import { NextResponse } from 'next/server';
import { apiFetch } from '@/lib/api/server';

/** Repasse das consultas externas pelo BFF — o token da API nunca chega ao browser. */
export async function GET(_req: Request, { params }: { params: Promise<{ caminho: string[] }> }) {
  const { caminho } = await params;

  try {
    const resultado = await apiFetch(`/integracoes/${caminho.join('/')}`);
    return NextResponse.json(resultado);
  } catch {
    return NextResponse.json({ encontrado: false, motivo: 'indisponivel' }, { status: 200 });
  }
}
