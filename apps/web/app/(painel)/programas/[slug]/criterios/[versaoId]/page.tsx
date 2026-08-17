import { notFound } from 'next/navigation';
import { CabecalhoTela, CorpoTela } from '@/components/ui/cabecalho-tela';
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
    <>
      <CabecalhoTela
        trilha={[
          { rotulo: 'Início', href: '/painel' },
          { rotulo: 'Programas', href: '/programas' },
          { rotulo: programa.nome, href: `/programas/${slug}` },
          { rotulo: `Critérios v${versao.versao}` },
        ]}
        titulo={`Critérios da versão ${versao.versao}`}
        subtitulo="Publicar é irreversível: a inscrição passa a valer sobre esta versão, e o snapshot de cada família aponta para ela."
      />

      <CorpoTela className="max-w-5xl">
        <EditorCriterios versaoId={versao.id} slug={slug} criteriosIniciais={versao.criterios} />
      </CorpoTela>
    </>
  );
}
