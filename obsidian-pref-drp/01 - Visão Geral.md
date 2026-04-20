# Visão Geral

## Objetivo

O sistema implementa um ciclo anual de avaliação institucional para servidores públicos, com foco em:

- autoavaliação do servidor
- avaliação da chefia imediata
- gestão do ciclo pelo RH
- reavaliação manual pelo RH
- armazenamento de comprovantes em PDF

## Perfis de acesso

### `EMPLOYEE`

- entra pelo login do ciclo `/{ano}/login`
- preenche a própria avaliação
- em vínculo `EFETIVO`, pode anexar comprovantes PDF
- não consegue editar depois que a fase trava

### `MANAGER`

- entra pelo login do ciclo `/{ano}/login`
- vê seus subordinados no ciclo
- só pode avaliar subordinado com status `AUTO_DONE`
- preenche a avaliação da chefia

### `RH`

- entra em `/rh/login`
- administra todos os ciclos
- cria novo ciclo
- importa base XML
- acompanha avaliações
- pode solicitar reavaliação
- pode encerrar ciclo

### Console administrativo

Existe um acesso adicional em `/admin` para CPFs listados em `DEVELOPER_ACCESS_CPFS`. Esse console não é um perfil de negócio separado no banco; ele é derivado por allowlist no código.

## Stack

- `Next.js 15.5`
- `React 19`
- `TypeScript 5`
- `Prisma`
- `PostgreSQL`
- `Supabase Storage`
- `Vitest`
- `Tailwind CSS`

## Organização do código

- `app/`: rotas App Router e server actions
- `components/`: componentes de tela e formulários
- `lib/`: regras de autenticação, avaliação, upload, storage, parser XML e utilidades
- `prisma/`: esquema e seed
- `tests/`: testes unitários
- `obsidian-pref-drp/`: este cofre

## Entry points

- `/` redireciona para o ciclo ativo ou para a área do usuário autenticado
- `/{ano}/login` faz login contextual por ciclo
- `/rh/login` faz login global de RH
- `/admin` expõe o console ampliado para CPFs autorizados
