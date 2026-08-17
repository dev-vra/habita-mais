'use client';

import Link from 'next/link';
import { useState } from 'react';
import { UsersRound } from 'lucide-react';
import { BarraFiltros } from '@/components/ui/barra-filtros';
import { Drawer, ParDado } from '@/components/ui/drawer';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { EtiquetaStatus } from '@/components/ui/etiqueta-status';
import { CelulaPrincipal, RodapeTabela, Tabela } from '@/components/ui/tabela';
import { formatarReais, statusInscricao } from '@/lib/status';
import { cn } from '@/lib/cn';

export interface ItemFamilia {
  id: string;
  codigo: string;
  responsavel: string;
  cpfMascarado: string;
  pessoas: number;
  rendaPerCapita: number | null;
  fichaValidaAte: string | null;
  inscricoes: number;
  situacao: string | null;
}

const CHIPS = [
  { valor: '', rotulo: 'Todas' },
  { valor: 'APTA', rotulo: 'Apta' },
  { valor: 'PENDENTE', rotulo: 'Com pendência' },
  { valor: 'EM_RECURSO', rotulo: 'Em recurso' },
];

const COLUNAS = [
  { chave: 'responsavel', rotulo: 'Responsável' },
  { chave: 'composicao', rotulo: 'Composição', largura: 'minmax(0,110px)' },
  { chave: 'ficha', rotulo: 'Ficha', largura: 'minmax(0,150px)' },
  { chave: 'renda', rotulo: 'Renda per capita', largura: 'minmax(120px,auto)', direita: true },
];

/**
 * Lista de famílias. O clique na linha abre o resumo lateral em vez de navegar: o atendimento
 * confere dez famílias seguidas, e perder a lista a cada conferência é o que faz a fila do balcão
 * andar devagar. O nome continua sendo link de verdade — para teclado, nova aba e menu de contexto.
 */
export function ListaFamilias({
  itens,
  total,
  pagina,
  porPagina,
  busca,
}: {
  itens: ItemFamilia[];
  total: number;
  pagina: number;
  porPagina: number;
  busca?: string;
}) {
  const [selecionada, setSelecionada] = useState<ItemFamilia>();

  return (
    <>
      <BarraFiltros placeholder="Buscar por nome, CPF ou código" chips={CHIPS} />

      <div className="mt-3.5">
        <Tabela
          rotulo="Famílias cadastradas"
          colunas={COLUNAS}
          aoAbrir={(id) => setSelecionada(itens.find((item) => item.id === id))}
          linhas={itens.map((item) => ({
            id: item.id,
            celulas: [
              <CelulaPrincipal
                key="responsavel"
                titulo={item.responsavel}
                apoio={`${item.codigo} · ${item.cpfMascarado}`}
                href={`/familias/${item.id}`}
              />,
              <span key="composicao" className="text-[13px] text-texto-suave">
                {item.pessoas} {item.pessoas === 1 ? 'pessoa' : 'pessoas'}
              </span>,
              <ValidadeFicha key="ficha" ate={item.fichaValidaAte} />,
              <span key="renda" className="tabular text-[13px] text-texto-suave">
                {item.rendaPerCapita === null ? '—' : formatarReais(item.rendaPerCapita)}
              </span>,
            ],
          }))}
          vazio={
            <EstadoVazio
              icone={<UsersRound size={20} strokeWidth={1.7} />}
              titulo={busca ? 'Nenhuma família para essa busca' : 'Nenhuma família cadastrada ainda'}
              descricao={
                busca
                  ? `Nada encontrado para “${busca}”. A busca aceita nome, CPF e código da família.`
                  : 'Assim que a primeira ficha social entrar, a família aparece aqui.'
              }
              acao={
                busca ? (
                  <Link
                    href="/familias"
                    className="inline-flex h-9 items-center rounded-md border border-borda bg-surface px-3.5 text-[12.5px] font-bold text-institucional transition hover:bg-background"
                  >
                    Limpar busca
                  </Link>
                ) : undefined
              }
            />
          }
          rodape={<RodapeTabela total={total} pagina={pagina} porPagina={porPagina} />}
        />
      </div>

      <Drawer
        aberto={!!selecionada}
        aoFechar={() => setSelecionada(undefined)}
        kicker={selecionada?.codigo}
        titulo={selecionada?.responsavel ?? ''}
        acoes={
          selecionada && (
            <>
              <button
                type="button"
                onClick={() => setSelecionada(undefined)}
                className="h-[38px] rounded-md border border-borda bg-surface px-4 text-[13px] font-bold text-institucional transition hover:bg-background focus:outline-none focus:ring-2 focus:ring-institucional/30"
              >
                Fechar
              </button>
              <Link
                href={`/familias/${selecionada.id}`}
                className="inline-flex h-[38px] items-center rounded-md bg-primary px-4 text-[13px] font-bold text-surface transition hover:bg-primary/90"
              >
                Abrir ficha completa
              </Link>
            </>
          )
        }
      >
        {selecionada && (
          <div>
            {selecionada.situacao && (
              <div className="mb-3">
                <EtiquetaStatus
                  rotulo={statusInscricao(selecionada.situacao).rotulo}
                  tom={statusInscricao(selecionada.situacao).tom}
                />
              </div>
            )}

            <ParDado rotulo="CPF" tabular>
              {selecionada.cpfMascarado}
            </ParDado>
            <ParDado rotulo="Composição">
              {selecionada.pessoas} {selecionada.pessoas === 1 ? 'pessoa' : 'pessoas'}
            </ParDado>
            <ParDado rotulo="Renda per capita" tabular>
              {selecionada.rendaPerCapita === null ? '—' : formatarReais(selecionada.rendaPerCapita)}
            </ParDado>
            <ParDado rotulo="Ficha social">
              <ValidadeFicha ate={selecionada.fichaValidaAte} />
            </ParDado>
            <ParDado rotulo="Inscrições" tabular>
              {selecionada.inscricoes}
            </ParDado>
          </div>
        )}
      </Drawer>
    </>
  );
}

/** Ficha vencida é o que tira a família da fila no recadastramento — avisa antes de doer. */
function ValidadeFicha({ ate }: { ate: string | null }) {
  if (!ate) return <span className="text-[13px] font-semibold text-warning-text">Sem ficha</span>;

  const validade = new Date(ate);
  const vencida = validade < new Date();

  return (
    <span className={cn('text-[13px]', vencida ? 'font-semibold text-warning-text' : 'text-texto-suave')}>
      {vencida ? 'Vencida em ' : 'Válida até '}
      <span className="tabular">
        {validade.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })}
      </span>
    </span>
  );
}
