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

## Pendências conhecidas

- Fontes Rawline/Raleway não estão embarcadas; a interface cai no fallback do sistema. Mesma dívida
  do Regulariza+.
- Divergência entre os cadernos: a spec §11 fala em serifada humanista para leitura longa; a
  identidade §3 define Rawline/Raleway. O código segue a identidade — confirmar com o dono do
  produto.
- Envio de documento pelo munícipe ainda não tem policy de escrita: a central hoje é leitura mais
  interposição de recurso.
