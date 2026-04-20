# Banco de Dados

## Tecnologia

- `Prisma`
- `PostgreSQL`

## Modelos principais

### `User`

- identificador global
- `cpf` único
- `registration` único
- `passwordHash`
- `globalRole` opcional

### `Cycle`

- um ciclo por `year`
- possui status, datas, flag `active`

### `Session`

- sessão por token
- vinculada a `user`
- pode ou não estar vinculada a `cycle`

### `LoginAttempt`

- guarda CPF, IP e data
- usada para rate limiting no login

### `UserCycle`

- vínculo contextual por ano
- `@@unique([userId, cycleId])`
- representa lotação, cargo, chefia e papel

### `Question`

- pertence a um ciclo
- pertence a um `QuestionType`
- possui `sortOrder`

### `Option`

- pertence à pergunta
- guarda rótulo, descrição e score

### `Evaluation`

- pertence ao ciclo
- aponta para avaliado e chefia
- versiona reavaliações
- usa `current` para marcar a versão vigente

### `EvaluationAnswer`

- liga avaliação, pergunta e opção
- diferencia fase com `EvaluationPhase`
- garante unicidade por `evaluationId + questionId + phase`

### `Document`

- pertence à avaliação
- guarda metadados do PDF
- `storageKey` aponta para o objeto no storage

## Enums

### `SystemRole`

- `RH`
- `MANAGER`
- `EMPLOYEE`

### `EmploymentType`

- `EFETIVO`
- `PROBATORIO`

### `EvaluationPhase`

- `SELF`
- `MANAGER`

### `QuestionType`

- `BASE_60`
- `BASE_50`

### `EvaluationStatus`

- `PENDING`
- `DRAFT`
- `AUTO_DONE`
- `MANAGER_DONE`
- `COMPLETED`
- `ARCHIVED`

### `DocumentStatus`

- `PENDING`
- `UPLOADED`
- `FAILED`

### `CycleStatus`

- `OPEN`
- `COMPLETED`

## Relações importantes

- `User` -> `UserCycle`: um usuário pode participar de vários ciclos
- `UserCycle` -> `manager`: auto relação para organograma
- `Cycle` -> `Question`: cada ciclo tem seu conjunto de perguntas
- `Evaluation` -> `answers`: respostas de ambas as fases
- `Evaluation` -> `documents`: comprovantes

## Índices relevantes

- `LoginAttempt(cpf, createdAt)`
- `UserCycle(cycleId, managerId, role)`
- `Question(cycleId, type, sortOrder)`
- `Option(questionId, sortOrder)`
- `Evaluation(cycleId, evaluatedId, current)`
- `Evaluation(cycleId, current, status)`
- `Document(evaluationId, createdAt)`
