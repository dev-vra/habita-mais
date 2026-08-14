import {
  CampoData,
  CampoMarcador,
  CampoNumero,
  CampoSelecao,
  CampoTexto,
} from '@/components/ui/formulario';

const TIPOS_MORADIA = [
  { valor: 'ALUGADA', rotulo: 'Alugada' },
  { valor: 'CEDIDA', rotulo: 'Cedida' },
  { valor: 'OCUPACAO', rotulo: 'Ocupação' },
  { valor: 'PROPRIA_QUITADA', rotulo: 'Própria quitada' },
  { valor: 'PROPRIA_FINANCIADA', rotulo: 'Própria financiada' },
  { valor: 'ABRIGO', rotulo: 'Abrigo' },
  { valor: 'SITUACAO_RUA', rotulo: 'Situação de rua' },
  { valor: 'OUTRO', rotulo: 'Outro' },
];

const TIPOS_CONSTRUCAO = [
  { valor: 'ALVENARIA', rotulo: 'Alvenaria' },
  { valor: 'MADEIRA', rotulo: 'Madeira' },
  { valor: 'MISTA', rotulo: 'Mista' },
  { valor: 'IMPROVISADO', rotulo: 'Improvisada' },
  { valor: 'OUTRO', rotulo: 'Outro' },
];

const SANEAMENTOS = [
  { valor: 'REDE_PUBLICA', rotulo: 'Rede pública' },
  { valor: 'FOSSA_SEPTICA', rotulo: 'Fossa séptica' },
  { valor: 'FOSSA_RUDIMENTAR', rotulo: 'Fossa rudimentar' },
  { valor: 'CEU_ABERTO', rotulo: 'A céu aberto' },
  { valor: 'OUTRO', rotulo: 'Outro' },
];

/**
 * Campos da ficha social — os mesmos no cadastro e na reapuração, porque é a mesma entidade sendo
 * criada de novo. A renda per capita não é digitada: sai de renda ÷ pessoas no servidor, para que
 * o número que decide a fila nunca dependa de conta feita à mão no balcão.
 */
export function CamposFicha() {
  return (
    <>
      <fieldset className="space-y-4">
        <legend className="font-display text-lg font-bold text-institucional">Renda e composição</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <CampoNumero nome="rendaFamiliar" rotulo="Renda familiar (R$)" passo="0.01" />
          <CampoNumero nome="quantidadePessoas" rotulo="Pessoas no grupo" min={1} valorInicial={1} />
          <CampoNumero nome="quantidadeMenores" rotulo="Menores de 18" min={0} valorInicial={0} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <CampoTexto nome="fonteRendaPrincipal" rotulo="Fonte principal de renda" />
          <CampoTexto nome="nis" rotulo="NIS / CadÚnico" ajuda="Dado declarado, não verificado na base federal." />
          <CampoTexto nome="beneficioAtivo" rotulo="Benefício ativo" />
        </div>
      </fieldset>

      <fieldset className="mt-8 space-y-4">
        <legend className="font-display text-lg font-bold text-institucional">Vulnerabilidade</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoMarcador nome="mulherChefeFamilia" rotulo="Mulher chefe de família" />
          <CampoMarcador nome="temPessoaComDeficiencia" rotulo="Pessoa com deficiência no domicílio" />
          <CampoMarcador nome="temIdoso" rotulo="Idoso no domicílio" />
          <CampoMarcador nome="situacaoRisco" rotulo="Situação de risco (exige laudo)" />
        </div>
        <CampoTexto
          nome="laudoRiscoKey"
          rotulo="Laudo da Defesa Civil"
          ajuda="Identificação do laudo anexado. Sem laudo, o critério de risco não pontua."
        />
      </fieldset>

      <fieldset className="mt-8 space-y-4">
        <legend className="font-display text-lg font-bold text-institucional">Moradia atual</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <CampoSelecao nome="tipoMoradia" rotulo="Condição" opcoes={TIPOS_MORADIA} />
          <CampoSelecao nome="tipoConstrucao" rotulo="Construção" opcoes={TIPOS_CONSTRUCAO} />
          <CampoSelecao nome="saneamento" rotulo="Saneamento" opcoes={SANEAMENTOS} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <CampoNumero
            nome="mesesResidenciaMunicipio"
            rotulo="Meses no município"
            valorInicial={0}
          />
          <CampoData nome="apuradaEm" rotulo="Apurada em" valorInicial={hoje()} />
          <CampoData nome="validaAte" rotulo="Válida até" valorInicial={emUmAno()} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoMarcador nome="moradiaInadequada" rotulo="Moradia inadequada" />
          <CampoMarcador nome="possuiOutroImovel" rotulo="Possui outro imóvel" />
        </div>
      </fieldset>
    </>
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
