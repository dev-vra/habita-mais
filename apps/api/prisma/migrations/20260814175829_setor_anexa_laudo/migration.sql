-- O setor de destino grava o laudo na ficha — e só isso.
--
-- A primeira versão fazia esse efeito numa transação separada, com contexto de tenant. Duas
-- coisas quebraram: a resposta falhou depois do laudo já gravado (o encaminhamento ficou aberto
-- com a ficha alterada), e a trilha bateu na policy por estar em outro contexto.
--
-- A correção move o efeito para a MESMA transação da resposta e autoriza no banco exatamente o
-- que o processo permite: a ficha só pode ser tocada por quem tem um encaminhamento ABERTO de
-- laudo de risco, para aquela família, endereçado ao seu setor. Fora dessa janela, nada.
--
-- Repare que a policy não dá SELECT amplo: o setor enxerga a linha da ficha que vai alterar, não
-- a ficha social do município.

DROP POLICY IF EXISTS setor_anexa_laudo_leitura ON "ficha_social";
CREATE POLICY setor_anexa_laudo_leitura ON "ficha_social" FOR SELECT
  USING (
    "vigente" AND EXISTS (
      SELECT 1 FROM "encaminhamento" e
      WHERE e."setorDestinoId" = app_current_setor()
        AND e."tipoSolicitacao" = 'LAUDO_RISCO'
        AND e."situacao" = 'ABERTO'
        AND e."entidade" = 'Familia'
        AND e."entidadeId" = "ficha_social"."familiaId"
    )
  );

DROP POLICY IF EXISTS setor_anexa_laudo_escrita ON "ficha_social";
CREATE POLICY setor_anexa_laudo_escrita ON "ficha_social" FOR UPDATE
  USING (
    "vigente" AND EXISTS (
      SELECT 1 FROM "encaminhamento" e
      WHERE e."setorDestinoId" = app_current_setor()
        AND e."tipoSolicitacao" = 'LAUDO_RISCO'
        AND e."situacao" = 'ABERTO'
        AND e."entidade" = 'Familia'
        AND e."entidadeId" = "ficha_social"."familiaId"
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "encaminhamento" e
      WHERE e."setorDestinoId" = app_current_setor()
        AND e."tipoSolicitacao" = 'LAUDO_RISCO'
        AND e."entidade" = 'Familia'
        AND e."entidadeId" = "ficha_social"."familiaId"
    )
  );
