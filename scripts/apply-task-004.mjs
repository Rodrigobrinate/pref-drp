/**
 * apply-task-004.mjs
 * Executa os prompts do TASK-004 diretamente via `codex exec`.
 * Uso: node scripts/apply-task-004.mjs
 * Requisito: projeto deve ser um repositório git (`git init` já feito).
 */

import { execSync } from "child_process";

const ROOT = "/mnt/c/Users/PC/Documents/projeto-pref-drp";

function run(description, prompt) {
  console.log(`\n[EXECUTANDO] ${description}`);
  try {
    execSync(`codex exec "${prompt.replace(/"/g, '\\"')}" >> saida-codex.md 2>&1`, {
      cwd: ROOT,
      stdio: "inherit",
    });
    console.log(`[OK] ${description}`);
  } catch {
    console.log(`[ERRO] ${description} — veja saida-codex.md para detalhes`);
  }
}

run(
  "Fix call site canManagerEvaluate na página da chefia",
  "No arquivo app/[year]/chefia/avaliacoes/[evaluationId]/page.tsx, localize a chamada canManagerEvaluate(evaluation.evaluated.employmentType ?? EmploymentType.EFETIVO, evaluation.status) e remova o primeiro argumento, deixando apenas canManagerEvaluate(evaluation.status). Se EmploymentType não for mais usado em nenhum outro lugar do arquivo após essa mudança, remova-o do import.",
);

run(
  "Adicionar campo startDate no formulário de ciclo",
  "No arquivo components/rh-forms.tsx, dentro do componente CycleCreateForm, adicione após o campo de input do ano (name=year) um novo campo: label 'Data de abertura do projeto', input type=date, name=startDate, required. Use as mesmas classes CSS do restante do formulário.",
);

run(
  "Exibir classificação SD/AD/AP/NA na página do servidor",
  "No arquivo app/[year]/servidor/page.tsx: (1) adicione getClassification ao import de @/lib/evaluation. (2) Logo após o parágrafo que exibe o StatusBadge, adicione um novo parágrafo que mostra a pontuação e classificação apenas quando selfScore > 0: formato 'Pontuação: X.XX pts — SD/AD/AP/NA'. Use decimalToNumber(fullEvaluation.selfScore) e getClassification(score, type) para calcular.",
);

console.log("\n=== Concluído. Rode: npx tsc --noEmit para verificar tipos. ===\n");
