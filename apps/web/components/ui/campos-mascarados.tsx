'use client';

import { useEffect, useState } from 'react';
import { br } from '@habita/shared';

/**
 * Campos com máscara de digitação.
 *
 * Regra de ouro: o usuário digita só o conteúdo, a máscara formata sozinha, e o valor que vai ao
 * servidor é o canônico (só dígitos). O balcão digita CPF o dia inteiro — cada ponto e traço que
 * a pessoa precisa apertar é erro esperando acontecer.
 */

interface BaseProps {
  nome: string;
  rotulo: string;
  obrigatorio?: boolean;
  ajuda?: string;
  valorInicial?: string;
}

const CLASSE_CAMPO =
  'mt-1.5 w-full rounded-md border border-borda bg-surface px-3 py-2.5 text-base outline-none transition focus:border-institucional focus:ring-2 focus:ring-institucional/30';

function Envolver({
  nome,
  rotulo,
  ajuda,
  estado,
  children,
}: BaseProps & { estado?: { tom: 'erro' | 'ok' | 'aviso'; texto: string }; children: React.ReactNode }) {
  const cores = { erro: 'text-danger', ok: 'text-success', aviso: 'text-warning-text' } as const;

  return (
    <div>
      <label htmlFor={nome} className="block text-sm font-semibold text-texto">
        {rotulo}
      </label>
      {children}
      {estado ? (
        <p className={`mt-1.5 text-xs ${cores[estado.tom]}`}>{estado.texto}</p>
      ) : (
        ajuda && <p className="mt-1.5 text-xs text-texto-suave">{ajuda}</p>
      )}
    </div>
  );
}

interface DadosCpf {
  nome: string;
  situacaoCadastral: string;
  dataNascimento: string;
}

/**
 * CPF com validação de dígito verificador e consulta ao Hub.
 *
 * A validação local roda antes de gastar uma consulta paga; o preenchimento automático é sugestão,
 * nunca imposição — o atendente confere com o documento na mão e corrige se precisar.
 */
export function CampoCpf({
  nome,
  rotulo,
  obrigatorio,
  valorInicial = '',
  onEncontrado,
  onCompleto,
}: BaseProps & {
  onEncontrado?: (dados: DadosCpf) => void;
  /** Chamado quando o CPF fica válido — é o gancho de quem retoma rascunho salvo por CPF. */
  onCompleto?: (cpf: string) => void;
}) {
  const [valor, setValor] = useState(br.maskCpf(valorInicial));
  const [estado, setEstado] = useState<{ tom: 'erro' | 'ok' | 'aviso'; texto: string }>();
  const [consultando, setConsultando] = useState(false);

  const digitos = br.onlyDigits(valor);
  const completo = digitos.length === 11;
  const valido = completo && br.isValidCpf(digitos);

  useEffect(() => {
    if (!completo) {
      setEstado(undefined);
      return;
    }
    if (!valido) {
      setEstado({ tom: 'erro', texto: 'CPF inválido — confira os dígitos.' });
      return;
    }

    onCompleto?.(digitos);

    let cancelado = false;
    setConsultando(true);
    setEstado({ tom: 'aviso', texto: 'CPF válido — consultando a Receita…' });

    fetch(`/api/integracoes/cpf/${digitos}`)
      .then((r) => r.json() as Promise<{ encontrado: boolean; motivo?: string; dados?: DadosCpf }>)
      .then((resposta) => {
        if (cancelado) return;
        if (resposta.encontrado && resposta.dados) {
          setEstado({
            tom: 'ok',
            texto: `${resposta.dados.nome} · ${resposta.dados.situacaoCadastral || 'situação não informada'}`,
          });
          onEncontrado?.(resposta.dados);
          return;
        }
        setEstado(
          resposta.motivo === 'sem_integracao'
            ? { tom: 'aviso', texto: 'Consulta externa não configurada — siga digitando.' }
            : { tom: 'aviso', texto: 'Não encontrado na base. Preencha manualmente.' },
        );
      })
      .catch(() => {
        if (!cancelado) setEstado({ tom: 'aviso', texto: 'Consulta indisponível agora.' });
      })
      .finally(() => !cancelado && setConsultando(false));

    return () => {
      cancelado = true;
    };
    // `onEncontrado` e `onCompleto` ficam fora das dependências de propósito: recriar a função no
    // componente pai não deve disparar outra consulta — ela é paga e auditada.
  }, [digitos, completo, valido]);

  return (
    <Envolver nome={nome} rotulo={rotulo} estado={estado} ajuda="Digite só os números.">
      <input
        id={nome}
        name={nome}
        inputMode="numeric"
        value={valor}
        required={obrigatorio}
        onChange={(e) => setValor(br.maskCpf(e.target.value))}
        placeholder="000.000.000-00"
        aria-busy={consultando}
        className={`tabular ${CLASSE_CAMPO} ${estado?.tom === 'erro' ? 'border-danger' : ''}`}
      />
    </Envolver>
  );
}

