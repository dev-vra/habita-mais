import { NextResponse, type NextRequest } from 'next/server';

/**
 * Porteiro das rotas de servidor (no Next 16 o antigo `middleware` chama-se `proxy`).
 *
 * A renovação da sessão mora AQUI, e não no BFF, por um motivo do framework: Server Component não
 * pode gravar cookie — só Server Action, Route Handler e o proxy podem. Enquanto a renovação
 * ficava no cliente HTTP do BFF, ela chamava a API, recebia o par novo, falhava ao gravar e o
 * usuário caía no login ao clicar em qualquer link depois de 15 minutos. Foi assim que o defeito
 * apareceu: sessão viva, tela de login.
 *
 * O payload é lido aqui mesmo, sem importar lib/auth/session: o proxy roda separado do código de
 * render e não deve depender de módulos que tocam `next/headers`.
 */
const COOKIE_ACCESS = 'hb_at';
const COOKIE_REFRESH = 'hb_rt';
const ROTA_ENTRADA = '/entrar';
const ROTA_TROCA_SENHA = '/trocar-senha';

const API = process.env.API_URL ?? 'http://localhost:3334/api/v1';

const OPCOES_COOKIE = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

const DURACAO_REFRESH_SEGUNDOS = 7 * 24 * 60 * 60;
/** Renova um pouco antes de vencer: evita expirar no meio de uma navegação. */
const MARGEM_RENOVACAO_MS = 30_000;

interface PayloadMinimo {
  exp?: number;
  trocarSenhaNoLogin?: boolean;
}

function lerPayload(token: string): PayloadMinimo | null {
  try {
    const bruto = token.split('.')[1];
    if (!bruto) return null;

    const base64 = bruto.replace(/-/g, '+').replace(/_/g, '/');
    const completo = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(completo)) as PayloadMinimo;
  } catch {
    return null;
  }
}

const expirado = (payload: PayloadMinimo | null): boolean =>
  !payload?.exp || payload.exp * 1000 - MARGEM_RENOVACAO_MS <= Date.now();

type ResultadoRenovacao =
  | { estado: 'renovado'; par: { accessToken: string; refreshToken: string } }
  | { estado: 'sessao_morta' }
  | { estado: 'indisponivel' };

/**
 * Renova a sessão.
 *
 * A distinção entre "sessão morta" e "não deu para renovar agora" é o ponto: só 401/403 significam
 * credencial inválida. Excesso de requisições, erro da API ou rede fora não podem deslogar
 * ninguém — tratar 429 como sessão inválida derrubou o painel inteiro em teste, e numa prefeitura,
 * onde todos saem pelo mesmo IP, isso seria uma queda coletiva no meio do expediente.
 */
async function renovar(refresh: string): Promise<ResultadoRenovacao> {
  try {
    const resposta = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
      cache: 'no-store',
    });

    if (resposta.ok) {
      return {
        estado: 'renovado',
        par: (await resposta.json()) as { accessToken: string; refreshToken: string },
      };
    }
    return resposta.status === 401 || resposta.status === 403
      ? { estado: 'sessao_morta' }
      : { estado: 'indisponivel' };
  } catch {
    return { estado: 'indisponivel' };
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const access = req.cookies.get(COOKIE_ACCESS)?.value;
  const refresh = req.cookies.get(COOKIE_REFRESH)?.value;

  if (pathname === ROTA_ENTRADA) {
    return access ?? refresh
      ? NextResponse.redirect(new URL('/painel', req.url))
      : NextResponse.next();
  }

  if (!access && !refresh) {
    return NextResponse.redirect(new URL(ROTA_ENTRADA, req.url));
  }

  let payload = access ? lerPayload(access) : null;
  let parRenovado: { accessToken: string; refreshToken: string } | null = null;

  if (refresh && expirado(payload)) {
    const resultado = await renovar(refresh);

    if (resultado.estado === 'sessao_morta') {
      const destino = new URL(ROTA_ENTRADA, req.url);
      destino.searchParams.set('sessao', 'expirada');

      // Limpa o que sobrou: cookie de refresh morto só produziria a mesma falha na próxima página.
      const saida = NextResponse.redirect(destino);
      saida.cookies.delete(COOKIE_ACCESS);
      saida.cookies.delete(COOKIE_REFRESH);
      return saida;
    }

    // Indisponível: segue a navegação com o que há. A página mostra o erro real se for o caso —
    // deslogar por instabilidade de rede seria trocar um problema temporário por um permanente.
    if (resultado.estado === 'indisponivel') {
      return NextResponse.next();
    }

    parRenovado = resultado.par;
    payload = lerPayload(parRenovado.accessToken);
    // O token novo precisa valer JÁ nesta requisição: sem isto, a página renderiza com o token
    // velho e recebe 401 do mesmo jeito.
    req.cookies.set(COOKIE_ACCESS, parRenovado.accessToken);
    req.cookies.set(COOKIE_REFRESH, parRenovado.refreshToken);
  }

  if (payload?.trocarSenhaNoLogin === true && pathname !== ROTA_TROCA_SENHA) {
    return NextResponse.redirect(new URL(ROTA_TROCA_SENHA, req.url));
  }

  const resposta = NextResponse.next({ request: { headers: req.headers } });

  if (parRenovado) {
    const expiraEm = payload?.exp ? new Date(payload.exp * 1000) : undefined;
    resposta.cookies.set(COOKIE_ACCESS, parRenovado.accessToken, {
      ...OPCOES_COOKIE,
      expires: expiraEm,
    });
    resposta.cookies.set(COOKIE_REFRESH, parRenovado.refreshToken, {
      ...OPCOES_COOKIE,
      maxAge: DURACAO_REFRESH_SEGUNDOS,
    });
  }

  return resposta;
}

/**
 * Matcher negativo: protege tudo, menos o que é explicitamente público. A lista positiva anterior
 * envelhecia mal — cada rota nova nascia desprotegida até alguém lembrar de incluí-la aqui.
 *
 * Fora: assets do Next, a central do munícipe (esfera própria), a validação pública de documento
 * e as rotas de BFF (que já anexam e validam o token no servidor).
 */
export const config = {
  matcher: ['/((?!_next/|api/|minha-inscricao|validar/|favicon|.*\\.(?:svg|png|jpg|ico)$).*)'],
};
