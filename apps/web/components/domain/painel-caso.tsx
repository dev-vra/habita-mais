'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { habitacao } from '@habita/shared';
import {
  decidirCaso,
  encerrarCaso,
  enviarParaAnalise,
  notificarCaso,
  registrarDefesa,
  registrarTentativa,
} from '@/app/actions/retomada';
import { CampoArquivo } from '@/components/ui/campo-arquivo';
import { Aviso } from '@/components/ui/formulario';
import { data } from '@/lib/formato';
import type { CasoDetalhe } from '@/app/(painel)/retomada/[casoId]/page';

/**
 * Instrução e decisão do caso.
 *
 * Cada bloco só aparece na fase em que o ato é possível. Esconder o que não pode ser feito é
 * deliberado: num processo que pode tirar a casa de alguém, oferecer o botão errado é convidar ao
 * erro que anula tudo — e o erro só apareceria meses depois, em juízo.
 */
export function PainelCaso({
  caso,
  caminho,
  podeInstruir,
  podeDecidir,
  podeRegistrarDefesa,
}: {
  caso: CasoDetalhe;
  caminho: string;
  podeInstruir: boolean;
  podeDecidir: boolean;
  podeRegistrarDefesa: boolean;
}) {
  const [erro, setErro] = useState<string>();
  const [aviso, setAviso] = useState<string>();
  const [forma, setForma] = useState<habitacao.FormaNotificacao>('PESSOAL');
  const [encerrando, setEncerrando] = useState(false);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  const rodar = (acao: () => Promise<{ erro?: string }>, aoConcluir?: () => void) =>
    iniciar(async () => {
      const resultado = await acao();
      setErro(resultado.erro);
      if (!resultado.erro) {
        aoConcluir?.();
        router.refresh();
      }
    });

  const editalLiberado = habitacao.editalAdmissivel(caso.tentativasFrustradas);

  return (
    <div className="space-y-4">
      {erro && <Aviso tom="danger">{erro}</Aviso>}
      {aviso && <Aviso tom="info">{aviso}</Aviso>}

      {caso.avaliacao.motivos.length > 0 && caso.fase !== 'ENCERRADO' && (
        <div className="rounded-lg border border-borda bg-background p-4">
          <p className="text-sm font-bold text-texto">O que falta para decidir</p>
          <ul className="mt-2 space-y-1 text-sm text-texto-suave">
            {caso.avaliacao.motivos.map((motivo) => (
              <li key={motivo}>· {motivo}</li>
            ))}
          </ul>
        </div>
      )}

      {caso.fase === 'ABERTO' && podeInstruir && (
        <>
          <form
            className="rounded-lg border border-borda bg-surface p-5"
            action={(formulario) =>
              rodar(
                () =>
                  registrarTentativa(
                    caso.id,
                    String(formulario.get('detalhe') ?? ''),
                    caminho,
                  ),
                () => setAviso('Tentativa registrada.'),
              )
            }
          >
            <h3 className="text-sm font-bold text-texto">Tentativa de notificação sem êxito</h3>
            <p className="mt-1 text-xs text-texto-suave">
              {caso.tentativasFrustradas} tentativa(s) registrada(s).{' '}
              {editalLiberado
                ? 'O edital já é admissível.'
                : `Faltam ${habitacao.TENTATIVAS_ANTES_DO_EDITAL - caso.tentativasFrustradas} para o edital ser admissível.`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                name="detalhe"
                required
                placeholder="Ex.: AR devolvido — destinatário ausente em 3 tentativas do carteiro"
                className="min-w-64 flex-1 rounded-md border border-borda px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={pendente}
                className="rounded-md border border-borda px-4 py-2 text-sm font-semibold text-institucional disabled:opacity-60"
              >
                Registrar tentativa
              </button>
            </div>
          </form>

          <form
            className="space-y-3 rounded-lg border border-borda bg-surface p-5"
            action={(formulario) =>
              rodar(() =>
                notificarCaso(
                  caso.id,
                  {
                    forma,
                    notificadoEm: String(formulario.get('notificadoEm')),
                    comprovanteKey: String(formulario.get('comprovanteKey') ?? '') || undefined,
                    prazoDefesaDias: formulario.get('prazoDefesaDias')
                      ? Number(formulario.get('prazoDefesaDias'))
                      : undefined,
                  },
                  caminho,
                ),
              )
            }
          >
            <h3 className="text-sm font-bold text-texto">Notificar a família</h3>
            <p className="text-xs text-texto-suave">
              A ciência abre o prazo de defesa. Sem ela, nenhuma decisão se sustenta.
            </p>

            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm font-semibold text-texto">
                Forma
                <select
                  value={forma}
                  onChange={(evento) =>
                    setForma(evento.target.value as habitacao.FormaNotificacao)
                  }
                  className="mt-1 w-full rounded-md border border-borda bg-surface px-3 py-2 text-base font-normal"
                >
                  {habitacao.FORMAS_NOTIFICACAO.map((opcao) => (
                    <option key={opcao} value={opcao} disabled={opcao === 'EDITAL' && !editalLiberado}>
                      {habitacao.rotuloFormaNotificacao(opcao)}
                      {opcao === 'EDITAL' && !editalLiberado ? ' (exige 2 tentativas)' : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-texto">
                Data da ciência
                <input
                  type="date"
                  name="notificadoEm"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="mt-1 w-full rounded-md border border-borda bg-surface px-3 py-2 text-base font-normal"
                />
              </label>

              <label className="text-sm font-semibold text-texto">
                Prazo de defesa (dias)
                <input
                  type="number"
                  name="prazoDefesaDias"
                  min={5}
                  max={60}
                  placeholder={String(habitacao.PRAZO_DEFESA_DIAS)}
                  className="tabular mt-1 w-full rounded-md border border-borda bg-surface px-3 py-2 text-base font-normal"
                />
              </label>
            </div>

            {forma !== 'EDITAL' && (
              <CampoArquivo
                nome="comprovanteKey"
                categoria="oficios"
                rotulo="Comprovante da ciência (AR ou termo assinado)"
                ajuda="AR digitalizado ou termo assinado pela família."
              />
            )}

            <button
              type="submit"
              disabled={pendente}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-surface disabled:opacity-60"
            >
              Registrar notificação
            </button>
          </form>
        </>
      )}

      {(caso.fase === 'NOTIFICADO' || caso.fase === 'EM_DEFESA') && (
        <>
          {podeRegistrarDefesa && !caso.defesaApresentadaEm && (
            <form
              className="space-y-3 rounded-lg border border-borda bg-surface p-5"
              action={(formulario) =>
                rodar(
                  () =>
                    registrarDefesa(
                      caso.id,
                      {
                        apresentadaEm: String(formulario.get('apresentadaEm')),
                        teor: String(formulario.get('teor')),
                        apresentadaPor: String(formulario.get('apresentadaPor')),
                        arquivoKey: String(formulario.get('defesaArquivoKey') ?? '') || undefined,
                      },
                      caminho,
                    ),
                  () => setAviso('Defesa protocolada.'),
                )
              }
            >
              <h3 className="text-sm font-bold text-texto">Protocolar defesa</h3>
              <p className="text-xs text-texto-suave">
                Prazo até {data(caso.prazoDefesaAte)}. Defesa fora do prazo também é protocolada —
                quem julga decide se conhece.
              </p>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm font-semibold text-texto">
                  Apresentada em
                  <input
                    type="date"
                    name="apresentadaEm"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="mt-1 w-full rounded-md border border-borda bg-surface px-3 py-2 text-base font-normal"
                  />
                </label>
                <label className="text-sm font-semibold text-texto">
                  Quem apresentou
                  <input
                    name="apresentadaPor"
                    required
                    placeholder="Titular, familiar ou advogado"
                    className="mt-1 w-full rounded-md border border-borda bg-surface px-3 py-2 text-base font-normal"
                  />
                </label>
              </div>

              <label className="block text-sm font-semibold text-texto">
                Teor da defesa
                <textarea
                  name="teor"
                  required
                  rows={4}
                  placeholder="O que a família alega e o que juntou."
                  className="mt-1 w-full rounded-md border border-borda bg-surface px-3 py-2 text-base font-normal"
                />
              </label>

              <CampoArquivo
                nome="defesaArquivoKey"
                categoria="oficios"
                rotulo="Defesa escrita (opcional)"
              />

              <button
                type="submit"
                disabled={pendente}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-surface disabled:opacity-60"
              >
                Protocolar defesa
              </button>
            </form>
          )}

          {podeInstruir && (
            <div className="rounded-lg border border-borda bg-surface p-5">
              <h3 className="text-sm font-bold text-texto">Encerrar a instrução</h3>
              <p className="mt-1 text-xs text-texto-suave">
                Manda o caso para quem decide. Só é possível com a defesa apresentada ou o prazo
                vencido.
              </p>
              <button
                type="button"
                disabled={pendente}
                onClick={() =>
                  rodar(() => enviarParaAnalise(caso.id, caminho), () =>
                    setAviso('Instrução encerrada. O caso está em análise.'),
                  )
                }
                className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-surface disabled:opacity-60"
              >
                Enviar para análise
              </button>
            </div>
          )}
        </>
      )}

      {caso.fase === 'EM_ANALISE' && podeDecidir && (
        <form
          className="space-y-3 rounded-lg border border-borda bg-surface p-5"
          action={(formulario) =>
            rodar(() =>
              decidirCaso(
                caso.id,
                {
                  decisao: String(formulario.get('decisao')),
                  fundamentacao: String(formulario.get('fundamentacao')),
                },
                caminho,
              ),
            )
          }
        >
          <h3 className="text-sm font-bold text-texto">Decisão</h3>
          {caso.defesaTeor && (
            <div className="rounded-md bg-background p-3">
              <p className="text-xs font-semibold text-texto-suave">
                O que a defesa alegou ({caso.defesaApresentadaPor})
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-texto">{caso.defesaTeor}</p>
            </div>
          )}
          {caso.avaliacao.revelia && (
            <p className="rounded-md bg-warning/15 px-3 py-2 text-sm text-warning-text">
              Prazo vencido sem defesa. A revelia é fato registrado, não autorização — a decisão
              continua sendo de quem assina.
            </p>
          )}

          <label className="block text-sm font-semibold text-texto">
            Decisão
            <select
              name="decisao"
              defaultValue="REGULARIZACAO"
              className="mt-1 w-full rounded-md border border-borda bg-surface px-3 py-2 text-base font-normal"
            >
              {habitacao.DECISOES_RETOMADA.map((decisao) => (
                <option key={decisao} value={decisao}>
                  {habitacao.rotuloDecisaoRetomada(decisao)}
                  {decisao === 'RESCISAO' ? ' — retira a unidade da família' : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-texto">
            Fundamentação
            <textarea
              name="fundamentacao"
              required
              rows={5}
              placeholder="Enfrente o que a defesa alegou e diga por que se decidiu assim."
              className="mt-1 w-full rounded-md border border-borda bg-surface px-3 py-2 text-base font-normal"
            />
          </label>

          <button
            type="submit"
            disabled={pendente}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-surface disabled:opacity-60"
          >
            Registrar decisão
          </button>
        </form>
      )}

      {caso.decisao && (
        <div className="rounded-lg border border-borda bg-surface p-5">
          <h3 className="text-sm font-bold text-texto">
            Decisão: {habitacao.rotuloDecisaoRetomada(caso.decisao)}
          </h3>
          <p className="tabular text-xs text-texto-suave">
            {data(caso.decididoEm)} · {caso.decididoPor}
          </p>
          <p className="mt-2 whitespace-pre-line text-sm text-texto">
            {caso.fundamentacaoDecisao}
          </p>

          {caso.decisao === 'RESCISAO' && caso.fase !== 'ENCERRADO' && (
            <p className="mt-3 rounded-md bg-warning/15 px-3 py-2 text-sm text-warning-text">
              A unidade continua com a família no sistema. Retomar a posse é ato próprio, registrado
              na página da unidade — decisão no papel não desocupa casa.
            </p>
          )}
        </div>
      )}

      {caso.fase === 'DECIDIDO' && podeInstruir && (
        <div className="rounded-lg border border-borda bg-surface p-5">
          {encerrando ? (
            <form
              className="flex flex-wrap gap-2"
              action={(formulario) =>
                rodar(
                  () =>
                    encerrarCaso(caso.id, String(formulario.get('motivo') ?? ''), caminho),
                  () => setEncerrando(false),
                )
              }
            >
              <input
                name="motivo"
                required
                placeholder="Motivo do encerramento"
                className="min-w-64 flex-1 rounded-md border border-borda px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={pendente}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-surface disabled:opacity-60"
              >
                Encerrar
              </button>
              <button
                type="button"
                onClick={() => setEncerrando(false)}
                className="rounded-md border border-borda px-4 py-2 text-sm font-semibold text-texto-suave"
              >
                Cancelar
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setEncerrando(true)}
              className="rounded-md border border-borda px-4 py-2 text-sm font-semibold text-institucional"
            >
              Encerrar processo
            </button>
          )}
        </div>
      )}

      {caso.motivoEncerramento && (
        <div className="rounded-lg border border-borda bg-background p-4">
          <p className="text-xs font-semibold text-texto-suave">
            Encerrado em {data(caso.encerradoEm)}
          </p>
          <p className="mt-1 text-sm text-texto">{caso.motivoEncerramento}</p>
        </div>
      )}
    </div>
  );
}
