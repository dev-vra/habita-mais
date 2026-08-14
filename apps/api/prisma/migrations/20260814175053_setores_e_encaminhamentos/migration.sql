-- CreateEnum
CREATE TYPE "TipoSetor" AS ENUM ('HABITACAO', 'ASSISTENCIA_SOCIAL', 'DEFESA_CIVIL', 'OBRAS', 'JURIDICO', 'PLANEJAMENTO_URBANO', 'MEIO_AMBIENTE', 'FAZENDA', 'GABINETE', 'CONTROLE_INTERNO', 'OUTRO');

-- CreateEnum
CREATE TYPE "SituacaoEncaminhamento" AS ENUM ('ABERTO', 'RESPONDIDO', 'DEVOLVIDO', 'CANCELADO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PerfilTenant" ADD VALUE 'DEFESA_CIVIL';
ALTER TYPE "PerfilTenant" ADD VALUE 'SETOR_PARCEIRO';

-- AlterEnum
ALTER TYPE "SerieProtocolo" ADD VALUE 'ENC';

-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "setorId" TEXT;

-- CreateTable
CREATE TABLE "setor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "tipo" "TipoSetor" NOT NULL,
    "secretaria" TEXT,
    "email" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "setor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encaminhamento" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "setorOrigemId" TEXT NOT NULL,
    "setorDestinoId" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "prazoAte" TIMESTAMP(3) NOT NULL,
    "situacao" "SituacaoEncaminhamento" NOT NULL DEFAULT 'ABERTO',
    "resposta" TEXT,
    "respondidoEm" TIMESTAMP(3),
    "respondidoPor" TEXT,
    "anexoKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "encaminhamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "setor_tenantId_tipo_ativo_idx" ON "setor"("tenantId", "tipo", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "setor_tenantId_sigla_key" ON "setor"("tenantId", "sigla");

-- CreateIndex
CREATE INDEX "encaminhamento_tenantId_setorDestinoId_situacao_idx" ON "encaminhamento"("tenantId", "setorDestinoId", "situacao");

-- CreateIndex
CREATE INDEX "encaminhamento_tenantId_entidade_entidadeId_idx" ON "encaminhamento"("tenantId", "entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "encaminhamento_tenantId_prazoAte_idx" ON "encaminhamento"("tenantId", "prazoAte");

-- CreateIndex
CREATE UNIQUE INDEX "encaminhamento_tenantId_numero_key" ON "encaminhamento"("tenantId", "numero");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_setorId_fkey" FOREIGN KEY ("setorId") REFERENCES "setor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "setor" ADD CONSTRAINT "setor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encaminhamento" ADD CONSTRAINT "encaminhamento_setorOrigemId_fkey" FOREIGN KEY ("setorOrigemId") REFERENCES "setor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encaminhamento" ADD CONSTRAINT "encaminhamento_setorDestinoId_fkey" FOREIGN KEY ("setorDestinoId") REFERENCES "setor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
