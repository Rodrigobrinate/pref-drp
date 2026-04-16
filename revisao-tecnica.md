Vou gerar o arquivo `revisao-tecnica.md` com base nos pontos identificados.

```markdown
# Revisão Técnica - Sistema Nomos
**Data:** 2026-04-16

## 1. Segurança

- **🔴 CRÍTICA** | `app/actions.ts:217`
  - **Descrição:** `submitEvaluationAction` não valida prazo, estado READ-ONLY nem pre-condição de autoavaliação no backend. A UI pode ser bypassada via chamadas diretas à Action.
  - **Ação Corretiva Sugerida:** Implementar validações de servidor rigorosas verificando a data atual contra o ciclo, o status atual da avaliação e a existência da autoavaliação antes de processar o envio.

- **🟠 ALTA** | `app/actions.ts:364`
  - **Descrição:** Upload valida PDF apenas por MIME type (`application/pdf`), permitindo o envio de arquivos maliciosos mascarados.
  - **Ação Corretiva Sugerida:** Implementar verificação de *magic bytes* (checar se os primeiros bytes do arquivo são `%PDF-`) no buffer do upload.

- **🟡 MÉDIA** | `lib/auth.ts:118`
  - **Descrição:** Mensagens de erro distintas para falhas de login expõem a existência de usuários ou ciclos específicos (enumeração).
  - **Ação Corretiva Sugerida:** Padronizar mensagens de erro para "Usuário ou senha inválidos" ou "Ciclo não disponível" de forma genérica.

- **🟡 MÉDIA** | `lib/rate-limit.ts:10`
  - **Descrição:** Rate limit baseado apenas por CPF. O campo IP nunca é gravado nem consultado, facilitando ataques distribuídos.
  - **Ação Corretiva Sugerida:** Atualizar a lógica de rate limiting para considerar o par CPF/IP e persistir as tentativas de conexão por IP.

## 2. Regras de Negócio

- **🟠 ALTA** | `lib/evaluation.ts:36`
  - **Descrição:** O prazo expira no início do dia seguinte (uso de `addDays`), não às 23:59 do dia exigido.
  - **Ação Corretiva Sugerida:** Ajustar o cálculo de expiração para `endOfDay` da data limite, conforme RN-04.1 e RN-04.2.

- **🟠 ALTA** | `app/actions.ts:451`
  - **Descrição:** `createCycleAction` possui o valor `01/04` hardcoded, ignorando o `startDate` enviado pelo RH.
  - **Ação Corretiva Sugerida:** Substituir o valor estático pelo parâmetro `startDate` recebido no corpo da requisição (RN-04.0).

- **🟠 ALTA** | `app/actions.ts:358`
  - **Descrição:** Limite de arquivo configurado em 10MB e padrão de pasta `nome_matricula`.
  - **Ação Corretiva Sugerida:** Atualizar o limite para o definido na RN-06.1 e ajustar a nomenclatura da pasta para o padrão exigido na RN-06.3.

- **🟠 ALTA** | `app/actions.ts:664`
  - **Descrição:** Possibilidade de abertura de reavaliação sem uma avaliação de chefia existente.
  - **Ação Corretiva Sugerida:** Adicionar trava lógica que impeça a criação de reavaliação se o status da avaliação de chefia não estiver como concluído (RN-07.2).

## 3. Erros não Mapeados

- **🟠 ALTA** | `app/actions.ts:169`
  - **Descrição:** `questionId` e `selectedOptionId` não são validados como pertencentes ao banco de questões do ciclo atual.
  - **Ação Corretiva Sugerida:** Validar se os IDs enviados pertencem de fato ao ciclo de avaliação ativo para evitar corrupção de dados e estados inválidos.

- **🟡 MÉDIA** | `app/actions.ts:362`
  - **Descrição:** Operação de upload de arquivo não possui transação compensatória em caso de falha no banco de dados.
  - **Ação Corretiva Sugerida:** Implementar lógica de limpeza (*cleanup*) para remover o arquivo do storage caso a atualização do registro no banco de dados falhe.

## 4. Performance

- **🟠 ALTA** | `app/actions.ts:559`
  - **Descrição:** `importXmlAction` realiza operações de upsert sequenciais, gerando locks transacionais longos em importações massivas.
  - **Ação Corretiva Sugerida:** Migrar para operações de lote (*batch operations*) utilizando `createMany` ou processamento assíncrono via fila.

- **🟡 MÉDIA** | `app/[year]/chefia/page.tsx:33`
  - **Descrição:** Duas leituras redundantes do mesmo conjunto de avaliações a cada renderização da página.
  - **Ação Corretiva Sugerida:** Unificar a busca de dados em uma única query ou utilizar cache/memoização para evitar chamadas duplicadas ao banco.

## Resumo de Vulnerabilidades

| Seção              | CRÍTICA | ALTA | MÉDIA | TOTAL |
|--------------------|:-------:|:----:|:-----:|:-----:|
| Segurança          |    1    |  1   |   2   |   4   |
| Regras de Negócio  |    0    |  4   |   0   |   4   |
| Erros não Mapeados |    0    |  1   |   1   |   2   |
| Performance        |    0    |  1   |   1   |   2   |
| **TOTAL**          |  **1**  | **7**| **4** | **12**|
```
