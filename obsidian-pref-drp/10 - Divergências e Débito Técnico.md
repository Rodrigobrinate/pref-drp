# Divergências e Débito Técnico

Este arquivo registra diferenças entre as regras declaradas no repositório e o comportamento implementado no código.

## 1. Data de abertura do ciclo não é respeitada na criação

Em `components/rh-forms.tsx`, o formulário pede `startDate`.

Em `createCycleAction`, o valor enviado não é lido. O código cria sempre:

- `startDate = {ano}-04-01T00:00:00.000Z`
- `endDate = {ano}-04-30T23:59:59.999Z`

Impacto:

- a UI sugere parametrização real da abertura
- o backend ignora a entrada do usuário
- prazos de 15 e 17 dias ficam ancorados numa data fixa

## 2. Tamanho de upload diverge das regras de negócio

`regras-de-negocio.md` fala em `20 MB`.

O código atual limita para `10MB` em:

- `lib/upload-security.ts`
- `lib/storage.ts` ao criar bucket
- `tests/upload-security.test.ts`

## 3. Nome da pasta de documentos diverge da regra

A regra diz que a pasta deve usar apenas o nome do servidor.

O código usa:

- `Nome_do_servidor + "_" + matricula`

Isso acontece em `uploadDocumentsAction`.

## 4. `finalScore` não expressa composição clara

No envio final, `submitEvaluationAction` grava:

- `finalScore = score` da fase enviada

Na prática:

- quando o servidor envia, `finalScore` recebe `selfScore`
- quando a chefia envia, `finalScore` recebe `managerScore`

Não existe cálculo explícito de consolidação entre fases.

## 5. Rate limit não usa IP para decisão

O IP é coletado e persistido, mas `checkRateLimit` conta tentativas só por CPF.

Impacto:

- há rastreabilidade do IP
- não há bloqueio combinado CPF+IP

## 6. `MANAGER_DONE` é tecnicamente possível na função de transição, mas não no fluxo normal

`resolveFinalStatus` permite:

- `PENDING + manager => MANAGER_DONE`

Mas a tela da chefia só libera envio quando o status é `AUTO_DONE`.

Conclusão:

- o domínio permite um estado mais amplo
- a UI normal não o produz

## 7. Reavaliação não tem suíte de testes dedicada

O fluxo existe e altera histórico/versionamento, mas não há teste cobrindo:

- arquivamento da versão anterior
- clonagem das respostas `SELF`
- cópia de documentos
- criação da nova versão corrente

## 8. Criação de ciclo depende do ciclo mais recente, não de um template versionado

Se existir ciclo anterior, o questionário é clonado dele.

Impacto:

- isso preserva continuidade
- também replica erros ou mudanças acidentais do ciclo anterior

## 9. Parser XML operacional não possui aliases tão robustos quanto o importador admin

`lib/xml.ts` é mais simples que `lib/admin-import.ts`.

Impacto:

- o importador de produção é mais sensível à estrutura do XML
- mudanças pequenas na nomenclatura do arquivo podem quebrar a importação
