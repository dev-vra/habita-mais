-- CreateEnum
CREATE TYPE "EsferaUsuario" AS ENUM ('PLATAFORMA', 'TENANT', 'MUNICIPE');

-- CreateEnum
CREATE TYPE "PerfilTenant" AS ENUM ('ADMINISTRADOR', 'GESTOR_HABITACAO', 'TECNICO_SOCIAL', 'ATENDENTE', 'FISCAL_OBRAS', 'ANALISTA_MUTUARIO', 'JURIDICO', 'FISCAL_AUDITOR');

-- CreateEnum
CREATE TYPE "StatusUsuario" AS ENUM ('ATIVO', 'BLOQUEADO', 'INATIVO');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('TENANT', 'PLATFORM', 'SYSTEM', 'MUNICIPE');

-- CreateEnum
CREATE TYPE "AuditOperation" AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'READ');

-- CreateEnum
CREATE TYPE "SerieProtocolo" AS ENUM ('HAB', 'AUX', 'MUT', 'REA', 'FIS');

-- CreateEnum
CREATE TYPE "PapelSignatario" AS ENUM ('PREFEITO', 'VICE_PREFEITO', 'SECRETARIO', 'DIRETOR_HABITACAO', 'PROCURADOR', 'OUTRO');

-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('FEMININO', 'MASCULINO', 'NAO_INFORMADO');

-- CreateEnum
CREATE TYPE "Parentesco" AS ENUM ('RESPONSAVEL', 'CONJUGE', 'FILHO', 'ENTEADO', 'PAI_MAE', 'AVO', 'NETO', 'IRMAO', 'OUTRO_PARENTE', 'NAO_PARENTE');

