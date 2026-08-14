-- CreateEnum
CREATE TYPE "EstadoCivil" AS ENUM ('SOLTEIRO', 'CASADO', 'UNIAO_ESTAVEL', 'DIVORCIADO', 'VIUVO', 'SEPARADO');

-- CreateEnum
CREATE TYPE "RegimeBens" AS ENUM ('COMUNHAO_PARCIAL', 'COMUNHAO_UNIVERSAL', 'SEPARACAO_TOTAL', 'SEPARACAO_OBRIGATORIA', 'PARTICIPACAO_FINAL_AQUESTOS');

-- CreateEnum
CREATE TYPE "Escolaridade" AS ENUM ('NAO_ALFABETIZADO', 'SEM_INSTRUCAO', 'FUNDAMENTAL_INCOMPLETO', 'FUNDAMENTAL_COMPLETO', 'MEDIO_INCOMPLETO', 'MEDIO_COMPLETO', 'SUPERIOR_INCOMPLETO', 'SUPERIOR_COMPLETO', 'POS_GRADUACAO');

-- CreateEnum
CREATE TYPE "SituacaoTrabalho" AS ENUM ('CARTEIRA_ASSINADA', 'SERVIDOR_PUBLICO', 'AUTONOMO', 'INFORMAL', 'DESEMPREGADO', 'APOSENTADO_PENSIONISTA', 'ESTUDANTE', 'DO_LAR', 'INCAPACITADO');

-- CreateEnum
CREATE TYPE "TipoDeficiencia" AS ENUM ('FISICA', 'VISUAL', 'AUDITIVA', 'INTELECTUAL', 'PSICOSSOCIAL', 'TEA', 'MULTIPLA', 'MOBILIDADE_REDUZIDA');

-- CreateEnum
CREATE TYPE "FonteRenda" AS ENUM ('EMPREGO_FORMAL', 'MEI', 'AUTONOMO', 'INFORMAL', 'APOSENTADORIA_PENSAO', 'BPC', 'PROGRAMA_SOCIAL', 'SEM_RENDA');

-- CreateEnum
CREATE TYPE "RegimeRenda" AS ENUM ('FIXA', 'VARIAVEL', 'MISTA');

-- CreateEnum
CREATE TYPE "BeneficioSocial" AS ENUM ('BOLSA_FAMILIA', 'BPC_PCD', 'BPC_IDOSO', 'APOSENTADORIA_INVALIDEZ', 'SEGURO_DESEMPREGO', 'AUXILIO_ALUGUEL_MUNICIPAL', 'TARIFA_SOCIAL_ENERGIA');

-- CreateEnum
CREATE TYPE "EstruturaFamiliar" AS ENUM ('CASAL_COM_FILHOS', 'CASAL_SEM_FILHOS', 'MONOPARENTAL_MAE', 'MONOPARENTAL_PAI', 'UNIPESSOAL', 'AMPLIADA', 'OUTRA');

-- CreateEnum
CREATE TYPE "IndicadorVulnerabilidade" AS ENUM ('VIOLENCIA_DOMESTICA', 'TRABALHO_INFANTIL', 'USO_SUBSTANCIAS', 'SITUACAO_RUA_ANTERIOR', 'DOENCA_CRONICA_GRAVE', 'PCD_DOMICILIO', 'CUIDADOS_CONTINUOS', 'GESTANTE', 'ADOLESCENTE_RESPONSAVEL', 'ENDIVIDAMENTO_RENDA_BASICA', 'DESPEJO_EM_CURSO', 'AREA_DE_RISCO');

-- CreateEnum
CREATE TYPE "NivelVulnerabilidade" AS ENUM ('BAIXA', 'MEDIA', 'ALTA');

-- CreateEnum
CREATE TYPE "SituacaoHabitacional" AS ENUM ('ADEQUADA', 'PRECARIA_HABITAVEL', 'INADEQUADA');

-- CreateEnum
CREATE TYPE "AbastecimentoAgua" AS ENUM ('REDE_PUBLICA', 'POCO_NASCENTE', 'CARRO_PIPA', 'SEM_ABASTECIMENTO');

-- CreateEnum
CREATE TYPE "EnergiaEletrica" AS ENUM ('RELOGIO_PROPRIO', 'RELOGIO_COMPARTILHADO', 'LIGACAO_IRREGULAR', 'SEM_ENERGIA');

