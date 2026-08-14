'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { habitacao } from '@habita/shared';
import { criarSetor, desativarSetor } from '@/app/actions/setores';
import { Aviso } from '@/components/ui/formulario';

interface Setor {
  id: string;
  nome: string;
  sigla: string;
  tipo: string;
  secretaria: string | null;
  ativo: boolean;
}

export function GestaoSetores({
  setores,
  tipos,
}: {
  setores: Setor[];
  tipos: { valor: string; rotulo: string }[];
}) {
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  const rodar = (acao: () => Promise<{ erro?: string }>) =>
    iniciar(async () => {
      const resultado = await acao();
      setErro(resultado.erro);
      if (!resultado.erro) router.refresh();
    });

  const ativos = setores.filter((setor) => setor.ativo);

  return (
    <div className="mt-8 space-y-6">
      {erro && <Aviso tom="danger">{erro}</Aviso>}

      <section className="rounded-lg border border-borda bg-surface p-6">
        <h2 className="font-display text-lg font-bold text-institucional">Novo setor</h2>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-[2fr_0.8fr_1.2fr_1.5fr_auto]"
          action={(form) =>
            rodar(() =>
              criarSetor({
                nome: String(form.get('nome') ?? ''),
                sigla: String(form.get('sigla') ?? ''),
                tipo: String(form.get('tipo') ?? ''),
                secretaria: String(form.get('secretaria') ?? '') || undefined,
              }),
            )
          }
        >
          <input
            name="nome"
            required
            placeholder="Nome do setor"
            aria-label="Nome"
            className="rounded-md border border-borda px-3 py-2 text-sm"
          />
          <input
            name="sigla"
            required
            placeholder="Sigla"
            aria-label="Sigla"
            className="rounded-md border border-borda px-3 py-2 text-sm uppercase"
          />
          <select
            name="tipo"
            aria-label="Tipo"
            className="rounded-md border border-borda px-3 py-2 text-sm"
          >
            {tipos.map((tipo) => (
              <option key={tipo.valor} value={tipo.valor}>
                {tipo.rotulo}
              </option>
            ))}
          </select>
          <input
            name="secretaria"
            placeholder="Secretaria (opcional)"
            aria-label="Secretaria"
            className="rounded-md border border-borda px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={pendente}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-surface hover:bg-primary/90 disabled:opacity-60"
          >
            Criar
          </button>
        </form>
      </section>

      <ul className="space-y-2">
        {ativos.map((setor) => (
          <li
            key={setor.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-borda bg-surface px-5 py-3"
          >
            <span>
              <span className="font-semibold text-texto">
                {setor.sigla} — {setor.nome}
              </span>
              <span className="block text-xs text-texto-suave">
                {habitacao.rotuloTipoSetor(setor.tipo)}
                {setor.secretaria && ` · ${setor.secretaria}`}
              </span>
            </span>
            <button
              type="button"
              disabled={pendente}
              onClick={() => rodar(() => desativarSetor(setor.id))}
              className="text-sm font-semibold text-danger hover:underline disabled:opacity-60"
            >
              Desativar
            </button>
          </li>
        ))}
      </ul>

      {ativos.length === 0 && (
        <p className="text-center text-texto-suave">
          Nenhum setor cadastrado. Comece pelo setor de Habitação — ele é a origem dos
          encaminhamentos.
        </p>
      )}
    </div>
  );
}
