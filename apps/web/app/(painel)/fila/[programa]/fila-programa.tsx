'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ListOrdered } from 'lucide-react';
import { convocar } from '@/app/actions/inscricoes';
import { EstadoVazio } from '@/components/ui/estado-vazio';
import { EtiquetaStatus } from '@/components/ui/etiqueta-status';
import { Modal, ModalConfirmacao } from '@/components/ui/modal';
import { CelulaPrincipal, Tabela } from '@/components/ui/tabela';
import { useToast } from '@/components/ui/toast';
import { formatarNota, formatarReais, statusInscricao } from '@/lib/status';

export interface LinhaDaFila {
  posicao: number;
  inscricaoId: string;
  protocolo: string;
  responsavel: string;
  composicao: { pessoas: number; menores: number };
  rendaPerCapita: number;
  pontuacao: number;
  situacao: string;
  criterioQuePesou: string | null;
}

const PRAZO_PADRAO_DIAS = 15;

/**
 * A tela-âncora do produto. Tudo aqui precisa ser defensável em auditoria: posição, pontuação,
 * quando foi calculada e sob qual versão do critério.
 *
 * Convocar a primeira da fila é um clique; convocar qualquer outra é uma exceção, e exceção pede
 * motivo escrito que vai nominal para a trilha. A UI não pode fazer as duas coisas parecerem a
 * mesma coisa.
 */
