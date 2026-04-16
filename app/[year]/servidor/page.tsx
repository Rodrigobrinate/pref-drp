import { EmploymentType, EvaluationPhase, SystemRole } from "@prisma/client";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { EvaluationForm } from "@/components/evaluation-form";
import { LogoutButton } from "@/components/logout-button";
import { StatusBadge } from "@/components/status-badge";
import { getSessionContext, requireSessionForYear } from "@/lib/auth";
import { decimalToNumber, ensureCurrentEvaluation } from "@/lib/evaluations-data";
import { getClassification, getQuestionTypeByEmploymentType, isReadOnly, SCORE_BY_TYPE } from "@/lib/evaluation";
import { prisma } from "@/lib/prisma";

export default async function ServidorPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  const cycleYear = Number(year);
  const context = await requireSessionForYear(cycleYear, SystemRole.EMPLOYEE);

  if (!context.userCycle) {
    notFound();
  }

  if (!context.cycle) {
    notFound();
  }

  const cycle = context.cycle;

  const evaluation = await ensureCurrentEvaluation({
    cycleId: cycle.id,
    evaluatedId: context.userCycle.id,
    managerId: context.userCycle.managerId,
  });

  const fullEvaluation = await prisma.evaluation.findUniqueOrThrow({
    where: { id: evaluation.id },
    select: {
      id: true,
      status: true,
      selfScore: true,
      documents: {
        select: {
          id: true,
          name: true,
          size: true,
          url: true,
        },
      },
      answers: {
        where: { phase: EvaluationPhase.SELF },
        select: {
          questionId: true,
          selectedOptionId: true,
        },
      },
    },
  });

  const type = getQuestionTypeByEmploymentType(context.userCycle.employmentType ?? EmploymentType.EFETIVO);
  const questions = await prisma.question.findMany({
    where: {
      cycleId: cycle.id,
      type,
    },
    select: {
      id: true,
      title: true,
      description: true,
      sortOrder: true,
      options: {
        select: {
          id: true,
          label: true,
          description: true,
          score: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  const initialAnswers = Object.fromEntries(
    fullEvaluation.answers.map((answer) => [answer.questionId, answer.selectedOptionId]),
  );
  const selfScore = decimalToNumber(fullEvaluation.selfScore);

  const session = await getSessionContext();

  return (
    <AppShell
      actions={<LogoutButton year={cycleYear} />}
      currentPath={`/${cycleYear}/servidor`}
      navItems={[{ href: `/${cycleYear}/servidor`, label: "Avaliação" }]}
      subtitle="Portal do Servidor"
      title="Nomos"
      userMeta={`${context.userCycle.jobTitle} · ${context.userCycle.department}`}
      userName={session?.user.name ?? context.user.name}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-on-surface-variant">
            Status do fluxo <StatusBadge status={fullEvaluation.status} />
          </p>
          {selfScore > 0 ? (
            <p className="text-sm text-on-surface-variant">
              Pontuacao: {selfScore.toFixed(2)} pts - {getClassification(selfScore, type)}
            </p>
          ) : null}
        </div>
      </div>

      <EvaluationForm
        actorName={context.user.name}
        currentScore={selfScore}
        employmentType={context.userCycle.employmentType ?? EmploymentType.EFETIVO}
        evaluationId={fullEvaluation.id}
        initialAnswers={initialAnswers}
        initialDocuments={fullEvaluation.documents.map((document) => ({
          id: document.id,
          name: document.name,
          size: document.size,
          url: document.url,
        }))}
        maxScore={SCORE_BY_TYPE[type].cap}
        phase="self"
        questions={questions.map((question) => ({
          id: question.id,
          title: question.title,
          description: question.description,
          sortOrder: question.sortOrder,
          options: question.options.map((option) => ({
            id: option.id,
            label: option.label,
            description: option.description,
            score: Number(option.score),
          })),
        }))}
        readOnly={isReadOnly(fullEvaluation.status, "self")}
        status={fullEvaluation.status}
        year={cycleYear}
      />
    </AppShell>
  );
}
