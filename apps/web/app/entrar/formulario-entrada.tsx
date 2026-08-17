'use client';

import { useActionState } from 'react';
import { entrar, type EstadoFormulario } from '@/app/actions/auth';
import { Botao, CampoTexto, Aviso } from '@/components/ui/formulario';

const ESTADO_INICIAL: EstadoFormulario = {};

export function FormularioEntrada() {
  const [estado, acao, enviando] = useActionState(entrar, ESTADO_INICIAL);

  return (
    <form action={acao} className="mt-8 space-y-5">
      {estado.erro && <Aviso tom="danger">{estado.erro}</Aviso>}

      <CampoTexto
        nome="email"
        rotulo="E-mail funcional"
        tipo="email"
        autoComplete="username"
        placeholder="nome@municipio.mt.gov.br"
        obrigatorio
      />

      <div>
        <CampoTexto
          nome="senha"
          rotulo="Senha"
          tipo="password"
          autoComplete="current-password"
          obrigatorio
        />
        <p className="mt-2 text-xs text-texto-suave">
          O primeiro acesso pede a troca da senha temporária.
        </p>
      </div>

      <Botao tipo="submit" carregando={enviando} className="h-[46px] py-0">
        Entrar
      </Botao>

      <p className="text-[12.5px] text-texto-suave">
        Esqueceu a senha? Só o administrador do município redefine — é ele que responde por quem
        tem acesso.
      </p>
    </form>
  );
}
