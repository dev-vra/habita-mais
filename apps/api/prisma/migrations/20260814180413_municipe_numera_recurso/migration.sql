-- Permite que o recurso interposto pela central receba número de protocolo.
--
-- O munícipe entra com o GUC de tenant vazio (default-deny), então o contador — tabela de
-- configuração do município — negava o INSERT e o recurso morria com 500 no meio do caminho.
--
-- Em vez de afrouxar o default-deny, entra um GUC informativo com o tenant do ator (sempre
-- setado, inclusive nas esferas restritas) e uma policy de escopo mínimo: a família só toca o
-- contador da série REC, e só o do próprio município. Nenhuma outra série, nenhum outro tenant.

CREATE OR REPLACE FUNCTION app_tenant_do_ator() RETURNS text
  LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.tenant_do_ator', true), '') $$;

DROP POLICY IF EXISTS municipe_numera_recurso ON "contador_protocolo";
CREATE POLICY municipe_numera_recurso ON "contador_protocolo" FOR ALL
  USING (
    app_current_familia() IS NOT NULL
    AND "serie" = 'REC'
    AND "tenantId" = app_tenant_do_ator()
  )
  WITH CHECK (
    app_current_familia() IS NOT NULL
    AND "serie" = 'REC'
    AND "tenantId" = app_tenant_do_ator()
  );

-- Mesma necessidade do lado do recurso: o INSERT do Prisma usa RETURNING, e o RETURNING exige
-- que a linha inserida passe pela policy de SELECT.
DROP POLICY IF EXISTS municipe_le_proprio_recurso ON "recurso";
CREATE POLICY municipe_le_proprio_recurso ON "recurso" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "inscricao_fila" i
      WHERE i."id" = "recurso"."inscricaoId" AND i."familiaId" = app_current_familia()
    )
  );
