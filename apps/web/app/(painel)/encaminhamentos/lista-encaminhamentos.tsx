'use client';

import { useState } from 'react';
import { Inbox } from 'lucide-react';
import { habitacao } from '@habita/shared';
import { BarraFiltros } from '@/components/ui/barra-filtros';
import { Drawer, ParDado } from '@/components/ui/drawer';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { EtiquetaStatus } from '@/components/ui/etiqueta-status';
import { CelulaPrincipal, Tabela } from '@/components/ui/tabela';
import type { TomStatus } from '@/lib/status';
import { cn } from '@/lib/cn';
import { AcoesEncaminhamento } from './acoes-encaminhamento';

export interface Encaminhamento {
  id: string;
  numero: string;
  tipoSolicitacao: string;
  assunto: string;
  descricao: string;
  referenciaResumo: string;
  prazoAte: string;
  vencido: boolean;
  situacao: string;
  origem: { sigla: string; nome: string };
  destino: { sigla: string; nome: string };
  resposta: string | null;
  respondidoEm: string | null;
  anexoKey: string | null;
  abertoEm?: string;
}

const SITUACOES: Record<string, { rotulo: string; tom: TomStatus }> = {
  ABERTO: { rotulo: 'Aguardando', tom: 'atencao' },
  RESPONDIDO: { rotulo: 'Respondido', tom: 'sucesso' },
  DEVOLVIDO: { rotulo: 'Devolvido', tom: 'perigo' },
  CANCELADO: { rotulo: 'Cancelado', tom: 'neutro' },
};

const CHIPS = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'ABERTO', rotulo: 'Aguardando' },
  { valor: 'RESPONDIDO', rotulo: 'Respondido' },
];

const COLUNAS = [
  { chave: 'assunto', rotulo: 'Assunto' },
  { chave: 'setor', rotulo: 'Setor', largura: 'minmax(0,150px)' },
  { chave: 'situacao', rotulo: 'Situação', largura: 'minmax(0,132px)' },
  { chave: 'prazo', rotulo: 'Prazo', largura: 'minmax(120px,auto)', direita: true },
];

/**
 * Caixa de encaminhamentos — a mesma tela para os dois lados do balcão interno.
 *
 * A lista mostra o que corre prazo; a resposta acontece no painel lateral, com o pedido inteiro à
 * vista. Responder sem reler o que foi pedido é como o pedido volta errado.
 */
export function ListaEncaminhamentos({
  encaminhamentos,
  podeResponder,
  situacao,
  busca,
}: {
  encaminhamentos: Encaminhamento[];
  podeResponder: boolean;
  situacao?: string;
  busca?: string;
}) {
  const [aberto, setAberto] = useState<Encaminhamento>();

  return (
    <>
      <BarraFiltros placeholder="Buscar por assunto, número ou setor" chips={CHIPS} />

      <div className="mt-3.5">
        <Tabela
          rotulo="Encaminhamentos"
          colunas={COLUNAS}
          aoAbrir={(id) => setAberto(encaminhamentos.find((item) => item.id === id))}
          linhas={encaminhamentos.map((item) => {
            const estado = SITUACOES[item.situacao] ?? { rotulo: item.situacao, tom: 'neutro' as TomStatus };

            return {
              id: item.id,
              celulas: [
                <CelulaPrincipal
                  key="assunto"
                  titulo={item.assunto}
                  apoio={`${item.numero} · ${item.referenciaResumo}`}
                />,
                <span key="setor" className="block truncate text-[13px] text-texto-suave">
                  {item.origem.sigla} → {item.destino.sigla}
                  <span className="block truncate text-[11.5px]">
                    {habitacao.rotuloTipoSolicitacao(item.tipoSolicitacao)}
                  </span>
                </span>,
                <EtiquetaStatus key="situacao" rotulo={estado.rotulo} tom={estado.tom} />,
                <span
                  key="prazo"
                  className={cn(
                    'tabular text-[13px]',
                    item.vencido ? 'font-semibold text-danger' : 'text-texto-suave',
                  )}
                >
                  {item.vencido ? 'Vencido em ' : 'Prazo · '}
                  {new Date(item.prazoAte).toLocaleDateString('pt-BR')}
                </span>,
              ],
            };
          })}
          vazio={
            <EstadoVazio
              icone={<Inbox size={20} strokeWidth={1.7} />}
              titulo={
                situacao || busca ? 'Nenhum encaminhamento neste recorte' : 'Nenhum encaminhamento'
              }
              descricao={
                situacao || busca
                  ? 'Troque o recorte ou limpe a busca.'
                  : 'Abra um pela ficha da família ou pela inscrição.'
              }
            />
          }
        />
      </div>

      <Drawer
        aberto={!!aberto}
        aoFechar={() => setAberto(undefined)}
        kicker={aberto?.numero}
        titulo={aberto?.assunto ?? ''}
      >
        {aberto && (
          <div>
            <div className="mb-3">
              <EtiquetaStatus
                rotulo={SITUACOES[aberto.situacao]?.rotulo ?? aberto.situacao}
                tom={SITUACOES[aberto.situacao]?.tom ?? 'neutro'}
              />
            </div>

            <ParDado rotulo="Tipo">{habitacao.rotuloTipoSolicitacao(aberto.tipoSolicitacao)}</ParDado>
            <ParDado rotulo="De → para">
              {aberto.origem.nome} → {aberto.destino.nome}
            </ParDado>
            <ParDado rotulo="Referência">{aberto.referenciaResumo}</ParDado>
            <ParDado rotulo="Prazo" tabular>
              {new Date(aberto.prazoAte).toLocaleDateString('pt-BR')}
              {aberto.vencido && <span className="ml-1 font-semibold text-danger">vencido</span>}
            </ParDado>

            <p className="mt-4 text-[13px] leading-relaxed text-texto">{aberto.descricao}</p>

            {aberto.resposta && (
              <div className="mt-4 border-l-2 border-success/40 pl-3">
                <p className="text-[11.5px] font-semibold text-texto-suave">
                  Resposta em{' '}
                  {aberto.respondidoEm && new Date(aberto.respondidoEm).toLocaleDateString('pt-BR')}
                  {aberto.anexoKey && ' · com documento anexado'}
                </p>
                <p className="mt-1 text-[13px] text-texto">{aberto.resposta}</p>
              </div>
            )}

            {aberto.situacao === 'ABERTO' && podeResponder && (
              <div className="mt-5 border-t border-borda pt-4">
                <AcoesEncaminhamento
                  encaminhamentoId={aberto.id}
                  pedeDocumento={aberto.tipoSolicitacao === 'LAUDO_RISCO'}
                />
              </div>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
}
