'use client';

import { useActionState } from 'react';
import { cadastrarFamilia } from '@/app/actions/familias';
import type { EstadoFormulario } from '@/app/actions/auth';
import { CamposFicha } from '@/components/domain/campos-ficha';
import { Aviso, Botao, CampoData, CampoSelecao, CampoTexto } from '@/components/ui/formulario';

const ESTADO_INICIAL: EstadoFormulario = {};

const SEXOS = [
  { valor: 'FEMININO', rotulo: 'Feminino' },
  { valor: 'MASCULINO', rotulo: 'Masculino' },
  { valor: 'NAO_INFORMADO', rotulo: 'Não informado' },
];

export function FormularioFamilia() {
  const [estado, acao, enviando] = useActionState(cadastrarFamilia, ESTADO_INICIAL);

  return (
    <form action={acao} className="mt-8 rounded-lg border border-borda bg-surface p-6">
      {estado.erro && <Aviso tom="danger">{estado.erro}</Aviso>}

      <fieldset className="space-y-4">
        <legend className="font-display text-lg font-bold text-institucional">
          Responsável familiar
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto nome="cpf" rotulo="CPF" obrigatorio />
          <CampoTexto nome="nome" rotulo="Nome completo" obrigatorio />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <CampoData nome="nascimento" rotulo="Nascimento" />
          <CampoSelecao nome="sexo" rotulo="Sexo" opcoes={SEXOS} />
          <CampoTexto nome="nisResponsavel" rotulo="NIS" />
          <CampoTexto nome="telefone" rotulo="Telefone" />
        </div>
      </fieldset>

      <div className="mt-8 border-t border-borda pt-8">
        <CamposFicha />
      </div>

      <div className="mt-8">
        <Botao tipo="submit" carregando={enviando}>
          Cadastrar família
        </Botao>
      </div>
    </form>
  );
}
