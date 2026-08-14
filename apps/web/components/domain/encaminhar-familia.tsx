'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { habitacao } from '@habita/shared';
import { abrirEncaminhamento } from '@/app/actions/encaminhamentos';
import { Aviso } from '@/components/ui/formulario';

/**
 * Encaminhar a família a outro setor.
 *
 * O resumo já vem preenchido com o que o outro setor precisa saber — e é editável, porque quem
 * encaminha sabe o que o destino precisa ler. O que for escrito aqui é TUDO que o setor externo
 * vai ver: ele não abre a ficha social.
 */
export function EncaminharFamilia({
  familiaId,
  resumoSugerido,
  setores,
}: {
  familiaId: string;
  resumoSugerido: string;
  setores: { id: string; nome: string; sigla: string; tipo: string }[];
}) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  const destinos = setores.filter((setor) => setor.tipo !== 'HABITACAO');
  if (destinos.length === 0) {
    return (
      <p className="text-sm text-texto-suave">
        Cadastre os setores do município para poder encaminhar.
      </p>
    );
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-md border border-borda px-3 py-1.5 text-sm font-semibold text-institucional hover:bg-background"
      >
        Encaminhar a outro setor
      </button>
    );
  }

  return (
    <form
      className="space-y-3"
      action={(form) =>
        iniciar(async () => {
          const resultado = await abrirEncaminhamento({
            setorDestinoId: String(form.get('setorDestinoId') ?? ''),
            tipoSolicitacao: String(form.get('tipoSolicitacao') ?? ''),
            entidade: 'Familia',
            entidadeId: familiaId,
            referenciaResumo: String(form.get('referenciaResumo') ?? ''),
            assunto: String(form.get('assunto') ?? ''),
            descricao: String(form.get('descricao') ?? ''),
            prazoAte: String(form.get('prazoAte') ?? ''),
          });
          setErro(resultado.erro);
          if (!resultado.erro) {
            setAberto(false);
            router.push('/encaminhamentos');
          }
        })
      }
    >
      {erro && <Aviso tom="danger">{erro}</Aviso>}

      <div className="grid gap-2 sm:grid-cols-2">
        <select
          name="setorDestinoId"
          aria-label="Setor de destino"
          className="rounded-md border border-borda px-2.5 py-1.5 text-sm"
        >
          {destinos.map((setor) => (
            <option key={setor.id} value={setor.id}>
              {setor.sigla} — {setor.nome}
            </option>
          ))}
        </select>
        <select
          name="tipoSolicitacao"
          aria-label="Tipo de solicitação"
          className="rounded-md border border-borda px-2.5 py-1.5 text-sm"
        >
          {habitacao.opcoes(habitacao.TIPO_SOLICITACAO).map((tipo) => (
            <option key={tipo.valor} value={tipo.valor}>
              {tipo.rotulo}
            </option>
          ))}
        </select>
      </div>

      <input
        name="assunto"
        required
        placeholder="Assunto"
        aria-label="Assunto"
        className="w-full rounded-md border border-borda px-2.5 py-1.5 text-sm"
      />
      <textarea
        name="referenciaResumo"
        required
        rows={2}
        defaultValue={resumoSugerido}
        aria-label="Resumo do caso"
        className="w-full rounded-md border border-borda px-2.5 py-1.5 text-sm"
      />
      <p className="text-xs text-texto-suave">
        O texto acima é tudo que o outro setor enxerga desta família.
      </p>
      <textarea
        name="descricao"
        required
        rows={2}
        placeholder="O que está sendo pedido"
        aria-label="Descrição"
        className="w-full rounded-md border border-borda px-2.5 py-1.5 text-sm"
      />
      <input
        name="prazoAte"
        type="date"
        required
        aria-label="Prazo"
        className="rounded-md border border-borda px-2.5 py-1.5 text-sm"
      />

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-surface hover:bg-primary/90 disabled:opacity-60"
        >
          Encaminhar
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-md border border-borda px-3 py-1.5 text-sm font-semibold text-institucional"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