interface EnderecoCep {
  logradouro: string;
  bairro: string;
  municipio: string;
  uf: string;
}

/** CEP com autofill de endereço (Hub, com ViaCEP de reserva). */
export function CampoCep({
  nome,
  rotulo,
  valorInicial = '',
  onEncontrado,
}: BaseProps & { onEncontrado?: (endereco: EnderecoCep) => void }) {
  const [valor, setValor] = useState(br.maskCep(valorInicial));
  const [estado, setEstado] = useState<{ tom: 'erro' | 'ok' | 'aviso'; texto: string }>();
  const digitos = br.onlyDigits(valor);

  useEffect(() => {
    if (digitos.length !== 8) {
      setEstado(undefined);
      return;
    }

    let cancelado = false;
    fetch(`/api/integracoes/cep/${digitos}`)
      .then((r) => r.json() as Promise<{ encontrado: boolean; dados?: EnderecoCep }>)
      .then((resposta) => {
        if (cancelado) return;
        if (resposta.encontrado && resposta.dados) {
          setEstado({
            tom: 'ok',
            texto: `${resposta.dados.logradouro}, ${resposta.dados.bairro} — ${resposta.dados.municipio}/${resposta.dados.uf}`,
          });
          onEncontrado?.(resposta.dados);
        } else {
          setEstado({ tom: 'aviso', texto: 'CEP não encontrado. Preencha o endereço à mão.' });
        }
      })
      .catch(() => !cancelado && setEstado({ tom: 'aviso', texto: 'Consulta indisponível.' }));

    return () => {
      cancelado = true;
    };
    // Mesma razão do CPF: só o CEP digitado dispara a consulta.
  }, [digitos]);

  return (
    <Envolver nome={nome} rotulo={rotulo} estado={estado}>
      <input
        id={nome}
        name={nome}
        inputMode="numeric"
        value={valor}
        onChange={(e) => setValor(br.maskCep(e.target.value))}
        placeholder="00000-000"
        className={`tabular ${CLASSE_CAMPO}`}
      />
    </Envolver>
  );
}

export function CampoTelefone({ nome, rotulo, valorInicial = '' }: BaseProps) {
  const [valor, setValor] = useState(br.maskPhone(valorInicial));

  return (
    <Envolver nome={nome} rotulo={rotulo}>
      <input
        id={nome}
        name={nome}
        inputMode="tel"
        value={valor}
        onChange={(e) => setValor(br.maskPhone(e.target.value))}
        placeholder="(00) 00000-0000"
        className={`tabular ${CLASSE_CAMPO}`}
      />
    </Envolver>
  );
}

/** NIS: 11 dígitos, sem máscara visual — o número é lido em bloco no cartão. */
export function CampoNis({ nome, rotulo, ajuda, valorInicial = '' }: BaseProps) {
  const [valor, setValor] = useState(br.onlyDigits(valorInicial));

  return (
    <Envolver nome={nome} rotulo={rotulo} ajuda={ajuda}>
      <input
        id={nome}
        name={nome}
        inputMode="numeric"
        maxLength={11}
        value={valor}
        onChange={(e) => setValor(br.onlyDigits(e.target.value).slice(0, 11))}
        placeholder="00000000000"
        className={`tabular ${CLASSE_CAMPO}`}
      />
    </Envolver>
  );
}

/** Nome próprio com Title Case aplicado ao sair do campo — "MARIA DA SILVA" vira "Maria da Silva". */
export function CampoNome({ nome, rotulo, obrigatorio, valorInicial = '' }: BaseProps) {
  const [valor, setValor] = useState(valorInicial);

  return (
    <Envolver nome={nome} rotulo={rotulo}>
      <input
        id={nome}
        name={nome}
        value={valor}
        required={obrigatorio}
        onChange={(e) => setValor(e.target.value)}
        onBlur={(e) => setValor(br.tituloCaso(e.target.value))}
        placeholder="Nome completo"
        className={CLASSE_CAMPO}
      />
    </Envolver>
  );
}

/** Dinheiro com formatação ao vivo; envia o valor canônico em reais. */
export function CampoDinheiro({
  nome,
  rotulo,
  ajuda,
  valorInicial = '',
  onMudar,
}: BaseProps & { onMudar?: (valor: number) => void }) {
  const [centavos, setCentavos] = useState(() => Math.round(Number(valorInicial || 0) * 100));

  const emReais = centavos / 100;
  const formatado = emReais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Envolver nome={nome} rotulo={rotulo} ajuda={ajuda}>
      <input
        id={`${nome}-visivel`}
        inputMode="numeric"
        value={formatado}
        onChange={(e) => {
          const novos = Number(br.onlyDigits(e.target.value) || 0);
          setCentavos(novos);
          onMudar?.(novos / 100);
        }}
        className={`tabular ${CLASSE_CAMPO}`}
      />
      <input type="hidden" name={nome} value={emReais} />
    </Envolver>
  );
}
