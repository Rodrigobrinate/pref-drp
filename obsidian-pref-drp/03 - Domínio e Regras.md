# Domínio e Regras

## Entidades de negócio

### Ciclo

Representa o projeto anual de avaliação. Tem:

- `year`
- `name`
- `startDate`
- `endDate`
- `status`: `OPEN` ou `COMPLETED`
- `active`

### Usuário

É a pessoa autenticável no sistema. O papel operacional real depende do ciclo ou do papel global.

### UserCycle

É a peça central do domínio. Liga usuário a um ciclo com:

- `role`
- `employmentType`
- `department`
- `jobTitle`
- `managerId`

Sem `UserCycle`, não existe atuação contextual no ciclo.

### Avaliação

Representa o fluxo de avaliação daquele servidor naquele ciclo.

Campos relevantes:

- `status`
- `selfScore`
- `managerScore`
- `finalScore`
- `version`
- `current`
- datas de submissão e arquivamento

## Tipos de questionário

### `BASE_60`

Usado para `EFETIVO`.

- 8 fatores
- pesos: `A=7.5`, `B=6`, `C=4`, `D=2.25`, `E=0.75`
- teto: `60`

### `BASE_50`

Usado para `PROBATORIO`.

- 5 fatores
- pesos: `A=10`, `B=8`, `C=6`, `D=3`, `E=1`
- teto: `50`

## Classificação

Calculada em `getClassification`:

- `SD`: >= 90%
- `AD`: >= 70% e < 90%
- `AP`: >= 40% e < 70%
- `NA`: < 40%

## Status de avaliação

### `PENDING`

Avaliação criada, mas ainda sem submissão final.

### `DRAFT`

Servidor já salvou rascunho da autoavaliação.

### `AUTO_DONE`

Autoavaliação enviada. A chefia passa a poder avaliar.

### `MANAGER_DONE`

Chefia enviou sua parte antes da autoavaliação ser finalizada no mesmo registro ou em fluxo intermediário.

### `COMPLETED`

As duas fases ficaram concluídas.

### `ARCHIVED`

Versão antiga arquivada, normalmente por reavaliação.

## Deadlines

As funções de domínio consideram:

- `self`: 15 dias
- `manager`: 17 dias

O cálculo usa `startOfDay(startDate)` e soma os dias corridos.

## Travas

### Autosave

`canAutosave` bloqueia quando:

- status é `COMPLETED`
- status é `ARCHIVED`
- status é `AUTO_DONE`
- prazo expirou

### Avaliação da chefia

`canManagerEvaluate` só retorna `true` para `AUTO_DONE`.

### Somente leitura

`isReadOnly` trava:

- tudo em `COMPLETED` e `ARCHIVED`
- autoavaliação quando status já é `AUTO_DONE` ou `MANAGER_DONE`
- avaliação da chefia quando status é `MANAGER_DONE`

## Reavaliação

Quando o RH solicita reavaliação:

- a avaliação atual vira `ARCHIVED`
- `current` passa para `false`
- uma nova avaliação é criada com `version + 1`
- respostas da fase `SELF` são copiadas
- documentos são copiados
- a chefia refaz apenas a sua parte

## Regra prática observada

O `finalScore` hoje acompanha a última pontuação submetida, não uma composição explícita de servidor + chefia. Isso precisa ser lido como comportamento implementado, não como regra conceitual definitiva.
