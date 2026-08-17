'use client';

import { useRef, useState } from 'react';
import { usePrenderFoco } from '@/lib/foco';
import { cn } from '@/lib/cn';

/**
 * Caixa de decisão. Curta e centralizada, porque o que se decide aqui — convocar fora de ordem,
 * retomar unidade — vai nominal para a trilha e não pode ser clicado de passagem.
 */
export function Modal({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  acoes,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: React.ReactNode;
  children?: React.ReactNode;
  acoes: React.ReactNode;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  usePrenderFoco(caixa, aberto, aoFechar);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        onClick={aoFechar}
        className="animate-surgir absolute inset-0 bg-institucional-escuro/24 backdrop-blur-[2px]"
      />

      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="animate-subir relative w-full max-w-[440px] rounded-lg border border-borda bg-surface p-5 shadow-[0_18px_50px_rgba(20,51,43,0.16)]"
      >
        <h2 className="font-display text-[17px] font-extrabold text-institucional">{titulo}</h2>
        {descricao && (
          <div className="mt-1.5 text-[12.5px] leading-relaxed text-texto-suave">{descricao}</div>
        )}
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5">{acoes}</div>
      </div>
    </div>
  );
}

/**
 * Confirmação com motivo. Toda exceção à regra objetiva — convocar fora de ordem, cancelar
 * inscrição, retomar unidade — exige texto: é o que a trilha guarda e o que a pessoa assina.
 */
export function ModalConfirmacao({
  aberto,
  aoFechar,
  titulo,
  descricao,
  rotuloConfirmar,
  aviso,
  destrutivo = false,
  aoConfirmar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: React.ReactNode;
  rotuloConfirmar: string;
  aviso?: string;
  destrutivo?: boolean;
  aoConfirmar: (motivo: string) => Promise<void> | void;
}) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function confirmar() {
    if (motivo.trim().length < 10) return;
    setEnviando(true);
    try {
      await aoConfirmar(motivo.trim());
      setMotivo('');
      aoFechar();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={titulo}
      descricao={descricao}
      acoes={
        <>
          <button
            type="button"
            onClick={aoFechar}
            className="h-[38px] rounded-md border border-borda bg-surface px-4 text-[13px] font-bold text-institucional transition hover:bg-background focus:outline-none focus:ring-2 focus:ring-institucional/30"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void confirmar()}
            disabled={enviando || motivo.trim().length < 10}
            className={cn(
              'h-[38px] rounded-md px-4 text-[13px] font-bold text-surface transition',
              'disabled:cursor-not-allowed disabled:opacity-45',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              destrutivo
                ? 'bg-danger hover:bg-danger/90 focus:ring-danger/40'
                : 'bg-primary hover:bg-primary/90 focus:ring-primary/40',
            )}
          >
            {enviando ? 'Registrando…' : rotuloConfirmar}
          </button>
        </>
      }
    >
      <label htmlFor="motivo-confirmacao" className="block text-[13px] font-semibold text-texto">
        Motivo
      </label>
      <textarea
        id="motivo-confirmacao"
        value={motivo}
        onChange={(evento) => setMotivo(evento.target.value)}
        rows={3}
        placeholder="Descreva o que justifica a exceção."
        className="mt-1.5 w-full rounded-md border border-borda bg-surface px-3 py-2 text-[13px] outline-none transition focus:border-institucional focus:ring-2 focus:ring-institucional/30"
      />
      <p className="mt-1.5 text-[11.5px] text-texto-suave">
        {aviso ?? 'O motivo vai nominal para a trilha de auditoria, com o seu nome e a data.'}
      </p>
    </Modal>
  );
}
