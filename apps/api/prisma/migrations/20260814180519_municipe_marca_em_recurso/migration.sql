-- Interpor recurso pela central muda a situação da inscrição para EM_RECURSO — e é o único
-- efeito que a família tem sobre a própria inscrição.
--
-- A policy é escrita para permitir exatamente isso: a própria inscrição, e só para EM_RECURSO.
-- Qualquer outro destino (APTA, CONTEMPLADA, CANCELADA) continua sendo ato do servidor.
--
-- Alternativa descartada: deixar a situação intacta e a família "em recurso" sem aparecer no
-- estado da inscrição. Isso mantinha o banco mais fechado, mas criava dois lugares dizendo
-- coisas diferentes sobre o mesmo caso — que é justamente o que o produto existe para evitar.

DROP POLICY IF EXISTS municipe_marca_em_recurso ON "inscricao_fila";
CREATE POLICY municipe_marca_em_recurso ON "inscricao_fila" FOR UPDATE
  USING ("familiaId" = app_current_familia())
  WITH CHECK ("familiaId" = app_current_familia() AND "situacao" = 'EM_RECURSO');
