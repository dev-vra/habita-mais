'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { habitacao } from '@habita/shared';
import { criarConvenio } from '@/app/actions/producao';
import { CampoDinheiro } from '@/components/ui/campos-mascarados';
import {
  Aviso,
  Botao,
  CampoData,
  CampoSelecao,
  CampoTexto,
} from '@/components/ui/formulario';

export function FormularioConvenio() {
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  return (
    <form
      className="mt-6 space-y-5 rounded-lg border border-borda bg-surface p-6"
      action={(formulario) =>
        iniciar(async () => {
          const resultado = await criarConvenio({
            objeto: String(formulario.get('objeto')),
            origem: String(formulario.get('origem')),
            orgaoRepassador: String(formulario.get('orgaoRepassador')),
            numeroExterno: String(formulario.get('numeroExterno') ?? '').trim() || undefined,
            valorRepasse: Number(formulario.get('valorRepasse')),
            valorContrapartida: Number(formulario.get('valorContrapartida')),
            vigenciaInicio: String(formulario.get('vigenciaInicio')),
            vigenciaFim: String(formulario.get('vigenciaFim')),
          });

          if (resultado.erro) {
            setErro(resultado.erro);
            return;
          }
          router.push('/producao');
        })
      }
    >
      {erro && <Aviso tom="danger">{erro}</Aviso>}

      <CampoTexto
        nome="objeto"
        rotulo="Objeto"
        obrigatorio
        placeholder="Construção de 40 unidades habitacionais"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <CampoSelecao
          nome="origem"
          rotulo="Origem do recurso"
          opcoes={habitacao.opcoes(habitacao.ORIGEM_RECURSO)}
        />
        <CampoTexto
          nome="orgaoRepassador"
          rotulo="Órgão repassador"
          obrigatorio
          placeholder="Ministério das Cidades / Caixa"
        />
      </div>

      <CampoTexto
        nome="numeroExterno"
        rotulo="Número no órgão"
        placeholder="0912345-67/2026"
        ajuda="É por este número que o convênio é procurado fora da prefeitura."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <CampoDinheiro nome="valorRepasse" rotulo="Valor do repasse" />
        <CampoDinheiro
          nome="valorContrapartida"
          rotulo="Contrapartida do município"
          ajuda="Deixe zerado se não houver."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CampoData nome="vigenciaInicio" rotulo="Vigência a partir de" />
        <CampoData nome="vigenciaFim" rotulo="Vigência até" />
      </div>

      <Botao tipo="submit" carregando={pendente}>
        Registrar convênio
      </Botao>
    </form>
  );
}
