# Suíte documental, pilha do processo e pós-entrega

Plano para o que a lei pede, o que o cartório recebe e o que a prefeitura precisa provar depois da
chave entregue. Escrito a partir do que a spec define, do que o Regulariza+ já resolveu e de
pesquisa sobre a prática de COHABs e do Programa Minha Casa, Minha Vida.

## O que a pesquisa mostrou

**O cartório não recebe "o processo": recebe uma pilha específica.** Na prática das COHABs, o
registro do título exige matrícula atualizada do imóvel, certidão negativa de débitos municipais,
o contrato com assinatura reconhecida e certidões conforme o estado civil das partes — e é a
companhia habitacional que monta e confere essa pilha, não a família.
([COHAB-SP](https://www.cohab.sp.gov.br/cartilha_glebaK_facing.pdf),
[COHAB-SP FAQ](https://www.cohab.sp.gov.br/AcessoInformacao/PerguntasFrequentes.aspx))

**Desvio de finalidade tem consequência contratual expressa.** No MCMV, o contrato declara que a
unidade se destina à moradia do beneficiário e da família; desvio antecipa o vencimento da dívida,
e a Lei 11.977/2009 considera nulas as transferências de direitos sem quitação. Verificado que o
imóvel não é residência do beneficiário, o agente declara a rescisão e promove a retomada.
([Lei 11.977 — Migalhas](https://www.migalhas.com.br/quentes/88375/lei-11-977-dispoe-sobre-o-programa-minha-casa--minha-vida),
[TRF3](https://web.trf3.jus.br/acordaos/Acordao/BuscarDocumentoPje/156262725))

**O pós-entrega é obrigação, não cortesia.** O Trabalho Social em programas habitacionais tem
eixos definidos: participação cidadã, desenvolvimento socioeconômico, educação ambiental,
orçamento familiar e gestão condominial/educação patrimonial. Isso vira visita, registro e
relatório — e o município precisa comprovar execução.
([Trabalho social — MCidades](https://autogestao.unmp.org.br/wp-content/uploads/2014/08/Trabalho-Social-MCidades.pdf))

**A adesão ao SNHIS cobra estrutura permanente.** 97,5% dos municípios aderiram, mas só 26,2%
estão regulares em fundo, plano e conselho — a prestação de contas é o gargalo, e é exatamente o
que um sistema com trilha resolve.
([CNM — Nota Técnica 2026](https://cnm.org.br/storage/biblioteca/2026/Notas_Tecnicas/2026_NT_01_orientacoes_obrigatoriedades_SNHIS.pdf))

## Princípios que valem para tudo abaixo

1. **Protocolo em cada avanço.** Todo ato que muda a situação de alguém recebe número próprio, do
   mesmo contador por prefeitura, série e ano. Já vale para inscrição, ofício, recurso, família e
   encaminhamento; passa a valer para documento, contrato, vistoria e notificação.
2. **Motivo obrigatório em todo retrocesso.** Desabilitação, cancelamento, desistência, retomada e
   regresso à fila só existem com motivo registrado. Sem isso, o histórico não explica a decisão.
3. **Auto-preencher, o humano valida.** Toda vez que o sistema puder gerar, calcular ou copiar, ele
   propõe — e a pessoa edita ou confirma. Nada entra sem passar por alguém.
4. **Documento é evidência com validade.** Não basta anexar: o documento tem tipo, exigência,
   validade e quem conferiu. Documento vencido reabre pendência sozinho.

## Bloco 1 — Suíte documental

Um mecanismo único, usado por todos os módulos.

| Peça | O que faz |
| --- | --- |
| `TipoDocumento` | catálogo por prefeitura: nome, escopo (família, pessoa, programa, contrato, obra), obrigatório, validade em meses, aceita foto |
| `Documento` | arquivo + tipo + escopo + emissão/validade + conferido por quem e quando + protocolo |
| `ExigenciaDocumental` | o que cada programa exige de quem se inscreve — gera pendência automaticamente |
| `PilhaDocumental` | conjunto nomeado para uma finalidade (registro em cartório, prestação de contas do convênio, habite-se), com o que está pronto e o que falta |

A pilha é o que resolve o problema do cartório: a prefeitura abre "Registro — unidade 118", o
sistema lista os documentos exigidos, marca os que já existem e gera o índice em PDF com a ordem
de juntada.

## Bloco 2 — Documentos por contexto

- **Programa**: edital, regulamento, publicação do ranking, atas, comprovação de publicidade.
- **Requerente e elegíveis**: identidade, comprovante de renda, comprovante de residência,
  declaração de não possuir imóvel, certidões de estado civil.
- **Contrato e título**: contrato assinado, termo de entrega de chaves, título de garantia de
  recebimento, matrícula, CND municipal, comprovante de quitação.
- **Obra**: projeto aprovado, licenças, ART/RRT, medições com foto, habite-se.

## Bloco 3 — Produção e mutuários (fase 2 da spec)

Convênio → obra → cronograma → medição → unidade → contrato → parcelas. O que muda em relação ao
plano original: cada etapa nasce com sua pilha documental e cada avanço gera protocolo.

## Bloco 4 — Pós-entrega e monitoramento

- **Visita de acompanhamento** por unidade, nos eixos do Trabalho Social, com periodicidade
  parametrizável e alerta de visita vencida.
- **Ocorrência de uso**: quem mora, se é o beneficiário, se há cessão, aluguel ou abandono.
- **Situação da unidade**: ocupada pelo titular, ocupada por terceiro, desocupada, em litígio.

## Bloco 5 — Descumprimento e retomada

Processo próprio, com fase e prazo, porque retirar moradia é o ato mais grave do sistema:

1. **Constatação** — vistoria com evidência (foto, declaração de vizinhos, consulta cadastral).
2. **Notificação** — prazo para defesa, com AR ou entrega registrada.
3. **Defesa** — a família responde pela central ou no balcão.
4. **Decisão fundamentada** — regularização, acordo, ou rescisão.
5. **Encaminhamento** — jurídico para retomada, com toda a pilha anexada.

Inadimplência entra pelo mesmo caminho, com escada própria: cobrança, renegociação, notificação e
só então rescisão.

## Bloco 6 — Onde a IA entra (e onde não entra)

**Entra onde o custo do erro é baixo e a revisão é natural:**

| Uso | Ganho |
| --- | --- |
| Extrair dados de documento (OCR + modelo) | comprovante de renda, RG e conta de luz pré-preenchem a ficha; o técnico confere |
| Rascunhar parecer social a partir da visita | o técnico edita em vez de escrever do zero |
| Rascunhar fundamentação de decisão de recurso | cita os itens da pontuação; o gestor assina |
| Resumir o caso para encaminhamento | preenche o resumo que hoje é digitado à mão |
| Apontar inconsistência | renda declarada × benefícios, composição × membros cadastrados, possível duplicidade de família |
| Busca em linguagem natural | "famílias com idoso em área de risco sem laudo" |

**Não entra em nada que decida sozinho:** pontuação, ordem da fila, contemplação, corte de
benefício e retomada de unidade continuam determinísticos e auditáveis. A regra é uma só — **a IA
propõe, a pessoa assina, e o sistema registra quem assinou.** Um número que muda a vida de uma
família não pode sair de um modelo que ninguém consegue reproduzir dois anos depois, na auditoria.

## Ordem sugerida

1. Suíte documental (blocos 1 e 2) — é fundação do resto.
2. Produção e mutuários (bloco 3).
3. Pós-entrega (bloco 4).
4. Descumprimento e retomada (bloco 5).
5. IA, começando pela extração documental (bloco 6).
