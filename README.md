# Habita+

Plataforma SaaS de gestão habitacional de interesse social para prefeituras. Produto irmão do
[Regulariza+](../regulariza+) (REURB): um resolve o processo do lote, o outro resolve a fila da
família.

O problema que o produto ataca não é planilha ruim — é **prova**. A fila habitacional é o ato
administrativo mais contestável de uma prefeitura, e o Habita+ existe para que ela consiga
responder, linha por linha, por que a casa foi para aquela família e não para a outra.

Documentos de referência em [`docs/`](docs/): caderno de especificação funcional e de arquitetura,
e caderno de identidade visual.

## Stack

| Camada | Escolha |
| --- | --- |
| Monorepo | Turborepo + pnpm 11, Node 24, TypeScript estrito |
| API | NestJS 11, Prisma 7 (driver adapter), PostgreSQL 17 + PostGIS |
| Web | Next.js 16 (App Router) como BFF, React 19, Tailwind 4 CSS-first, gov.br-DS v3 |
| Domínio | `packages/shared` — regra de negócio pura, sem framework |

## Como rodar

```bash
cp .env.example .env            # ajuste os segredos; nunca commite o .env
docker compose -f infra/docker-compose.yml --env-file .env up -d

pnpm install
pnpm --filter @habita/api db:migrate           # migrations (Postgres 55433)
pnpm --filter @habita/api db:bootstrap-role    # senha do papel de runtime habita_app
pnpm --filter @habita/api db:seed              # Tangará da Serra + 8 famílias na fila

pnpm dev                        # api em :3334, web em :3001
```

Acesso do seed: `bianka@tangaradaserra.mt.gov.br` / `Habita+Dev2026!` (troca obrigatória no
primeiro acesso).

Portas deslocadas de propósito — esta máquina roda o Regulariza+ em paralelo (Postgres 55432,
MinIO 9300/9301, API 3333, web 3000).

## Decisões que valem conhecer antes de mexer

**A fronteira com o Regulariza+ é dura.** Banco, tenant, autenticação e deploy próprios. Nenhuma
chave estrangeira atravessa: o Habita+ pergunta "esta pessoa tem processo de REURB?" pela API, com
chave de escopo restrito, e ambos os lados registram a leitura (`ConsultaExterna`).

**A RLS é real, não decorativa.** Toda tabela tem `FORCE ROW LEVEL SECURITY`, e a aplicação conecta
com o papel `habita_app` — sem superuser, sem `BYPASSRLS`. Consequência assumida: toda operação
roda dentro de `PrismaService.runWithContext`, que aplica os `SET LOCAL` que as policies leem.
Plataforma não tem bypass em dado de família. O munícipe entra com o GUC de tenant vazio e só
alcança a própria família. Há testes de integração conectando com o papel de runtime
(`src/prisma/rls.spec.ts`) — se alguém afrouxar isso, o teste quebra.

**A pontuação é congelada, nunca recalculada para exibir.** `PontuacaoSnapshot` é tabela própria,
com os fatos e a versão de critério que valiam. Recalcular cria snapshot novo e aposenta o
anterior; quem já foi convocada não é recalculada. Mudar o peso de um critério exige nova versão —
é o que impede reordenar a fila retroativamente sem rastro.

**A exceção da fila existe, e é vigiada.** Convocação fora de ordem exige capacidade concedida
explicitamente à pessoa (não ao cargo), motivo fundamentado, e aparece num contador no painel.
Não reordena a fila: o ranking publicado permanece o que foi publicado.

**Capacidade sensível não vem do perfil.** As quatro ações da spec §5 (recalcular em lote, convocar
fora de ordem, cortar auxílio, transferir titularidade) só existem com concessão explícita em
`usuario_capacidade`. O guard barra pelo token e o caso de uso reconfirma no banco.

## Estado

**Fase 1 (MVP "a fila em pé") completa.** Roda ponta a ponta:

| Módulo | O que faz |
| --- | --- |
| Fundação | multi-tenant com RLS provada por teste, auditoria append-only, autenticação com lockout |
| Famílias | cadastro, ficha social versionada, membros, visita domiciliar, visão 360° |
| Programas | criação, critérios versionados (rascunho → publicada → substituída) |
| Fila | inscrição, pontuação congelada, ranking publicado, convocação com exceção auditada, recurso |
| Pendências | suspensão com prazo e retorno automático à fila quando saneadas |
| Documentos | storage S3-compatível e ofício em PDF com QR de validação pública |
| Central do munícipe | posição, nota explicada, documentos e recurso, em esfera isolada |
| Administração | usuários, capacidades nominais, parâmetros e signatários |
| Trilha | consulta filtrável por entidade, operação e período |
| Painel | contadores, decisões com prazo correndo, busca por CPF/nome/protocolo |
| Recadastramento | baixa por ficha vencida, sempre confirmada pelo gestor |

Fora do MVP, conforme o roadmap da spec: produção habitacional (convênio, obra, medição,
unidades), mutuários e parcelas, aluguel social, reassentamento, PLHIS, fiscalização e a
integração por API com o Regulariza+.

Infra pendente: fontes embarcadas, CI, imagem de produção e deploy.
