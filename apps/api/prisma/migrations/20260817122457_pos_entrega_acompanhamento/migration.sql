-- CreateEnum
CREATE TYPE "TipoAcompanhamento" AS ENUM ('INICIAL', 'PERIODICA', 'EXTRAORDINARIA', 'APURACAO');

-- CreateEnum
CREATE TYPE "EixoTrabalhoSocial" AS ENUM ('MOBILIZACAO_ORGANIZACAO', 'ACOMPANHAMENTO_GESTAO', 'EDUCACAO_AMBIENTAL_PATRIMONIAL', 'DESENVOLVIMENTO_SOCIOECONOMICO');

-- CreateEnum
CREATE TYPE "SituacaoEixo" AS ENUM ('ADEQUADA', 'ATENCAO', 'CRITICA', 'NAO_AVALIADA');

-- CreateEnum
CREATE TYPE "TipoOcorrenciaUso" AS ENUM ('CESSAO_TERCEIRO', 'ALUGUEL', 'VENDA_TRANSFERENCIA', 'ABANDONO', 'USO_COMERCIAL', 'OBRA_IRREGULAR', 'MUDANCA_COMPOSICAO', 'OBITO_TITULAR', 'OUTRA');

-- CreateEnum
CREATE TYPE "GravidadeOcorrencia" AS ENUM ('ADMINISTRATIVA', 'LEVE', 'GRAVE', 'GRAVISSIMA');

-- CreateEnum
CREATE TYPE "OrigemOcorrencia" AS ENUM ('VISITA', 'DENUNCIA', 'OFICIO', 'CRUZAMENTO_CADASTRAL', 'OUTRA');

-- CreateEnum
CREATE TYPE "SituacaoOcorrenciaUso" AS ENUM ('ABERTA', 'EM_APURACAO', 'NOTIFICADA', 'REGULARIZADA', 'IMPROCEDENTE', 'ENCAMINHADA_JURIDICO');

-- AlterEnum
ALTER TYPE "SerieProtocolo" ADD VALUE 'VIS';

-- CreateTable
CREATE TABLE "acompanhamento_unidade" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "visitadaEm" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoAcompanhamento" NOT NULL DEFAULT 'PERIODICA',
    "tecnicoNome" TEXT NOT NULL,
    "tecnicoId" TEXT,
    "residenciaConfirmada" BOOLEAN NOT NULL,
    "quemReside" TEXT,
    "moradoresEncontrados" INTEGER,
    "parecer" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "fotos" JSONB NOT NULL DEFAULT '[]',
    "proximaVisitaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "acompanhamento_unidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eixo_acompanhamento" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "acompanhamentoId" TEXT NOT NULL,
    "eixo" "EixoTrabalhoSocial" NOT NULL,
    "situacao" "SituacaoEixo" NOT NULL DEFAULT 'NAO_AVALIADA',
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "eixo_acompanhamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ocorrencia_unidade" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "tipo" "TipoOcorrenciaUso" NOT NULL,
    "gravidade" "GravidadeOcorrencia" NOT NULL,
    "origem" "OrigemOcorrencia" NOT NULL,
    "situacao" "SituacaoOcorrenciaUso" NOT NULL DEFAULT 'ABERTA',
    "descricao" TEXT NOT NULL,
    "acompanhamentoId" TEXT,
    "constatadaEm" TIMESTAMP(3) NOT NULL,
    "notificadaEm" TIMESTAMP(3),
    "prazoRegularizacaoAte" TIMESTAMP(3),
    "encerradaEm" TIMESTAMP(3),
    "motivoEncerramento" TEXT,
    "encaminhamentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "ocorrencia_unidade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "acompanhamento_unidade_tenantId_unidadeId_visitadaEm_idx" ON "acompanhamento_unidade"("tenantId", "unidadeId", "visitadaEm");

-- CreateIndex
CREATE UNIQUE INDEX "acompanhamento_unidade_tenantId_protocolo_key" ON "acompanhamento_unidade"("tenantId", "protocolo");

-- CreateIndex
CREATE INDEX "eixo_acompanhamento_tenantId_eixo_situacao_idx" ON "eixo_acompanhamento"("tenantId", "eixo", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "eixo_acompanhamento_acompanhamentoId_eixo_key" ON "eixo_acompanhamento"("acompanhamentoId", "eixo");

-- CreateIndex
CREATE INDEX "ocorrencia_unidade_tenantId_unidadeId_situacao_idx" ON "ocorrencia_unidade"("tenantId", "unidadeId", "situacao");

-- CreateIndex
CREATE INDEX "ocorrencia_unidade_tenantId_situacao_prazoRegularizacaoAte_idx" ON "ocorrencia_unidade"("tenantId", "situacao", "prazoRegularizacaoAte");

-- CreateIndex
CREATE UNIQUE INDEX "ocorrencia_unidade_tenantId_protocolo_key" ON "ocorrencia_unidade"("tenantId", "protocolo");

-- AddForeignKey
ALTER TABLE "acompanhamento_unidade" ADD CONSTRAINT "acompanhamento_unidade_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidade_habitacional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eixo_acompanhamento" ADD CONSTRAINT "eixo_acompanhamento_acompanhamentoId_fkey" FOREIGN KEY ("acompanhamentoId") REFERENCES "acompanhamento_unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencia_unidade" ADD CONSTRAINT "ocorrencia_unidade_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidade_habitacional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencia_unidade" ADD CONSTRAINT "ocorrencia_unidade_acompanhamentoId_fkey" FOREIGN KEY ("acompanhamentoId") REFERENCES "acompanhamento_unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS do pós-entrega.
--
-- Isolamento por tenant, sem bypass de plataforma: parecer social e ocorrência de uso indevido
-- dizem quem mora onde e o que se suspeita da família — não é dado de administração de SaaS.
--
-- A família NÃO enxerga estes registros. Parecer técnico e apuração em curso são peça de
-- processo administrativo: o que ela recebe é a notificação, com prazo e direito de defesa, não o
-- rascunho da suspeita.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  tabela text;
  tabelas text[] := ARRAY['acompanhamento_unidade', 'eixo_acompanhamento', 'ocorrencia_unidade'];
BEGIN
  FOREACH tabela IN ARRAY tabelas LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tabela);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tabela);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tabela);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("tenantId" = app_current_tenant()) WITH CHECK ("tenantId" = app_current_tenant())',
      tabela
    );
  END LOOP;
END
$$;
