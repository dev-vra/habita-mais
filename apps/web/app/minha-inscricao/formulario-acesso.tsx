'use client';

import { useActionState } from 'react';
import type { EstadoFormulario } from '@/app/actions/auth';
import { entrarMunicipe } from '@/app/actions/municipe';
import { Aviso, Botao, CampoSelecao, CampoTexto } from '@/components/ui/formulario';

const ESTADO_INICIAL: EstadoFormulario = {};

export function FormularioAcesso({
  municipios,
}: {
  municipios: { id: string; municipio: string; uf: string }[];
}) {
  const [estado, acao, enviando] = useActionState(entrarMunicipe, ESTADO_INICIAL);

  return (
    <form action={acao} className="mt-8 space-y-5">
      {estado.erro && <Aviso tom="danger">{estado.erro}</Aviso>}

      {municipios.length > 1 ? (
        <CampoSelecao
          nome="tenantId"
          rotulo="Município"
          opcoes={municipios.map((municipio) => ({
            valor: municipio.id,
            rotulo: `${municipio.municipio} — ${municipio.uf}`,
          }))}
        />
      ) : (
        <input type="hidden" name="tenantId" value={municipios[0]?.id ?? ''} />
      )}

      <CampoTexto
        nome="protocolo"
        rotulo="Número do protocolo"
        placeholder="HAB-2026/00418"
        obrigatorio
      />
      <CampoTexto
        nome="cpf"
        rotulo="CPF do responsável familiar"
        placeholder="000.000.000-00"
        obrigatorio
      />

      <Botao tipo="submit" carregando={enviando}>
        Consultar
      </Botao>
    </form>
  );
}