export function FilaPrograma({
  linhas,
  podeConvocar,
  podeForaDeOrdem,
}: {
  linhas: LinhaDaFila[];
  podeConvocar: boolean;
  podeForaDeOrdem: boolean;
}) {
  const [emOrdem, setEmOrdem] = useState<LinhaDaFila>();
  const [foraDeOrdem, setForaDeOrdem] = useState<LinhaDaFila>();
  const [prazo, setPrazo] = useState(prazoPadrao());
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const { avisar } = useToast();
  const router = useRouter();

  const proxima = linhas.find((linha) => linha.situacao === 'APTA');
  const colunas = [
    { chave: 'classificacao', rotulo: 'Classificação' },
    { chave: 'composicao', rotulo: 'Composição', largura: 'minmax(0,120px)' },
    { chave: 'situacao', rotulo: 'Situação', largura: 'minmax(0,132px)' },
    { chave: 'pontos', rotulo: 'Pontos', largura: 'minmax(80px,auto)', direita: true },
    ...(podeConvocar ? [{ chave: 'acao', rotulo: '', largura: 'minmax(0,116px)', direita: true }] : []),
  ];

  async function convocarEmOrdem() {
    if (!emOrdem) return;
    setEnviando(true);
    const resultado = await convocar(emOrdem.inscricaoId, {
      prazoComparecimentoAte: prazo,
      foraDeOrdem: false,
    });
    setEnviando(false);

    if (resultado.erro) {
      setErro(resultado.erro);
      return;
    }

    setEmOrdem(undefined);
    avisar({
      tom: 'sucesso',
      titulo: 'Convocação emitida',
      corpo: `${emOrdem.responsavel} tem até ${new Date(prazo).toLocaleDateString('pt-BR')} para comparecer.`,
    });
    router.refresh();
  }

  async function convocarForaDeOrdem(motivo: string) {
    if (!foraDeOrdem) return;
    const resultado = await convocar(foraDeOrdem.inscricaoId, {
      prazoComparecimentoAte: prazo,
      foraDeOrdem: true,
      motivoExcecao: motivo,
    });

    if (resultado.erro) {
      avisar({ tom: 'perigo', titulo: 'Não foi possível convocar', corpo: resultado.erro });
      return;
    }

    avisar({
      tom: 'atencao',
      titulo: 'Exceção registrada',
      corpo: 'A convocação fora de ordem foi publicada junto ao ranking, com o motivo.',
    });
    router.refresh();
  }

  return (
    <>
      <Tabela
        rotulo="Fila classificada"
        colunas={colunas}
        linhas={linhas.map((linha) => ({
          id: linha.inscricaoId,
          href: `/inscricoes/${linha.inscricaoId}`,
          celulas: [
            <CelulaPrincipal
              key="classificacao"
              titulo={`${linha.posicao}º · ${linha.responsavel}`}
              apoio={linha.criterioQuePesou ?? `${linha.protocolo} · ${formatarReais(linha.rendaPerCapita)} per capita`}
              href={`/inscricoes/${linha.inscricaoId}`}
            />,
            <span key="composicao" className="text-[13px] text-texto-suave">
              {linha.composicao.pessoas} {linha.composicao.pessoas === 1 ? 'pessoa' : 'pessoas'}
              {linha.composicao.menores > 0 &&
                ` · ${linha.composicao.menores} ${linha.composicao.menores === 1 ? 'menor' : 'menores'}`}
            </span>,
            <EtiquetaStatus
              key="situacao"
              rotulo={statusInscricao(linha.situacao).rotulo}
              tom={statusInscricao(linha.situacao).tom}
            />,
            <span key="pontos" className="tabular text-[13px] font-bold text-institucional">
              {formatarNota(linha.pontuacao)}
            </span>,
            ...(podeConvocar
              ? [
                  linha.situacao === 'APTA' ? (
                    <button
                      key="acao"
                      type="button"
                      onClick={(evento) => {
                        evento.stopPropagation();
                        setErro(undefined);
                        if (proxima?.inscricaoId === linha.inscricaoId) setEmOrdem(linha);
                        else if (podeForaDeOrdem) setForaDeOrdem(linha);
                      }}
                      disabled={proxima?.inscricaoId !== linha.inscricaoId && !podeForaDeOrdem}
                      className="rounded-md border border-borda bg-surface px-2.5 py-1.5 text-[11.5px] font-bold text-institucional transition hover:bg-background disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-institucional/30"
                    >
                      {proxima?.inscricaoId === linha.inscricaoId ? 'Convocar' : 'Fora de ordem'}
                    </button>
                  ) : (
                    <span key="acao" />
                  ),
                ]
              : []),
          ],
        }))}
        vazio={
          <EstadoVazio
            icone={<ListOrdered size={20} strokeWidth={1.7} />}
            titulo="Nenhuma família classificada"
            descricao="A fila só ordena inscrição apta com pontuação calculada. Publique o critério e recalcule para ver a classificação."
          />
        }
      />

      <Modal
        aberto={!!emOrdem}
        aoFechar={() => setEmOrdem(undefined)}
        titulo="Convocar da fila"
        descricao={
          emOrdem && (
            <>
              <strong className="font-semibold text-texto">{emOrdem.responsavel}</strong> está em{' '}
              {emOrdem.posicao}º lugar, com {formatarNota(emOrdem.pontuacao)} pontos. A convocação
              abre prazo de comparecimento e entra na trilha.
            </>
          )
        }
        acoes={
          <>
            <button
              type="button"
              onClick={() => setEmOrdem(undefined)}
              className="h-[38px] rounded-md border border-borda bg-surface px-4 text-[13px] font-bold text-institucional transition hover:bg-background"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void convocarEmOrdem()}
              disabled={enviando || !prazo}
              className="h-[38px] rounded-md bg-primary px-4 text-[13px] font-bold text-surface transition hover:bg-primary/90 disabled:opacity-45"
            >
              {enviando ? 'Emitindo…' : 'Emitir convocação'}
            </button>
          </>
        }
      >
        <label htmlFor="prazo-convocacao" className="block text-[13px] font-semibold text-texto">
          Prazo para comparecer
        </label>
        <input
          id="prazo-convocacao"
          type="date"
          value={prazo}
          onChange={(evento) => setPrazo(evento.target.value)}
          className="tabular mt-1.5 w-full rounded-md border border-borda bg-surface px-3 py-2 text-[13px] outline-none transition focus:border-institucional focus:ring-2 focus:ring-institucional/30"
        />
        {erro && <p className="mt-2 text-xs text-danger">{erro}</p>}
      </Modal>

      <ModalConfirmacao
        aberto={!!foraDeOrdem}
        aoFechar={() => setForaDeOrdem(undefined)}
        titulo="Convocar fora de ordem"
        descricao={
          foraDeOrdem && (
            <>
              <strong className="font-semibold text-texto">{foraDeOrdem.responsavel}</strong> está em{' '}
              {foraDeOrdem.posicao}º lugar. Convocar antes de quem está à frente é exceção à regra
              objetiva da fila.
            </>
          )
        }
        rotuloConfirmar="Convocar mesmo assim"
        aviso="A exceção vai nominal para a trilha e é publicada junto ao ranking, com este motivo."
        aoConfirmar={convocarForaDeOrdem}
      />
    </>
  );
}

function prazoPadrao(): string {
  const data = new Date();
  data.setDate(data.getDate() + PRAZO_PADRAO_DIAS);
  return data.toISOString().slice(0, 10);
}
