-- RLS, PostGIS e papel de aplicação.
--
-- Três decisões carregam segurança aqui, e nenhuma delas é reversível por engano:
--
-- 1. FORCE ROW LEVEL SECURITY em toda tabela — sem FORCE, o dono do banco ignora as policies e a
--    RLS vira decoração. Consequência assumida: toda conexão DML precisa setar o contexto.
-- 2. Papel `habita_app` SEM superuser e SEM BYPASSRLS é quem a aplicação usa em runtime. É a
--    dívida conhecida do Regulariza+, corrigida de saída (spec §3).
-- 3. Tabela de dado de família NÃO dá bypass para plataforma. Quem administra o SaaS configura
--    prefeitura; não lê ficha social de ninguém.
--
-- A esfera MUNÍCIPE entra por policies próprias, escopadas por app.current_familia. Como o GUC de
-- tenant fica vazio nessa esfera, as policies de tenant negam tudo por padrão — o munícipe só
-- alcança o que está explicitamente liberado abaixo, e nunca dado de terceiro.

CREATE EXTENSION IF NOT EXISTS postgis;

-- ── Helpers de contexto ──
-- STABLE + leitura de GUC: as policies chamam a cada linha, então precisa ser barato.

CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.current_tenant', true), '') $$;

CREATE OR REPLACE FUNCTION app_is_platform() RETURNS boolean
  LANGUAGE sql STABLE AS $$ SELECT COALESCE(current_setting('app.is_platform', true), '') = 'true' $$;

CREATE OR REPLACE FUNCTION app_current_familia() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.current_familia', true), '') $$;

-- ── Papel de runtime ──

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'habita_app') THEN
    -- Sem senha aqui de propósito: segredo não entra em migration versionada. A senha é
    -- sincronizada pelo script db:bootstrap-role, que é idempotente e roda no deploy.
    CREATE ROLE habita_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  ELSE
    ALTER ROLE habita_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO habita_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO habita_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO habita_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO habita_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO habita_app;

-- ── Isolamento por tenant (tabelas de domínio e de configuração do município) ──

DO $$
DECLARE
  tabela text;
  tabelas text[] := ARRAY[
    'usuario_capacidade', 'signatario', 'consulta_externa', 'contador_protocolo',
    'pessoa', 'familia', 'membro_familiar', 'ficha_social', 'visita_domiciliar',
    'consentimento_dado', 'programa_habitacional', 'versao_criterio', 'inscricao_fila',
    'pontuacao_snapshot', 'ranking_publicacao', 'ranking_item', 'convocacao', 'recurso',
    'pendencia'
  ];
  -- Bypass de plataforma só onde é configuração do município, nunca em dado de família.
  administrativas text[] := ARRAY['usuario_capacidade', 'signatario', 'contador_protocolo'];
  condicao text;
BEGIN
  FOREACH tabela IN ARRAY tabelas LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tabela);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tabela);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tabela);

    condicao := CASE
      WHEN tabela = ANY (administrativas) THEN 'app_is_platform() OR "tenantId" = app_current_tenant()'
      ELSE '"tenantId" = app_current_tenant()'
    END;

    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (%s) WITH CHECK (%s)',
      tabela, condicao, condicao
    );
  END LOOP;
END
$$;

-- ── Tenant e usuário: administração da plataforma ──

ALTER TABLE "tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "tenant";
CREATE POLICY tenant_isolation ON "tenant"
  USING (app_is_platform() OR "id" = app_current_tenant())
  WITH CHECK (app_is_platform() OR "id" = app_current_tenant());

ALTER TABLE "usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usuario" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "usuario";
CREATE POLICY tenant_isolation ON "usuario"
  USING (app_is_platform() OR "tenantId" = app_current_tenant())
  WITH CHECK (app_is_platform() OR "tenantId" = app_current_tenant());

-- Refresh token não tem tenantId: pendura no usuário, e o login roda em contexto de plataforma.
ALTER TABLE "refresh_token" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_token" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "refresh_token";
CREATE POLICY tenant_isolation ON "refresh_token"
  USING (
    app_is_platform()
    OR EXISTS (
      SELECT 1 FROM "usuario" u
      WHERE u."id" = "refresh_token"."usuarioId" AND u."tenantId" = app_current_tenant()
    )
  )
  WITH CHECK (
    app_is_platform()
    OR EXISTS (
      SELECT 1 FROM "usuario" u
      WHERE u."id" = "refresh_token"."usuarioId" AND u."tenantId" = app_current_tenant()
    )
  );

