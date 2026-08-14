'use client';

import { useActionState } from 'react';
import { trocarSenha, type EstadoFormulario } from '@/app/actions/auth';
import { Aviso, Botao, CampoTexto } from '@/components/ui/formulario';

const ESTADO_INICIAL: EstadoFormulario = {};

export function FormularioTrocaSenha() {
  const [estado, acao, enviando] = useActionState(trocarSenha, ESTADO_INICIAL);

  return (
    <form action={acao} className="mt-8 space-y-5">
      {estado.erro && <Aviso tom="danger">{estado.erro}</Aviso>}

      <CampoTexto
        nome="senhaAtual"
        rotulo="Senha temporária"
        tipo="password"
        autoComplete="current-password"
        obrigatorio
      />
      <CampoTexto
        nome="novaSenha"
        rotulo="Nova senha"
        tipo="password"
        autoComplete="new-password"
        ajuda="Ao menos 12 caracteres."
        obrigatorio
      />
      <CampoTexto
        nome="confirmacao"
        rotulo="Repita a nova senha"
        tipo="password"
        autoComplete="new-password"
        obrigatorio
      />

      <Botao tipo="submit" carregando={enviando}>
        Salvar e entrar
      </Botao>
    </form>
  );
}
