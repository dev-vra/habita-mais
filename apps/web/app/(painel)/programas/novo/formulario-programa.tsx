'use client';

import { useActionState } from 'react';
import type { EstadoFormulario } from '@/app/actions/auth';
import { criarPrograma } from '@/app/actions/programas';
import { Aviso, Botao, CampoData, CampoNumero, CampoTexto } from '@/components/ui/formulario';

const ESTADO_INICIAL: EstadoFormulario = {};

export function FormularioPrograma() {
  const [estado, acao, enviando] = useActionState(criarPrograma, ESTADO_INICIAL);

  return (
    <form action={acao} className="mt-8 space-y-5 rounded-lg border border-borda bg-surface p-6">
      {estado.erro && <Aviso tom="danger">{estado.erro}</Aviso>}

      <CampoTexto nome="nome" rotulo="Nome do programa" obrigatorio />
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto
          nome="fonteRecurso"
          rotulo="Fonte do recurso"
          placeholder="FAR / Caixa Econômica Federal"
          obrigatorio
        />
        <CampoNumero nome="vagas" rotulo="Unidades previstas" min={1} valorInicial={1} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoData nome="inscricaoInicio" rotulo="Início das inscrições" />
        <CampoData nome="inscricaoFim" rotulo="Fim das inscrições" />
      </div>

      <Botao tipo="submit" carregando={enviando}>
        Criar programa
      </Botao>
    </form>
  );
}
