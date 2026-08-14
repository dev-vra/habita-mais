-- RLS das tabelas organizacionais e da tramitação entre setores.
--
-- O setor externo (Defesa Civil, Jurídico, Obras) entra com o MESMO default-deny do munícipe: o
-- GUC de tenant fica vazio, então toda policy de tenant nega, e o acesso vem só das policies
-- baseadas em `app.current_setor`. Consequência deliberada: um usuário da Defesa Civil não
-- alcança família, ficha social nem fila — ele lê o encaminhamento e o resumo que a Habitação
-- escreveu nele, e nada mais.
--
-- É a mesma decisão da fronteira com o Regulariza+: o que atravessa é o que foi declarado.

CREATE OR REPLACE FUNCTION app_current_setor() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.current_setor', true), '') $$;

-- ── Setor: tabela de configuração do município ──

ALTER TABLE "setor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "setor" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "setor";
CREATE POLICY tenant_isolation ON "setor"
  USING (app_is_platform() OR "tenantId" = app_current_tenant())
  WITH CHECK (app_is_platform() OR "tenantId" = app_current_tenant());

-- O servidor de setor externo precisa enxergar o próprio setor (e só ele) para a interface saber
-- em nome de quem ele responde.
DROP POLICY IF EXISTS setor_proprio ON "setor";
CREATE POLICY setor_proprio ON "setor" FOR SELECT USING ("id" = app_current_setor());

-- ── Encaminhamento ──

ALTER TABLE "encaminhamento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "encaminhamento" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "encaminhamento";
CREATE POLICY tenant_isolation ON "encaminhamento"
  USING ("tenantId" = app_current_tenant())
  WITH CHECK ("tenantId" = app_current_tenant());

-- Setor externo vê o que enviou e o que recebeu. Responder é UPDATE na própria linha; abrir
-- encaminhamento continua sendo ato da Habitação (INSERT exige o contexto de tenant).
DROP POLICY IF EXISTS setor_envolvido_leitura ON "encaminhamento";
CREATE POLICY setor_envolvido_leitura ON "encaminhamento" FOR SELECT
  USING ("setorOrigemId" = app_current_setor() OR "setorDestinoId" = app_current_setor());

DROP POLICY IF EXISTS setor_destino_responde ON "encaminhamento";
CREATE POLICY setor_destino_responde ON "encaminhamento" FOR UPDATE
  USING ("setorDestinoId" = app_current_setor())
  WITH CHECK ("setorDestinoId" = app_current_setor());

-- Trilha: o setor externo registra o que fez (responder é ato administrativo), mas não lê a
-- trilha do município.
DROP POLICY IF EXISTS audit_insert ON "audit_log";
CREATE POLICY audit_insert ON "audit_log" FOR INSERT
  WITH CHECK (
    app_is_platform()
    OR "tenantId" = app_current_tenant()
    OR app_current_familia() IS NOT NULL
    OR app_current_setor() IS NOT NULL
  );
