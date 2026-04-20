# Segurança e Restrições

## Sessão

- cookie: `nomos_session`
- `httpOnly`
- `sameSite=lax`
- `secure` em produção
- expiração: 12 horas

## Controle de acesso

### Por sessão

- `requireSessionForYear` protege áreas contextuais do ciclo
- `requireGlobalRhSession` protege o RH global
- `requireDeveloperConsoleSession` protege `/admin`

### Por CPF allowlist

`DEVELOPER_ACCESS_CPFS` controla quem pode entrar no console administrativo.

## Login e brute force

O rate limit usa:

- janela de `15` minutos
- bloqueio após `5` tentativas por CPF

Observação importante: o IP é armazenado, mas a decisão de bloqueio hoje é feita por CPF, não por CPF+IP.

## Upload de documentos

- aceita apenas `application/pdf`
- limite atual de `10MB` por arquivo
- valida assinatura binária `%PDF-`
- sanitiza nome do arquivo
- limita em `10` documentos por avaliação

## Storage

- bucket padrão: `evaluation-documents`
- bucket não público
- tipo permitido: `application/pdf`
- limite configurado no bucket: `10MB`
- acesso por URL assinada com TTL de `1` hora

## Segurança de navegação

- o redirecionamento pós-login é centralizado em `getPostLoginPath`
- o root `/` redireciona sempre para a área correta quando há sessão
- o console admin prevalece sobre as áreas de papel comum quando o CPF está na allowlist

## Fail-fast existente

O código já falha cedo para:

- sessão ausente
- ano inválido
- avaliação inexistente
- submissão incompleta
- respostas inválidas
- upload inválido
- ciclo duplicado
- ciclo inexistente
