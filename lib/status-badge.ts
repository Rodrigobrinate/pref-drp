import { CycleStatus, EvaluationStatus } from "@prisma/client";

const evaluationStatusLabels: Record<EvaluationStatus, string> = {
  PENDING: "Pendente",
  DRAFT: "Rascunho",
  AUTO_DONE: "Autoavaliação concluída",
  MANAGER_DONE: "Chefia concluída",
  COMPLETED: "Fluxo concluído",
  ARCHIVED: "Arquivada",
};

const evaluationStatusColors: Record<EvaluationStatus, string> = {
  PENDING: "bg-tertiary-fixed text-on-error-container",
  DRAFT: "bg-surface-container text-on-surface-variant",
  AUTO_DONE: "bg-secondary-container text-on-secondary-container",
  MANAGER_DONE: "bg-secondary-container text-on-secondary-container",
  COMPLETED: "bg-primary text-on-primary",
  ARCHIVED: "bg-surface-container-highest text-on-surface-variant",
};

const cycleStatusLabels: Record<CycleStatus, string> = {
  OPEN: "Aberto",
  COMPLETED: "Encerrado",
};

const cycleStatusColors: Record<CycleStatus, string> = {
  OPEN: "bg-secondary-container text-on-secondary-container",
  COMPLETED: "bg-primary text-on-primary",
};

export type StatusBadgeValue = EvaluationStatus | CycleStatus;
export type StatusBadgeKind = "evaluation" | "cycle";

export function getStatusBadgePresentation(status: StatusBadgeValue, kind: StatusBadgeKind = "evaluation") {
  if (kind === "cycle") {
    return {
      label: cycleStatusLabels[status as CycleStatus],
      className: cycleStatusColors[status as CycleStatus],
    };
  }

  return {
    label: evaluationStatusLabels[status as EvaluationStatus],
    className: evaluationStatusColors[status as EvaluationStatus],
  };
}
