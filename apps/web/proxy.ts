import { NextResponse, type NextRequest } from 'next/server';

/**
 * Porteiro das rotas de servidor (no Next 16 o antigo `middleware` chama-se `proxy`).
 *
 * O payload é lido aqui mesmo, sem importar lib/auth/session: o proxy roda separado do código de
 * render e pode ser distribuído na borda, então não deve depender de módulos compartilhados que
 * tocam `next/headers`.
 *
 * Sessão expirada com refresh guardado não derruba o usuário — o BFF renova na primeira chamada.
 * Aqui só barramos quem não tem credencial nenhuma.
 */
const COOKIE_ACCESS = 'hb_at';
const COOKIE_REFRESH = 'hb_rt';
const ROTA_ENTRADA = '/entrar';
const ROTA_TROCA_SENHA = '/trocar-senha';

interface PayloadMinimo {
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

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const access = req.cookies.get(COOKIE_ACCESS)?.value;
  const refresh = req.cookies.get(COOKIE_REFRESH)?.value;
  const temCredencial = Boolean(access ?? refresh);

  if (pathname === ROTA_ENTRADA) {
    return temCredencial ? NextResponse.redirect(new URL('/painel', req.url)) : NextResponse.next();
  }

  if (!temCredencial) {
    return NextResponse.redirect(new URL(ROTA_ENTRADA, req.url));
  }

  // Primeiro acesso: nada além da troca até a senha temporária cair.
  const precisaTrocar = access ? lerPayload(access)?.trocarSenhaNoLogin === true : false;
  if (precisaTrocar && pathname !== ROTA_TROCA_SENHA) {
    return NextResponse.redirect(new URL(ROTA_TROCA_SENHA, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/entrar', '/painel/:path*', '/fila/:path*', '/familias/:path*', '/trocar-senha'],
};
