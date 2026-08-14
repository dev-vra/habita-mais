'use client';

import { useActionState } from 'react';
import type { EstadoFormulario } from '@/app/actions/auth';
import { novaFicha } from '@/app/actions/familias';
import { CamposFicha } from '@/components/domain/campos-ficha';
import { Aviso, Botao } from '@/components/ui/formulario';

const ESTADO_INICIAL: EstadoFormulario = {};

export function FormularioFicha({ familiaId }: { familiaId: string }) {
  const [estado, acao, enviando] = useActionState(
    novaFicha.bind(null, familiaId),
    ESTADO_INICIAL,
  );

  return (
    <form action={acao} className="mt-8 rounded-lg border border-borda bg-surface p-6">
      {estado.erro && <Aviso tom="danger">{estado.erro}</Aviso>}
      <CamposFicha />
      <div className="mt-8">
        <Botao tipo="submit" carregando={enviando}>
          Gravar apuração
        </Botao>
      </div>
    </form>
  );
}
