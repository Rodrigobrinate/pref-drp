import { EvaluationStatus } from "@prisma/client";

import { cn } from "@/lib/utils";

const labels: Record<EvaluationStatus, string> = {
  PENDING: "Pendente",
  DRAFT: "Rascunho",
  AUTO_DONE: "Autoavaliação concluída",
  MANAGER_DONE: "Chefia concluída",
  COMPLETED: "Fluxo concluído",
  ARCHIVED: "Arquivada",
};

const colors: Record<EvaluationStatus, string> = {
  PENDING: "bg-tertiary-fixed text-on-error-container",
  DRAFT: "bg-surface-container text-on-surface-variant",
  AUTO_DONE: "bg-secondary-container text-on-secondary-container",
  MANAGER_DONE: "bg-secondary-container text-on-secondary-container",
  COMPLETED: "bg-primary text-on-primary",
  ARCHIVED: "bg-surface-container-highest text-on-surface-variant",
};

export function StatusBadge({ status }: { status: EvaluationStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold", colors[status])}>
      {labels[status]}
    </span>
  );
}
