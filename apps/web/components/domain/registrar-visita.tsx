'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { habitacao } from '@habita/shared';
import {
  rascunharParecerVisita,
  registrarAcompanhamento,
  registrarDesfechoSugestao,
  type EixoAvaliado,
} from '@/app/actions/pos-entrega';
import { Aviso } from '@/components/ui/formulario';
import { data } from '@/lib/formato';

const EIXOS = habitacao.EIXOS_TRABALHO_SOCIAL;
const SITUACOES_EIXO = ['ADEQUADA', 'ATENCAO', 'CRITICA', 'NAO_AVALIADA'] as const;

/**
 * Registro da visita de acompanhamento.
 *
 * Os quatro eixos vêm sempre preenchidos como "adequada" e o técnico rebaixa o que encontrou —
 * é mais rápido do que classificar quatro campos do zero, e evita o formulário meio vazio que
 * torna o indicador do Trabalho Social inútil na prestação de contas.
 *
 * "Titular na unidade" é a pergunta central: desmarcá-la abre o campo de quem foi encontrado, que
 * é o que sustenta qualquer apuração depois.
 */
export function RegistrarVisita({
  unidadeId,
  caminho,
  tecnicoPadrao,
  primeiraVisita,
  unidade,
  familia,
  assistenteDisponivel,
}: {
  unidadeId: string;
  caminho: string;
  tecnicoPadrao: string;
  primeiraVisita: boolean;
  unidade: string;
  familia: string;
  assistenteDisponivel: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string>();
  const [sucesso, setSucesso] = useState<string>();
  const [titularPresente, setTitularPresente] = useState(true);
  const [parecer, setParecer] = useState('');
  const [rascunho, setRascunho] = useState<{ sugestaoId: string; texto: string }>();
  const [rascunhando, setRascunhando] = useState(false);
  const [pendente, iniciar] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  /**
   * Pede o rascunho a partir do que já está preenchido no formulário.
   *
   * O texto NÃO substitui o campo sozinho: aparece ao lado, e a pessoa aproveita se quiser. Trocar
   * o conteúdo por baixo de quem está escrevendo seria a IA decidindo em vez de propor.
   */
  async function pedirRascunho() {
    const formulario = formRef.current;
    if (!formulario) return;

    setRascunhando(true);
    setErro(undefined);

    const dados = new FormData(formulario);
    const eixos: EixoAvaliado[] = EIXOS.map((eixo) => ({
      eixo,
      situacao: String(dados.get(`eixo_${eixo}`) ?? 'NAO_AVALIADA'),
      observacao: String(dados.get(`obs_${eixo}`) ?? '').trim() || undefined,
    }));

    const moradores = dados.get('moradoresEncontrados');
    const resultado = await rascunharParecerVisita({
      acompanhamentoId: unidadeId,
      unidade,
      familia,
      residenciaConfirmada: titularPresente,
      quemReside: String(dados.get('quemReside') ?? '').trim() || undefined,
      moradoresEncontrados: moradores ? Number(moradores) : undefined,
      eixos,
      anotacoes: String(dados.get('parecer') ?? '').trim() || undefined,
    });

    setRascunhando(false);
    if (resultado.erro) {
      setErro(resultado.erro);
      return;
    }
    if (resultado.dados) {
      setRascunho({ sugestaoId: resultado.dados.sugestaoId, texto: resultado.dados.texto });
    }
  }

  if (!aberto) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-surface"
        >
          Registrar visita
        </button>
        {sucesso && <p className="text-sm font-semibold text-success">{sucesso}</p>}
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      className="space-y-4 rounded-lg border border-borda bg-surface p-5"
      action={(formulario) =>
        iniciar(async () => {
          const eixos: EixoAvaliado[] = EIXOS.map((eixo) => ({
            eixo,
            situacao: String(formulario.get(`eixo_${eixo}`) ?? 'NAO_AVALIADA'),
            observacao: String(formulario.get(`obs_${eixo}`) ?? '').trim() || undefined,
          }));

          const moradores = formulario.get('moradoresEncontrados');

          const resultado = await registrarAcompanhamento(
            {
              unidadeId,
              visitadaEm: String(formulario.get('visitadaEm')),
              tipo: String(formulario.get('tipo')),
              tecnicoNome: String(formulario.get('tecnicoNome')),
              residenciaConfirmada: titularPresente,
              quemReside: String(formulario.get('quemReside') ?? '').trim() || undefined,
              moradoresEncontrados: moradores ? Number(moradores) : undefined,
              parecer: String(formulario.get('parecer')),
              eixos,
            },
            caminho,
          );

          if (resultado.erro) {
            setErro(resultado.erro);
            return;
          }

          // Fecha o ciclo do rascunho: aceito como veio, editado, ou não aproveitado.
          if (rascunho) {
            const textoSalvo = String(formulario.get('parecer') ?? '');
            const desfecho =
              textoSalvo.trim() === rascunho.texto.trim()
                ? 'ACEITA'
                : textoSalvo.includes(rascunho.texto.slice(0, 40))
                  ? 'EDITADA'
                  : 'REJEITADA';
            await registrarDesfechoSugestao(rascunho.sugestaoId, desfecho, textoSalvo);
          }

          setErro(undefined);
          setSucesso(
            `Visita ${resultado.dados?.protocolo} registrada. Próxima em ${data(resultado.dados?.proximaVisitaEm)}.`,
          );
          setAberto(false);
          router.refresh();
        })
      }
    >
      {erro && <Aviso tom="danger">{erro}</Aviso>}

      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm font-semibold text-texto">
          Data da visita
          <input
            type="date"
            name="visitadaEm"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="mt-1 w-full rounded-md border border-borda bg-surface px-3 py-2 text-base font-normal"
          />
        </label>

        <label className="text-sm font-semibold text-texto">
          Tipo
          <select
            name="tipo"
            defaultValue={primeiraVisita ? 'INICIAL' : 'PERIODICA'}
            className="mt-1 w-full rounded-md border border-borda bg-surface px-3 py-2 text-base font-normal"
          >
            {habitacao.opcoes(habitacao.TIPO_ACOMPANHAMENTO).map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-semibold text-texto">
          Técnico responsável
          <input
            name="tecnicoNome"
            required
            defaultValue={tecnicoPadrao}
            className="mt-1 w-full rounded-md border border-borda bg-surface px-3 py-2 text-base font-normal"
          />
        </label>
      </div>

      <div className="rounded-md border border-borda bg-background p-3">
        <label className="flex items-start gap-2 text-sm font-semibold text-texto">
          <input
            type="checkbox"
            checked={titularPresente}
            onChange={(evento) => setTitularPresente(evento.target.checked)}
            className="mt-1"
          />
          <span>
            O titular foi encontrado morando na unidade
            <span className="block text-xs font-normal text-texto-suave">
              É a pergunta central do pós-entrega. Desmarque se encontrou outra pessoa ou a casa
              vazia.
            </span>
          </span>
        </label>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {!titularPresente && (
            <label className="text-sm font-semibold text-texto">
              Quem foi encontrado
              <input
                name="quemReside"
                required
                placeholder="Ex.: casa vazia há 2 meses, segundo vizinhos"
                className="mt-1 w-full rounded-md border border-borda bg-surface px-3 py-2 text-base font-normal"
              />
            </label>
          )}
          <label className="text-sm font-semibold text-texto">
            Moradores encontrados
            <input
              type="number"
              name="moradoresEncontrados"
              min={0}
              max={50}
              className="tabular mt-1 w-full rounded-md border border-borda bg-surface px-3 py-2 text-base font-normal"
            />
          </label>
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-bold text-texto">Eixos do Trabalho Social</legend>
        <p className="text-xs text-texto-suave">
          Quatro eixos da Portaria MDR 464/2018. Rebaixe o que encontrou fora do adequado.
        </p>

        <div className="mt-3 space-y-2">
          {EIXOS.map((eixo) => (
            <div key={eixo} className="grid gap-2 rounded-md border border-borda p-3 md:grid-cols-[1fr_auto]">
              <div>
                <p className="text-sm font-semibold text-texto">{habitacao.rotuloEixo(eixo)}</p>
                <input
                  name={`obs_${eixo}`}
                  placeholder="Observação (opcional)"
                  className="mt-1.5 w-full rounded border border-borda px-2 py-1 text-sm"
                />
              </div>
              <select
                name={`eixo_${eixo}`}
                defaultValue="ADEQUADA"
                aria-label={`Situação do eixo ${habitacao.rotuloEixo(eixo)}`}
                className="h-9 self-start rounded-md border border-borda bg-surface px-2 text-sm"
              >
                {SITUACOES_EIXO.map((situacao) => (
                  <option key={situacao} value={situacao}>
                    {habitacao.rotuloSituacaoEixo(situacao)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </fieldset>

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="parecer" className="text-sm font-semibold text-texto">
            Parecer da visita
          </label>
          {assistenteDisponivel && (
            <button
              type="button"
              onClick={() => void pedirRascunho()}
              disabled={rascunhando || pendente}
              className="rounded-md border border-borda px-3 py-1 text-xs font-semibold text-institucional disabled:opacity-60"
            >
              {rascunhando ? 'Rascunhando…' : 'Rascunhar com IA'}
            </button>
          )}
        </div>
        <textarea
          id="parecer"
          name="parecer"
          required
          rows={5}
          value={parecer}
          onChange={(evento) => setParecer(evento.target.value)}
          placeholder="O que foi encontrado, o que foi orientado e o que ficou encaminhado."
          className="mt-1 w-full rounded-md border border-borda bg-surface px-3 py-2 text-base font-normal"
        />

        {rascunho && (
          <div className="mt-2 rounded-md border border-borda bg-background p-3">
            <p className="text-xs font-bold text-texto">{habitacao.AVISO_PADRAO.titulo}</p>
            <p className="text-xs text-texto-suave">{habitacao.AVISO_PADRAO.texto}</p>
            <p className="mt-2 whitespace-pre-line text-sm text-texto">{rascunho.texto}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setParecer(rascunho.texto)}
                className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-surface"
              >
                Usar este texto
              </button>
              <button
                type="button"
                onClick={() => setRascunho(undefined)}
                className="rounded-md border border-borda px-3 py-1 text-xs font-semibold text-texto-suave"
              >
                Descartar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-surface disabled:opacity-60"
        >
          Registrar visita
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-md border border-borda px-4 py-2 text-sm font-semibold text-texto-suave"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
