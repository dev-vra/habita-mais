'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { criarEmpreendimento } from '@/app/actions/producao';
import { CampoCep } from '@/components/ui/campos-mascarados';
import { Aviso, Botao, CampoData, CampoNumero, CampoTexto } from '@/components/ui/formulario';

export function FormularioEmpreendimento({
  programas,
  convenios,
}: {
  programas: { id: string; nome: string }[];
  convenios: { id: string; rotulo: string }[];
}) {
  const [erro, setErro] = useState<string>();
  const [endereco, setEndereco] = useState('');
  const [bairro, setBairro] = useState('');
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  return (
    <form
      className="mt-6 space-y-5 rounded-lg border border-borda bg-surface p-6"
      action={(formulario) =>
        iniciar(async () => {
          const texto = (campo: string) => String(formulario.get(campo) ?? '').trim() || undefined;

          const resultado = await criarEmpreendimento({
            nome: String(formulario.get('nome')),
            endereco: String(formulario.get('endereco')),
            bairro: String(formulario.get('bairro')),
            cep: texto('cep')?.replace(/\D/g, ''),
            unidadesPrevistas: Number(formulario.get('unidadesPrevistas')),
            previsaoEntrega: texto('previsaoEntrega'),
            convenioId: texto('convenioId'),
            programaId: texto('programaId'),
          });

          if (resultado.erro) {
            setErro(resultado.erro);
            return;
          }
          router.push(`/producao/${resultado.dados?.slug}`);
        })
      }
    >
      {erro && <Aviso tom="danger">{erro}</Aviso>}

      <CampoTexto
        nome="nome"
        rotulo="Nome do empreendimento"
        obrigatorio
        placeholder="Residencial Aurora"
        ajuda="É o nome pelo qual a cidade conhece o conjunto."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <CampoCep
            nome="cep"
            rotulo="CEP"
            onEncontrado={(dados) => {
              setEndereco(dados.logradouro);
              setBairro(dados.bairro);
            }}
          />
        </div>
        <div className="md:col-span-2">
          <CampoTexto
            key={endereco}
            nome="endereco"
            rotulo="Endereço"
            obrigatorio
            valorInicial={endereco}
            placeholder="Rua das Palmeiras, s/n"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <CampoTexto key={bairro} nome="bairro" rotulo="Bairro" obrigatorio valorInicial={bairro} />
        </div>
        <CampoNumero nome="unidadesPrevistas" rotulo="Unidades previstas" min={1} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CampoData nome="previsaoEntrega" rotulo="Previsão de entrega" obrigatorio={false} />

        <div>
          <label htmlFor="convenioId" className="block text-sm font-semibold text-texto">
            Convênio
          </label>
          <select
            id="convenioId"
            name="convenioId"
            defaultValue=""
            className="mt-1.5 w-full rounded-md border border-borda bg-surface px-3 py-2.5 text-base"
          >
            <option value="">Recurso próprio</option>
            {convenios.map((convenio) => (
              <option key={convenio.id} value={convenio.id}>
                {convenio.rotulo}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="programaId" className="block text-sm font-semibold text-texto">
          Fila que vai contemplar
        </label>
        <select
          id="programaId"
          name="programaId"
          defaultValue=""
          className="mt-1.5 w-full rounded-md border border-borda bg-surface px-3 py-2.5 text-base"
        >
          <option value="">Definir depois</option>
          {programas.map((programa) => (
            <option key={programa.id} value={programa.id}>
              {programa.nome}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-texto-suave">
          É o vínculo que permite entregar a casa só a quem foi contemplado na fila. Sem ele, a
          entrega não oferece candidatos.
        </p>
      </div>

      <Botao tipo="submit" carregando={pendente}>
        Cadastrar empreendimento
      </Botao>
    </form>
  );
}
