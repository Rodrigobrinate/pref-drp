# Testes e Qualidade

## Ferramenta

- `Vitest`
- cobertura via `@vitest/coverage-v8`

## Suites existentes

### `tests/evaluation.test.ts`

Valida:

- mapeamento de vínculo para tipo de questionário
- cálculo de score com teto
- janelas de prazo
- expiração
- autosave
- desbloqueio da chefia
- estados read-only
- transição de status
- validação de payload de respostas

### `tests/auth.test.ts`

Valida:

- erro genérico em credenciais inválidas
- bloqueio de usuário fora do ciclo
- login RH global
- roteamento para console admin por allowlist
- revogação de sessões anteriores

### `tests/upload-security.test.ts`

Valida:

- sanitização de nome
- detecção de assinatura PDF
- rejeição de PDF forjado
- aceitação de PDF válido
- rejeição por tamanho

### `tests/rate-limit.test.ts`

Valida:

- bloqueio após limite de tentativas
- limpeza após login bem-sucedido
- gravação de tentativas
- normalização do IP

### `tests/storage.test.ts`

Valida:

- montagem estável do caminho do arquivo
- detecção de URLs legadas externas

## Qualidade percebida

Pontos fortes:

- regras de domínio principais têm testes unitários
- autenticação e upload têm defesa explícita
- mensagens de erro sensíveis são genéricas no login

Lacunas:

- não há testes de integração cobrindo `app/actions.ts`
- não há testes end-to-end de fluxos por perfil
- não há testes cobrindo as páginas do App Router
- não há testes do parser `xml.ts` de produção
- não há testes de reavaliação, importação XML e encerramento de ciclo
