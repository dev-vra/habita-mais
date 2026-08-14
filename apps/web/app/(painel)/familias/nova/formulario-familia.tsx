'use client';

import { useActionState, useState } from 'react';
import { habitacao } from '@habita/shared';
import { cadastrarFamilia } from '@/app/actions/familias';
import type { EstadoFormulario } from '@/app/actions/auth';
import { CamposFicha } from '@/components/domain/campos-ficha';
import { Aviso, Botao, CampoData, CampoSelecao, CampoTexto } from '@/components/ui/formulario';
import {
  CampoCep,
  CampoCpf,
  CampoNis,
  CampoNome,
  CampoTelefone,
} from '@/components/ui/campos-mascarados';

const ESTADO_INICIAL: EstadoFormulario = {};

/** Converte "dd/mm/aaaa" do Hub para o formato do input date. */
function paraInputData(valor: string): string {
  const partes = valor.split('/');
  return partes.length === 3 ? `${partes[2]}-${partes[1]}-${partes[0]}` : '';
}

export function FormularioFamilia() {
  const [estado, acao, enviando] = useActionState(cadastrarFamilia, ESTADO_INICIAL);
  const [nome, setNome] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [endereco, setEndereco] = useState({ logradouro: '', bairro: '', municipio: '', uf: '' });

  return (
    <form action={acao} className="mt-8 rounded-lg border border-borda bg-surface p-6">
      {estado.erro && <Aviso tom="danger">{estado.erro}</Aviso>}

      <fieldset className="space-y-4">
        <legend className="font-display text-lg font-bold text-institucional">
          Responsável familiar
        </legend>
        <p className="text-sm text-texto-suave">
          Digite o CPF: o sistema consulta a Receita e preenche o que puder. Confira com o documento
          na mão — a consulta sugere, você valida.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoCpf
            nome="cpf"
            rotulo="CPF"
            obrigatorio
            onEncontrado={(dados) => {
              if (dados.nome) setNome(dados.nome);
              if (dados.dataNascimento) setNascimento(paraInputData(dados.dataNascimento));
            }}
          />
          <CampoNome key={nome} nome="nome" rotulo="Nome completo" obrigatorio valorInicial={nome} />
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <CampoData key={nascimento} nome="nascimento" rotulo="Nascimento" valorInicial={nascimento} />
          <CampoSelecao nome="sexo" rotulo="Sexo" opcoes={habitacao.opcoes(habitacao.SEXO)} />
          <CampoSelecao
            nome="estadoCivil"
            rotulo="Estado civil"
            opcoes={habitacao.opcoes(habitacao.ESTADO_CIVIL)}
          />
          <CampoNis nome="nisResponsavel" rotulo="NIS" ajuda="Declarado, não verificado." />
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <CampoNome nome="nomeMae" rotulo="Nome da mãe" />
          <CampoNome nome="nomePai" rotulo="Nome do pai" />
          <CampoTexto nome="rg" rotulo="RG" />
          <CampoTexto nome="orgaoExpedidor" rotulo="Órgão expedidor" />
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <CampoTelefone nome="telefone" rotulo="Telefone" />
          <CampoTexto nome="profissao" rotulo="Profissão" />
          <CampoSelecao
            nome="escolaridade"
            rotulo="Escolaridade"
            opcoes={habitacao.opcoes(habitacao.ESCOLARIDADE)}
          />
          <CampoSelecao
            nome="situacaoTrabalho"
            rotulo="Situação de trabalho"
            opcoes={habitacao.opcoes(habitacao.SITUACAO_TRABALHO)}
          />
        </div>
      </fieldset>

      <fieldset className="mt-8 space-y-4">
        <legend className="font-display text-lg font-bold text-institucional">
          Endereço atual
        </legend>
        <p className="text-sm text-texto-suave">
          É por aqui que a visita domiciliar e a Defesa Civil chegam na casa.
        </p>

        <div className="grid gap-4 sm:grid-cols-[1fr_2fr_0.6fr]">
          <CampoCep nome="cep" rotulo="CEP" onEncontrado={setEndereco} />
          <CampoTexto key={endereco.logradouro} nome="logradouro" rotulo="Logradouro" />
          <CampoTexto nome="numero" rotulo="Número" />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <CampoTexto nome="complemento" rotulo="Complemento" />
          <CampoTexto key={endereco.bairro} nome="bairro" rotulo="Bairro" />
          <CampoTexto key={endereco.municipio} nome="municipio" rotulo="Município" />
          <CampoTexto nome="referencia" rotulo="Ponto de referência" />
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
