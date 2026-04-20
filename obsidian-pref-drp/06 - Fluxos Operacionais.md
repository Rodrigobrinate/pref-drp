# Fluxos Operacionais

## 1. Criação de ciclo

1. RH acessa `/rh`.
2. Informa o ano.
3. `createCycleAction` valida se já existe ciclo daquele ano.
4. Também valida se existe ciclo aberto.
5. O ciclo é criado com `status=OPEN` e `active=true`.
6. Demais ciclos ficam `active=false`.
7. O conjunto de perguntas é clonado do ciclo mais recente ou criado a partir de `QUESTION_BANK`.

## 2. Importação da base anual

1. RH acessa `/{ano}/rh`.
2. Envia XML.
3. `parseXmlEmployees` extrai registros funcionais.
4. O sistema faz `upsert` de `User`.
5. O sistema faz `upsert` de `UserCycle`.
6. A chefia é inferida pelos CPFs presentes como `chefiaCpf`.
7. O vínculo é convertido em `PROBATORIO` ou `EFETIVO`.
8. Avaliações correntes são criadas ou atualizadas com `status=PENDING`.

## 3. Login do usuário no ciclo

1. Usuário entra em `/{ano}/login`.
2. CPF e senha são normalizados.
3. O sistema consulta o rate limit.
4. `verifyCredentials` exige:
   - ciclo existente
   - usuário existente
   - vínculo do usuário naquele ciclo ou papel global
   - senha válida
5. Em sucesso, tentativas falhas são limpas.
6. A sessão é criada e o usuário é redirecionado conforme o papel.

## 4. Autoavaliação do servidor

1. O servidor entra em `/{ano}/servidor`.
2. O sistema garante uma avaliação corrente.
3. Cada resposta altera o estado local do formulário.
4. Após `900ms`, `saveDraftAction` salva as respostas da fase `SELF`.
5. O status vira `DRAFT`.
6. Ao concluir, `submitEvaluationAction` grava respostas da fase `SELF`, calcula score e muda o status para `AUTO_DONE` ou `COMPLETED`.

## 5. Upload de comprovantes

1. Apenas `EMPLOYEE` com vínculo `EFETIVO` pode enviar arquivos.
2. O upload só ocorre enquanto `canAutosave` permitir.
3. Cada arquivo passa por:
   - validação de MIME type
   - validação do tamanho
   - validação de assinatura `%PDF-`
   - sanitização do nome
4. O arquivo é gravado no `Supabase Storage`.
5. Um registro é salvo em `Document`.

## 6. Avaliação da chefia

1. A chefia entra em `/{ano}/chefia`.
2. O painel lista subordinados e suas avaliações correntes.
3. Apenas status `AUTO_DONE` libera o botão `Avaliar agora`.
4. Ao enviar, `submitEvaluationAction` grava respostas da fase `MANAGER`.
5. O status vira `COMPLETED` se a autoavaliação já estava finalizada.

## 7. Reavaliação

1. RH aciona `requestReevaluationAction`.
2. A avaliação atual é arquivada.
3. Uma nova versão corrente é criada.
4. Respostas `SELF` e documentos são reaproveitados.
5. A chefia refaz sua avaliação sobre a nova versão.

## 8. Encerramento do ciclo

1. RH aciona `completeCycleAction`.
2. O sistema conta avaliações correntes com status diferente de `COMPLETED`.
3. Se existir pendência, o encerramento falha.
4. Sem pendências, o ciclo vira `COMPLETED` e deixa de ser ativo.
