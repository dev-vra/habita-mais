# Habita+ — instruções do projeto

Leia o [README](README.md) primeiro: stack, como rodar e as decisões estruturais. Este arquivo
cobre só o que muda a forma de trabalhar aqui dentro.

## Fonte de verdade

- `docs/Habita-Mais-Especificacao.*` — spec funcional e de arquitetura (§ citados no código).
- `docs/Habita-Mais-Identidade-Visual.*` — marca, cor, tipografia e as cinco telas de referência.
- `apps/api/prisma/schema.prisma` — o modelo. Confira antes de criar qualquer coisa.
- `packages/shared/src/habitacao/` — a regra da fila. Se a regra não estiver aqui, ela vai divergir
  entre API e interface.

## Regras que não se negociam

1. **Nunca calcular pontuação fora de `@habita/shared`.** O motor é puro e determinístico; API e
   web consomem o mesmo código. Snapshot guarda fatos + versão de critério.
2. **Nada de query fora de `runWithContext`.** Sem os `SET LOCAL`, as policies negam — e se algum
   dia passarem, é porque alguém afrouxou a RLS.
3. **Toda mutação relevante grava trilha na mesma transação**, com diff mascarado. Trilha que
   sobrevive a um rollback é trilha mentindo.
4. **Dado sensível novo entra na lista de máscara** (`apps/api/src/audit/mascarar-diff.ts`) antes de
   existir no schema — bancário, social e documento.
5. **Sem CASL** (decisão da spec §3): guards de perfil e de capacidade. Ação sensível reconfirma a
   concessão no banco dentro da transação.
6. **Sem hex em className** — só tokens (`globals.css`). O ESLint quebra o build. Azul significa
   Regulariza+; âmbar significa ação. Trocar isso apaga a convenção visual do produto.
7. **Migration é idempotente e testada** antes de produção. Em produção, confirme antes de aplicar.

## Convenções

- Código, comentário, commit e interface em **pt-BR**. Comentário explica *por quê*.
- Módulo NestJS em Clean Architecture: `domain/` (tipos e ports) → `application/` (use cases) →
  `infra/` (Prisma e adaptadores). Controller fino.
- `prisma migrate dev` nem sempre regenera o client nesta versão — use `pnpm db:migrate`, que já
  encadeia o `generate`.

## Decisões travadas com o dono do produto (14/08/2026)

- **Fila**: objetiva com exceção auditada (§9). Já implementada.
- **ADMINISTRADOR** configura e lê trilha; não opera fila, ficha nem contrato.
- **Salário mínimo** é parâmetro por prefeitura (`Tenant.parametros.salarioMinimo`).
- **Tipografia**: caderno de identidade §3 (Rawline/Raleway), não a serifada da spec §11.

8. **IA propõe, pessoa assina.** Uso novo de IA entra em `packages/shared/src/habitacao/assistente.ts`
   (lista fechada), passa pela máscara antes de sair e grava `SugestaoIA` com o desfecho. Pontuação,
   fila, contemplação, benefício e retomada continuam determinísticas — sem exceção.

## Pendências conhecidas

- Fontes Rawline/Raleway não estão embarcadas; a interface cai no fallback do sistema. As duas são
  SIL OFL: Raleway pelo Google Fonts, Rawline em
  `cdngovbr-ds.estaleiro.serpro.gov.br/design-system/fonts/rawline/font/rawline-{peso}.woff2`.
- Envio de documento pelo munícipe ainda não tem policy de escrita: a central hoje é leitura mais
  interposição de recurso. Pela mesma razão, a defesa no processo de retomada entra pelo balcão.
- Reajuste anual das parcelas por índice existe na regra (`reajustarParcela`) e não tem ainda a
  ação que aplica o índice ao carnê — é a próxima peça do módulo de mutuários.
- A chamada ao modelo de IA roda dentro da transação do request, com teto estendido
  (`@TransacaoLonga`). Funciona, mas segurar conexão do pool esperando rede externa não é bom
  desenho: o certo é tirar a chamada do caminho transacional.
- A validação pública de documento não consulta o banco de propósito — o QR carrega um payload
  assinado (HMAC). Consultar exigiria abrir policy pública em dado de família.
- Não há job agendado: recadastramento e vencimento de pendência são ações confirmadas por
  alguém, nunca rotina silenciosa.
- Puppeteer usa o Chrome do sistema (`PUPPETEER_EXECUTABLE_PATH`); a imagem de produção precisa
  trazer um chromium.
