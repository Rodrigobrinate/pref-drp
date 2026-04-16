const bcrypt = require("bcryptjs");
const { PrismaClient, EmploymentType, EvaluationStatus, QuestionType, SystemRole } = require("@prisma/client");
const { QUESTION_BANK_DATA } = require("../lib/question-bank-data");

const prisma = new PrismaClient();

async function seedQuestions(cycleId, type, list) {
  for (const [index, question] of list.entries()) {
    await prisma.question.create({
      data: {
        cycleId,
        type,
        title: question.title,
        description: question.description,
        sortOrder: index + 1,
        options: {
          create: [
            { label: "A", score: type === QuestionType.BASE_50 ? 10 : 7.5 },
            { label: "B", score: type === QuestionType.BASE_50 ? 8 : 6 },
            { label: "C", score: type === QuestionType.BASE_50 ? 6 : 4 },
            { label: "D", score: type === QuestionType.BASE_50 ? 3 : 2.25 },
            { label: "E", score: type === QuestionType.BASE_50 ? 1 : 0.75 },
          ].map((option, optionIndex) => ({
            label: option.label,
            description: question.options[optionIndex],
            score: option.score,
            sortOrder: optionIndex + 1,
          })),
        },
      },
    });
  }
}

async function main() {
  await prisma.document.deleteMany();
  await prisma.evaluationAnswer.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.question.deleteMany();
  await prisma.session.deleteMany();
  await prisma.userCycle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.cycle.deleteMany();

  const passwordHash = await bcrypt.hash("12345678900", 10);
  const probationHash = await bcrypt.hash("12345678901", 10);
  const managerHash = await bcrypt.hash("12345678902", 10);
  const rhHash = await bcrypt.hash("12345678903", 10);

  const cycle = await prisma.cycle.create({
    data: {
      year: 2026,
      name: "Ciclo 2026",
      startDate: new Date("2026-04-01T00:00:00.000Z"),
      endDate: new Date("2026-04-30T23:59:59.999Z"),
      active: true,
    },
  });

  await seedQuestions(cycle.id, QuestionType.BASE_60, QUESTION_BANK_DATA.BASE_60);
  await seedQuestions(cycle.id, QuestionType.BASE_50, QUESTION_BANK_DATA.BASE_50);

  const [employee, probationary, manager, rh] = await Promise.all([
    prisma.user.create({
      data: {
        cpf: "12345678900",
        name: "Ana Paula Silva",
        registration: "44.592-1",
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        cpf: "12345678901",
        name: "Ricardo Gomes",
        registration: "31.204-8",
        passwordHash: probationHash,
      },
    }),
    prisma.user.create({
      data: {
        cpf: "12345678902",
        name: "Marina Lima",
        registration: "55.109-0",
        passwordHash: managerHash,
      },
    }),
    prisma.user.create({
      data: {
        cpf: "12345678903",
        name: "RH Administrator",
        registration: "00.001-0",
        passwordHash: rhHash,
        globalRole: SystemRole.RH,
      },
    }),
  ]);

  const managerCycle = await prisma.userCycle.create({
    data: {
      userId: manager.id,
      cycleId: cycle.id,
      role: SystemRole.MANAGER,
      department: "Secretaria de Gestão e Planejamento",
      jobTitle: "Diretora de Gestão",
    },
  });

  const employeeCycle = await prisma.userCycle.create({
    data: {
      userId: employee.id,
      cycleId: cycle.id,
      role: SystemRole.EMPLOYEE,
      employmentType: EmploymentType.EFETIVO,
      department: "Secretaria de Gestão e Planejamento",
      jobTitle: "Analista Administrativo",
      managerId: managerCycle.id,
    },
  });

  const probationaryCycle = await prisma.userCycle.create({
    data: {
      userId: probationary.id,
      cycleId: cycle.id,
      role: SystemRole.EMPLOYEE,
      employmentType: EmploymentType.PROBATORIO,
      department: "Secretaria de Gestão e Planejamento",
      jobTitle: "Assistente Administrativo",
      managerId: managerCycle.id,
    },
  });

  const base60Questions = await prisma.question.findMany({
    where: { cycleId: cycle.id, type: QuestionType.BASE_60 },
    include: { options: true },
    orderBy: { sortOrder: "asc" },
  });

  await prisma.evaluation.create({
    data: {
      cycleId: cycle.id,
      evaluatedId: employeeCycle.id,
      managerId: managerCycle.id,
      status: EvaluationStatus.AUTO_DONE,
      selfScore: 46,
      finalScore: 46,
      autoSubmittedAt: new Date("2026-04-04T10:00:00.000Z"),
      answers: {
        create: base60Questions.map((question) => ({
          questionId: question.id,
          phase: "SELF",
          selectedOptionId: question.options[1].id,
        })),
      },
    },
  });

  await prisma.evaluation.create({
    data: {
      cycleId: cycle.id,
      evaluatedId: probationaryCycle.id,
      managerId: managerCycle.id,
      status: EvaluationStatus.PENDING,
    },
  });

}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
