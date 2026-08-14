-- RLS da suíte documental.
--
-- Documento é evidência: quem vê o arquivo vê o dado. As tabelas entram no mesmo isolamento por
-- tenant do resto, sem bypass de plataforma — comprovante de renda e laudo social não são dado de
-- administração de SaaS.
--
-- Duas exceções deliberadas, ambas de escopo mínimo:
--  • o munícipe enxerga os documentos da própria família (é dado dele, e a central precisa
--    mostrar o que já foi entregue);
--  • o setor externo enxerga o documento que ele mesmo anexou ao responder um encaminhamento.

DO $$
DECLARE
  tabela text;
  tabelas text[] := ARRAY['tipo_documento', 'documento', 'exigencia_documental', 'pilha_documental', 'item_pilha'];
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

-- A família vê o que entregou. Escopo PESSOA fica de fora de propósito: o documento de um membro
-- pode ser de outro adulto do domicílio, e "mesma casa" não é autorização.
DROP POLICY IF EXISTS municipe_proprios_documentos ON "documento";
CREATE POLICY municipe_proprios_documentos ON "documento" FOR SELECT
  USING (
    (
      "escopo" = 'FAMILIA'
      AND "referenciaId" = app_current_familia()
    )
    OR (
      "escopo" = 'INSCRICAO'
      AND EXISTS (
        SELECT 1 FROM "inscricao_fila" i
        WHERE i."id" = "documento"."referenciaId" AND i."familiaId" = app_current_familia()
      )
    )
  );

-- O catálogo é público dentro do município: a central precisa dizer QUAL documento falta, com a
-- orientação de como consegui-lo.
DROP POLICY IF EXISTS municipe_le_catalogo ON "tipo_documento";
CREATE POLICY municipe_le_catalogo ON "tipo_documento" FOR SELECT
  USING (app_current_familia() IS NOT NULL AND "ativo");
