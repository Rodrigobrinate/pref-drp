import { EvaluationStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function ensureCurrentEvaluation(input: {
  cycleId: string;
  evaluatedId: string;
  managerId?: string | null;
}) {
  const existing = await prisma.evaluation.findFirst({
    where: {
      cycleId: input.cycleId,
      evaluatedId: input.evaluatedId,
      current: true,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.evaluation.create({
    data: {
      cycleId: input.cycleId,
      evaluatedId: input.evaluatedId,
      managerId: input.managerId ?? null,
      status: EvaluationStatus.PENDING,
    },
  });
}

export async function getEvaluationWithRelations(evaluationId: string) {
  return prisma.evaluation.findUnique({
    where: { id: evaluationId },
    include: {
      cycle: true,
      documents: {
        orderBy: { createdAt: "desc" },
      },
      evaluated: {
        include: {
          user: true,
          manager: {
            include: {
              user: true,
            },
          },
        },
      },
      manager: {
        include: {
          user: true,
        },
      },
      answers: {
        include: {
          question: {
            include: {
              options: {
                orderBy: { sortOrder: "asc" },
              },
            },
          },
          selectedOption: true,
        },
      },
    },
  });
}

export async function cloneQuestionSet(sourceCycleId: string, targetCycleId: string) {
  const questions = await prisma.question.findMany({
    where: { cycleId: sourceCycleId },
    include: { options: { orderBy: { sortOrder: "asc" } } },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
  });

  if (questions.length === 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.question.createMany({
      data: questions.map((question) => ({
        cycleId: targetCycleId,
        type: question.type,
        title: question.title,
        description: question.description,
        sortOrder: question.sortOrder,
      })),
    });

    const createdQuestions = await tx.question.findMany({
      where: { cycleId: targetCycleId },
      select: {
        id: true,
        type: true,
        sortOrder: true,
      },
    });

    const questionIdByKey = new Map(
      createdQuestions.map((question) => [`${question.type}:${question.sortOrder}`, question.id]),
    );

    await tx.option.createMany({
      data: questions.flatMap((question) =>
        question.options.map((option) => {
          const questionId = questionIdByKey.get(`${question.type}:${question.sortOrder}`);

          if (!questionId) {
            throw new Error("Pergunta clonada não encontrada.");
          }

          return {
            questionId,
            label: option.label,
            description: option.description,
            score: option.score,
            sortOrder: option.sortOrder,
          };
        }),
      ),
    });
  });
}

export function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number {
  return value ? Number(value) : 0;
}
