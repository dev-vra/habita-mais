'use client';

import { useActionState, useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { habitacao } from '@habita/shared';
import { cadastrarFamilia } from '@/app/actions/familias';
import type { EstadoFormulario } from '@/app/actions/auth';
import { CamposFicha } from '@/components/domain/campos-ficha';
import { Aviso, CampoData, CampoSelecao, CampoTexto } from '@/components/ui/formulario';
import {
  CampoCep,
  CampoCpf,
  CampoNis,
  CampoNome,
  CampoTelefone,
} from '@/components/ui/campos-mascarados';
import { Stepper } from '@/components/ui/stepper';
import { cn } from '@/lib/cn';
import { formatarNota, formatarReais } from '@/lib/status';

const ESTADO_INICIAL: EstadoFormulario = {};

const ETAPAS = [
  { rotulo: 'Responsável', essenciais: ['cpf', 'nome'] },
  { rotulo: 'Endereço', essenciais: ['cep', 'logradouro', 'numero'] },
  { rotulo: 'Composição', essenciais: [] },
  { rotulo: 'Ficha social', essenciais: ['rendaFamiliar'] },
  { rotulo: 'Revisão', essenciais: [] },
];

const PARENTESCOS = [
  'CONJUGE',
  'FILHO',
  'FILHA',
  'PAI',
  'MAE',
  'IRMAO',
  'IRMA',
  'NETO',
  'NETA',
  'AVO',
  'OUTRO',
];

interface Membro {
  id: number;
  nome: string;
  parentesco: string;
  idade: string;
  pcd: boolean;
}

/** Converte "dd/mm/aaaa" do Hub para o formato do input date. */
function paraInputData(valor: string): string {
  const partes = valor.split('/');
  return partes.length === 3 ? `${partes[2]}-${partes[1]}-${partes[0]}` : '';
}

/**
 * Cadastro em cinco etapas.
 *
 * Um formulário só, do começo ao fim: as etapas escondem, não desmontam. Perder o que já foi
 * digitado porque o servidor voltou uma etapa é o tipo de coisa que faz o balcão pedir papel de
 * volta. Pela mesma razão a validação de formato (CPF, data) bloqueia o avanço, mas campo
 * obrigatório vazio só marca a etapa no stepper — o atendimento continua, e a pendência aparece.
 *
 * Os `name` enviados à `cadastrarFamilia` são exatamente os de antes: o redesenho muda a ordem em
 * que se pergunta, não o que se pergunta.
 */
export function FormularioFamilia({ salarioMinimo }: { salarioMinimo: number | null }) {
  const [estado, acao, enviando] = useActionState(cadastrarFamilia, ESTADO_INICIAL);
  const [etapa, setEtapa] = useState(0);
  const [nome, setNome] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [endereco, setEndereco] = useState({ logradouro: '', bairro: '', municipio: '', uf: '' });
  const [membros, setMembros] = useState<Membro[]>([]);
  const [renda, setRenda] = useState(0);
  const [faltando, setFaltando] = useState<Record<number, boolean>>({});
  const [rascunho, setRascunho] = useState<{ salvoEm?: string; sujo: boolean }>({ sujo: false });
  const formulario = useRef<HTMLFormElement>(null);

  const pessoas = 1 + membros.length;
  const menores = membros.filter((membro) => Number(membro.idade) > 0 && Number(membro.idade) < 18).length;
  const perCapita = pessoas > 0 ? renda / pessoas : 0;
  const referencia = salarioMinimo ?? 1600;

  const [previsao, setPrevisao] = useState<{ total: number; maximo: number; itens: string[] }>({
    total: 0,
    maximo: 0,
    itens: [],
  });

  const recalcular = useCallback(() => {
    const campo = formulario.current;
    if (!campo) return;

    const dados = new FormData(campo);
    const marcado = (nomeCampo: string) => dados.get(nomeCampo) === 'sim';

    // O motor é o mesmo do servidor (@habita/shared) — a tela não tem regra de pontuação própria.
    // O que muda é a versão de critério: aqui é a de referência, e a faixa de resumo diz isso.
    const calculada = habitacao.calcularPontuacao(
      habitacao.versaoCriterioReferencia(referencia, new Date().toISOString()),
      {
        rendaPerCapita: pessoas > 0 ? Number(dados.get('rendaFamiliar') ?? 0) / pessoas : 0,
        mesesResidenciaMunicipio: Number(dados.get('mesesResidenciaMunicipio') ?? 0),
        mesesInscricao: 0,
        quantidadeMenores: Number(dados.get('quantidadeMenores') ?? 0),
        temPessoaComDeficiencia: marcado('temPessoaComDeficiencia'),
        temIdoso: marcado('temIdoso'),
        mulherChefeFamilia: marcado('mulherChefeFamilia'),
        moradiaInadequada: marcado('moradiaInadequada'),
        situacaoRisco: marcado('situacaoRisco'),
        laudoRiscoRegistrado: !!dados.get('laudoRiscoKey'),
      },
      new Date().toISOString(),
    );

    setPrevisao({
      total: calculada.total,
      maximo: calculada.totalMaximo,
      itens: calculada.itens.filter((item) => item.pontos > 0).map((item) => item.rotulo),
    });

    setFaltando(
      Object.fromEntries(
        ETAPAS.map((passo, indice) => [
          indice,
          passo.essenciais.some((campoEssencial) => !String(dados.get(campoEssencial) ?? '').trim()),
        ]),
      ),
    );
  }, [pessoas, referencia]);

  useEffect(() => recalcular(), [recalcular, membros]);

  function salvarRascunho() {
    const campo = formulario.current;
    if (!campo) return;

    const dados = new FormData(campo);
    const cpf = String(dados.get('cpf') ?? '').replace(/\D/g, '');
    if (cpf.length !== 11) return;

    const valores: Record<string, string[]> = {};
    for (const [chave, valor] of dados.entries()) {
      if (typeof valor !== 'string') continue;
      valores[chave] = [...(valores[chave] ?? []), valor];
    }

    const salvoEm = new Date().toLocaleDateString('pt-BR');
    localStorage.setItem(
      `habita.rascunho.${cpf}`,
      JSON.stringify({ valores, membros, salvoEm }),
    );
    setRascunho({ salvoEm, sujo: false });
  }

  /** Retoma o que ficou pela metade — o mesmo CPF voltando ao balcão não redigita a ficha. */
  function retomarRascunho(cpf: string) {
    const bruto = localStorage.getItem(`habita.rascunho.${cpf}`);
    const campo = formulario.current;
    if (!bruto || !campo) return;

    const salvo = JSON.parse(bruto) as {
      valores: Record<string, string[]>;
      membros: Membro[];
      salvoEm: string;
    };

    for (const [chave, lista] of Object.entries(salvo.valores)) {
      const elementos = campo.elements.namedItem(chave);
      if (!elementos) continue;

      const alvos =
        elementos instanceof RadioNodeList ? Array.from(elementos) : [elementos as HTMLElement];

      for (const alvo of alvos) {
        if (alvo instanceof HTMLInputElement && (alvo.type === 'checkbox' || alvo.type === 'radio')) {
          alvo.checked = lista.includes(alvo.value);
        } else if (
          alvo instanceof HTMLInputElement ||
          alvo instanceof HTMLSelectElement ||
          alvo instanceof HTMLTextAreaElement
        ) {
          alvo.value = lista[0] ?? '';
        }
      }
    }

    setMembros(salvo.membros ?? []);
    setRascunho({ salvoEm: salvo.salvoEm, sujo: false });
    recalcular();
  }

  return (
    <form
      ref={formulario}
      action={acao}
      noValidate
      onChange={() => {
        setRascunho((atual) => ({ ...atual, sujo: true }));
        recalcular();
      }}
      onSubmit={() => {
        const cpf = String(new FormData(formulario.current ?? undefined).get('cpf') ?? '').replace(
          /\D/g,
          '',
        );
        if (cpf) localStorage.removeItem(`habita.rascunho.${cpf}`);
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PillRascunho salvoEm={rascunho.salvoEm} sujo={rascunho.sujo} />
        <button
          type="button"
          onClick={salvarRascunho}
          className="h-9 rounded-md border border-borda bg-surface px-3.5 text-[12.5px] font-bold text-institucional transition hover:bg-background focus:outline-none focus:ring-2 focus:ring-institucional/30"
        >
          Salvar rascunho
        </button>
      </div>

      <div className="mt-5">
        <Stepper
          etapas={ETAPAS.map((passo, indice) => ({
            rotulo: passo.rotulo,
            atencao: indice !== etapa && faltando[indice],
          }))}
          atual={etapa}
          aoIr={setEtapa}
        />
      </div>

      {estado.erro && (
        <div className="mt-5">
          <Aviso tom="danger">{estado.erro}</Aviso>
        </div>
      )}

      <div className="mt-5 rounded-lg border border-borda bg-surface p-5">
        <div hidden={etapa !== 0}>
          <h2 className="font-display text-[15.5px] font-bold text-institucional">Responsável familiar</h2>
          <p className="mt-1 text-[12.5px] text-texto-suave">
            Digite o CPF: o sistema consulta a Receita e preenche o que puder. Confira com o
            documento na mão — a consulta sugere, você valida.
          </p>

          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <CampoCpf
                nome="cpf"
                rotulo="CPF"
                obrigatorio
                onEncontrado={(dados) => {
                  if (dados.nome) setNome(dados.nome);
                  if (dados.dataNascimento) setNascimento(paraInputData(dados.dataNascimento));
                }}
                onCompleto={retomarRascunho}
              />
              <CampoNome key={nome} nome="nome" rotulo="Nome completo" obrigatorio valorInicial={nome} />
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <CampoData key={nascimento} nome="nascimento" rotulo="Nascimento" valorInicial={nascimento} />
              <CampoSelecao nome="sexo" rotulo="Sexo" opcoes={habitacao.opcoes(habitacao.SEXO)} />
              <CampoSelecao
                nome="estadoCivil"
                rotulo="Estado civil"
                opcoes={habitacao.opcoes(habitacao.ESTADO_CIVIL)}
              />
              <CampoNis nome="nisResponsavel" rotulo="NIS" ajuda="Declarado, não verificado." />
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <CampoNome nome="nomeMae" rotulo="Nome da mãe" />
              <CampoNome nome="nomePai" rotulo="Nome do pai" />
              <CampoTexto nome="rg" rotulo="RG" />
              <CampoTexto nome="orgaoExpedidor" rotulo="Órgão expedidor" />
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <CampoTelefone nome="telefone" rotulo="Telefone" />
              <CampoTexto nome="profissao" rotulo="Profissão" />
              <CampoSelecao
                nome="escolaridade"
                rotulo="Escolaridade"
                opcoes={habitacao.opcoes(habitacao.ESCOLARIDADE)}
              />
              <CampoSelecao
                nome="situacaoTrabalho"
                rotulo="Situação de trabalho"
                opcoes={habitacao.opcoes(habitacao.SITUACAO_TRABALHO)}
              />
            </div>
          </div>
        </div>

        <div hidden={etapa !== 1}>
          <h2 className="font-display text-[15.5px] font-bold text-institucional">Endereço atual</h2>
          <p className="mt-1 text-[12.5px] text-texto-suave">
            É por aqui que a visita domiciliar e a Defesa Civil chegam na casa.
          </p>

          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_2fr_0.6fr]">
              <CampoCep nome="cep" rotulo="CEP" onEncontrado={setEndereco} />
              <CampoTexto key={endereco.logradouro} nome="logradouro" rotulo="Logradouro" />
              <CampoTexto nome="numero" rotulo="Número" />
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <CampoTexto nome="complemento" rotulo="Complemento" />
              <CampoTexto key={endereco.bairro} nome="bairro" rotulo="Bairro" />
              <CampoTexto key={endereco.municipio} nome="municipio" rotulo="Município" />
              <CampoTexto nome="referencia" rotulo="Ponto de referência" />
            </div>
          </div>
        </div>

        <div hidden={etapa !== 2}>
          <h2 className="font-display text-[15.5px] font-bold text-institucional">
            Quem mora no domicílio
          </h2>
          <p className="mt-1 text-[12.5px] text-texto-suave">
            A composição define a renda per capita e os pontos por menores no domicílio. O
            responsável já está contado.
          </p>

          <ul className="mt-4 space-y-2">
            {membros.map((membro) => (
              <li
                key={membro.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-borda p-3"
              >
                <span
                  aria-hidden
                  className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-institucional/10 text-[11px] font-bold text-institucional"
                >
                  {iniciais(membro.nome)}
                </span>

                <input
                  value={membro.nome}
                  onChange={(evento) => atualizar(setMembros, membro.id, { nome: evento.target.value })}
                  placeholder="Nome"
                  aria-label="Nome da pessoa"
                  className="min-w-[160px] flex-1 rounded-md border border-borda px-2.5 py-1.5 text-[13.5px] font-semibold outline-none focus:border-institucional focus:ring-2 focus:ring-institucional/30"
                />

                <select
                  value={membro.parentesco}
                  onChange={(evento) =>
                    atualizar(setMembros, membro.id, { parentesco: evento.target.value })
                  }
                  aria-label="Parentesco"
                  className="rounded-md border border-borda px-2.5 py-1.5 text-[12.5px] outline-none focus:border-institucional focus:ring-2 focus:ring-institucional/30"
                >
                  {PARENTESCOS.map((parentesco) => (
                    <option key={parentesco} value={parentesco}>
                      {parentesco.charAt(0) + parentesco.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>

                <input
                  value={membro.idade}
                  onChange={(evento) =>
                    atualizar(setMembros, membro.id, { idade: evento.target.value.replace(/\D/g, '') })
                  }
                  placeholder="Idade"
                  inputMode="numeric"
                  aria-label="Idade"
                  className="tabular w-16 rounded-md border border-borda px-2.5 py-1.5 text-[12.5px] outline-none focus:border-institucional focus:ring-2 focus:ring-institucional/30"
                />

                <label className="flex items-center gap-1.5 text-[12.5px] text-texto">
                  <input
                    type="checkbox"
                    checked={membro.pcd}
                    onChange={(evento) => atualizar(setMembros, membro.id, { pcd: evento.target.checked })}
                    className="size-4 rounded border-borda text-primary"
                  />
                  PcD
                </label>

                <button
                  type="button"
                  aria-label={`Remover ${membro.nome || 'pessoa'}`}
                  onClick={() => setMembros((atual) => atual.filter((outro) => outro.id !== membro.id))}
                  className="rounded p-1 text-texto-suave transition hover:text-danger focus:outline-none focus:ring-2 focus:ring-institucional/30"
                >
                  <Trash2 size={15} strokeWidth={1.7} />
                </button>
              </li>
            ))}
          </ul>

          {membros.length === 0 && (
            <p className="mt-4 rounded-lg border border-dashed border-borda px-4 py-6 text-center text-[12.5px] text-texto-suave">
              Só o responsável no domicílio.
            </p>
          )}

          <button
            type="button"
            onClick={() =>
              setMembros((atual) => [
                ...atual,
                { id: atual.length + Date.now(), nome: '', parentesco: 'FILHO', idade: '', pcd: false },
              ])
            }
            className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-md border border-borda bg-surface px-3.5 text-[12.5px] font-bold text-institucional transition hover:bg-background focus:outline-none focus:ring-2 focus:ring-institucional/30"
          >
            <Plus size={15} strokeWidth={2} aria-hidden />
            Adicionar pessoa
          </button>

          <p className="mt-4 text-[11.5px] text-texto-suave">
            A composição nominal com CPF de cada pessoa é registrada depois, na ficha da família —
            aqui ela conta pessoas e menores, que é o que a pontuação usa.
          </p>
        </div>

        <div hidden={etapa !== 3}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-borda bg-background/50 p-4">
              <p className="text-[12.5px] text-texto-suave">Renda per capita</p>
              <p className="tabular mt-0.5 font-display text-[22px] font-extrabold text-institucional">
                {formatarReais(perCapita)}
              </p>
              <p className="mt-1 text-[11.5px] text-texto-suave">
                {formatarReais(renda)} ÷ {pessoas} {pessoas === 1 ? 'pessoa' : 'pessoas'}
              </p>
            </div>

            <div className="rounded-lg border border-borda bg-background/50 p-4">
              <p className="text-[12.5px] text-texto-suave">Enquadramento</p>
              <p
                className={cn(
                  'mt-0.5 font-display text-[22px] font-extrabold',
                  perCapita > referencia ? 'text-warning-text' : 'text-institucional',
                )}
              >
                {enquadramento(perCapita, referencia).titulo}
              </p>
              <p className="mt-1 text-[11.5px] text-texto-suave">
                {enquadramento(perCapita, referencia).nota} · salário mínimo de{' '}
                <span className="tabular">{formatarReais(referencia)}</span>
              </p>
            </div>
          </div>

          <div className="mt-5">
            <CamposFicha
              salarioMinimo={salarioMinimo}
              pessoasControladas={pessoas}
              menoresSugeridos={menores}
              aoMudarRenda={setRenda}
            />
          </div>

          <div className="mt-6 rounded-lg bg-institucional/8 p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[12.5px] text-texto-suave">Pontuação prevista</p>
                <p className="tabular mt-0.5 font-display text-[27px] font-extrabold leading-none text-institucional">
                  {formatarNota(previsao.total)}
                </p>
              </div>
              <p className="tabular text-[11.5px] text-texto-suave">
                de {formatarNota(previsao.maximo)} pontos possíveis
              </p>
            </div>

            <div aria-hidden className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-institucional-claro transition-[width] duration-500"
                style={{ width: `${previsao.maximo > 0 ? (previsao.total / previsao.maximo) * 100 : 0}%` }}
              />
            </div>

            {previsao.itens.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {previsao.itens.map((item) => (
                  <li
                    key={item}
                    className="rounded-full bg-primary/10 px-2.5 py-1 text-[11.5px] font-semibold text-primary"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-3 text-[11.5px] text-texto-suave">
              Previsão pelo modelo de referência. A classificação final depende da versão de
              critérios publicada pelo programa em que a família for inscrita.
            </p>
          </div>
        </div>

        <div hidden={etapa !== 4}>
          <h2 className="font-display text-[15.5px] font-bold text-institucional">Revisão</h2>
          <p className="mt-1 text-[12.5px] text-texto-suave">
            Confira antes de cadastrar. O documento da família é anexado depois, na ficha — é lá que
            ele fica ligado ao protocolo.
          </p>

          <Revisao formulario={formulario} pessoas={pessoas} aoEditar={setEtapa} visivel={etapa === 4} />
        </div>
      </div>

      <div className="sticky bottom-0 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-borda bg-background/92 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => setEtapa((atual) => Math.max(atual - 1, 0))}
          disabled={etapa === 0}
          className="h-[38px] rounded-md border border-borda bg-surface px-4 text-[13px] font-bold text-institucional transition hover:bg-background disabled:opacity-45"
        >
          Voltar
        </button>

        <p className="tabular text-[12.5px] text-texto-suave">
          Etapa {etapa + 1} de {ETAPAS.length}
        </p>

        {etapa < ETAPAS.length - 1 ? (
          <button
            type="button"
            onClick={() => setEtapa((atual) => Math.min(atual + 1, ETAPAS.length - 1))}
            className="h-[38px] rounded-md bg-primary px-4 text-[13px] font-bold text-surface transition hover:-translate-y-px hover:bg-primary/90 active:translate-y-0"
          >
            Continuar
          </button>
        ) : (
          <button
            type="submit"
            disabled={enviando}
            className="h-[38px] rounded-md bg-primary px-4 text-[13px] font-bold text-surface transition hover:-translate-y-px hover:bg-primary/90 active:translate-y-0 disabled:opacity-45"
          >
            {enviando ? 'Cadastrando…' : 'Cadastrar família'}
          </button>
        )}
      </div>
    </form>
  );
}

function PillRascunho({ salvoEm, sujo }: { salvoEm?: string; sujo: boolean }) {
  const alterado = sujo || !salvoEm;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        alterado ? 'bg-warning/15 text-warning-text' : 'bg-success/10 text-success',
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', alterado ? 'bg-warning' : 'bg-success')} />
      {alterado ? 'Alterações não salvas' : `Rascunho salvo ${salvoEm}`}
    </span>
  );
}

/** Tabela de conferência: o que foi preenchido, com salto direto para a etapa que o preencheu. */
function Revisao({
  formulario,
  pessoas,
  aoEditar,
  visivel,
}: {
  formulario: React.RefObject<HTMLFormElement | null>;
  pessoas: number;
  aoEditar: (etapa: number) => void;
  visivel: boolean;
}) {
  const [linhas, setLinhas] = useState<{ rotulo: string; valor: string; etapa: number }[]>([]);

  useEffect(() => {
    if (!visivel || !formulario.current) return;
    const dados = new FormData(formulario.current);
    const ler = (campo: string) => String(dados.get(campo) ?? '').trim() || '—';

    setLinhas([
      { rotulo: 'CPF', valor: ler('cpf'), etapa: 0 },
      { rotulo: 'Nome', valor: ler('nome'), etapa: 0 },
      { rotulo: 'Nascimento', valor: ler('nascimento'), etapa: 0 },
      { rotulo: 'Telefone', valor: ler('telefone'), etapa: 0 },
      {
        rotulo: 'Endereço',
        valor: [ler('logradouro'), ler('numero'), ler('bairro')].filter((p) => p !== '—').join(', ') || '—',
        etapa: 1,
      },
      { rotulo: 'Composição', valor: `${pessoas} ${pessoas === 1 ? 'pessoa' : 'pessoas'}`, etapa: 2 },
      { rotulo: 'Renda familiar', valor: formatarReais(Number(dados.get('rendaFamiliar') ?? 0)), etapa: 3 },
      { rotulo: 'Moradia atual', valor: ler('tipoMoradia'), etapa: 3 },
      { rotulo: 'Ficha válida até', valor: ler('validaAte'), etapa: 3 },
    ]);
  }, [visivel, formulario, pessoas]);

  return (
    <dl className="mt-4">
      {linhas.map((linha) => (
        <div key={linha.rotulo} className="flex items-center gap-3 border-b border-borda py-2.5">
          <dt className="w-[152px] shrink-0 text-xs text-texto-suave">{linha.rotulo}</dt>
          <dd className="tabular min-w-0 flex-1 truncate text-[13px] text-texto">{linha.valor}</dd>
          <button
            type="button"
            onClick={() => aoEditar(linha.etapa)}
            className="shrink-0 rounded text-[12.5px] font-semibold text-primary underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            editar
          </button>
        </div>
      ))}
    </dl>
  );
}

function atualizar(
  definir: React.Dispatch<React.SetStateAction<Membro[]>>,
  id: number,
  mudanca: Partial<Membro>,
) {
  definir((atual) => atual.map((membro) => (membro.id === id ? { ...membro, ...mudanca } : membro)));
}

function enquadramento(perCapita: number, salarioMinimo: number) {
  if (perCapita <= salarioMinimo / 4) {
    return { titulo: 'Faixa 1 · elegível', nota: 'até ¼ do salário mínimo' };
  }
  if (perCapita <= salarioMinimo / 2) {
    return { titulo: 'Faixa 2', nota: 'entre ¼ e ½ salário mínimo' };
  }
  if (perCapita <= salarioMinimo) {
    return { titulo: 'Faixa 3', nota: 'entre ½ e 1 salário mínimo' };
  }
  return { titulo: 'Fora do limite', nota: 'acima de 1 salário mínimo' };
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? '') : '')).toUpperCase();
}
