-- Corrige uma falha real: a trilha recusava INSERT de quem não é servidor do tenant.
--
-- Motivo: o Prisma emite `INSERT ... RETURNING`, e sob RLS o RETURNING exige que a linha inserida
-- também passe pela policy de SELECT. A `audit_select` só cobria plataforma e tenant, então
-- munícipe (ao interpor recurso pela central) e setor externo (ao responder encaminhamento)
-- gravavam a trilha e batiam em "new row violates row-level security policy".
--
-- Isso ficava invisível no INSERT puro — passava — e só aparecia com RETURNING. É o tipo de coisa
-- que teria aparecido em produção, no primeiro recurso de família.
--
-- A correção dá a cada ator o direito de ler o que ele mesmo registrou, e nada além: o munícipe
-- não passa a ver a trilha do município, nem o setor externo.

CREATE OR REPLACE FUNCTION app_current_ator() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.current_ator', true), '') $$;

DROP POLICY IF EXISTS audit_select ON "audit_log";
CREATE POLICY audit_select ON "audit_log" FOR SELECT
  USING (
    app_is_platform()
    OR "tenantId" = app_current_tenant()
    OR "actorId" = app_current_ator()
  );
