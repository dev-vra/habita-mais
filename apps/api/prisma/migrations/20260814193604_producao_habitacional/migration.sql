-- CreateEnum
CREATE TYPE "SituacaoConvenio" AS ENUM ('EM_ELABORACAO', 'VIGENTE', 'SUSPENSO', 'ENCERRADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "SituacaoEmpreendimento" AS ENUM ('PLANEJAMENTO', 'EM_OBRA', 'CONCLUIDO', 'ENTREGUE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "SituacaoObra" AS ENUM ('NAO_INICIADA', 'EM_EXECUCAO', 'PARALISADA', 'CONCLUIDA', 'RESCINDIDA');

-- CreateEnum
CREATE TYPE "SituacaoMedicao" AS ENUM ('RASCUNHO', 'APROVADA', 'REJEITADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "SituacaoUnidade" AS ENUM ('PLANEJADA', 'EM_OBRA', 'PRONTA', 'ENTREGUE', 'DESOCUPADA', 'EM_LITIGIO', 'RETOMADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "OrigemRecurso" AS ENUM ('FEDERAL', 'ESTADUAL', 'MUNICIPAL', 'FGTS', 'FINANCIAMENTO', 'EMENDA_PARLAMENTAR', 'OUTRA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SerieProtocolo" ADD VALUE 'CNV';
ALTER TYPE "SerieProtocolo" ADD VALUE 'EMP';
ALTER TYPE "SerieProtocolo" ADD VALUE 'MED';
ALTER TYPE "SerieProtocolo" ADD VALUE 'UNI';

-- CreateTable
CREATE TABLE "convenio" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "numeroExterno" TEXT,
    "objeto" TEXT NOT NULL,
    "origem" "OrigemRecurso" NOT NULL,
    "orgaoRepassador" TEXT NOT NULL,
    "valorRepasse" DECIMAL(14,2) NOT NULL,
    "valorContrapartida" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "vigenciaInicio" TIMESTAMP(3) NOT NULL,
    "vigenciaFim" TIMESTAMP(3) NOT NULL,
    "situacao" "SituacaoConvenio" NOT NULL DEFAULT 'EM_ELABORACAO',
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "convenio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empreendimento" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "convenioId" TEXT,
    "programaId" TEXT,
    "endereco" TEXT NOT NULL,
    "bairro" TEXT NOT NULL,
    "cep" CHAR(8),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "unidadesPrevistas" INTEGER NOT NULL,
    "situacao" "SituacaoEmpreendimento" NOT NULL DEFAULT 'PLANEJAMENTO',
    "previsaoEntrega" TIMESTAMP(3),
    "entregueEm" TIMESTAMP(3),
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "empreendimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "obra" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "empreendimentoId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "executoraNome" TEXT NOT NULL,
    "executoraCnpj" VARCHAR(14) NOT NULL,
    "numeroContrato" TEXT NOT NULL,
    "artRrt" TEXT,
    "valorContrato" DECIMAL(14,2) NOT NULL,
    "valorMedido" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "percentualExecutado" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "inicioPrevisto" TIMESTAMP(3) NOT NULL,
    "terminoPrevisto" TIMESTAMP(3) NOT NULL,
    "inicioReal" TIMESTAMP(3),
    "terminoReal" TIMESTAMP(3),
    "situacao" "SituacaoObra" NOT NULL DEFAULT 'NAO_INICIADA',
    "motivoParalisacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etapa_obra" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "peso" DECIMAL(5,2) NOT NULL,
    "executado" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "previstaAte" TIMESTAMP(3) NOT NULL,
    "concluidaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "etapa_obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicao" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "obraId" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "periodoInicio" TIMESTAMP(3) NOT NULL,
    "periodoFim" TIMESTAMP(3) NOT NULL,
    "percentualAcumulado" DECIMAL(5,2) NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "situacao" "SituacaoMedicao" NOT NULL DEFAULT 'RASCUNHO',
    "fiscalNome" TEXT NOT NULL,
    "fiscalId" TEXT,
    "aprovadaEm" TIMESTAMP(3),
    "aprovadaPor" TEXT,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "medicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidade_habitacional" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "empreendimentoId" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "identificacao" TEXT NOT NULL,
    "quadra" TEXT,
    "lote" TEXT,
    "endereco" TEXT NOT NULL,
    "cep" CHAR(8),
    "tipologia" TEXT,
    "areaConstruida" DECIMAL(8,2),
    "areaTerreno" DECIMAL(10,2),
    "matricula" TEXT,
    "cartorio" TEXT,
    "inscricaoImobiliaria" TEXT,
    "valorAvaliado" DECIMAL(14,2),
    "situacao" "SituacaoUnidade" NOT NULL DEFAULT 'PLANEJADA',
    "familiaId" TEXT,
    "entregueEm" TIMESTAMP(3),
    "motivoSituacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "unidade_habitacional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "convenio_tenantId_situacao_idx" ON "convenio"("tenantId", "situacao");

-- CreateIndex
CREATE INDEX "convenio_tenantId_vigenciaFim_idx" ON "convenio"("tenantId", "vigenciaFim");

-- CreateIndex
CREATE UNIQUE INDEX "convenio_tenantId_protocolo_key" ON "convenio"("tenantId", "protocolo");

-- CreateIndex
CREATE INDEX "empreendimento_tenantId_situacao_idx" ON "empreendimento"("tenantId", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "empreendimento_tenantId_slug_key" ON "empreendimento"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "empreendimento_tenantId_protocolo_key" ON "empreendimento"("tenantId", "protocolo");

-- CreateIndex
CREATE INDEX "obra_tenantId_empreendimentoId_idx" ON "obra"("tenantId", "empreendimentoId");

-- CreateIndex
CREATE INDEX "obra_tenantId_situacao_idx" ON "obra"("tenantId", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "obra_tenantId_numeroContrato_key" ON "obra"("tenantId", "numeroContrato");

-- CreateIndex
CREATE INDEX "etapa_obra_tenantId_obraId_idx" ON "etapa_obra"("tenantId", "obraId");

-- CreateIndex
CREATE UNIQUE INDEX "etapa_obra_obraId_codigo_key" ON "etapa_obra"("obraId", "codigo");

-- CreateIndex
CREATE INDEX "medicao_tenantId_obraId_situacao_idx" ON "medicao"("tenantId", "obraId", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "medicao_tenantId_protocolo_key" ON "medicao"("tenantId", "protocolo");

-- CreateIndex
CREATE UNIQUE INDEX "medicao_obraId_numero_key" ON "medicao"("obraId", "numero");

-- CreateIndex
CREATE INDEX "unidade_habitacional_tenantId_situacao_idx" ON "unidade_habitacional"("tenantId", "situacao");

-- CreateIndex
CREATE INDEX "unidade_habitacional_tenantId_familiaId_idx" ON "unidade_habitacional"("tenantId", "familiaId");

-- CreateIndex
CREATE UNIQUE INDEX "unidade_habitacional_tenantId_protocolo_key" ON "unidade_habitacional"("tenantId", "protocolo");

-- CreateIndex
CREATE UNIQUE INDEX "unidade_habitacional_empreendimentoId_identificacao_key" ON "unidade_habitacional"("empreendimentoId", "identificacao");

-- AddForeignKey
ALTER TABLE "convenio" ADD CONSTRAINT "convenio_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empreendimento" ADD CONSTRAINT "empreendimento_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empreendimento" ADD CONSTRAINT "empreendimento_convenioId_fkey" FOREIGN KEY ("convenioId") REFERENCES "convenio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empreendimento" ADD CONSTRAINT "empreendimento_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "programa_habitacional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obra" ADD CONSTRAINT "obra_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "obra" ADD CONSTRAINT "obra_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "empreendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "etapa_obra" ADD CONSTRAINT "etapa_obra_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicao" ADD CONSTRAINT "medicao_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "obra"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidade_habitacional" ADD CONSTRAINT "unidade_habitacional_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidade_habitacional" ADD CONSTRAINT "unidade_habitacional_empreendimentoId_fkey" FOREIGN KEY ("empreendimentoId") REFERENCES "empreendimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidade_habitacional" ADD CONSTRAINT "unidade_habitacional_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "familia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS da produção habitacional.
--
-- Mesmo isolamento por tenant do resto, sem bypass de plataforma: contrato de obra, valor medido e
-- endereço de família contemplada não são dado de administração de SaaS.
--
-- Uma exceção deliberada: o munícipe enxerga a própria unidade e o conjunto onde ela fica. Depois
-- da entrega, a central é onde a família acompanha a própria casa — e negar isso obrigaria a
-- prefeitura a informar por telefone o que o sistema já sabe.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  tabela text;
  tabelas text[] := ARRAY['convenio', 'empreendimento', 'obra', 'etapa_obra', 'medicao', 'unidade_habitacional'];
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

-- A casa da família aparece para a família. Só leitura: mudança de situação de unidade é ato da
-- prefeitura, com motivo registrado (§9).
DROP POLICY IF EXISTS municipe_propria_unidade ON "unidade_habitacional";
CREATE POLICY municipe_propria_unidade ON "unidade_habitacional" FOR SELECT
  USING ("familiaId" IS NOT NULL AND "familiaId" = app_current_familia());

-- O conjunto onde a casa fica — nome e endereço, pelo mesmo caminho. Sem isto a central mostraria
-- a unidade sem conseguir dizer de que empreendimento ela é.
DROP POLICY IF EXISTS municipe_empreendimento_da_unidade ON "empreendimento";
CREATE POLICY municipe_empreendimento_da_unidade ON "empreendimento" FOR SELECT
  USING (
    app_current_familia() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM "unidade_habitacional" u
      WHERE u."empreendimentoId" = "empreendimento"."id"
        AND u."familiaId" = app_current_familia()
    )
  );
