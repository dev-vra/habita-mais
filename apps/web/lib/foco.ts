'use client';

import { useEffect, type RefObject } from 'react';

const FOCAVEIS =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Prende o foco dentro de uma sobreposição e devolve ao gatilho quando fecha.
 *
 * Sem isso, o Tab escapa do modal para a lista atrás e o servidor confirma uma retomada achando
 * que está preenchendo o motivo. `Esc` fecha em todas — é o que a mão já espera.
 */
export function usePrenderFoco(
  referencia: RefObject<HTMLElement | null>,
  aberto: boolean,
  aoFechar: () => void,
): void {
  useEffect(() => {
    if (!aberto) return;

    const gatilho = document.activeElement as HTMLElement | null;
    const caixa = referencia.current;
    caixa?.querySelector<HTMLElement>(FOCAVEIS)?.focus();

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.stopPropagation();
        aoFechar();
        return;
      }

      if (evento.key !== 'Tab' || !caixa) return;

      const alvos = Array.from(caixa.querySelectorAll<HTMLElement>(FOCAVEIS));
      if (alvos.length === 0) return;

      const primeiro = alvos[0];
      const ultimo = alvos[alvos.length - 1];
      if (!primeiro || !ultimo) return;
      const atual = document.activeElement;

      if (evento.shiftKey && atual === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && atual === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      gatilho?.focus();
    };
  }, [aberto, aoFechar, referencia]);
}
