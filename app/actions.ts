"use server";

import {
  CycleStatus,
  EmploymentType,
  EvaluationPhase,
  EvaluationStatus,
  Prisma,
  QuestionType,
  SystemRole,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  clearSession,
  createSession,
  getSessionContext,
  routeForRole,
  verifyCredentials,
  verifyGlobalRhCredentials,
} from "@/lib/auth";
import {
  calculateScore,
  canAutosave,
  getDeadline,
  getQuestionTypeByEmploymentType,
  resolveFinalStatus,
  validateAnswerPayload,
} from "@/lib/evaluation";
import { cloneQuestionSet, decimalToNumber, ensureCurrentEvaluation, getEvaluationWithRelations } from "@/lib/evaluations-data";
import { prisma } from "@/lib/prisma";
import { getDefaultOptions, QUESTION_BANK } from "@/lib/question-bank";
import { checkRateLimit, clearAttempts, normalizeRequestIp, recordFailedAttempt } from "@/lib/rate-limit";
import { storeDocumentInDrive } from "@/lib/storage";
import { validatePdfUpload } from "@/lib/upload-security";
import { parseXmlEmployees } from "@/lib/xml";

const loginSchema = z.object({
  cpf: z.string().min(11),
  password: z.string().min(11),
  year: z.coerce.number().int(),
});

