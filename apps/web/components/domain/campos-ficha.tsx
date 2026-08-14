'use client';

import { useState } from 'react';
import { habitacao } from '@habita/shared';
import { CampoArquivo } from '@/components/ui/campo-arquivo';
import { CampoDinheiro, CampoNis } from '@/components/ui/campos-mascarados';
import { CampoData, CampoMarcador, CampoNumero, CampoSelecao, CampoTexto } from '@/components/ui/formulario';

/**
 * Campos da ficha social — os mesmos no cadastro e na reapuração, porque é a mesma entidade sendo
 * criada de novo.
 *
 * A renda per capita aparece calculada ao vivo, mas não é digitada nem enviada: quem calcula é o
 * servidor, a partir de renda ÷ pessoas. O número que decide a fila nunca pode depender de conta
 * feita à mão no balcão — aqui ele é conferência, não entrada.
 */
export function CamposFicha() {
  const [renda, setRenda] = useState(0);
  const [pessoas, setPessoas] = useState(1);
  const [temRisco, setTemRisco] = useState(false);

  const perCapita = pessoas > 0 ? renda / pessoas : 0;
  const salarioReferencia = 1600;
  const faixa =
    perCapita <= salarioReferencia / 4
      ? { texto: 'até ¼ do salário mínimo — extrema pobreza', tom: 'text-danger' }
      : perCapita <= salarioReferencia / 2
        ? { texto: 'entre ¼ e ½ salário mínimo', tom: 'text-warning-text' }
        : { texto: 'acima de ½ salário mínimo', tom: 'text-texto-suave' };

  return (
    <>
      <fieldset className="space-y-4">
        <legend className="font-display text-lg font-bold text-institucional">
          Renda e composição
        </legend>

        <div className="grid gap-4 sm:grid-cols-3">
          <CampoDinheiro nome="rendaFamiliar" rotulo="Renda familiar" onMudar={setRenda} />
          <div>
            <label htmlFor="quantidadePessoas" className="block text-sm font-semibold text-texto">
              Pessoas no grupo
            </label>
            <input
              id="quantidadePessoas"
              name="quantidadePessoas"
              type="number"
              min={1}
              defaultValue={1}
              required
              onChange={(e) => setPessoas(Number(e.target.value) || 1)}
              className="tabular mt-1.5 w-full rounded-md border border-borda bg-surface px-3 py-2.5 text-base outline-none focus:border-institucional focus:ring-2 focus:ring-institucional/30"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-texto">Renda per capita</p>
            <p className="tabular mt-1.5 rounded-md bg-background px-3 py-2.5 text-base font-bold text-institucional">
              {perCapita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className={`mt-1.5 text-xs ${faixa.tom}`}>{faixa.texto}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <CampoNumero nome="quantidadeMenores" rotulo="Menores de 18" min={0} valorInicial={0} />
          <CampoSelecao
            nome="fonteRenda"
            rotulo="Fonte da renda"
            opcoes={habitacao.opcoes(habitacao.FONTE_RENDA)}
          />
          <CampoSelecao
            nome="regimeRenda"
            rotulo="Regime da renda"
            opcoes={habitacao.opcoes(habitacao.REGIME_RENDA)}
          />
          <CampoSelecao
            nome="estruturaFamiliar"
            rotulo="Estrutura familiar"
            opcoes={habitacao.opcoes(habitacao.ESTRUTURA_FAMILIAR)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoNis
            nome="nis"
            rotulo="NIS / CadÚnico"
            ajuda="Declarado no balcão — não verificado na base federal."
          />
          <div className="flex items-end pb-3">
            <CampoMarcador nome="inscritoCadUnico" rotulo="Inscrita no CadÚnico" />
          </div>
        </div>

        <MarcadoresMultiplos
          nome="beneficios"
          titulo="Benefícios recebidos"
          opcoes={habitacao.opcoes(habitacao.BENEFICIO_SOCIAL)}
        />
      </fieldset>

      <fieldset className="mt-8 space-y-4">
        <legend className="font-display text-lg font-bold text-institucional">
          Vulnerabilidade
        </legend>

        <div className="grid gap-3 sm:grid-cols-2">
          <CampoMarcador nome="mulherChefeFamilia" rotulo="Mulher chefe de família" />
          <CampoMarcador nome="temPessoaComDeficiencia" rotulo="Pessoa com deficiência no domicílio" />
          <CampoMarcador nome="temIdoso" rotulo="Idoso no domicílio" />
          <label className="flex items-center gap-2.5 text-sm text-texto">
            <input
              type="checkbox"
              name="situacaoRisco"
              value="sim"
              checked={temRisco}
              onChange={(e) => setTemRisco(e.target.checked)}
              className="size-4 rounded border-borda text-primary"
            />
            Situação de risco
          </label>
        </div>

        <MarcadoresMultiplos
          nome="vulnerabilidades"
          titulo="Indicadores identificados na visita"
          opcoes={habitacao.opcoes(habitacao.VULNERABILIDADE)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelecao
            nome="nivelVulnerabilidade"
            rotulo="Nível de vulnerabilidade"
            opcoes={habitacao.opcoes(habitacao.NIVEL_VULNERABILIDADE)}
          />
          <CampoTexto nome="parecerTecnico" rotulo="Parecer técnico" />
        </div>

        {temRisco && (
          <div className="rounded-md border border-warning/40 bg-warning/5 p-3">
            <p className="text-sm font-semibold text-warning-text">
              Risco declarado exige laudo da Defesa Civil
            </p>
            <p className="mt-0.5 text-xs text-warning-text">
              Sem o laudo anexado, o critério de risco não pontua — risco é evidência de terceiro,
              não marcação do servidor. Se não tiver o documento agora, encaminhe à Defesa Civil
              pela ficha da família.
            </p>
            <div className="mt-3">
              <CampoArquivo nome="laudoRiscoKey" rotulo="Laudo (PDF ou foto)" categoria="laudos" />
            </div>
          </div>
        )}
      </fieldset>

      <fieldset className="mt-8 space-y-4">
        <legend className="font-display text-lg font-bold text-institucional">Moradia atual</legend>

        <div className="grid gap-4 sm:grid-cols-4">
          <CampoSelecao
            nome="tipoMoradia"
            rotulo="Condição"
            opcoes={habitacao.opcoes(habitacao.TIPO_MORADIA)}
          />
          <CampoSelecao
            nome="tipoConstrucao"
            rotulo="Construção"
            opcoes={habitacao.opcoes(habitacao.TIPO_CONSTRUCAO)}
          />
          <CampoSelecao
            nome="situacaoHabitacional"
            rotulo="Situação habitacional"
            opcoes={habitacao.opcoes(habitacao.SITUACAO_HABITACIONAL)}
          />
          <CampoNumero
            nome="mesesResidenciaMunicipio"
            rotulo="Meses no município"
            valorInicial={0}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <CampoNumero nome="comodos" rotulo="Cômodos" min={0} valorInicial={0} />
          <CampoNumero nome="banheiros" rotulo="Banheiros" min={0} valorInicial={0} />
          <CampoData nome="apuradaEm" rotulo="Apurada em" valorInicial={hoje()} />
          <CampoData nome="validaAte" rotulo="Válida até" valorInicial={emUmAno()} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <CampoMarcador nome="moradiaInadequada" rotulo="Moradia inadequada" />
          <CampoMarcador nome="possuiOutroImovel" rotulo="Possui outro imóvel" />
        </div>
      </fieldset>

      <fieldset className="mt-8 space-y-4">
        <legend className="font-display text-lg font-bold text-institucional">
          Infraestrutura do entorno
        </legend>
        <p className="text-sm text-texto-suave">
          O que separa “casa ruim” de “lugar sem serviço público” — e o que alimenta os indicadores
          do PLHIS.
        </p>

        <div className="grid gap-4 sm:grid-cols-4">
          <CampoSelecao
            nome="abastecimentoAgua"
            rotulo="Água"
            opcoes={habitacao.opcoes(habitacao.ABASTECIMENTO_AGUA)}
          />
          <CampoSelecao
            nome="saneamento"
            rotulo="Esgoto"
            opcoes={habitacao.opcoes(habitacao.SANEAMENTO)}
          />
          <CampoSelecao
            nome="energiaEletrica"
            rotulo="Energia"
            opcoes={habitacao.opcoes(habitacao.ENERGIA_ELETRICA)}
          />
          <CampoSelecao
            nome="coletaLixo"
            rotulo="Lixo"
            opcoes={habitacao.opcoes(habitacao.COLETA_LIXO)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelecao
            nome="pavimentacao"
            rotulo="Pavimentação"
            opcoes={habitacao.opcoes(habitacao.PAVIMENTACAO)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CampoMarcador nome="iluminacaoPublica" rotulo="Iluminação pública" />
          <CampoMarcador nome="drenagemPluvial" rotulo="Drenagem pluvial" />
          <CampoMarcador nome="acessoEscolaProxima" rotulo="Escola próxima" />
          <CampoMarcador nome="acessoSaudeProxima" rotulo="Unidade de saúde próxima" />
          <CampoMarcador nome="acessoTransportePublico" rotulo="Transporte público" />
        </div>
      </fieldset>
    </>
  );
}

/** Lista de marcadores que enviam o mesmo nome — o servidor recebe um array. */
function MarcadoresMultiplos({
  nome,
  titulo,
  opcoes,
}: {
  nome: string;
  titulo: string;
  opcoes: { valor: string; rotulo: string }[];
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-texto">{titulo}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {opcoes.map((opcao) => (
          <label key={opcao.valor} className="flex items-center gap-2 text-sm text-texto">
            <input
              type="checkbox"
              name={nome}
              value={opcao.valor}
              className="size-4 rounded border-borda text-primary"
            />
            {opcao.rotulo}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

function emUmAno(): string {
  const data = new Date();
  data.setFullYear(data.getFullYear() + 1);
  return data.toISOString().slice(0, 10);
}
