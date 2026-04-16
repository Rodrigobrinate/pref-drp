/**
 * sec-01-rate-limiting.mjs
 * Gera prompt para o Codex implementar rate limiting no login.
 * Uso: node scripts/sec-01-rate-limiting.mjs
 */
import { execSync } from "child_process";

const ROOT = "/mnt/c/Users/PC/Documents/projeto-pref-drp";

const prompt = `
No projeto em /mnt/c/Users/PC/Documents/projeto-pref-drp, implemente proteção contra brute force no login.

CONTEXTO:
- As funções loginAction e rhLoginAction em app/actions.ts não têm rate limiting.
- O projeto usa Prisma com SQLite (prisma/schema.prisma). Não há Redis disponível.
- Use a tabela do banco para registrar tentativas falhas — crie um novo model Prisma.

PASSO 1 — Adicionar model LoginAttempt em prisma/schema.prisma:
model LoginAttempt {
  id        String   @id @default(cuid())
  cpf       String
  ip        String   @default("unknown")
  createdAt DateTime @default(now())

  @@index([cpf, createdAt])
}

PASSO 2 — Criar lib/rate-limit.ts com a seguinte lógica:
- Constantes: MAX_ATTEMPTS = 5, WINDOW_MINUTES = 15, LOCKOUT_MINUTES = 30
- Função checkRateLimit(cpf: string): Promise<{ blocked: boolean; remaining: number }>
  - Conta tentativas do CPF nos últimos WINDOW_MINUTES minutos
  - Se >= MAX_ATTEMPTS, retorna blocked: true
  - Caso contrário, retorna blocked: false com remaining
- Função recordFailedAttempt(cpf: string): Promise<void>
  - Insere registro em LoginAttempt
- Função clearAttempts(cpf: string): Promise<void>
  - Deleta todos os registros de LoginAttempt para aquele CPF (login bem-sucedido)

PASSO 3 — Aplicar em app/actions.ts:
- Em loginAction: antes de verifyCredentials, chamar checkRateLimit. Se blocked, retornar { error: "Conta temporariamente bloqueada. Tente novamente em 30 minutos." }. Após falha, chamar recordFailedAttempt. Após sucesso, chamar clearAttempts.
- Mesma lógica em rhLoginAction.

PASSO 4 — Rodar: npx prisma migrate dev --name add_login_attempts

Não adicione comentários. Não altere outros arquivos.
`;

console.log("Executando Codex — SEC-01 Rate Limiting...\n");
execSync(`codex exec "${prompt.replace(/\n/g, " ").replace(/"/g, "'")}" >> saida-codex.md 2>&1`, {
  cwd: ROOT,
  stdio: "inherit",
});
console.log("Concluído. Verifique saida-codex.md");
