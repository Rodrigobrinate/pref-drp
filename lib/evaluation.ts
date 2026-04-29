import { EmploymentType, EvaluationStatus, QuestionType } from "@prisma/client";
import { addDays, differenceInCalendarDays, isAfter } from "date-fns";

const GMT_MINUS_3_OFFSET_MS = 3 * 60 * 60 * 1000;

function startOfDayGmt3(date: Date): Date {
  const localMs = date.getTime() - GMT_MINUS_3_OFFSET_MS;
  const d = new Date(localMs);
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() + GMT_MINUS_3_OFFSET_MS);
}

export const SCORE_BY_TYPE = {
  [QuestionType.BASE_50]: {
    cap: 50,
    weights: { A: 10, B: 8, C: 6, D: 3, E: 1 },
  },
  [QuestionType.BASE_60]: {
    cap: 60,
    weights: { A: 7.5, B: 6, C: 4, D: 2.25, E: 0.75 },
  },
} as const;

export function getQuestionTypeByEmploymentType(type: EmploymentType): QuestionType {
  return type === EmploymentType.PROBATORIO ? QuestionType.BASE_50 : QuestionType.BASE_60;
}

export function getDeadlineDays(kind: "self" | "manager"): number {
  return 10;
}

export function calculateScore(
  type: QuestionType,
  selectedLabels: string[],
): number {
  const config = SCORE_BY_TYPE[type];
  const total = selectedLabels.reduce((sum, label) => {
    const key = label as keyof typeof config.weights;
    return sum + (config.weights[key] ?? 0);
  }, 0);

  return Number(Math.min(total, config.cap).toFixed(2));
}

type QuestionOptionRef = {
  id: string;
  label: string;
};

type QuestionRef = {
  id: string;
  options: QuestionOptionRef[];
};

export function validateAnswerPayload(
  questions: QuestionRef[],
  answers: Record<string, string>,
  requireComplete: boolean,
): { ok: true; selectedLabels: string[] } | { ok: false; message: string } {
  const entries = Object.entries(answers);

  if (requireComplete && entries.length !== questions.length) {
    return { ok: false, message: "Preencha todos os fatores obrigatórios." };
  }

  if (entries.length === 0) {
    return { ok: false, message: requireComplete ? "Preencha todos os fatores obrigatórios." : "Carga de rascunho inválida." };
  }

  const questionMap = new Map(
    questions.map((question) => [
      question.id,
      new Map(question.options.map((option) => [option.id, option.label])),
    ]),
  );

  const selectedLabels: string[] = [];

  for (const [questionId, optionId] of entries) {
    const optionsById = questionMap.get(questionId);

    if (!optionsById) {
      return { ok: false, message: "Respostas inválidas para esta avaliação." };
    }

    const label = optionsById.get(optionId);

    if (!label) {
      return { ok: false, message: "Respostas inválidas para esta avaliação." };
    }

    selectedLabels.push(label);
  }

  return { ok: true, selectedLabels };
}

export function getDeadline(startDate: Date, kind: "self" | "manager"): Date {
  return addDays(startOfDayGmt3(startDate), getDeadlineDays(kind));
}

export function getRemainingDays(deadline: Date, now = new Date()): number {
  return Math.max(differenceInCalendarDays(startOfDayGmt3(deadline), startOfDayGmt3(now)), 0);
}

export function isDeadlineExpired(deadline: Date, now = new Date()): boolean {
  return isAfter(startOfDayGmt3(now), startOfDayGmt3(deadline));
}

export function canAutosave(status: EvaluationStatus, deadline: Date, now = new Date()): boolean {
  if (status === EvaluationStatus.COMPLETED || status === EvaluationStatus.ARCHIVED) {
    return false;
  }

  return !isDeadlineExpired(deadline, now);
}

export function canManagerEvaluate(status: EvaluationStatus): boolean {
  return (
    status !== EvaluationStatus.COMPLETED &&
    status !== EvaluationStatus.ARCHIVED &&
    status !== EvaluationStatus.MANAGER_DONE
  );
}

export function canManagerSubmit(status: EvaluationStatus, managerDeadline: Date, now = new Date()): boolean {
  return canManagerEvaluate(status) && !isDeadlineExpired(managerDeadline, now);
}

export function isReadOnly(status: EvaluationStatus, phase: "self" | "manager"): boolean {
  if (status === EvaluationStatus.COMPLETED || status === EvaluationStatus.ARCHIVED) {
    return true;
  }

  if (phase === "self") {
    return status === EvaluationStatus.AUTO_DONE;
  }

  return status === EvaluationStatus.MANAGER_DONE;
}

export function resolveFinalStatus(
  currentStatus: EvaluationStatus,
  phase: "self" | "manager",
): EvaluationStatus {
  if (phase === "self") {
    return currentStatus === EvaluationStatus.MANAGER_DONE
      ? EvaluationStatus.COMPLETED
      : EvaluationStatus.AUTO_DONE;
  }

  return currentStatus === EvaluationStatus.AUTO_DONE
    ? EvaluationStatus.COMPLETED
    : EvaluationStatus.MANAGER_DONE;
}

export function getClassification(score: number, type: QuestionType): 'SD' | 'AD' | 'AP' | 'NA' {
  const cap = SCORE_BY_TYPE[type].cap;
  const pct = cap > 0 ? score / cap : 0;
  if (pct >= 0.9) return 'SD';
  if (pct >= 0.7) return 'AD';
  if (pct >= 0.4) return 'AP';
  return 'NA';
}
