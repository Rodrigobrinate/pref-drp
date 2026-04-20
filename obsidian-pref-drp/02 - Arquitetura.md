# Arquitetura

## Estilo geral

O sistema segue um desenho simples e direto:

- UI renderizada no servidor com `App Router`
- mutações concentradas em `app/actions.ts`
- regras de domínio isoladas em `lib/`
- persistência em `Prisma`
- armazenamento de arquivos em `Supabase Storage`

## Camadas

### Interface

As páginas em `app/` montam os dados e renderizam componentes como:

- `AppShell`
- `LoginForm`
- `EvaluationForm`
- formulários de RH

### Aplicação

`app/actions.ts` concentra as operações principais:

- login por ciclo
- login global RH
- logout
- autosave de rascunho
- envio definitivo de avaliação
- upload de documentos
- criação de ciclo
- importação XML
- reavaliação
- encerramento de ciclo
- prévia de importação admin

### Domínio

As decisões centrais ficam em `lib/`:

- `auth.ts`: sessão, roteamento pós-login e autorização
- `evaluation.ts`: pontuação, deadlines, estados e travas
- `evaluations-data.ts`: busca/garantia da avaliação corrente
- `xml.ts` e `admin-import.ts`: parsing de arquivos funcionais
- `upload-security.ts`: validação de PDFs
- `storage.ts`: integração com Supabase Storage
- `rate-limit.ts`: bloqueio por tentativas de login

### Persistência

O modelo Prisma trata:

- usuários
- ciclos
- sessões
- tentativas de login
- vínculo do usuário em cada ciclo
- perguntas e opções
- avaliações e respostas
- documentos

## Fluxo macro

1. RH cria um ciclo.
2. O sistema clona ou cria o questionário do ciclo.
3. RH importa a base XML do ano.
4. O import cria ou atualiza usuários, vínculos, chefias e avaliações.
5. Servidor entra no ciclo e preenche a autoavaliação.
6. A chefia recebe desbloqueio quando a autoavaliação vira `AUTO_DONE`.
7. A chefia envia sua avaliação.
8. O RH acompanha, reabre via reavaliação quando necessário e encerra o ciclo.

## Observações arquiteturais

- O sistema usa cookies HTTP-only para sessão.
- Existe no máximo uma sessão persistida por usuário, porque `createSession` apaga as anteriores.
- O `EvaluationForm` é cliente e dispara autosave de rascunho com debounce de `900ms`.
- O `HomePage` depende do ciclo marcado como `active`.
