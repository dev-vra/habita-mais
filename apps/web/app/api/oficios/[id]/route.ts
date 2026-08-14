import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { COOKIE_ACCESS, renovarAcesso } from '@/lib/auth/session';

const BASE = process.env.API_URL ?? 'http://localhost:3334/api/v1';

/** Serve o ofício em PDF pelo BFF — o arquivo passa pelo servidor, sem link assinado circulando. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const buscar = (token?: string) =>
    fetch(`${BASE}/convocacoes/${id}/oficio`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    });

  const token = (await cookies()).get(COOKIE_ACCESS)?.value;
  let resposta = await buscar(token);

  if (resposta.status === 401) {
    const novo = await renovarAcesso();
    if (novo) resposta = await buscar(novo);
  }

  if (!resposta.ok) {
    return NextResponse.json(
      { erro: 'Não foi possível gerar o ofício.' },
      { status: resposta.status },
    );
  }

  return new NextResponse(await resposta.arrayBuffer(), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': resposta.headers.get('content-disposition') ?? 'inline',
    },
  });
}