-- ── Trilha de auditoria: append-only ──
-- Sem policy de UPDATE e sem policy de DELETE. Com FORCE, nem o dono do banco reescreve a trilha
-- pela aplicação — é o que separa prova de relatório.

ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_select ON "audit_log";
CREATE POLICY audit_select ON "audit_log" FOR SELECT
  USING (app_is_platform() OR "tenantId" = app_current_tenant());

DROP POLICY IF EXISTS audit_insert ON "audit_log";
CREATE POLICY audit_insert ON "audit_log" FOR INSERT
  WITH CHECK (
    app_is_platform()
    OR "tenantId" = app_current_tenant()
    OR app_current_familia() IS NOT NULL
  );

-- ── Esfera MUNÍCIPE ──
-- Policies permissivas adicionais: valem só quando app.current_familia está setado, e sempre
-- amarradas à própria família. Leitura apenas — o único ato de escrita da central é o recurso.

DROP POLICY IF EXISTS municipe_propria_familia ON "familia";
CREATE POLICY municipe_propria_familia ON "familia" FOR SELECT
  USING ("id" = app_current_familia());

DROP POLICY IF EXISTS municipe_propria_ficha ON "ficha_social";
CREATE POLICY municipe_propria_ficha ON "ficha_social" FOR SELECT
  USING ("familiaId" = app_current_familia());

DROP POLICY IF EXISTS municipe_propria_inscricao ON "inscricao_fila";
CREATE POLICY municipe_propria_inscricao ON "inscricao_fila" FOR SELECT
  USING ("familiaId" = app_current_familia());

DO $$
DECLARE
  tabela text;
  -- Tudo que pendura na inscrição: a família enxerga o que é da própria inscrição, e só.
  tabelas text[] := ARRAY['pontuacao_snapshot', 'convocacao', 'recurso', 'pendencia', 'ranking_item'];
BEGIN
  FOREACH tabela IN ARRAY tabelas LOOP
    EXECUTE format('DROP POLICY IF EXISTS municipe_propria_inscricao ON %I', tabela);
    EXECUTE format(
      'CREATE POLICY municipe_propria_inscricao ON %I FOR SELECT USING (
         EXISTS (
           SELECT 1 FROM "inscricao_fila" i
           WHERE i."id" = %I."inscricaoId" AND i."familiaId" = app_current_familia()
         )
       )', tabela, tabela
    );
  END LOOP;
END
$$;

-- Interpor recurso é ato da família (spec §8): sem canal formal de contestação, o indeferimento
-- é vício de devido processo.
DROP POLICY IF EXISTS municipe_interpoe_recurso ON "recurso";
CREATE POLICY municipe_interpoe_recurso ON "recurso" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "inscricao_fila" i
      WHERE i."id" = "recurso"."inscricaoId" AND i."familiaId" = app_current_familia()
    )
  );

-- Regulamento e critérios do programa em que a família está inscrita: publicidade é o que
-- sustenta a defesa da fila. Só a versão publicada, nunca o rascunho em edição.
DROP POLICY IF EXISTS municipe_programa_inscrito ON "programa_habitacional";
CREATE POLICY municipe_programa_inscrito ON "programa_habitacional" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "inscricao_fila" i
      WHERE i."programaId" = "programa_habitacional"."id"
        AND i."familiaId" = app_current_familia()
    )
  );

DROP POLICY IF EXISTS municipe_criterio_publicado ON "versao_criterio";
CREATE POLICY municipe_criterio_publicado ON "versao_criterio" FOR SELECT
  USING (
    "situacao" = 'PUBLICADA'
    AND EXISTS (
      SELECT 1 FROM "inscricao_fila" i
      WHERE i."programaId" = "versao_criterio"."programaId"
        AND i."familiaId" = app_current_familia()
    )
  );

DROP POLICY IF EXISTS municipe_ranking_publicado ON "ranking_publicacao";
CREATE POLICY municipe_ranking_publicado ON "ranking_publicacao" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "inscricao_fila" i
      WHERE i."programaId" = "ranking_publicacao"."programaId"
        AND i."familiaId" = app_current_familia()
    )
  );
