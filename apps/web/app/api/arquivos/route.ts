import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_ACCESS, renovarAcesso } from '@/lib/auth/session';

const BASE = process.env.API_URL ?? 'http://localhost:3334/api/v1';

/**
 * Repasse de upload ao BFF: o multipart segue intacto (sem Content-Type forçado, para preservar o
 * boundary) e o Bearer é anexado no servidor — o browser continua sem ver o token.
 */
export async function POST(req: NextRequest) {
  const categoria = req.nextUrl.searchParams.get('categoria') ?? '';
  const corpo = await req.arrayBuffer();
  const tipoConteudo = req.headers.get('content-type') ?? '';

  const enviar = (token?: string) =>
    fetch(`${BASE}/arquivos?categoria=${encodeURIComponent(categoria)}`, {
      method: 'POST',
      headers: {
        'content-type': tipoConteudo,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corpo,
      cache: 'no-store',
    });

  const token = (await cookies()).get(COOKIE_ACCESS)?.value;
  let resposta = await enviar(token);

  if (resposta.status === 401) {
    const novo = await renovarAcesso();
    if (novo) resposta = await enviar(novo);
  }

  return NextResponse.json(await resposta.json().catch(() => ({})), { status: resposta.status });
}
