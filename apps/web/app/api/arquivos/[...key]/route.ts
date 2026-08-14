import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_ACCESS, renovarAcesso } from '@/lib/auth/session';

const BASE = process.env.API_URL ?? 'http://localhost:3334/api/v1';

/**
 * Stream INLINE do arquivo pelo BFF.
 *
 * Nem o `<img>` nem o pdf.js conseguem mandar Authorization — eles só recebem uma URL. Então a URL
 * é esta, do próprio web: o Bearer é anexado no servidor, o token continua invisível ao browser e
 * não existe link assinado circulando. Um laudo social não deve ser abrível por quem receber o
 * endereço encaminhado.
 *
 * O corpo é repassado como stream: um PDF de 40 MB não precisa passar inteiro pela memória do Node.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  const caminho = key.map(encodeURIComponent).join('/');

  const buscar = (token?: string) =>
    fetch(`${BASE}/arquivos/${caminho}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: 'no-store',
    });

  const token = (await cookies()).get(COOKIE_ACCESS)?.value;
  let resposta = await buscar(token);

  if (resposta.status === 401) {
    const novo = await renovarAcesso();
    if (novo) resposta = await buscar(novo);
  }

  if (!resposta.ok || !resposta.body) {
    return NextResponse.json(
      { message: 'Não foi possível abrir o arquivo.' },
      { status: resposta.status === 200 ? 502 : resposta.status },
    );
  }

  return new NextResponse(resposta.body, {
    headers: {
      'Content-Type': resposta.headers.get('content-type') ?? 'application/octet-stream',
      // Sem cache: quem perde o acesso ao processo não deve continuar lendo o documento do disco.
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'inline',
    },
  });
}
