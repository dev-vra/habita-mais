-- CreateEnum
CREATE TYPE "TipoSolicitacao" AS ENUM ('LAUDO_RISCO', 'PARECER_JURIDICO', 'VISTORIA_TECNICA', 'ANALISE_PROJETO', 'APOIO_SOCIAL', 'OUTRO');

-- AlterTable
ALTER TABLE "encaminhamento" ADD COLUMN     "tipoSolicitacao" "TipoSolicitacao" NOT NULL DEFAULT 'OUTRO';
