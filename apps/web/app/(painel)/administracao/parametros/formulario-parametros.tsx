'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  criarSignatario,
  definirSalarioMinimo,
  desativarSignatario,
} from '@/app/actions/administracao';
import { Aviso } from '@/components/ui/formulario';

interface Signatario {
  id: string;
  nome: string;
  papel: string;
  cargo: string;
  ativo: boolean;
}

const PAPEIS = [
  { valor: 'PREFEITO', rotulo: 'Prefeito(a)' },
  { valor: 'VICE_PREFEITO', rotulo: 'Vice-prefeito(a)' },
  { valor: 'SECRETARIO', rotulo: 'Secretário(a)' },
  { valor: 'DIRETOR_HABITACAO', rotulo: 'Diretor(a) de Habitação' },
  { valor: 'PROCURADOR', rotulo: 'Procurador(a)' },
  { valor: 'OUTRO', rotulo: 'Outro' },
];

export function FormularioParametros({
  salarioMinimo,
  signatarios,
}: {
  salarioMinimo: number | null;
  signatarios: Signatario[];
}) {
  const [erro, setErro] = useState<string>();
  const [salvo, setSalvo] = useState(false);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  const rodar = (acao: () => Promise<{ erro?: string }>) =>
    iniciar(async () => {
      const resultado = await acao();
      setErro(resultado.erro);
      setSalvo(!resultado.erro);
      if (!resultado.erro) router.refresh();
    });

  const ativos = signatarios.filter((signatario) => signatario.ativo);

  return (
    <div className="mt-8 space-y-6">
      {erro && <Aviso tom="danger">{erro}</Aviso>}
      {salvo && !erro && <Aviso tom="info">Alteração registrada na trilha.</Aviso>}

      <section className="rounded-lg border border-borda bg-surface p-6">
        <h2 className="font-display text-lg font-bold text-institucional">
          Salário mínimo de referência
        </h2>
        <p className="mt-1 text-sm text-texto-suave">
          Alimenta as faixas de renda do modelo de critérios. Alterar aqui não mexe em versão já
          publicada — critério publicado é imutável.
        </p>
        <form
          className="mt-4 flex flex-wrap gap-3"
          action={(form) => rodar(() => definirSalarioMinimo(Number(form.get('valor') ?? 0)))}
        >
          <input
            name="valor"
            type="number"
            min={100}
            step="0.01"
            defaultValue={salarioMinimo ?? undefined}
            required
            aria-label="Salário mínimo"
            className="tabular w-48 rounded-md border border-borda px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pendente}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-surface hover:bg-primary/90 disabled:opacity-60"
          >
            Salvar
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-borda bg-surface p-6">
        <h2 className="font-display text-lg font-bold text-institucional">Signatários</h2>
        <p className="mt-1 text-sm text-texto-suave">
          Quem assina o ofício de convocação. Sem signatário ativo, o documento sai sem assinatura.
        </p>

        {ativos.length === 0 && (
          <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-text">
            Nenhum signatário ativo.
          </p>
        )}

        <ul className="mt-4 space-y-2">
          {ativos.map((signatario) => (
            <li
              key={signatario.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-background px-3 py-2"
            >
              <span className="text-sm">
                <strong>{signatario.nome}</strong> — {signatario.cargo}
              </span>
              <button
                type="button"
                disabled={pendente}
                onClick={() => rodar(() => desativarSignatario(signatario.id))}
                className="text-sm font-semibold text-danger hover:underline disabled:opacity-60"
              >
                Desativar
              </button>
            </li>
          ))}
        </ul>

        <form
          className="mt-4 grid gap-3 sm:grid-cols-[2fr_1.5fr_2fr_auto]"
          action={(form) =>
            rodar(() =>
              criarSignatario({
                nome: String(form.get('nome') ?? ''),
                papel: String(form.get('papel') ?? ''),
                cargo: String(form.get('cargo') ?? ''),
              }),
            )
          }
        >
          <input
            name="nome"
            required
            placeholder="Nome"
            aria-label="Nome do signatário"
            className="rounded-md border border-borda px-3 py-2 text-sm"
          />
          <select
            name="papel"
            aria-label="Papel"
            className="rounded-md border border-borda px-3 py-2 text-sm"
          >
            {PAPEIS.map((papel) => (
              <option key={papel.valor} value={papel.valor}>
                {papel.rotulo}
              </option>
            ))}
          </select>
          <input
            name="cargo"
            required
            placeholder="Cargo como assina"
            aria-label="Cargo"
            className="rounded-md border border-borda px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pendente}
            className="rounded-md border border-borda px-4 py-2 text-sm font-semibold text-institucional hover:bg-background disabled:opacity-60"
          >
            Adicionar
          </button>
        </form>
      </section>
    </div>
  );
}
