# Projeto PREF-DRP

Este cofre documenta o sistema `projeto-pref-drp`, chamado na interface de **Nomos**.

## Navegação

- [[01 - Visão Geral]]
- [[02 - Arquitetura]]
- [[03 - Domínio e Regras]]
- [[04 - Banco de Dados]]
- [[05 - Rotas e Telas]]
- [[06 - Fluxos Operacionais]]
- [[07 - Segurança e Restrições]]
- [[08 - Ambiente e Operação]]
- [[09 - Testes e Qualidade]]
- [[10 - Divergências e Débito Técnico]]

## Leitura rápida

- O sistema é um portal de avaliação anual com três perfis: `EMPLOYEE`, `MANAGER` e `RH`.
- A stack principal é `Next.js 15 + React 19 + Prisma + PostgreSQL/Supabase + Vitest`.
- O RH cria ciclos, importa a base funcional em XML e monitora avaliações.
- O servidor faz autoavaliação.
- A chefia só pode avaliar depois que a autoavaliação foi enviada.
- Documentos PDF de servidores efetivos são enviados para `Supabase Storage`.
- Existe um console administrativo especial em `/admin` liberado por allowlist de CPF.

## Origem desta documentação

Esta documentação foi produzida a partir da leitura direta do código-fonte, do esquema Prisma, dos testes e dos documentos de regra de negócio do repositório. Quando houver conflito entre intenção e implementação, o conflito está registrado em [[10 - Divergências e Débito Técnico]].