-- CreateEnum
CREATE TYPE "ColetaLixo" AS ENUM ('COLETA_REGULAR', 'COLETA_IRREGULAR', 'QUEIMA_ENTERRA', 'DESCARTE_IRREGULAR');

-- CreateEnum
CREATE TYPE "Pavimentacao" AS ENUM ('ASFALTO', 'BLOQUETE', 'CASCALHO', 'TERRA');

-- CreateEnum
CREATE TYPE "TipoEscola" AS ENUM ('PUBLICA', 'PRIVADA', 'FILANTROPICA');

-- CreateEnum
CREATE TYPE "TurnoEscola" AS ENUM ('MATUTINO', 'VESPERTINO', 'NOTURNO', 'INTEGRAL');

-- AlterTable
ALTER TABLE "ficha_social" ADD COLUMN     "abastecimentoAgua" "AbastecimentoAgua",
ADD COLUMN     "acessoEscolaProxima" BOOLEAN,
ADD COLUMN     "acessoSaudeProxima" BOOLEAN,
ADD COLUMN     "acessoTransportePublico" BOOLEAN,
ADD COLUMN     "banheiros" INTEGER,
ADD COLUMN     "beneficios" "BeneficioSocial"[],
ADD COLUMN     "coletaLixo" "ColetaLixo",
ADD COLUMN     "comodos" INTEGER,
ADD COLUMN     "drenagemPluvial" BOOLEAN,
ADD COLUMN     "energiaEletrica" "EnergiaEletrica",
ADD COLUMN     "estruturaFamiliar" "EstruturaFamiliar",
ADD COLUMN     "fonteRenda" "FonteRenda",
ADD COLUMN     "iluminacaoPublica" BOOLEAN,
ADD COLUMN     "inscritoCadUnico" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nivelVulnerabilidade" "NivelVulnerabilidade",
ADD COLUMN     "parecerTecnico" TEXT,
ADD COLUMN     "pavimentacao" "Pavimentacao",
ADD COLUMN     "regimeRenda" "RegimeRenda",
ADD COLUMN     "rendaComplementar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rendaComplementarDesc" TEXT,
ADD COLUMN     "situacaoHabitacional" "SituacaoHabitacional",
ADD COLUMN     "vulnerabilidades" "IndicadorVulnerabilidade"[];

-- AlterTable
ALTER TABLE "membro_familiar" ADD COLUMN     "doencaCronica" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "escolaridade" "Escolaridade",
ADD COLUMN     "frequentaEscola" BOOLEAN,
ADD COLUMN     "gestante" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nomeEscola" TEXT,
ADD COLUMN     "ocupacao" TEXT,
ADD COLUMN     "renda" DECIMAL(14,2),
ADD COLUMN     "situacaoTrabalho" "SituacaoTrabalho",
ADD COLUMN     "tipoEscola" "TipoEscola",
ADD COLUMN     "turnoEscola" "TurnoEscola";

-- AlterTable
ALTER TABLE "pessoa" ADD COLUMN     "bairro" TEXT,
ADD COLUMN     "cep" CHAR(8),
ADD COLUMN     "complemento" TEXT,
ADD COLUMN     "escolaridade" "Escolaridade",
ADD COLUMN     "estadoCivil" "EstadoCivil",
ADD COLUMN     "logradouro" TEXT,
ADD COLUMN     "municipio" TEXT,
ADD COLUMN     "nacionalidade" TEXT,
ADD COLUMN     "naturalidade" TEXT,
ADD COLUMN     "necessitaCuidador" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nomeMae" TEXT,
ADD COLUMN     "nomePai" TEXT,
ADD COLUMN     "nomePaiNaoInformado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "numero" TEXT,
ADD COLUMN     "orgaoExpedidor" TEXT,
ADD COLUMN     "profissao" TEXT,
ADD COLUMN     "referencia" TEXT,
ADD COLUMN     "regimeBens" "RegimeBens",
ADD COLUMN     "rg" TEXT,
ADD COLUMN     "rgAusente" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rgUf" CHAR(2),
ADD COLUMN     "situacaoTrabalho" "SituacaoTrabalho",
ADD COLUMN     "telefoneAlternativo" TEXT,
ADD COLUMN     "tiposDeficiencia" "TipoDeficiencia"[],
ADD COLUMN     "uf" CHAR(2),
ADD COLUMN     "usaCadeiraDeRodas" BOOLEAN NOT NULL DEFAULT false;
