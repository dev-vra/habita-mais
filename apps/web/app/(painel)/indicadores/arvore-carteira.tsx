import Link from 'next/link';
import { habitacao } from '@habita/shared';
import { formatarReais, statusInscricao } from '@/lib/status';
import { EtiquetaStatus } from '@/components/ui/etiqueta-status';

export interface ProgramaArvore {
  id: string;
  nome: string;
  slug: string;
  vagas: number;
  familias: {
    inscricaoId: string;
    familiaId: string;
    protocolo: string;
    situacao: string;
    responsavel: string;
    pessoas: number;
    menores: number;
    rendaPerCapita: number | null;
    nivelVulnerabilidade: string | null;
    moradores: {
      id: string;
      nome: string;
      parentesco: string;
      idade: number | null;
      deficiencia: boolean;
    }[];
  }[];
}

/**
 * Árvore da carteira, com `<details>` nativo: expande sem JavaScript, funciona com teclado e leitor
 * de tela de graça, e imprime aberto. Um componente próprio de árvore custaria mais e entregaria
 * menos acessibilidade.
 */
export function ArvoreCarteira({ programas }: { programas: ProgramaArvore[] }) {
  if (programas.length === 0) {
    return <p className="mt-3 text-texto-suave">Nenhum programa cadastrado.</p>;
  }

  return (
    <ul className="mt-4 space-y-3">
      {programas.map((programa) => (
        <li key={programa.id} className="overflow-hidden rounded-lg border border-borda bg-surface">
          <details open={programas.length === 1}>
            <summary className="cursor-pointer list-none px-5 py-4 hover:bg-background">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  <span className="font-display text-lg font-bold text-institucional">
                    {programa.nome}
                  </span>
                  <span className="tabular ml-3 text-sm text-texto-suave">
                    {programa.familias.length}{' '}
                    {programa.familias.length === 1 ? 'família' : 'famílias'} · {programa.vagas} unidades
                  </span>
                </span>
                <Link
                  href={`/fila/${programa.slug}`}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Abrir a fila
                </Link>
              </div>
            </summary>

            <ul className="divide-y divide-borda border-t border-borda">
              {programa.familias.map((familia) => {
                const status = statusInscricao(familia.situacao);
                return (
                  <li key={familia.inscricaoId} className="px-5">
                    <details>
                      <summary className="cursor-pointer list-none py-3 hover:bg-background">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span>
                            <span className="font-semibold text-texto">{familia.responsavel}</span>
                            <span className="tabular block text-xs text-texto-suave">
                              {familia.protocolo} · {familia.pessoas} pessoas
                              {familia.menores > 0 && ` · ${familia.menores} menores`}
                              {familia.rendaPerCapita !== null &&
                                ` · ${formatarReais(familia.rendaPerCapita)} per capita`}
                            </span>
                          </span>
                          <span className="flex items-center gap-2">
                            {familia.nivelVulnerabilidade && (
                              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning-text">
                                vulnerabilidade{' '}
                                {habitacao
                                  .rotuloNivelVulnerabilidade(familia.nivelVulnerabilidade)
                                  .toLowerCase()}
                              </span>
                            )}
                            <EtiquetaStatus rotulo={status.rotulo} tom={status.tom} />
                          </span>
                        </div>
                      </summary>

                      <div className="pb-3 pl-4">
                        {familia.moradores.length === 0 ? (
                          <p className="text-sm text-texto-suave">
                            Composição nominal ainda não cadastrada —{' '}
                            <Link
                              href={`/familias/${familia.familiaId}`}
                              className="font-semibold text-primary hover:underline"
                            >
                              abrir a ficha
                            </Link>
                            .
                          </p>
                        ) : (
                          <ul className="space-y-1 text-sm">
                            {familia.moradores.map((morador) => (
                              <li key={morador.id} className="flex flex-wrap gap-x-2 text-texto-suave">
                                <span className="text-texto">{morador.nome}</span>
                                <span>· {habitacao.rotuloParentesco(morador.parentesco)}</span>
                                {morador.idade !== null && <span>· {morador.idade} anos</span>}
                                {morador.deficiencia && (
                                  <span className="text-warning-text">· pessoa com deficiência</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>

            {programa.familias.length === 0 && (
              <p className="border-t border-borda px-5 py-4 text-sm text-texto-suave">
                Nenhuma família inscrita neste programa.
              </p>
            )}
          </details>
        </li>
      ))}
    </ul>
  );
}
