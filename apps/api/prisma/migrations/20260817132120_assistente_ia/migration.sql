-- CreateEnum
CREATE TYPE "UsoIA" AS ENUM ('RASCUNHO_PARECER_VISITA', 'RASCUNHO_PARECER_SOCIAL', 'RASCUNHO_FUNDAMENTACAO_RECURSO', 'RESUMO_ENCAMINHAMENTO', 'EXTRACAO_DOCUMENTO');

-- CreateEnum
CREATE TYPE "DesfechoSugestao" AS ENUM ('PROPOSTA', 'ACEITA', 'EDITADA', 'REJEITADA');

-- CreateTable
CREATE TABLE "sugestao_ia" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "uso" "UsoIA" NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "entradaEnviada" TEXT NOT NULL,
    "respostaBruta" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "desfecho" "DesfechoSugestao" NOT NULL DEFAULT 'PROPOSTA',
    "textoFinal" TEXT,
    "decididoEm" TIMESTAMP(3),
    "solicitadoPor" TEXT NOT NULL,
    "decididoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "sugestao_ia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sugestao_ia_tenantId_uso_createdAt_idx" ON "sugestao_ia"("tenantId", "uso", "createdAt");

-- CreateIndex
CREATE INDEX "sugestao_ia_tenantId_entidade_entidadeId_idx" ON "sugestao_ia"("tenantId", "entidade", "entidadeId");

-- RLS do registro de sugestões.
--
-- Mesmo isolamento por tenant do resto. Sem exceção para o munícipe: o rascunho é peça interna de
-- trabalho, e mostrar à família o texto que a máquina propôs antes de alguém revisar seria dar
-- estatuto de ato ao que ainda é minuta.
DO $$
DECLARE
  tabela text;
  tabelas text[] := ARRAY['sugestao_ia'];
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
