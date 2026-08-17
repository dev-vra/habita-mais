-- CreateEnum
CREATE TYPE "SituacaoContrato" AS ENUM ('EM_ELABORACAO', 'VIGENTE', 'SUSPENSO', 'RENEGOCIADO', 'QUITADO', 'RESCINDIDO', 'TRANSFERIDO');

-- CreateEnum
CREATE TYPE "SituacaoParcela" AS ENUM ('ABERTA', 'PAGA', 'PAGA_PARCIAL', 'VENCIDA', 'RENEGOCIADA', 'ISENTA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "IndiceReajuste" AS ENUM ('SEM_REAJUSTE', 'INPC', 'IPCA', 'TR', 'SALARIO_MINIMO');

-- CreateEnum
CREATE TYPE "FormaPagamento" AS ENUM ('BOLETO', 'PIX', 'DINHEIRO', 'TRANSFERENCIA', 'DESCONTO_FOLHA', 'OUTRA');

-- CreateEnum
CREATE TYPE "MotivoTransferencia" AS ENUM ('OBITO_TITULAR', 'SEPARACAO_DIVORCIO', 'ABANDONO_LAR', 'DECISAO_JUDICIAL', 'OUTRO');

-- CreateTable
CREATE TABLE "contrato_mutuario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "titularId" TEXT NOT NULL,
    "valorUnidade" DECIMAL(14,2) NOT NULL,
    "valorSubsidio" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valorFinanciado" DECIMAL(14,2) NOT NULL,
    "valorEntrada" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "quantidadeParcelas" INTEGER NOT NULL,
    "valorParcela" DECIMAL(14,2) NOT NULL,
    "diaVencimento" INTEGER NOT NULL DEFAULT 10,
    "indiceReajuste" "IndiceReajuste" NOT NULL DEFAULT 'SEM_REAJUSTE',
    "ultimoReajusteEm" TIMESTAMP(3),
    "assinadoEm" TIMESTAMP(3) NOT NULL,
    "primeiraCompetencia" TEXT NOT NULL,
    "situacao" "SituacaoContrato" NOT NULL DEFAULT 'EM_ELABORACAO',
    "motivoSituacao" TEXT,
    "tituloGarantiaKey" TEXT,
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "contrato_mutuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcela_contrato" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "competencia" TEXT NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "valorPago" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "situacao" "SituacaoParcela" NOT NULL DEFAULT 'ABERTA',
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "parcela_contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamento_parcela" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parcelaId" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "pagoEm" TIMESTAMP(3) NOT NULL,
    "forma" "FormaPagamento" NOT NULL DEFAULT 'BOLETO',
    "comprovanteKey" TEXT,
    "baixadoPor" TEXT NOT NULL,
    "estornadoEm" TIMESTAMP(3),
    "estornadoPor" TEXT,
    "motivoEstorno" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "pagamento_parcela_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "renegociacao_contrato" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "saldoRenegociado" DECIMAL(14,2) NOT NULL,
    "parcelasSubstituidas" INTEGER NOT NULL,
    "novaQuantidade" INTEGER NOT NULL,
    "novoValorParcela" DECIMAL(14,2) NOT NULL,
    "primeiraCompetencia" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "autorizadaPor" TEXT NOT NULL,
    "acordoKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "renegociacao_contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transferencia_titularidade" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "motivo" "MotivoTransferencia" NOT NULL,
    "deTitularId" TEXT NOT NULL,
    "paraTitularId" TEXT NOT NULL,
    "deFamiliaId" TEXT NOT NULL,
    "paraFamiliaId" TEXT NOT NULL,
    "fundamentacao" TEXT NOT NULL,
    "autorizadaPor" TEXT NOT NULL,
    "efetivadaEm" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "transferencia_titularidade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contrato_mutuario_tenantId_situacao_idx" ON "contrato_mutuario"("tenantId", "situacao");

-- CreateIndex
CREATE INDEX "contrato_mutuario_tenantId_familiaId_idx" ON "contrato_mutuario"("tenantId", "familiaId");

-- CreateIndex
CREATE INDEX "contrato_mutuario_tenantId_unidadeId_idx" ON "contrato_mutuario"("tenantId", "unidadeId");

-- CreateIndex
CREATE UNIQUE INDEX "contrato_mutuario_tenantId_protocolo_key" ON "contrato_mutuario"("tenantId", "protocolo");

-- CreateIndex
CREATE INDEX "parcela_contrato_tenantId_contratoId_situacao_idx" ON "parcela_contrato"("tenantId", "contratoId", "situacao");

-- CreateIndex
CREATE INDEX "parcela_contrato_tenantId_vencimento_idx" ON "parcela_contrato"("tenantId", "vencimento");

-- CreateIndex
CREATE UNIQUE INDEX "parcela_contrato_contratoId_numero_key" ON "parcela_contrato"("contratoId", "numero");

-- CreateIndex
CREATE INDEX "pagamento_parcela_tenantId_parcelaId_idx" ON "pagamento_parcela"("tenantId", "parcelaId");

-- CreateIndex
CREATE INDEX "pagamento_parcela_tenantId_pagoEm_idx" ON "pagamento_parcela"("tenantId", "pagoEm");

-- CreateIndex
CREATE INDEX "renegociacao_contrato_tenantId_contratoId_idx" ON "renegociacao_contrato"("tenantId", "contratoId");

-- CreateIndex
CREATE INDEX "transferencia_titularidade_tenantId_contratoId_idx" ON "transferencia_titularidade"("tenantId", "contratoId");

-- AddForeignKey
ALTER TABLE "contrato_mutuario" ADD CONSTRAINT "contrato_mutuario_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "unidade_habitacional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_mutuario" ADD CONSTRAINT "contrato_mutuario_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "familia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrato_mutuario" ADD CONSTRAINT "contrato_mutuario_titularId_fkey" FOREIGN KEY ("titularId") REFERENCES "pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcela_contrato" ADD CONSTRAINT "parcela_contrato_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contrato_mutuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamento_parcela" ADD CONSTRAINT "pagamento_parcela_parcelaId_fkey" FOREIGN KEY ("parcelaId") REFERENCES "parcela_contrato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "renegociacao_contrato" ADD CONSTRAINT "renegociacao_contrato_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contrato_mutuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transferencia_titularidade" ADD CONSTRAINT "transferencia_titularidade_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contrato_mutuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS dos contratos.
--
-- Isolamento por tenant, sem bypass de plataforma: saldo devedor e histórico de pagamento são
-- dado financeiro de família, não de administração de SaaS.
--
-- A família enxerga o próprio contrato e o próprio carnê. É o mínimo de um contrato: quem deve
-- precisa poder ver quanto deve, o que já pagou e quando vence a próxima — sem depender de ligar
-- para a prefeitura. Só leitura; baixa de pagamento é ato de servidor.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  tabela text;
  tabelas text[] := ARRAY['contrato_mutuario', 'parcela_contrato', 'pagamento_parcela',
                          'renegociacao_contrato', 'transferencia_titularidade'];
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

DROP POLICY IF EXISTS municipe_proprio_contrato ON "contrato_mutuario";
CREATE POLICY municipe_proprio_contrato ON "contrato_mutuario" FOR SELECT
  USING ("familiaId" = app_current_familia());

DROP POLICY IF EXISTS municipe_proprio_carne ON "parcela_contrato";
CREATE POLICY municipe_proprio_carne ON "parcela_contrato" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "contrato_mutuario" c
      WHERE c."id" = "parcela_contrato"."contratoId" AND c."familiaId" = app_current_familia()
    )
  );

-- O recibo é da família: sem isto, ela veria a parcela quitada sem conseguir provar quando pagou.
DROP POLICY IF EXISTS municipe_proprios_pagamentos ON "pagamento_parcela";
CREATE POLICY municipe_proprios_pagamentos ON "pagamento_parcela" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "parcela_contrato" p
      JOIN "contrato_mutuario" c ON c."id" = p."contratoId"
      WHERE p."id" = "pagamento_parcela"."parcelaId" AND c."familiaId" = app_current_familia()
    )
  );
