import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api/server';
import type { Criterio } from '@/app/actions/programas';
import { EditorCriterios } from './editor-criterios';

interface ProgramaDetalhe {
  nome: string;
  slug: string;
  versoes: { id: string; versao: number; situacao: string; criterios: Criterio[] }[];
}

export default async function PaginaEditorCriterios({
  params,
}: {
  params: Promise<{ slug: string; versaoId: string }>;
}) {
  const { slug, versaoId } = await params;
  const programa = await apiFetch<ProgramaDetalhe>(`/programas/${slug}/detalhe`);
  const versao = programa.versoes.find((item) => item.id === versaoId);
  if (!versao) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm text-texto-suave">
        <Link href={`/programas/${slug}`} className="hover:underline">
          Início › Programas › {programa.nome}
        </Link>{' '}
        › Critérios v{versao.versao}
      </p>
      <h1 className="mt-1 font-display text-3xl font-extrabold text-institucional">
        Critérios da versão {versao.versao}
      </h1>
      <p className="mt-1 text-texto-suave">
        Publicar é irreversível: a inscrição passa a valer sobre esta versão, e o snapshot de cada
        família aponta para ela.
      </p>

      <EditorCriterios versaoId={versao.id} slug={slug} criteriosIniciais={versao.criterios} />
    </div>
  );
}
