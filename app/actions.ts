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
  canAccessDeveloperConsole,
  createSession,
  getSessionContext,
  getPostLoginPath,
  listDeveloperAccessCpfs,
  provisionDeveloperAccessUser,
  verifyCredentials,
  verifyGlobalRhCredentials,
} from "@/lib/auth";
import { parseAdminImportFile } from "@/lib/admin-import";
import { buildDevTestCycleName, buildDevTestUsers, pickDevTestYear } from "@/lib/dev-console";
import {
  calculateScore,
  canAutosave,
  canManagerSubmit,
  getDeadline,
  getQuestionTypeByEmploymentType,
  resolveFinalStatus,
  validateAnswerPayload,
} from "@/lib/evaluation";
import { cloneQuestionSet, decimalToNumber, ensureCurrentEvaluation, getEvaluationWithRelations } from "@/lib/evaluations-data";
import { prisma } from "@/lib/prisma";
import { getDefaultOptions, QUESTION_BANK } from "@/lib/question-bank";
import { checkRateLimit, clearAttempts, normalizeRequestIp, recordFailedAttempt } from "@/lib/rate-limit";
import { storeDocument } from "@/lib/storage";
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
    if (canAccessDeveloperConsole(parsed.data.cpf) && parsed.data.password === parsed.data.cpf) {
      const user = await provisionDeveloperAccessUser(parsed.data.cpf);
      await clearAttempts(parsed.data.cpf);
      await createSession(user.id, null);
      redirect("/admin");
    }

    await recordFailedAttempt(parsed.data.cpf, requestIp);
    return { error: result.message };
  }

  await clearAttempts(parsed.data.cpf);

  if (result.user.globalRole === SystemRole.RH) {
    await createSession(result.user.id, null);
    redirect(
      getPostLoginPath({
        cpf: result.user.cpf,
        role: result.effectiveRole,
      }),
    );
  }

  await createSession(result.user.id, result.cycle.id);
  redirect(
    getPostLoginPath({
      cpf: result.user.cpf,
      role: result.effectiveRole,
      year: parsed.data.year,
    }),
  );
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
    if (canAccessDeveloperConsole(parsed.data.cpf) && parsed.data.password === parsed.data.cpf) {
      const user = await provisionDeveloperAccessUser(parsed.data.cpf);
      await clearAttempts(parsed.data.cpf);
      await createSession(user.id, null);
      redirect("/admin");
    }

    await recordFailedAttempt(parsed.data.cpf, requestIp);
    return { error: result.message };
  }

  await clearAttempts(parsed.data.cpf);
  await createSession(result.user.id, null);
  redirect(
    getPostLoginPath({
      cpf: result.user.cpf,
      role: result.effectiveRole,
    }),
  );
}

function getDeveloperConsoleUnauthorizedMessage(sessionContext: Awaited<ReturnType<typeof getSessionContext>>) {
  if (!sessionContext) {
    return "Nao autorizado.";
  }

  return "Acesso restrito ao console de desenvolvimento.";
}

async function requireDeveloperActionSession() {
  const sessionContext = await getSessionContext();

  if (!sessionContext || !canAccessDeveloperConsole(sessionContext.user.cpf)) {
    return { ok: false as const, message: getDeveloperConsoleUnauthorizedMessage(sessionContext) };
  }

  return { ok: true as const, sessionContext };
}

