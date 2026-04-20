# Rotas e Telas

## Rota raiz

### `/`

- se houver sessão, redireciona para a área correta via `getPostLoginPath`
- se não houver sessão, busca o ciclo ativo
- se existir ciclo ativo, redireciona para `/{ano}/login`
- sem ciclo ativo, mostra aviso na tela

## Login por ciclo

### `/{year}/login`

- valida `year`
- carrega o ciclo correspondente
- redireciona usuário já autenticado
- renderiza `LoginForm` no modo `cycle`

## Login RH global

### `/rh/login`

- redireciona usuário já autenticado
- renderiza `LoginForm` no modo `rh`

## Área do servidor

### `/{year}/servidor`

- exige sessão do ano com papel `EMPLOYEE`
- garante que exista uma avaliação corrente
- carrega perguntas do tipo correto
- mostra status, pontuação e formulário
- para `EFETIVO`, mostra e permite upload de PDFs

## Área da chefia

### `/{year}/chefia`

- exige sessão do ano com papel `MANAGER`
- lista subordinados do gerente no ciclo
- cria avaliações faltantes em lote quando necessário
- mostra status, prazo e pontuação da autoavaliação
- libera link de avaliação apenas quando `canManagerEvaluate` retorna `true`

## Avaliação da chefia

### `/{year}/chefia/avaliacoes/{evaluationId}`

- exige gerente do ano
- carrega avaliação com relações
- bloqueia acesso se a avaliação não for daquele gerente
- bloqueia acesso se o status não permitir avaliação da chefia

## Hub global RH

### `/rh`

- exige login global RH
- redireciona para `/admin` se o CPF estiver na allowlist
- lista ciclos
- permite criar novo ciclo se não houver ciclo aberto
- permite encerrar ciclo aberto

## Gestão de um ciclo

### `/{year}/rh`

- exige login global RH
- mostra resumo do ciclo
- disponibiliza importação XML
- lista servidores e versões das avaliações
- permite solicitar reavaliação

## Console administrativo

### `/admin`

- exige sessão autenticada e CPF na allowlist
- agrega métricas de saúde do sistema
- exibe importador admin XML/CSV
- mostra estatísticas de avaliações, documentos, ciclos e sessões

## Componentes centrais de UI

### `EvaluationForm`

- formulário cliente
- faz autosave na autoavaliação
- permite envio final
- faz upload de PDFs
- calcula pontuação projetada no browser

### `LoginForm`

- único componente de login para modo por ciclo e RH global

### `XmlImportForm`

- formulário de upload XML do ciclo

### `AdminImportForm`

- valida XML/CSV e mostra prévia no console admin
