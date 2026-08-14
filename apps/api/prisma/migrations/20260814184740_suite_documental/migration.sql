-- CreateEnum
CREATE TYPE "EscopoDocumento" AS ENUM ('PESSOA', 'FAMILIA', 'INSCRICAO', 'PROGRAMA', 'CONVENIO', 'OBRA', 'UNIDADE', 'CONTRATO', 'CASO_RETOMADA');

-- CreateEnum
CREATE TYPE "SituacaoDocumento" AS ENUM ('RECEBIDO', 'CONFERIDO', 'RECUSADO', 'SUBSTITUIDO');

-- CreateEnum
CREATE TYPE "FinalidadePilha" AS ENUM ('REGISTRO_CARTORIO', 'PRESTACAO_CONTAS', 'HABITE_SE', 'CONTRATO_MUTUARIO', 'RETOMADA_UNIDADE', 'OUTRA');

-- CreateEnum
CREATE TYPE "SituacaoPilha" AS ENUM ('EM_MONTAGEM', 'COMPLETA', 'ENTREGUE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SerieProtocolo" ADD VALUE 'DOC';
ALTER TYPE "SerieProtocolo" ADD VALUE 'PIL';

-- CreateTable
CREATE TABLE "tipo_documento" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "escopo" "EscopoDocumento" NOT NULL,
    "validadeMeses" INTEGER,
    "aceitaFoto" BOOLEAN NOT NULL DEFAULT true,
    "orientacao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "tipo_documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documento" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tipoDocumentoId" TEXT NOT NULL,
    "escopo" "EscopoDocumento" NOT NULL,
    "referenciaId" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "arquivoKey" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "emitidoEm" TIMESTAMP(3),
    "validoAte" TIMESTAMP(3),
    "situacao" "SituacaoDocumento" NOT NULL DEFAULT 'RECEBIDO',
    "conferidoPor" TEXT,
    "conferidoEm" TIMESTAMP(3),
    "motivoRecusa" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exigencia_documental" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "programaId" TEXT NOT NULL,
    "tipoDocumentoId" TEXT NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT true,
    "prazoDias" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "exigencia_documental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pilha_documental" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "finalidade" "FinalidadePilha" NOT NULL,
    "escopo" "EscopoDocumento" NOT NULL,
    "referenciaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "situacao" "SituacaoPilha" NOT NULL DEFAULT 'EM_MONTAGEM',
    "observacao" TEXT,
    "indiceKey" TEXT,
    "entregueEm" TIMESTAMP(3),
    "entreguePara" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "pilha_documental_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_pilha" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pilhaId" TEXT NOT NULL,
    "tipoDocumentoId" TEXT NOT NULL,
    "documentoId" TEXT,
    "ordem" INTEGER NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT true,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "item_pilha_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tipo_documento_tenantId_escopo_ativo_idx" ON "tipo_documento"("tenantId", "escopo", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_documento_tenantId_codigo_key" ON "tipo_documento"("tenantId", "codigo");

-- CreateIndex
CREATE INDEX "documento_tenantId_escopo_referenciaId_idx" ON "documento"("tenantId", "escopo", "referenciaId");

-- CreateIndex
CREATE INDEX "documento_tenantId_validoAte_idx" ON "documento"("tenantId", "validoAte");

-- CreateIndex
CREATE UNIQUE INDEX "documento_tenantId_protocolo_key" ON "documento"("tenantId", "protocolo");

-- CreateIndex
CREATE INDEX "exigencia_documental_tenantId_programaId_idx" ON "exigencia_documental"("tenantId", "programaId");

-- CreateIndex
CREATE UNIQUE INDEX "exigencia_documental_programaId_tipoDocumentoId_key" ON "exigencia_documental"("programaId", "tipoDocumentoId");

-- CreateIndex
CREATE INDEX "pilha_documental_tenantId_escopo_referenciaId_idx" ON "pilha_documental"("tenantId", "escopo", "referenciaId");

-- CreateIndex
CREATE INDEX "pilha_documental_tenantId_situacao_idx" ON "pilha_documental"("tenantId", "situacao");

-- CreateIndex
CREATE INDEX "item_pilha_tenantId_pilhaId_idx" ON "item_pilha"("tenantId", "pilhaId");

-- CreateIndex
CREATE UNIQUE INDEX "item_pilha_pilhaId_tipoDocumentoId_key" ON "item_pilha"("pilhaId", "tipoDocumentoId");

-- AddForeignKey
ALTER TABLE "documento" ADD CONSTRAINT "documento_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "tipo_documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exigencia_documental" ADD CONSTRAINT "exigencia_documental_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "programa_habitacional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exigencia_documental" ADD CONSTRAINT "exigencia_documental_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "tipo_documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pilha" ADD CONSTRAINT "item_pilha_pilhaId_fkey" FOREIGN KEY ("pilhaId") REFERENCES "pilha_documental"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pilha" ADD CONSTRAINT "item_pilha_tipoDocumentoId_fkey" FOREIGN KEY ("tipoDocumentoId") REFERENCES "tipo_documento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_pilha" ADD CONSTRAINT "item_pilha_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
