-- CreateEnum
CREATE TYPE "FaseRetomada" AS ENUM ('ABERTO', 'NOTIFICADO', 'EM_DEFESA', 'EM_ANALISE', 'DECIDIDO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "FormaNotificacao" AS ENUM ('PESSOAL', 'AR_CORREIO', 'EDITAL');

-- CreateEnum
CREATE TYPE "DecisaoRetomada" AS ENUM ('REGULARIZACAO', 'ACORDO', 'RESCISAO', 'ARQUIVAMENTO');

-- AlterEnum
ALTER TYPE "SerieProtocolo" ADD VALUE 'RET';

-- CreateTable
CREATE TABLE "caso_retomada" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "ocorrenciaId" TEXT,
    "protocolo" TEXT NOT NULL,
    "fase" "FaseRetomada" NOT NULL DEFAULT 'ABERTO',
    "fundamentacaoLegal" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "abertoEm" TIMESTAMP(3) NOT NULL,
    "notificadoEm" TIMESTAMP(3),
    "formaNotificacao" "FormaNotificacao",
    "comprovanteKey" TEXT,
    "tentativasFrustradas" INTEGER NOT NULL DEFAULT 0,
    "prazoDefesaAte" TIMESTAMP(3),
    "defesaApresentadaEm" TIMESTAMP(3),
    "defesaTeor" TEXT,
    "defesaArquivoKey" TEXT,
    "defesaApresentadaPor" TEXT,
    "decisao" "DecisaoRetomada",
    "decididoEm" TIMESTAMP(3),
    "decididoPor" TEXT,
    "fundamentacaoDecisao" TEXT,
    "encaminhamentoId" TEXT,
    "pilhaId" TEXT,
    "encerradoEm" TIMESTAMP(3),
    "motivoEncerramento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "caso_retomada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ato_do_caso" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "casoId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "ocorridoEm" TIMESTAMP(3) NOT NULL,
    "titulo" TEXT NOT NULL,
    "detalhe" TEXT,
    "autor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "ato_do_caso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "caso_retomada_tenantId_unidadeId_fase_idx" ON "caso_retomada"("tenantId", "unidadeId", "fase");

-- CreateIndex
CREATE INDEX "caso_retomada_tenantId_fase_prazoDefesaAte_idx" ON "caso_retomada"("tenantId", "fase", "prazoDefesaAte");

-- CreateIndex
CREATE UNIQUE INDEX "caso_retomada_tenantId_protocolo_key" ON "caso_retomada"("tenantId", "protocolo");

-- CreateIndex
CREATE INDEX "ato_do_caso_tenantId_casoId_ordem_idx" ON "ato_do_caso"("tenantId", "casoId", "ordem");

-- AddForeignKey
ALTER TABLE "caso_retomada" ADD CONSTRAINT "caso_retomada_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidade_habitacional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caso_retomada" ADD CONSTRAINT "caso_retomada_ocorrenciaId_fkey" FOREIGN KEY ("ocorrenciaId") REFERENCES "ocorrencia_unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ato_do_caso" ADD CONSTRAINT "ato_do_caso_casoId_fkey" FOREIGN KEY ("casoId") REFERENCES "caso_retomada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS do processo de retomada.
--
-- Isolamento por tenant, sem bypass de plataforma.
--
-- A família ENXERGA o próprio caso — e aqui a exceção não é conveniência, é requisito: ninguém se
-- defende do que não sabe. A central mostra o caso, o prazo e a linha do tempo a partir da
-- notificação; antes disso o caso é instrução interna, e abrir a apuração em curso daria à família
-- ciência sem forma legal, o que não conta como notificação e ainda atrapalharia a apuração.
--
-- Só leitura. A defesa é ato que precisa de forma: hoje entra pelo balcão, registrada por servidor
-- (a policy de escrita do munícipe é dívida conhecida do produto).
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  tabela text;
  tabelas text[] := ARRAY['caso_retomada', 'ato_do_caso'];
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

DROP POLICY IF EXISTS municipe_proprio_caso ON "caso_retomada";
CREATE POLICY municipe_proprio_caso ON "caso_retomada" FOR SELECT
  USING (
    "notificadoEm" IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM "unidade_habitacional" u
      WHERE u."id" = "caso_retomada"."unidadeId"
        AND u."familiaId" = app_current_familia()
    )
  );

DROP POLICY IF EXISTS municipe_atos_do_proprio_caso ON "ato_do_caso";
CREATE POLICY municipe_atos_do_proprio_caso ON "ato_do_caso" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "caso_retomada" c
      JOIN "unidade_habitacional" u ON u."id" = c."unidadeId"
      WHERE c."id" = "ato_do_caso"."casoId"
        AND c."notificadoEm" IS NOT NULL
        AND u."familiaId" = app_current_familia()
    )
  );
