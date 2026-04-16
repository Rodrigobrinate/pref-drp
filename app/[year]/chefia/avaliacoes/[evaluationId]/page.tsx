import { EmploymentType, EvaluationPhase, SystemRole } from "@prisma/client";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { EvaluationForm } from "@/components/evaluation-form";
import { LogoutButton } from "@/components/logout-button";
import { requireSessionForYear } from "@/lib/auth";
import { decimalToNumber, getEvaluationWithRelations } from "@/lib/evaluations-data";
import { canManagerEvaluate, getQuestionTypeByEmploymentType, isReadOnly, SCORE_BY_TYPE } from "@/lib/evaluation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ManagerEvaluationPage({
  params,
}: {
  params: Promise<{ year: string; evaluationId: string }>;
}) {
  const { year, evaluationId } = await params;
  const cycleYear = Number(year);
  const context = await requireSessionForYear(cycleYear, SystemRole.MANAGER);

  if (!context.userCycle) {
    notFound();
  }

  if (!context.cycle) {
    notFound();
  }

  const evaluation = await getEvaluationWithRelations(evaluationId);

  if (
    !evaluation ||
    evaluation.managerId !== context.userCycle.id ||
    !canManagerEvaluate(evaluation.status)
  ) {
    notFound();
  }

  const type = getQuestionTypeByEmploymentType(evaluation.evaluated.employmentType ?? EmploymentType.EFETIVO);
  const questions = await prisma.question.findMany({
    where: {
      cycleId: evaluation.cycleId,
      type,
    },
    include: {
      options: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  const initialAnswers = Object.fromEntries(
    evaluation.answers
      .filter((answer) => answer.phase === EvaluationPhase.MANAGER)
      .map((answer) => [answer.questionId, answer.selectedOptionId]),
  );

  return (
    <AppShell
      actions={<LogoutButton year={cycleYear} />}
      currentPath={`/${cycleYear}/chefia`}
      navItems={[{ href: `/${cycleYear}/chefia`, label: "Painel de Avaliação" }]}
      subtitle="Parecer da Chefia"
      title="Nomos"
      userMeta={`${context.userCycle.jobTitle} · ${context.userCycle.department}`}
      userName={context.user.name}
    >
      <EvaluationForm
        actorName={evaluation.evaluated.user.name}
        currentScore={decimalToNumber(evaluation.managerScore)}
        employmentType={evaluation.evaluated.employmentType ?? EmploymentType.EFETIVO}
        evaluationId={evaluation.id}
        initialAnswers={initialAnswers}
        initialDocuments={evaluation.documents.map((document) => ({
          id: document.id,
          name: document.name,
          size: document.size,
          url: document.url,
        }))}
        maxScore={SCORE_BY_TYPE[type].cap}
        phase="manager"
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
        readOnly={isReadOnly(evaluation.status, "manager")}
        status={evaluation.status}
        year={cycleYear}
      />
    </AppShell>
  );
}
