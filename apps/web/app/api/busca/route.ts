import { NextResponse, type NextRequest } from 'next/server';
import { apiFetch } from '@/lib/api/server';

/** Busca do topo pelo BFF — o token continua no servidor. */
export async function GET(req: NextRequest) {
  const termo = req.nextUrl.searchParams.get('q') ?? '';
  const resultado = await apiFetch(`/busca?q=${encodeURIComponent(termo)}`);
  return NextResponse.json(resultado);
}