-- CreateEnum
CREATE TYPE "TipoMoradia" AS ENUM ('PROPRIA_QUITADA', 'PROPRIA_FINANCIADA', 'ALUGADA', 'CEDIDA', 'OCUPACAO', 'ABRIGO', 'SITUACAO_RUA', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoConstrucao" AS ENUM ('ALVENARIA', 'MADEIRA', 'MISTA', 'IMPROVISADO', 'OUTRO');

-- CreateEnum
CREATE TYPE "Saneamento" AS ENUM ('REDE_PUBLICA', 'FOSSA_SEPTICA', 'FOSSA_RUDIMENTAR', 'CEU_ABERTO', 'OUTRO');

-- CreateEnum
CREATE TYPE "OrigemFicha" AS ENUM ('PROPRIA', 'REURB');

-- CreateEnum
CREATE TYPE "SituacaoFamilia" AS ENUM ('ATIVA', 'INATIVA', 'TRANSFERIDA');

-- CreateEnum
CREATE TYPE "SituacaoPrograma" AS ENUM ('RASCUNHO', 'INSCRICOES_ABERTAS', 'INSCRICOES_ENCERRADAS', 'EM_EXECUCAO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "SituacaoVersaoCriterio" AS ENUM ('RASCUNHO', 'PUBLICADA', 'SUBSTITUIDA');

-- CreateEnum
CREATE TYPE "SituacaoInscricao" AS ENUM ('EM_ANALISE', 'PENDENTE', 'APTA', 'EM_RECURSO', 'CONVOCADA', 'CONTEMPLADA', 'INDEFERIDA', 'INELEGIVEL', 'DESISTENTE', 'CANCELADA');

-- CreateEnum
CREATE TYPE "MotivoCalculo" AS ENUM ('INSCRICAO', 'ATUALIZACAO_FICHA', 'RECALCULO_LOTE', 'RECURSO', 'RECADASTRAMENTO');

-- CreateEnum
CREATE TYPE "DesfechoConvocacao" AS ENUM ('COMPARECEU', 'NAO_COMPARECEU', 'RECUSOU', 'INELEGIVEL');

-- CreateEnum
CREATE TYPE "DecisaoRecurso" AS ENUM ('DEFERIDO', 'INDEFERIDO', 'PARCIALMENTE_DEFERIDO');

-- CreateEnum
CREATE TYPE "SituacaoPendencia" AS ENUM ('ABERTA', 'RESOLVIDA', 'DISPENSADA', 'VENCIDA');

-- CreateTable
CREATE TABLE "tenant" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" VARCHAR(14) NOT NULL,
    "municipio" TEXT NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Cuiaba',
    "brasaoKey" TEXT,
    "parametros" JSONB NOT NULL DEFAULT '{}',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "esfera" "EsferaUsuario" NOT NULL DEFAULT 'TENANT',
    "perfil" "PerfilTenant",
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cpf" CHAR(11),
    "senhaHash" TEXT NOT NULL,
    "status" "StatusUsuario" NOT NULL DEFAULT 'ATIVO',
    "trocarSenhaNoLogin" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcessoEm" TIMESTAMP(3),
    "tentativasFalhas" INTEGER NOT NULL DEFAULT 0,
    "bloqueadoAte" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_capacidade" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "capacidade" TEXT NOT NULL,
    "concedida" BOOLEAN NOT NULL DEFAULT true,
    "motivo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "usuario_capacidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_token" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signatario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "papel" "PapelSignatario" NOT NULL,
    "cargo" TEXT NOT NULL,
    "cpf" CHAR(11),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "signatario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT,
    "operation" "AuditOperation" NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "diff" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consulta_externa" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cpf" CHAR(11) NOT NULL,
    "familiaId" TEXT,
    "finalidade" TEXT NOT NULL,
    "encontrou" BOOLEAN NOT NULL,
    "resposta" JSONB,
    "consultadoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consulta_externa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contador_protocolo" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serie" "SerieProtocolo" NOT NULL,
    "ano" INTEGER NOT NULL,
    "ultimo" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contador_protocolo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pessoa" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cpf" CHAR(11) NOT NULL,
    "nome" TEXT NOT NULL,
    "nascimento" DATE,
    "sexo" "Sexo" NOT NULL DEFAULT 'NAO_INFORMADO',
    "nis" VARCHAR(11),
    "telefone" TEXT,
    "email" TEXT,
    "deficiencia" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "pessoa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "familia" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "responsavelId" TEXT NOT NULL,
    "situacao" "SituacaoFamilia" NOT NULL DEFAULT 'ATIVA',
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "familia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membro_familiar" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "pessoaId" TEXT NOT NULL,
    "parentesco" "Parentesco" NOT NULL,
    "contribuiRenda" BOOLEAN NOT NULL DEFAULT false,
    "entrouEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saiuEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "membro_familiar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ficha_social" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "rendaFamiliar" DECIMAL(14,2) NOT NULL,
    "rendaPerCapita" DECIMAL(14,2) NOT NULL,
    "fonteRendaPrincipal" TEXT,
    "nis" VARCHAR(11),
    "nisVerificado" BOOLEAN NOT NULL DEFAULT false,
    "beneficioAtivo" TEXT,
    "mulherChefeFamilia" BOOLEAN NOT NULL DEFAULT false,
    "temPessoaComDeficiencia" BOOLEAN NOT NULL DEFAULT false,
    "temIdoso" BOOLEAN NOT NULL DEFAULT false,
    "quantidadeMenores" INTEGER NOT NULL DEFAULT 0,
    "situacaoRisco" BOOLEAN NOT NULL DEFAULT false,
    "tipoMoradia" "TipoMoradia" NOT NULL,
    "tipoConstrucao" "TipoConstrucao" NOT NULL,
    "saneamento" "Saneamento" NOT NULL,
    "moradiaInadequada" BOOLEAN NOT NULL DEFAULT false,
    "possuiOutroImovel" BOOLEAN NOT NULL DEFAULT false,
    "mesesResidenciaMunicipio" INTEGER NOT NULL DEFAULT 0,
    "origem" "OrigemFicha" NOT NULL DEFAULT 'PROPRIA',
    "origemProcessoExterno" TEXT,
    "origemConsultadaEm" TIMESTAMP(3),
    "apuradaEm" TIMESTAMP(3) NOT NULL,
    "validaAte" TIMESTAMP(3) NOT NULL,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "ficha_social_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visita_domiciliar" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "visitadaEm" TIMESTAMP(3) NOT NULL,
    "parecer" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "fotos" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "visita_domiciliar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consentimento_dado" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "finalidade" TEXT NOT NULL,
    "textoVersao" TEXT NOT NULL,
    "concedidoPor" TEXT NOT NULL,
    "assinadoPor" TEXT NOT NULL,
    "concedidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revogadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "consentimento_dado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programa_habitacional" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "fonteRecurso" TEXT NOT NULL,
    "vagas" INTEGER NOT NULL,
    "inscricaoInicio" TIMESTAMP(3) NOT NULL,
    "inscricaoFim" TIMESTAMP(3) NOT NULL,
    "regulamentoKey" TEXT,
    "situacao" "SituacaoPrograma" NOT NULL DEFAULT 'RASCUNHO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "programa_habitacional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "versao_criterio" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "programaId" TEXT NOT NULL,
    "versao" INTEGER NOT NULL,
    "situacao" "SituacaoVersaoCriterio" NOT NULL DEFAULT 'RASCUNHO',
    "definicoes" JSONB NOT NULL,
    "publicadoEm" TIMESTAMP(3),
    "publicadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "versao_criterio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscricao_fila" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "programaId" TEXT NOT NULL,
    "familiaId" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "situacao" "SituacaoInscricao" NOT NULL DEFAULT 'EM_ANALISE',
    "inscritaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motivoSituacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "inscricao_fila_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pontuacao_snapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inscricaoId" TEXT NOT NULL,
    "versaoCriterioId" TEXT NOT NULL,
    "total" DECIMAL(6,1) NOT NULL,
    "totalMaximo" DECIMAL(6,1) NOT NULL,
    "itens" JSONB NOT NULL,
    "fatos" JSONB NOT NULL,
    "motivo" "MotivoCalculo" NOT NULL,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "calculadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculadoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "pontuacao_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranking_publicacao" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "programaId" TEXT NOT NULL,
    "versaoCriterioId" TEXT NOT NULL,
    "publicadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publicadoPor" TEXT NOT NULL,
    "prazoRecursoAte" TIMESTAMP(3) NOT NULL,
    "pdfKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "ranking_publicacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranking_item" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "publicacaoId" TEXT NOT NULL,
    "inscricaoId" TEXT NOT NULL,
    "posicao" INTEGER NOT NULL,
    "protocolo" TEXT NOT NULL,
    "pontuacao" DECIMAL(6,1) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranking_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "convocacao" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inscricaoId" TEXT NOT NULL,
    "numeroOficio" TEXT NOT NULL,
    "emitidaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emitidaPor" TEXT NOT NULL,
    "prazoComparecimentoAte" TIMESTAMP(3) NOT NULL,
    "oficioKey" TEXT,
    "foraDeOrdem" BOOLEAN NOT NULL DEFAULT false,
    "motivoExcecao" TEXT,
    "autorizadaPor" TEXT,
    "desfecho" "DesfechoConvocacao",
    "desfechoEm" TIMESTAMP(3),
    "desfechoPor" TEXT,
    "motivoDesfecho" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "convocacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurso" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inscricaoId" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "apresentadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "apresentadoPor" TEXT NOT NULL,
    "prazoRespostaAte" TIMESTAMP(3) NOT NULL,
    "decisao" "DecisaoRecurso",
    "fundamentacao" TEXT,
    "decididoEm" TIMESTAMP(3),
    "decididoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "recurso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pendencia" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "inscricaoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "prazoAte" TIMESTAMP(3) NOT NULL,
    "situacao" "SituacaoPendencia" NOT NULL DEFAULT 'ABERTA',
    "resolvidaEm" TIMESTAMP(3),
    "resolvidaPor" TEXT,
    "arquivoKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "pendencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_cnpj_key" ON "tenant"("cnpj");

-- CreateIndex
CREATE INDEX "tenant_ativo_idx" ON "tenant"("ativo");

-- CreateIndex
CREATE INDEX "usuario_tenantId_status_idx" ON "usuario"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "usuario_capacidade_tenantId_idx" ON "usuario_capacidade"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_capacidade_usuarioId_capacidade_key" ON "usuario_capacidade"("usuarioId", "capacidade");

-- CreateIndex
CREATE INDEX "refresh_token_usuarioId_idx" ON "refresh_token"("usuarioId");

-- CreateIndex
CREATE INDEX "signatario_tenantId_ativo_idx" ON "signatario"("tenantId", "ativo");

-- CreateIndex
CREATE INDEX "audit_log_tenantId_entity_entityId_idx" ON "audit_log"("tenantId", "entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_log_tenantId_createdAt_idx" ON "audit_log"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_log_actorId_idx" ON "audit_log"("actorId");

-- CreateIndex
CREATE INDEX "consulta_externa_tenantId_cpf_idx" ON "consulta_externa"("tenantId", "cpf");

-- CreateIndex
CREATE INDEX "consulta_externa_tenantId_createdAt_idx" ON "consulta_externa"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "contador_protocolo_tenantId_serie_ano_key" ON "contador_protocolo"("tenantId", "serie", "ano");

-- CreateIndex
CREATE INDEX "pessoa_tenantId_nome_idx" ON "pessoa"("tenantId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "pessoa_tenantId_cpf_key" ON "pessoa"("tenantId", "cpf");

-- CreateIndex
CREATE INDEX "familia_tenantId_situacao_idx" ON "familia"("tenantId", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "familia_tenantId_codigo_key" ON "familia"("tenantId", "codigo");

-- CreateIndex
CREATE INDEX "membro_familiar_tenantId_idx" ON "membro_familiar"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "membro_familiar_familiaId_pessoaId_key" ON "membro_familiar"("familiaId", "pessoaId");

-- CreateIndex
CREATE INDEX "ficha_social_tenantId_familiaId_vigente_idx" ON "ficha_social"("tenantId", "familiaId", "vigente");

-- CreateIndex
CREATE INDEX "ficha_social_tenantId_validaAte_idx" ON "ficha_social"("tenantId", "validaAte");

-- CreateIndex
CREATE INDEX "visita_domiciliar_tenantId_familiaId_idx" ON "visita_domiciliar"("tenantId", "familiaId");

-- CreateIndex
CREATE INDEX "consentimento_dado_tenantId_familiaId_idx" ON "consentimento_dado"("tenantId", "familiaId");

-- CreateIndex
CREATE INDEX "programa_habitacional_tenantId_situacao_idx" ON "programa_habitacional"("tenantId", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "programa_habitacional_tenantId_slug_key" ON "programa_habitacional"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "versao_criterio_tenantId_programaId_situacao_idx" ON "versao_criterio"("tenantId", "programaId", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "versao_criterio_programaId_versao_key" ON "versao_criterio"("programaId", "versao");

-- CreateIndex
CREATE INDEX "inscricao_fila_tenantId_programaId_situacao_idx" ON "inscricao_fila"("tenantId", "programaId", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "inscricao_fila_tenantId_protocolo_key" ON "inscricao_fila"("tenantId", "protocolo");

-- CreateIndex
CREATE UNIQUE INDEX "inscricao_fila_programaId_familiaId_key" ON "inscricao_fila"("programaId", "familiaId");

-- CreateIndex
CREATE INDEX "pontuacao_snapshot_tenantId_inscricaoId_vigente_idx" ON "pontuacao_snapshot"("tenantId", "inscricaoId", "vigente");

-- CreateIndex
CREATE INDEX "pontuacao_snapshot_tenantId_calculadoEm_idx" ON "pontuacao_snapshot"("tenantId", "calculadoEm");

-- CreateIndex
CREATE INDEX "ranking_publicacao_tenantId_programaId_publicadoEm_idx" ON "ranking_publicacao"("tenantId", "programaId", "publicadoEm");

-- CreateIndex
CREATE INDEX "ranking_item_tenantId_publicacaoId_idx" ON "ranking_item"("tenantId", "publicacaoId");

-- CreateIndex
CREATE UNIQUE INDEX "ranking_item_publicacaoId_inscricaoId_key" ON "ranking_item"("publicacaoId", "inscricaoId");

-- CreateIndex
CREATE UNIQUE INDEX "ranking_item_publicacaoId_posicao_key" ON "ranking_item"("publicacaoId", "posicao");

-- CreateIndex
CREATE INDEX "convocacao_tenantId_inscricaoId_idx" ON "convocacao"("tenantId", "inscricaoId");

-- CreateIndex
CREATE INDEX "convocacao_tenantId_foraDeOrdem_idx" ON "convocacao"("tenantId", "foraDeOrdem");

-- CreateIndex
CREATE UNIQUE INDEX "convocacao_tenantId_numeroOficio_key" ON "convocacao"("tenantId", "numeroOficio");

-- CreateIndex
CREATE INDEX "recurso_tenantId_inscricaoId_idx" ON "recurso"("tenantId", "inscricaoId");

-- CreateIndex
CREATE INDEX "recurso_tenantId_prazoRespostaAte_idx" ON "recurso"("tenantId", "prazoRespostaAte");

-- CreateIndex
CREATE UNIQUE INDEX "recurso_tenantId_protocolo_key" ON "recurso"("tenantId", "protocolo");

-- CreateIndex
CREATE INDEX "pendencia_tenantId_inscricaoId_situacao_idx" ON "pendencia"("tenantId", "inscricaoId", "situacao");

-- CreateIndex
CREATE INDEX "pendencia_tenantId_prazoAte_idx" ON "pendencia"("tenantId", "prazoAte");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_capacidade" ADD CONSTRAINT "usuario_capacidade_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_token" ADD CONSTRAINT "refresh_token_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatario" ADD CONSTRAINT "signatario_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consulta_externa" ADD CONSTRAINT "consulta_externa_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "familia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pessoa" ADD CONSTRAINT "pessoa_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "familia" ADD CONSTRAINT "familia_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "familia" ADD CONSTRAINT "familia_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membro_familiar" ADD CONSTRAINT "membro_familiar_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membro_familiar" ADD CONSTRAINT "membro_familiar_pessoaId_fkey" FOREIGN KEY ("pessoaId") REFERENCES "pessoa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ficha_social" ADD CONSTRAINT "ficha_social_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visita_domiciliar" ADD CONSTRAINT "visita_domiciliar_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consentimento_dado" ADD CONSTRAINT "consentimento_dado_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "familia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programa_habitacional" ADD CONSTRAINT "programa_habitacional_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "versao_criterio" ADD CONSTRAINT "versao_criterio_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "programa_habitacional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricao_fila" ADD CONSTRAINT "inscricao_fila_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "programa_habitacional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricao_fila" ADD CONSTRAINT "inscricao_fila_familiaId_fkey" FOREIGN KEY ("familiaId") REFERENCES "familia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pontuacao_snapshot" ADD CONSTRAINT "pontuacao_snapshot_inscricaoId_fkey" FOREIGN KEY ("inscricaoId") REFERENCES "inscricao_fila"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pontuacao_snapshot" ADD CONSTRAINT "pontuacao_snapshot_versaoCriterioId_fkey" FOREIGN KEY ("versaoCriterioId") REFERENCES "versao_criterio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranking_publicacao" ADD CONSTRAINT "ranking_publicacao_programaId_fkey" FOREIGN KEY ("programaId") REFERENCES "programa_habitacional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranking_publicacao" ADD CONSTRAINT "ranking_publicacao_versaoCriterioId_fkey" FOREIGN KEY ("versaoCriterioId") REFERENCES "versao_criterio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranking_item" ADD CONSTRAINT "ranking_item_publicacaoId_fkey" FOREIGN KEY ("publicacaoId") REFERENCES "ranking_publicacao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ranking_item" ADD CONSTRAINT "ranking_item_inscricaoId_fkey" FOREIGN KEY ("inscricaoId") REFERENCES "inscricao_fila"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convocacao" ADD CONSTRAINT "convocacao_inscricaoId_fkey" FOREIGN KEY ("inscricaoId") REFERENCES "inscricao_fila"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurso" ADD CONSTRAINT "recurso_inscricaoId_fkey" FOREIGN KEY ("inscricaoId") REFERENCES "inscricao_fila"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendencia" ADD CONSTRAINT "pendencia_inscricaoId_fkey" FOREIGN KEY ("inscricaoId") REFERENCES "inscricao_fila"("id") ON DELETE CASCADE ON UPDATE CASCADE;