export async function loginAction(_prevState: { error?: string } | undefined, formData: FormData) {
  const requestHeaders = await headers();
  const requestIp = normalizeRequestIp(requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip"));
  const parsed = loginSchema.safeParse({
    cpf: String(formData.get("cpf") ?? "").replace(/\D/g, ""),
    password: String(formData.get("password") ?? "").replace(/\D/g, ""),
    year: formData.get("year"),
  });

  if (!parsed.success) {
    return { error: "Informe CPF e senha válidos." };
  }

  const rateLimit = await checkRateLimit(parsed.data.cpf, requestIp);

  if (rateLimit.blocked) {
    return { error: "Conta bloqueada. Tente em 15 minutos." };
  }

  const result = await verifyCredentials(parsed.data.cpf, parsed.data.password, parsed.data.year);

  if (!result.ok) {
    await recordFailedAttempt(parsed.data.cpf, requestIp);
    return { error: result.message };
  }

  await clearAttempts(parsed.data.cpf);

  if (result.effectiveRole === SystemRole.RH) {
    await createSession(result.user.id, null);
    redirect("/rh");
  }

  await createSession(result.user.id, result.cycle.id);
  redirect(`/${parsed.data.year}/${routeForRole(result.effectiveRole)}`);
}

const globalLoginSchema = z.object({
  cpf: z.string().min(11),
  password: z.string().min(11),
});

export async function rhLoginAction(_prevState: { error?: string } | undefined, formData: FormData) {
  const requestHeaders = await headers();
  const requestIp = normalizeRequestIp(requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip"));
  const parsed = globalLoginSchema.safeParse({
    cpf: String(formData.get("cpf") ?? "").replace(/\D/g, ""),
    password: String(formData.get("password") ?? "").replace(/\D/g, ""),
  });

  if (!parsed.success) {
    return { error: "Informe CPF e senha válidos." };
  }

  const rateLimit = await checkRateLimit(parsed.data.cpf, requestIp);

  if (rateLimit.blocked) {
    return { error: "Conta bloqueada. Tente em 15 minutos." };
  }

  const result = await verifyGlobalRhCredentials(parsed.data.cpf, parsed.data.password);

  if (!result.ok) {
    await recordFailedAttempt(parsed.data.cpf, requestIp);
    return { error: result.message };
  }

  await clearAttempts(parsed.data.cpf);
  await createSession(result.user.id, null);
  redirect("/rh");
}

export async function logoutAction(year?: number, redirectTo?: string) {
  await clearSession();
  redirect(redirectTo ?? `/${year}/login`);
}

const draftSchema = z.object({
  evaluationId: z.string().min(1),
  answers: z.record(z.string(), z.string()),
});

export async function saveDraftAction(input: z.infer<typeof draftSchema>) {
  const sessionContext = await getSessionContext();

  if (!sessionContext) {
    return { ok: false as const, message: "Nao autorizado." };
  }

  const parsed = draftSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false as const, message: "Carga de rascunho inválida." };
  }

  const evaluation = await getEvaluationWithRelations(parsed.data.evaluationId);

  if (!evaluation) {
    return { ok: false as const, message: "Avaliação não encontrada." };
  }

  const deadline = getDeadline(evaluation.cycle.startDate, "self");

  if (!canAutosave(evaluation.status, deadline)) {
    return { ok: false as const, message: "Prazo encerrado para salvar rascunho." };
  }

  const actorUserCycle = await prisma.userCycle.findUnique({
    where: {
      userId_cycleId: {
        userId: sessionContext.user.id,
        cycleId: evaluation.cycleId,
      },
    },
  });

  if (!actorUserCycle || evaluation.evaluatedId !== actorUserCycle.id) {
    return { ok: false as const, message: "Rascunho não autorizado." };
  }

  const questions = await prisma.question.findMany({
    where: {
      cycleId: evaluation.cycleId,
      type: getQuestionTypeByEmploymentType(evaluation.evaluated.employmentType ?? EmploymentType.EFETIVO),
    },
    select: {
      id: true,
      options: {
        select: {
          id: true,
          label: true,
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  const answerValidation = validateAnswerPayload(questions, parsed.data.answers, false);

  if (!answerValidation.ok) {
    return { ok: false as const, message: answerValidation.message };
  }

  await prisma.$transaction(async (tx) => {
    await tx.evaluationAnswer.deleteMany({
      where: {
        evaluationId: evaluation.id,
        phase: EvaluationPhase.SELF,
      },
    });

    await tx.evaluationAnswer.createMany({
      data: Object.entries(parsed.data.answers).map(([questionId, optionId]) => ({
        evaluationId: evaluation.id,
        questionId,
        selectedOptionId: optionId,
        phase: EvaluationPhase.SELF,
      })),
    });

    const score = calculateScore(
      getQuestionTypeByEmploymentType(evaluation.evaluated.employmentType ?? EmploymentType.EFETIVO),
      answerValidation.selectedLabels,
    );

    await tx.evaluation.update({
      where: { id: evaluation.id },
      data: {
        status: EvaluationStatus.DRAFT,
        selfScore: new Prisma.Decimal(score),
        finalScore: new Prisma.Decimal(score),
      },
    });
  });

  revalidatePath(`/${evaluation.cycle.year}/servidor`);
  revalidatePath(`/${evaluation.cycle.year}/chefia`);

  return { ok: true as const, message: "Alterações salvas automaticamente." };
}

const submitSchema = z.object({
  evaluationId: z.string().min(1),
  phase: z.enum(["self", "manager"]),
  answers: z.record(z.string(), z.string()),
});

export async function submitEvaluationAction(input: z.infer<typeof submitSchema>) {
  const sessionContext = await getSessionContext();

  if (!sessionContext) {
    return { ok: false as const, message: "Nao autorizado." };
  }

  const parsed = submitSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false as const, message: "Submissão inválida." };
  }

  const evaluation = await getEvaluationWithRelations(parsed.data.evaluationId);

  if (!evaluation) {
    return { ok: false as const, message: "Avaliação não encontrada." };
  }

  const phase = parsed.data.phase === "self" ? EvaluationPhase.SELF : EvaluationPhase.MANAGER;
  const isSelf = phase === EvaluationPhase.SELF;

  const actorUserCycle = await prisma.userCycle.findUnique({
    where: {
      userId_cycleId: {
        userId: sessionContext.user.id,
        cycleId: evaluation.cycleId,
      },
    },
  });

  if (!actorUserCycle) {
    return { ok: false as const, message: "Nao autorizado." };
  }

  if (isSelf && evaluation.evaluatedId !== actorUserCycle.id) {
    return { ok: false as const, message: "Operação não autorizada." };
  }

  if (!isSelf && evaluation.managerId !== actorUserCycle.id) {
    return { ok: false as const, message: "Operação não autorizada." };
  }

  const questions = await prisma.question.findMany({
    where: {
      cycleId: evaluation.cycleId,
      type: getQuestionTypeByEmploymentType(evaluation.evaluated.employmentType ?? EmploymentType.EFETIVO),
    },
    select: {
      id: true,
      options: {
        select: {
          id: true,
          label: true,
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  const answerValidation = validateAnswerPayload(questions, parsed.data.answers, true);

  if (!answerValidation.ok) {
    return { ok: false as const, message: answerValidation.message };
  }

  await prisma.$transaction(async (tx) => {
    await tx.evaluationAnswer.deleteMany({
      where: {
        evaluationId: evaluation.id,
        phase,
      },
    });

    await tx.evaluationAnswer.createMany({
      data: Object.entries(parsed.data.answers).map(([questionId, optionId]) => ({
        evaluationId: evaluation.id,
        questionId,
        selectedOptionId: optionId,
        phase,
      })),
    });

    const score = calculateScore(
      getQuestionTypeByEmploymentType(evaluation.evaluated.employmentType ?? EmploymentType.EFETIVO),
      answerValidation.selectedLabels,
    );

    const nextStatus = resolveFinalStatus(evaluation.status, parsed.data.phase);

    await tx.evaluation.update({
      where: { id: evaluation.id },
      data: {
        status: nextStatus,
        selfScore: isSelf ? new Prisma.Decimal(score) : evaluation.selfScore,
        managerScore: !isSelf ? new Prisma.Decimal(score) : evaluation.managerScore,
        finalScore: new Prisma.Decimal(isSelf ? score : score),
        autoSubmittedAt: isSelf ? new Date() : evaluation.autoSubmittedAt,
        managerSubmittedAt: !isSelf ? new Date() : evaluation.managerSubmittedAt,
      },
    });
  });

  revalidatePath(`/${evaluation.cycle.year}/servidor`);
  revalidatePath(`/${evaluation.cycle.year}/chefia`);
  revalidatePath(`/${evaluation.cycle.year}/rh`);

  return { ok: true as const, redirectTo: `/${evaluation.cycle.year}/${isSelf ? "servidor" : "chefia"}` };
}

export async function uploadDocumentsAction(formData: FormData) {
  const sessionContext = await getSessionContext();

  if (!sessionContext) {
    return { ok: false as const, message: "Nao autorizado." };
  }

  const evaluationId = String(formData.get("evaluationId") ?? "");
  const files = formData.getAll("files").filter((file): file is File => file instanceof File);

  if (!evaluationId || files.length === 0) {
    return { ok: false as const, message: "Nenhum arquivo enviado." };
  }

  const evaluation = await getEvaluationWithRelations(evaluationId);

  if (!evaluation) {
    return { ok: false as const, message: "Avaliação não encontrada." };
  }

  const actorUserCycle = await prisma.userCycle.findUnique({
    where: {
      userId_cycleId: {
        userId: sessionContext.user.id,
        cycleId: evaluation.cycleId,
      },
    },
  });

  if (!actorUserCycle || evaluation.evaluatedId !== actorUserCycle.id) {
    return { ok: false as const, message: "Nao autorizado." };
  }

  if (actorUserCycle.role !== SystemRole.EMPLOYEE) {
    return { ok: false as const, message: "Nao autorizado." };
  }

  if ((actorUserCycle.employmentType ?? evaluation.evaluated.employmentType) !== EmploymentType.EFETIVO) {
    return { ok: false as const, message: "Upload disponível apenas para servidores efetivos." };
  }

  const deadline = getDeadline(evaluation.cycle.startDate, "self");

  if (!canAutosave(evaluation.status, deadline)) {
    return { ok: false as const, message: "Prazo encerrado para envio de comprovantes." };
  }

  if ((evaluation.documents?.length ?? 0) + files.length > 10) {
    return { ok: false as const, message: "Limite máximo de 10 comprovantes por servidor." };
  }

  const uploaded = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = validatePdfUpload({
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      buffer,
    });

    if (!validation.ok) {
      return { ok: false as const, message: validation.message };
    }

    const stored = await storeDocumentInDrive({
      buffer,
      fileName: validation.sanitizedFileName,
      cycleYear: evaluation.cycle.year,
      userFolder: `${evaluation.evaluated.user.name.replace(/\s+/g, "_")}_${evaluation.evaluated.user.registration.replace(/\s+/g, "")}`,
    });

    const document = await prisma.document.create({
      data: {
        evaluationId,
        name: validation.sanitizedFileName,
        mimeType: file.type,
        size: file.size,
        storageKey: stored.storageKey,
        url: stored.url,
      },
    });

    uploaded.push({
      id: document.id,
      name: document.name,
      url: document.url,
      size: document.size,
    });
  }

  revalidatePath(`/${evaluation.cycle.year}/servidor`);
  return { ok: true as const, documents: uploaded };
}

const cycleSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
});

export async function createCycleAction(_prevState: { error?: string; success?: string } | undefined, formData: FormData) {
  const sessionContext = await getSessionContext();

  if (sessionContext?.user.globalRole !== SystemRole.RH) {
    return { error: "Nao autorizado." };
  }

  const parsed = cycleSchema.safeParse({
    year: formData.get("year"),
  });

  if (!parsed.success) {
    return { error: "Ano do ciclo inválido." };
  }

  const existing = await prisma.cycle.findUnique({ where: { year: parsed.data.year } });

  if (existing) {
    return { error: "Já existe um ciclo para esse ano." };
  }

  const openCycle = await prisma.cycle.findFirst({
    where: { status: CycleStatus.OPEN },
    orderBy: { year: "desc" },
  });

  if (openCycle) {
    return {
      error: `Finalize o projeto ${openCycle.year} antes de criar um novo ciclo.`,
    };
  }

  const latestCycle = await prisma.cycle.findFirst({
    orderBy: { year: "desc" },
  });

  const cycle = await prisma.cycle.create({
    data: {
      year: parsed.data.year,
      name: `Ciclo ${parsed.data.year}`,
      startDate: new Date(`${parsed.data.year}-04-01T00:00:00.000Z`),
      endDate: new Date(`${parsed.data.year}-04-30T23:59:59.999Z`),
      status: CycleStatus.OPEN,
      active: true,
    },
  });

  await prisma.cycle.updateMany({
    where: { NOT: { id: cycle.id } },
    data: { active: false },
  });

  if (latestCycle) {
    await cloneQuestionSet(latestCycle.id, cycle.id);
  } else {
    await prisma.$transaction(async (tx) => {
      const questionBankEntries = Object.entries(QUESTION_BANK) as Array<
        [QuestionType, (typeof QUESTION_BANK)[QuestionType]]
      >;

      const questionsToCreate = questionBankEntries.flatMap(([type, questions]) =>
        questions.map((question: (typeof questions)[number], index: number) => ({
          cycleId: cycle.id,
          type,
          title: question.title,
          description: question.description,
          sortOrder: index + 1,
        })),
      );

      await tx.question.createMany({
        data: questionsToCreate,
      });

      const createdQuestions = await tx.question.findMany({
        where: { cycleId: cycle.id },
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
        data: questionBankEntries.flatMap(([type, questions]) =>
          questions.flatMap((question: (typeof questions)[number], index: number) => {
            const questionId = questionIdByKey.get(`${type}:${index + 1}`);

            if (!questionId) {
              throw new Error("Pergunta criada não encontrada.");
            }

            return getDefaultOptions(type).map((option, optionIndex) => ({
              questionId,
              label: option.label,
              score: option.score,
              description: question.options[optionIndex],
              sortOrder: optionIndex + 1,
            }));
          }),
        ),
      });
    });
  }

  revalidatePath(`/${parsed.data.year}/rh`);
  revalidatePath("/rh");
  return { success: `Ciclo ${parsed.data.year} criado com sucesso.` };
}

export async function importXmlAction(_prevState: { error?: string; success?: string } | undefined, formData: FormData) {
  const sessionContext = await getSessionContext();

  if (sessionContext?.user.globalRole !== SystemRole.RH) {
    return { error: "Nao autorizado." };
  }

  const cycleId = String(formData.get("cycleId") ?? "");
  const xmlFile = formData.get("xml");

  if (!cycleId || !(xmlFile instanceof File)) {
    return { error: "Envie um arquivo XML válido." };
  }

  const cycle = await prisma.cycle.findUnique({ where: { id: cycleId } });

  if (!cycle) {
    return { error: "Ciclo não encontrado." };
  }

  const xml = await xmlFile.text();
  const employees = parseXmlEmployees(xml);

  if (employees.length === 0) {
    return { error: "Nenhum registro reconhecido no XML." };
  }

  const managerCpfs = new Set(employees.filter((employee) => employee.chefiaCpf).map((employee) => employee.chefiaCpf));
  const passwordHashes = await Promise.all(employees.map((employee) => bcrypt.hash(employee.cpf, 10)));

  await prisma.$transaction(async (tx) => {
    const managerMap = new Map<string, string>();
    const employeeCycleMap = new Map<string, string>();

    for (const [index, employee] of employees.entries()) {
      const passwordHash = passwordHashes[index];
      const user = await tx.user.upsert({
        where: { cpf: employee.cpf },
        create: {
          cpf: employee.cpf,
          name: employee.nome,
          registration: employee.matricula,
          passwordHash,
        },
        update: {
          name: employee.nome,
          registration: employee.matricula,
        },
      });

      const isManager = managerCpfs.has(employee.cpf);
      const employmentType =
        employee.vinculo.toUpperCase().includes("PROB") ? EmploymentType.PROBATORIO : EmploymentType.EFETIVO;

      const userCycle = await tx.userCycle.upsert({
        where: {
          userId_cycleId: {
            userId: user.id,
            cycleId,
          },
        },
        create: {
          userId: user.id,
          cycleId,
          role: isManager ? SystemRole.MANAGER : SystemRole.EMPLOYEE,
          employmentType: isManager ? null : employmentType,
          department: employee.secretaria,
          jobTitle: employee.cargo,
        },
        update: {
          role: isManager ? SystemRole.MANAGER : SystemRole.EMPLOYEE,
          employmentType: isManager ? null : employmentType,
          department: employee.secretaria,
          jobTitle: employee.cargo,
        },
      });

      managerMap.set(employee.cpf, userCycle.id);
      employeeCycleMap.set(employee.cpf, userCycle.id);
    }

    for (const employee of employees) {
      if (!employee.chefiaCpf) {
        continue;
      }

      const employeeCycleId = employeeCycleMap.get(employee.cpf);

      if (!employeeCycleId) {
        continue;
      }

      const managerId = managerMap.get(employee.chefiaCpf) ?? null;

      await tx.userCycle.update({
        where: { id: employeeCycleId },
        data: {
          managerId,
        },
      });

      const existingEvaluation = await tx.evaluation.findFirst({
        where: {
          cycleId,
          evaluatedId: employeeCycleId,
          current: true,
        },
      });

      if (existingEvaluation) {
        await tx.evaluation.update({
          where: { id: existingEvaluation.id },
          data: {
            managerId,
          },
        });
      } else {
        await tx.evaluation.create({
          data: {
            cycleId,
            evaluatedId: employeeCycleId,
            managerId,
            status: EvaluationStatus.PENDING,
          },
        });
      }
    }
  });

  revalidatePath(`/${cycle.year}/rh`);
  revalidatePath("/rh");
  revalidatePath(`/${cycle.year}/chefia`);
  return { success: `${employees.length} registro(s) importado(s) com sucesso.` };
}

export async function requestReevaluationAction(evaluationId: string) {
  const sessionContext = await getSessionContext();

  if (sessionContext?.user.globalRole !== SystemRole.RH) {
    return;
  }

  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    include: {
      answers: true,
      documents: true,
    },
  });

  if (!evaluation) {
    return;
  }

  const selfAnswers = evaluation.answers.filter((answer) => answer.phase === EvaluationPhase.SELF);
  const hasSelfEvaluation =
    selfAnswers.length > 0 ||
    evaluation.status === EvaluationStatus.AUTO_DONE ||
    evaluation.status === EvaluationStatus.MANAGER_DONE ||
    evaluation.status === EvaluationStatus.COMPLETED;

  await prisma.$transaction(async (tx) => {
    await tx.evaluation.update({
      where: { id: evaluation.id },
      data: {
        current: false,
        status: EvaluationStatus.ARCHIVED,
        archivedAt: new Date(),
      },
    });

    await tx.evaluation.create({
      data: {
        cycleId: evaluation.cycleId,
        evaluatedId: evaluation.evaluatedId,
        managerId: evaluation.managerId,
        version: evaluation.version + 1,
        current: true,
        status: hasSelfEvaluation ? EvaluationStatus.AUTO_DONE : EvaluationStatus.PENDING,
        selfScore: hasSelfEvaluation ? evaluation.selfScore : new Prisma.Decimal(0),
        managerScore: new Prisma.Decimal(0),
        finalScore: hasSelfEvaluation ? evaluation.selfScore : new Prisma.Decimal(0),
        autoSubmittedAt: hasSelfEvaluation ? evaluation.autoSubmittedAt ?? new Date() : null,
        managerSubmittedAt: null,
        reopenedAt: new Date(),
        answers: {
          create: selfAnswers.map((answer) => ({
            questionId: answer.questionId,
            selectedOptionId: answer.selectedOptionId,
            phase: EvaluationPhase.SELF,
          })),
        },
        documents: {
          create: evaluation.documents.map((document) => ({
            name: document.name,
            mimeType: document.mimeType,
            size: document.size,
            storageKey: document.storageKey,
            url: document.url,
            status: document.status,
          })),
        },
      },
    });
  });

  const cycle = await prisma.cycle.findUnique({ where: { id: evaluation.cycleId } });

  if (cycle) {
    revalidatePath(`/${cycle.year}/rh`);
    revalidatePath("/rh");
    revalidatePath(`/${cycle.year}/chefia`);
    revalidatePath(`/${cycle.year}/servidor`);
  }
}

export async function completeCycleAction(cycleId: string) {
  const sessionContext = await getSessionContext();

  if (sessionContext?.user.globalRole !== SystemRole.RH) {
    return { ok: false as const, message: "Nao autorizado." };
  }

  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
  });

  if (!cycle) {
    return { ok: false as const, message: "Projeto não encontrado." };
  }

  const pendingCount = await prisma.evaluation.count({
    where: {
      cycleId,
      current: true,
      status: {
        not: EvaluationStatus.COMPLETED,
      },
    },
  });

  if (pendingCount > 0) {
    return {
      ok: false as const,
      message: "Ainda existem avaliações pendentes. Finalize o ciclo somente após concluir todo o fluxo.",
    };
  }

  await prisma.cycle.update({
    where: { id: cycleId },
    data: {
      status: CycleStatus.COMPLETED,
      active: false,
      completedAt: new Date(),
    },
  });

  revalidatePath("/rh");
  revalidatePath(`/${cycle.year}/rh`);

  return { ok: true as const, message: `Projeto ${cycle.year} finalizado.` };
}
