import Link from "next/link";
import { CycleStatus, DocumentStatus, EmploymentType, EvaluationStatus, SystemRole } from "@prisma/client";

import { AdminImportForm } from "@/components/admin-import-form";
import { AdminRhImportForm } from "@/components/admin-rh-import-form";
import { AppShell } from "@/components/app-shell";
import { DevConsoleTools } from "@/components/dev-console-tools";
import { LogoutButton } from "@/components/logout-button";
import { StatusBadge } from "@/components/status-badge";
import { ADMIN_IMPORT_ALLOWED_CPFS_ENV, ADMIN_IMPORT_SUPPORTED_FORMATS } from "@/lib/admin-import-config";
import { buildDevTestCycleName, buildDeveloperUserBlueprint, buildDevTestUsers } from "@/lib/dev-console";
import { requireDeveloperConsoleSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDateTime(value: Date | null | undefined) {
  if (!value) {
    return "Nao disponível";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function formatPercent(value: number, total: number) {
  if (total <= 0) {
    return "0%";
  }

  return `${Math.round((value / total) * 100)}%`;
}

function byLabel<T extends string>(rows: Array<{ _count: { _all: number } } & Record<string, unknown>>, key: string, label: T): number {
  const match = rows.find((row) => row[key] === label);
  return match?._count._all ?? 0;
}

export default async function AdminPage() {
  const context = await requireDeveloperConsoleSession();
  const now = new Date();
  const developerIdentity = buildDeveloperUserBlueprint(context.user.cpf);
  const developerTestCycleName = buildDevTestCycleName(context.user.cpf);
  const developerTestUsers = buildDevTestUsers(context.user.cpf);
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [
    cycleCount,
    openCycleCount,
    activeCycle,
    userCount,
    activeSessionCount,
    loginAttempts15m,
    loginAttempts24h,
    evaluationCount,
    currentEvaluationCount,
    evaluationStatusGroups,
    documentCount,
    documentStatusGroups,
    roleGroups,
    employmentGroups,
    latestCycles,
    recentDocuments,
    developerUser,
    developerTestCycle,
  ] = await Promise.all([
    prisma.cycle.count(),
    prisma.cycle.count({
      where: { status: CycleStatus.OPEN },
    }),
    prisma.cycle.findFirst({
      where: { active: true },
      orderBy: { year: "desc" },
      select: {
        id: true,
        year: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        completedAt: true,
        _count: {
          select: {
            userCycles: true,
            evaluations: true,
            questions: true,
          },
        },
      },
    }),
    prisma.user.count(),
    prisma.session.count({
      where: {
        expiresAt: {
          gt: now,
        },
      },
    }),
    prisma.loginAttempt.count({
      where: {
        createdAt: {
          gte: fifteenMinutesAgo,
        },
      },
    }),
    prisma.loginAttempt.count({
      where: {
        createdAt: {
          gte: oneDayAgo,
        },
      },
    }),
    prisma.evaluation.count(),
    prisma.evaluation.count({
      where: {
        current: true,
      },
    }),
    prisma.evaluation.groupBy({
      by: ["status"],
      where: activeCycle
        ? {
            cycleId: activeCycle.id,
            current: true,
          }
        : {
            id: "__none__",
          },
      _count: {
        _all: true,
      },
    }),
    prisma.document.count(),
    prisma.document.groupBy({
      by: ["status"],
      where: activeCycle
        ? {
            evaluation: {
              cycleId: activeCycle.id,
            },
          }
        : {
            id: "__none__",
          },
      _count: {
        _all: true,
      },
    }),
    prisma.userCycle.groupBy({
      by: ["role"],
      where: activeCycle
        ? {
            cycleId: activeCycle.id,
          }
        : {
            id: "__none__",
          },
      _count: {
        _all: true,
      },
    }),
    prisma.userCycle.groupBy({
      by: ["employmentType"],
      where: activeCycle
        ? {
            cycleId: activeCycle.id,
            role: SystemRole.EMPLOYEE,
          }
        : {
            id: "__none__",
          },
      _count: {
        _all: true,
      },
    }),
    prisma.cycle.findMany({
      take: 5,
      orderBy: { year: "desc" },
      select: {
        id: true,
        year: true,
        name: true,
        status: true,
        active: true,
        updatedAt: true,
        _count: {
          select: {
            userCycles: true,
            evaluations: true,
          },
        },
      },
    }),
    prisma.document.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        size: true,
        createdAt: true,
        evaluation: {
          select: {
            cycle: {
              select: {
                year: true,
              },
            },
            evaluated: {
              select: {
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.user.findUnique({
      where: {
        cpf: developerIdentity.cpf,
      },
      select: {
        cpf: true,
        registration: true,
        globalRole: true,
        updatedAt: true,
      },
    }),
    prisma.cycle.findFirst({
      where: {
        name: developerTestCycleName,
      },
      select: {
        id: true,
        year: true,
        status: true,
        _count: {
          select: {
            userCycles: true,
            evaluations: true,
          },
        },
      },
    }),
  ]);

  const activeCycleEvaluationTotal = activeCycle?._count.evaluations ?? 0;
  const completedEvaluations = byLabel(evaluationStatusGroups, "status", EvaluationStatus.COMPLETED);
  const pendingEvaluations = byLabel(evaluationStatusGroups, "status", EvaluationStatus.PENDING);
  const draftEvaluations = byLabel(evaluationStatusGroups, "status", EvaluationStatus.DRAFT);
  const autoDoneEvaluations = byLabel(evaluationStatusGroups, "status", EvaluationStatus.AUTO_DONE);
  const managerDoneEvaluations = byLabel(evaluationStatusGroups, "status", EvaluationStatus.MANAGER_DONE);
  const archivedEvaluations = byLabel(evaluationStatusGroups, "status", EvaluationStatus.ARCHIVED);

  const activeEmployees = byLabel(roleGroups, "role", SystemRole.EMPLOYEE);
  const activeManagers = byLabel(roleGroups, "role", SystemRole.MANAGER);
  const activeRh = byLabel(roleGroups, "role", SystemRole.RH);

  const effectiveEmployees = activeEmployees || activeCycle?._count.userCycles || 0;
  const effectiveEvaluations = activeCycleEvaluationTotal || currentEvaluationCount;

  const uploadedDocuments = byLabel(documentStatusGroups, "status", DocumentStatus.UPLOADED);
  const failedDocuments = byLabel(documentStatusGroups, "status", DocumentStatus.FAILED);
  const pendingDocuments = byLabel(documentStatusGroups, "status", DocumentStatus.PENDING);

  const efetivos = byLabel(employmentGroups, "employmentType", EmploymentType.EFETIVO);
  const probatorios = byLabel(employmentGroups, "employmentType", EmploymentType.PROBATORIO);

  return (
    <AppShell
      actions={<LogoutButton redirectTo="/rh/login" />}
      currentPath="/admin"
      navItems={[
        { href: "/admin", label: "Painel admin" },
        { href: "/rh", label: "Hub RH" },
      ]}
      subtitle="Central de Monitoramento"
      title="Nomos"
      userMeta="Super admin / developer"
      userName={context.user.name}
    >
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="institutional-card p-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Visão operacional</p>
          <h1 className="mt-2 font-headline text-4xl font-black tracking-tight text-primary">
            Painel completo de saúde do sistema
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-on-surface-variant">
            Esta tela concentra o que importa para operação: volume de usuários, progresso das avaliações, ciclos,
            uploads, tentativas de login e atalhos para agir rápido quando algo sair do esperado.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs text-on-surface-variant">
            <span className="rounded-full bg-surface-container px-3 py-1">
              Allowlist: {ADMIN_IMPORT_ALLOWED_CPFS_ENV}
            </span>
            <span className="rounded-full bg-surface-container px-3 py-1">
              Formatos: {ADMIN_IMPORT_SUPPORTED_FORMATS.join(" / ")}
            </span>
            <span className="rounded-full bg-surface-container px-3 py-1">
              Última leitura: {formatDateTime(now)}
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <article className="institutional-card p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">Ciclo ativo</p>
            <p className="mt-3 font-headline text-3xl font-black text-primary">
              {activeCycle ? activeCycle.year : "Sem ciclo"}
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">
              {activeCycle ? activeCycle.name : "Nenhum projeto marcado como ativo."}
            </p>
          </article>
          <article className="institutional-card p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">Sinais rápidos</p>
            <p className="mt-3 text-sm text-on-surface-variant">
              {activeSessionCount} sessões ativas · {loginAttempts15m} tentativas de login em 15 min
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">
              {failedDocuments} uploads com falha · {openCycleCount} ciclo(s) aberto(s)
            </p>
          </article>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="institutional-card p-6">
          <p className="text-sm text-on-surface-variant">Usuários totais</p>
          <p className="mt-3 font-headline text-5xl font-black text-primary">{userCount}</p>
          <p className="mt-2 text-xs text-on-surface-variant">{activeSessionCount} sessões válidas agora</p>
        </article>
        <article className="institutional-card p-6">
          <p className="text-sm text-on-surface-variant">Avaliações atuais</p>
          <p className="mt-3 font-headline text-5xl font-black text-primary">{currentEvaluationCount}</p>
          <p className="mt-2 text-xs text-on-surface-variant">{evaluationCount} avaliações totais no histórico</p>
        </article>
        <article className="institutional-card p-6">
          <p className="text-sm text-on-surface-variant">Concluídas no ciclo ativo</p>
          <p className="mt-3 font-headline text-5xl font-black text-primary-container">{completedEvaluations}</p>
          <p className="mt-2 text-xs text-on-surface-variant">
            {formatPercent(completedEvaluations, effectiveEvaluations)} do volume corrente
          </p>
        </article>
        <article className="institutional-card p-6">
          <p className="text-sm text-on-surface-variant">Pendências no ciclo ativo</p>
          <p className="mt-3 font-headline text-5xl font-black text-error">
            {pendingEvaluations + draftEvaluations + autoDoneEvaluations + managerDoneEvaluations}
          </p>
          <p className="mt-2 text-xs text-on-surface-variant">
            {pendingEvaluations} pendentes puras · {draftEvaluations} rascunhos
          </p>
        </article>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="institutional-card p-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">Console de desenvolvimento</p>
          <h2 className="mt-2 font-headline text-2xl font-bold text-primary">Bootstrap e ambiente sintético</h2>
          <p className="mt-3 text-sm text-on-surface-variant">
            O CPF da allowlist pode ser provisionado como RH global e manter um projeto de teste isolado para validar o fluxo completo.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-surface-container-low p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Meu usuário dev</p>
              <p className="mt-3 text-sm text-on-surface-variant">CPF: {developerIdentity.cpf}</p>
              <p className="mt-2 text-sm text-on-surface-variant">
                Matrícula: {developerUser?.registration ?? developerIdentity.registration}
              </p>
              <p className="mt-2 text-sm text-on-surface-variant">Role global: {developerUser?.globalRole ?? "não provisionado"}</p>
              <p className="mt-2 text-sm text-on-surface-variant">
                Última atualização: {formatDateTime(developerUser?.updatedAt)}
              </p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Projeto de teste</p>
              <p className="mt-3 text-sm text-on-surface-variant">Nome: {developerTestCycleName}</p>
              <p className="mt-2 text-sm text-on-surface-variant">Ano: {developerTestCycle?.year ?? "não criado"}</p>
              <p className="mt-2 text-sm text-on-surface-variant">Status: {developerTestCycle?.status ?? "não criado"}</p>
              <p className="mt-2 text-sm text-on-surface-variant">
                Pessoas: {developerTestCycle?._count.userCycles ?? 0} · Avaliações: {developerTestCycle?._count.evaluations ?? 0}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <DevConsoleTools />
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">
                <tr>
                  <th className="pb-3">Perfil</th>
                  <th className="pb-3">CPF</th>
                  <th className="pb-3">Senha</th>
                  <th className="pb-3">Acesso</th>
                </tr>
              </thead>
              <tbody>
                {developerTestUsers.map((testUser) => {
                  const accessPath =
                    testUser.kind === "rh"
                      ? "/rh/login"
                      : developerTestCycle
                        ? `/${developerTestCycle.year}/login`
                        : "/rh/login";

                  return (
                    <tr className="border-t border-outline-variant/10" key={testUser.kind}>
                      <td className="py-4 text-sm font-semibold text-on-surface">{testUser.name}</td>
                      <td className="py-4 text-sm text-on-surface-variant">{testUser.cpf}</td>
                      <td className="py-4 text-sm text-on-surface-variant">{testUser.cpf}</td>
                      <td className="py-4 text-sm text-on-surface-variant">
                        <Link className="font-semibold text-primary underline-offset-4 hover:underline" href={accessPath}>
                          {accessPath}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>

        <article className="institutional-card p-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">Importação de RH</p>
          <h2 className="mt-2 font-headline text-2xl font-bold text-primary">Persistir usuários globais de RH</h2>
          <p className="mt-3 text-sm text-on-surface-variant">
            Use esta área para carregar a lista administrativa de RH. A importação do quadro funcional por ciclo continua sendo feita no hub RH.
          </p>
          <div className="mt-6">
            <AdminRhImportForm />
          </div>
        </article>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="institutional-card p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                Andamento do ciclo ativo
              </p>
              <h2 className="mt-2 font-headline text-2xl font-bold text-primary">Distribuição por status</h2>
            </div>
            {activeCycle ? <StatusBadge kind="cycle" status={activeCycle.status} /> : null}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl bg-surface-container-low p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Pendente</p>
              <p className="mt-3 font-headline text-4xl font-black text-primary">{pendingEvaluations}</p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Rascunho</p>
              <p className="mt-3 font-headline text-4xl font-black text-primary">{draftEvaluations}</p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Auto entregue</p>
              <p className="mt-3 font-headline text-4xl font-black text-primary">{autoDoneEvaluations}</p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Chefia entregue</p>
              <p className="mt-3 font-headline text-4xl font-black text-primary">{managerDoneEvaluations}</p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Concluída</p>
              <p className="mt-3 font-headline text-4xl font-black text-primary-container">{completedEvaluations}</p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Arquivada</p>
              <p className="mt-3 font-headline text-4xl font-black text-primary">{archivedEvaluations}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm text-on-surface-variant md:grid-cols-2">
            <p>Início: {formatDateTime(activeCycle?.startDate)}</p>
            <p>Término previsto: {formatDateTime(activeCycle?.endDate)}</p>
            <p>Questões carregadas: {activeCycle?._count.questions ?? 0}</p>
            <p>Avaliações do ciclo: {activeCycleEvaluationTotal}</p>
          </div>
        </article>

        <article className="institutional-card p-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">Base carregada</p>
          <h2 className="mt-2 font-headline text-2xl font-bold text-primary">Usuários e vínculos do ciclo ativo</h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-surface-container-low p-5">
              <p className="text-sm text-on-surface-variant">Servidores</p>
              <p className="mt-3 font-headline text-4xl font-black text-primary">{activeEmployees}</p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-5">
              <p className="text-sm text-on-surface-variant">Chefias</p>
              <p className="mt-3 font-headline text-4xl font-black text-primary">{activeManagers}</p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-5">
              <p className="text-sm text-on-surface-variant">RH no ciclo</p>
              <p className="mt-3 font-headline text-4xl font-black text-primary">{activeRh}</p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-5">
              <p className="text-sm text-on-surface-variant">Pessoas no ciclo</p>
              <p className="mt-3 font-headline text-4xl font-black text-primary">
                {activeCycle?._count.userCycles ?? 0}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm text-on-surface-variant">
            <p>Efetivos: {efetivos}</p>
            <p>Probatórios: {probatorios}</p>
            <p>Percentual concluído: {formatPercent(completedEvaluations, effectiveEvaluations)}</p>
            <p>Percentual pendente: {formatPercent(pendingEvaluations, effectiveEvaluations)}</p>
          </div>
        </article>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="institutional-card p-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">Arquivos</p>
          <h2 className="mt-2 font-headline text-2xl font-bold text-primary">Documentos e comprovantes</h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-surface-container-low p-5">
              <p className="text-sm text-on-surface-variant">Uploads ok</p>
              <p className="mt-3 font-headline text-4xl font-black text-primary-container">{uploadedDocuments}</p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-5">
              <p className="text-sm text-on-surface-variant">Pendentes</p>
              <p className="mt-3 font-headline text-4xl font-black text-primary">{pendingDocuments}</p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-5">
              <p className="text-sm text-on-surface-variant">Falhas</p>
              <p className="mt-3 font-headline text-4xl font-black text-error">{failedDocuments}</p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">
                <tr>
                  <th className="pb-3">Arquivo</th>
                  <th className="pb-3">Servidor</th>
                  <th className="pb-3">Ciclo</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Data</th>
                </tr>
              </thead>
              <tbody>
                {recentDocuments.map((document) => (
                  <tr className="border-t border-outline-variant/10" key={document.id}>
                    <td className="py-4 text-sm font-semibold text-on-surface">{document.name}</td>
                    <td className="py-4 text-sm text-on-surface-variant">
                      {document.evaluation.evaluated.user.name}
                    </td>
                    <td className="py-4 text-sm text-on-surface-variant">{document.evaluation.cycle.year}</td>
                    <td className="py-4 text-sm text-on-surface-variant">{document.status}</td>
                    <td className="py-4 text-right text-sm text-on-surface-variant">
                      {formatDateTime(document.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="institutional-card p-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">Segurança e operação</p>
          <h2 className="mt-2 font-headline text-2xl font-bold text-primary">Sinais para monitorar</h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-surface-container-low p-5">
              <p className="text-sm text-on-surface-variant">Tentativas em 15 min</p>
              <p className="mt-3 font-headline text-4xl font-black text-primary">{loginAttempts15m}</p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-5">
              <p className="text-sm text-on-surface-variant">Tentativas em 24h</p>
              <p className="mt-3 font-headline text-4xl font-black text-primary">{loginAttempts24h}</p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-5">
              <p className="text-sm text-on-surface-variant">Sessões ativas</p>
              <p className="mt-3 font-headline text-4xl font-black text-primary">{activeSessionCount}</p>
            </div>
            <div className="rounded-xl bg-surface-container-low p-5">
              <p className="text-sm text-on-surface-variant">Ciclos abertos</p>
              <p className="mt-3 font-headline text-4xl font-black text-primary">{openCycleCount}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Link className="rounded-lg bg-primary px-4 py-3 text-sm font-bold text-on-primary" href="/rh">
              Abrir hub RH
            </Link>
            {activeCycle ? (
              <>
                <Link
                  className="rounded-lg bg-surface-container px-4 py-3 text-sm font-semibold text-primary"
                  href={`/${activeCycle.year}/rh`}
                >
                  Gerenciar projeto {activeCycle.year}
                </Link>
                <Link
                  className="rounded-lg bg-surface-container px-4 py-3 text-sm font-semibold text-primary"
                  href={`/${activeCycle.year}/login`}
                >
                  Abrir login do ciclo {activeCycle.year}
                </Link>
              </>
            ) : null}
          </div>

          <div className="mt-6 rounded-xl bg-surface-container-low p-5 text-sm text-on-surface-variant">
            Se houver aumento inesperado de tentativas, falhas de upload ou múltiplos ciclos abertos, trate como alerta
            operacional.
          </div>
        </article>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="institutional-card p-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">Histórico recente</p>
          <h2 className="mt-2 font-headline text-2xl font-bold text-primary">Últimos projetos</h2>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">
                <tr>
                  <th className="pb-3">Ano</th>
                  <th className="pb-3">Nome</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Pessoas</th>
                  <th className="pb-3">Avaliações</th>
                  <th className="pb-3 text-right">Atualização</th>
                </tr>
              </thead>
              <tbody>
                {latestCycles.map((cycle) => (
                  <tr className="border-t border-outline-variant/10" key={cycle.id}>
                    <td className="py-4 font-semibold text-on-surface">{cycle.year}</td>
                    <td className="py-4 text-sm text-on-surface-variant">
                      {cycle.name}
                      {cycle.active ? " · ativo" : ""}
                    </td>
                    <td className="py-4">
                      <StatusBadge kind="cycle" status={cycle.status} />
                    </td>
                    <td className="py-4 text-sm text-on-surface-variant">{cycle._count.userCycles}</td>
                    <td className="py-4 text-sm text-on-surface-variant">{cycle._count.evaluations}</td>
                    <td className="py-4 text-right text-sm text-on-surface-variant">
                      {formatDateTime(cycle.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="institutional-card p-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">Importação avançada</p>
          <h2 className="mt-2 font-headline text-2xl font-bold text-primary">Validação de XML e CSV</h2>
          <p className="mt-3 text-sm text-on-surface-variant">
            Use esta área para validar estrutura, aliases e prévia dos dados antes de importar chefias e servidores no fluxo do RH.
          </p>
          <div className="mt-6">
            <AdminImportForm />
          </div>
        </article>
      </section>
    </AppShell>
  );
}