async function seedCycleQuestionSet(cycleId: string) {
  const latestCycle = await prisma.cycle.findFirst({
    where: {
      id: { not: cycleId },
    },
    orderBy: { year: "desc" },
  });

  if (latestCycle) {
    await cloneQuestionSet(latestCycle.id, cycleId);
    return;
  }

  await prisma.$transaction(async (tx) => {
    const questionBankEntries = Object.entries(QUESTION_BANK) as Array<
      [QuestionType, (typeof QUESTION_BANK)[QuestionType]]
    >;

    const questionsToCreate = questionBankEntries.flatMap(([type, questions]) =>
      questions.map((question: (typeof questions)[number], index: number) => ({
        cycleId,
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
      where: { cycleId },
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

export async function logoutAction(year?: number, redirectTo?: string) {
  await clearSession();
  redirect(redirectTo ?? `/${year}/login`);
}

const draftSchema = z.object({
  evaluationId: z.string().min(1),
  phase: z.enum(["self", "manager"]),
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

  const isSelf = parsed.data.phase === "self";
  const deadline = getDeadline(evaluation.cycle.startDate, parsed.data.phase);

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

  if (!actorUserCycle) {
    return { ok: false as const, message: "Rascunho não autorizado." };
  }

  if (isSelf && evaluation.evaluatedId !== actorUserCycle.id) {
    return { ok: false as const, message: "Rascunho não autorizado." };
  }

  if (!isSelf && evaluation.managerId !== actorUserCycle.id) {
    return { ok: false as const, message: "Rascunho não autorizado." };
  }

  const phase = isSelf ? EvaluationPhase.SELF : EvaluationPhase.MANAGER;

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

  const score = calculateScore(
    getQuestionTypeByEmploymentType(evaluation.evaluated.employmentType ?? EmploymentType.EFETIVO),
    answerValidation.selectedLabels,
  );

  await prisma.$transaction(async (tx) => {
    await tx.evaluationAnswer.deleteMany({
      where: { evaluationId: evaluation.id, phase },
    });

    await tx.evaluationAnswer.createMany({
      data: Object.entries(parsed.data.answers).map(([questionId, optionId]) => ({
        evaluationId: evaluation.id,
        questionId,
        selectedOptionId: optionId,
        phase,
      })),
    });

    await tx.evaluation.update({
      where: { id: evaluation.id },
      data: isSelf
        ? { status: EvaluationStatus.DRAFT, selfScore: new Prisma.Decimal(score), finalScore: new Prisma.Decimal(score) }
        : { managerScore: new Prisma.Decimal(score) },
    });
  });

  revalidatePath(`/${evaluation.cycle.year}/servidor`);
  revalidatePath(`/${evaluation.cycle.year}/chefia`);

  return { ok: true as const, message: "Rascunho salvo." };
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

  if (!isSelf) {
    const managerDeadline = getDeadline(evaluation.cycle.startDate, "manager");
    if (!canManagerSubmit(evaluation.status, managerDeadline)) {
      return { ok: false as const, message: "Prazo encerrado para avaliação da chefia." };
    }
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

    const stored = await storeDocument({
      buffer,
      fileName: validation.sanitizedFileName,
      cycleYear: evaluation.cycle.year,
      userFolder: evaluation.evaluated.user.name,
    });

    const document = await prisma.document.create({
      data: {
        evaluationId,
        name: validation.sanitizedFileName,
        mimeType: file.type,
        size: file.size,
        storageKey: stored.storageKey,
        url: stored.storageKey,
      },
    });

    uploaded.push({
      id: document.id,
      name: document.name,
      url: stored.url,
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

  await seedCycleQuestionSet(cycle.id);

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

  const managerMap = new Map<string, string>();
  const employeeCycleMap = new Map<string, string>();

  // Phase 1: upsert users and userCycles individually (no long transaction)
  for (const [index, employee] of employees.entries()) {
    const passwordHash = passwordHashes[index];
    const isManager = managerCpfs.has(employee.cpf);
    const employmentType =
      employee.vinculo.toUpperCase().includes("PROB") ? EmploymentType.PROBATORIO : EmploymentType.EFETIVO;

    const [user, userCycle] = await prisma.$transaction([
      prisma.user.upsert({
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
      }),
    ]).then(async ([u]) => {
      const uc = await prisma.userCycle.upsert({
        where: { userId_cycleId: { userId: u.id, cycleId } },
        create: {
          userId: u.id,
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
      return [u, uc] as const;
    });

    managerMap.set(employee.cpf, userCycle.id);
    employeeCycleMap.set(employee.cpf, userCycle.id);
  }

  // Phase 2: wire manager links and evaluations
  for (const employee of employees) {
    if (!employee.chefiaCpf) {
      continue;
    }

    const employeeCycleId = employeeCycleMap.get(employee.cpf);

    if (!employeeCycleId) {
      continue;
    }

    const managerId = managerMap.get(employee.chefiaCpf) ?? null;

    const existingEvaluation = await prisma.evaluation.findFirst({
      where: { cycleId, evaluatedId: employeeCycleId, current: true },
    });

    await prisma.$transaction([
      prisma.userCycle.update({
        where: { id: employeeCycleId },
        data: { managerId },
      }),
      existingEvaluation
        ? prisma.evaluation.update({
            where: { id: existingEvaluation.id },
            data: { managerId },
          })
        : prisma.evaluation.create({
            data: {
              cycleId,
              evaluatedId: employeeCycleId,
              managerId,
              status: EvaluationStatus.PENDING,
            },
          }),
    ]);
  }

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

export async function rollbackImportAction(cycleId: string) {
  const sessionContext = await getSessionContext();

  if (sessionContext?.user.globalRole !== SystemRole.RH) {
    return { ok: false as const, message: "Nao autorizado." };
  }

  const cycle = await prisma.cycle.findUnique({ where: { id: cycleId } });

  if (!cycle) {
    return { ok: false as const, message: "Ciclo não encontrado." };
  }

  // Block rollback if any evaluation has progressed beyond PENDING
  const progressedCount = await prisma.evaluation.count({
    where: {
      cycleId,
      current: true,
      status: { not: EvaluationStatus.PENDING },
    },
  });

  if (progressedCount > 0) {
    return {
      ok: false as const,
      message: `Rollback bloqueado: ${progressedCount} avaliação(ões) já iniciada(s). Use reavaliação individual.`,
    };
  }

  await prisma.userCycle.deleteMany({ where: { cycleId } });

  revalidatePath(`/${cycle.year}/rh`);
  revalidatePath("/rh");
  revalidatePath(`/${cycle.year}/chefia`);

  return { ok: true as const, message: "Importação revertida. O ciclo está em branco para nova importação." };
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

export async function adminImportPreviewAction(
  _prevState:
    | {
        error?: string;
        success?: string;
        format?: string;
        total?: number;
        preview?: Array<{
          cpf: string;
          nome: string;
          matricula: string;
          vinculo: string;
          secretaria: string;
          cargo: string;
          chefiaCpf?: string;
        }>;
      }
    | undefined,
  formData: FormData,
) {
  const sessionContext = await getSessionContext();

  if (!sessionContext || !canAccessDeveloperConsole(sessionContext.user.cpf)) {
    return { error: getDeveloperConsoleUnauthorizedMessage(sessionContext) };
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { error: "Envie um arquivo XML ou CSV." };
  }

  const content = await file.text();
  const parsed = parseAdminImportFile(file.name, content);

  if (!parsed.ok) {
    return { error: parsed.message };
  }

  return {
    success: "Arquivo validado com sucesso. Nenhuma alteração foi persistida.",
    format: parsed.format,
    total: parsed.total,
    preview: parsed.preview,
  };
}

export async function provisionDeveloperUsersAction() {
  const access = await requireDeveloperActionSession();

  if (!access.ok) {
    return { ok: false as const, message: access.message };
  }

  const cpfs = listDeveloperAccessCpfs();

  if (cpfs.length === 0) {
    return { ok: false as const, message: "Nenhum CPF configurado na allowlist do console." };
  }

  await Promise.all(cpfs.map((cpf) => provisionDeveloperAccessUser(cpf)));

  revalidatePath("/admin");
  return { ok: true as const, message: `${cpfs.length} usuário(s) developer provisionado(s).` };
}

export async function createDeveloperTestAction() {
  const access = await requireDeveloperActionSession();

  if (!access.ok) {
    return { ok: false as const, message: access.message };
  }

  const developerCpf = access.sessionContext.user.cpf;
  const cycleName = buildDevTestCycleName(developerCpf);
  const existingCycle = await prisma.cycle.findFirst({
    where: { name: cycleName },
    select: { id: true, year: true },
  });

  if (existingCycle) {
    return { ok: true as const, message: `Ambiente de teste já existe no projeto ${existingCycle.year}.` };
  }

  const existingYears = await prisma.cycle.findMany({
    select: { year: true },
  });
  const testYear = pickDevTestYear(
    developerCpf,
    existingYears.map((cycle) => cycle.year),
  );
  const testUsers = buildDevTestUsers(developerCpf);
  const passwordHashes = await Promise.all(testUsers.map((user) => bcrypt.hash(user.cpf, 10)));
  const startDate = new Date(`${String(new Date().getUTCFullYear())}-01-01T00:00:00.000Z`);
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 30);

  const cycle = await prisma.cycle.create({
    data: {
      year: testYear,
      name: cycleName,
      startDate,
      endDate,
      status: CycleStatus.OPEN,
      active: false,
    },
  });

  await seedCycleQuestionSet(cycle.id);

  await prisma.$transaction(async (tx) => {
    const createdUsers = new Map<string, { id: string }>();

    for (const [index, testUser] of testUsers.entries()) {
      const user = await tx.user.upsert({
        where: { cpf: testUser.cpf },
        create: {
          cpf: testUser.cpf,
          name: testUser.name,
          registration: testUser.registration,
          passwordHash: passwordHashes[index],
          globalRole: testUser.kind === "rh" ? SystemRole.RH : null,
        },
        update: {
          name: testUser.name,
          registration: testUser.registration,
          passwordHash: passwordHashes[index],
          globalRole: testUser.kind === "rh" ? SystemRole.RH : null,
        },
      });

      createdUsers.set(testUser.kind, { id: user.id });
    }

    await tx.userCycle.create({
      data: {
        userId: createdUsers.get("rh")!.id,
        cycleId: cycle.id,
        role: SystemRole.RH,
        department: "Ambiente de teste",
        jobTitle: "RH de teste",
      },
    });

    const managerCycle = await tx.userCycle.create({
      data: {
        userId: createdUsers.get("manager")!.id,
        cycleId: cycle.id,
        role: SystemRole.MANAGER,
        department: "Ambiente de teste",
        jobTitle: "Chefia de teste",
      },
    });

    const employeeCycle = await tx.userCycle.create({
      data: {
        userId: createdUsers.get("employee")!.id,
        cycleId: cycle.id,
        role: SystemRole.EMPLOYEE,
        employmentType: EmploymentType.EFETIVO,
        department: "Ambiente de teste",
        jobTitle: "Servidor efetivo de teste",
        managerId: managerCycle.id,
      },
    });

    const probatorioCycle = await tx.userCycle.create({
      data: {
        userId: createdUsers.get("probatorio")!.id,
        cycleId: cycle.id,
        role: SystemRole.EMPLOYEE,
        employmentType: EmploymentType.PROBATORIO,
        department: "Ambiente de teste",
        jobTitle: "Servidor probatório de teste",
        managerId: managerCycle.id,
      },
    });

    await tx.evaluation.create({
      data: {
        cycleId: cycle.id,
        evaluatedId: employeeCycle.id,
        managerId: managerCycle.id,
        status: EvaluationStatus.PENDING,
      },
    });

    await tx.evaluation.create({
      data: {
        cycleId: cycle.id,
        evaluatedId: probatorioCycle.id,
        managerId: managerCycle.id,
        status: EvaluationStatus.PENDING,
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/rh");
  revalidatePath(`/${cycle.year}/rh`);

  return { ok: true as const, message: `Ambiente de teste criado no projeto ${cycle.year}.` };
}

export async function deleteDeveloperTestAction() {
  const access = await requireDeveloperActionSession();

  if (!access.ok) {
    return { ok: false as const, message: access.message };
  }

  const developerCpf = access.sessionContext.user.cpf;
  const cycleName = buildDevTestCycleName(developerCpf);
  const testUsers = buildDevTestUsers(developerCpf);

  const cycles = await prisma.cycle.findMany({
    where: { name: cycleName },
    select: { id: true, year: true },
  });

  await prisma.$transaction(async (tx) => {
    if (cycles.length > 0) {
      await tx.cycle.deleteMany({
        where: {
          id: {
            in: cycles.map((cycle) => cycle.id),
          },
        },
      });
    }

    await tx.user.deleteMany({
      where: {
        cpf: {
          in: testUsers.map((user) => user.cpf),
        },
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/rh");
  for (const cycle of cycles) {
    revalidatePath(`/${cycle.year}/rh`);
  }

  return { ok: true as const, message: "Ambiente de teste removido." };
}

export async function adminImportRhAction(
  _prevState: { error?: string; success?: string } | undefined,
  formData: FormData,
) {
  const access = await requireDeveloperActionSession();

  if (!access.ok) {
    return { error: access.message };
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { error: "Envie um arquivo XML ou CSV." };
  }

  const content = await file.text();
  const parsed = parseAdminImportFile(file.name, content);

  if (!parsed.ok) {
    return { error: parsed.message };
  }

  const records = parsed.records.filter((record) => record.cpf && record.nome && record.matricula);

  if (records.length === 0) {
    return { error: "Nenhum RH válido encontrado no arquivo." };
  }

  const passwordHashes = await Promise.all(records.map((record) => bcrypt.hash(record.cpf, 10)));
  let createdCount = 0;
  let updatedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const [index, record] of records.entries()) {
      const existing = await tx.user.findUnique({
        where: { cpf: record.cpf },
        select: { id: true },
      });

      if (existing) {
        updatedCount += 1;
      } else {
        createdCount += 1;
      }

      await tx.user.upsert({
        where: { cpf: record.cpf },
        create: {
          cpf: record.cpf,
          name: record.nome,
          registration: record.matricula,
          passwordHash: passwordHashes[index],
          globalRole: SystemRole.RH,
        },
        update: {
          name: record.nome,
          registration: record.matricula,
          passwordHash: passwordHashes[index],
          globalRole: SystemRole.RH,
        },
      });
    }
  });

  revalidatePath("/admin");
  revalidatePath("/rh");

  return {
    success: `Lista de RH aplicada com sucesso. ${createdCount} criado(s), ${updatedCount} atualizado(s).`,
  };
}
