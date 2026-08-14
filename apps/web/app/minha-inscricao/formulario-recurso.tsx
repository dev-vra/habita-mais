'use client';

import { useActionState } from 'react';
import type { EstadoFormulario } from '@/app/actions/auth';
import { interporRecursoMunicipe } from '@/app/actions/municipe';
import { Aviso, Botao } from '@/components/ui/formulario';

const ESTADO_INICIAL: EstadoFormulario = {};

/** Recurso pela central: canal formal de contestação, sem depender de ir ao balcão (spec §8). */
export function FormularioRecurso() {
  const [estado, acao, enviando] = useActionState(interporRecursoMunicipe, ESTADO_INICIAL);

  return (
    <form action={acao} className="mt-3 space-y-3">
      {estado.erro && <Aviso tom="danger">{estado.erro}</Aviso>}

      <label htmlFor="motivo" className="block text-sm text-texto">
        Conte o que você acha que está errado na sua classificação. A prefeitura responde por
        escrito, com fundamentação.
      </label>
      <textarea
        id="motivo"
        name="motivo"
        rows={4}
        required
        minLength={20}
        className="w-full rounded-md border border-borda bg-surface px-3 py-2 text-base outline-none focus:border-institucional focus:ring-2 focus:ring-institucional/30"
      />

      <Botao tipo="submit" carregando={enviando}>
        Enviar recurso
      </Botao>
    </form>
  );
}
