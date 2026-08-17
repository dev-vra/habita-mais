'use client';

import { X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';

type TomAviso = 'sucesso' | 'atencao' | 'perigo';

interface Aviso {
  id: number;
  tom: TomAviso;
  titulo: string;
  corpo?: string;
}

const DURACAO_MS = 4200;

const PONTOS: Record<TomAviso, string> = {
  sucesso: 'bg-success',
  atencao: 'bg-warning',
  perigo: 'bg-danger',
};

const Contexto = createContext<{ avisar: (aviso: Omit<Aviso, 'id'>) => void } | null>(null);

/**
 * Confirmação passageira do que acabou de acontecer ("Exceção registrada"). É retorno de ação, não
 * canal de erro grave: o que exige leitura fica na tela, em `Aviso`.
 */
export function ProvedorToast({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const avisar = useCallback((aviso: Omit<Aviso, 'id'>) => {
    const id = Date.now() + Math.random();
    setAvisos((atuais) => [...atuais, { ...aviso, id }]);
    setTimeout(() => setAvisos((atuais) => atuais.filter((item) => item.id !== id)), DURACAO_MS);
  }, []);

  const valor = useMemo(() => ({ avisar }), [avisar]);

  return (
    <Contexto.Provider value={valor}>
      {children}

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col gap-2.5"
      >
        {avisos.map((aviso) => (
          <div
            key={aviso.id}
            className="animate-entrada-lateral pointer-events-auto flex w-[328px] items-start gap-2.5 rounded-lg border border-borda bg-surface px-4 py-3 shadow-[0_10px_30px_rgba(20,51,43,0.10)]"
          >
            <span aria-hidden className={cn('mt-1.5 size-2 shrink-0 rounded-full', PONTOS[aviso.tom])} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-texto">{aviso.titulo}</p>
              {aviso.corpo && <p className="mt-0.5 text-xs text-texto-suave">{aviso.corpo}</p>}
            </div>
            <button
              type="button"
              aria-label="Fechar aviso"
              onClick={() => setAvisos((atuais) => atuais.filter((item) => item.id !== aviso.id))}
              className="shrink-0 rounded text-texto-suave transition hover:text-institucional focus:outline-none focus:ring-2 focus:ring-institucional/30"
            >
              <X size={14} strokeWidth={1.7} />
            </button>
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}

export function useToast() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useToast precisa estar dentro de <ProvedorToast>.');
  return contexto;
}
