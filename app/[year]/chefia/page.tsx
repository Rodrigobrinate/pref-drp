import Link from "next/link";
import { SystemRole } from "@prisma/client";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { LogoutButton } from "@/components/logout-button";
import { StatusBadge } from "@/components/status-badge";
import { requireSessionForYear } from "@/lib/auth";
import { decimalToNumber } from "@/lib/evaluations-data";
import { canManagerEvaluate, getDeadline, getRemainingDays } from "@/lib/evaluation";
import { prisma } from "@/lib/prisma";
import { parseYearParam } from "@/lib/year-route";

export const dynamic = "force-dynamic";

export default async function ChefiaPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  const cycleYear = parseYearParam(year);

  if (cycleYear === null) {
    notFound();
  }

  const context = await requireSessionForYear(cycleYear, SystemRole.MANAGER);

  if (!context.userCycle) {
    notFound();
  }

  if (!context.cycle) {
    notFound();
  }

  const managerUserCycle = context.userCycle;
  const cycle = context.cycle;

  const subordinates = await prisma.userCycle.findMany({
    where: {
      managerId: managerUserCycle.id,
      cycleId: cycle.id,
      role: SystemRole.EMPLOYEE,
    },
    select: {
      id: true,
      employmentType: true,
      user: {
        select: {
          name: true,
          registration: true,
        },
      },
      evaluations: {
        where: { current: true },
        select: {
          id: true,
          status: true,
          selfScore: true,
          version: true,
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  const subordinateIds = subordinates.map((item) => item.id);
  const existingEvaluations = subordinateIds.length
    ? await prisma.evaluation.findMany({
        where: {
          cycleId: cycle.id,
          evaluatedId: { in: subordinateIds },
          current: true,
        },
        select: {
          id: true,
          evaluatedId: true,
          status: true,
          selfScore: true,
          version: true,
        },
      })
    : [];

  const existingEvaluationIds = new Set(existingEvaluations.map((evaluation) => evaluation.evaluatedId));
  const missingSubordinateIds = subordinateIds.filter((id) => !existingEvaluationIds.has(id));

  if (missingSubordinateIds.length) {
    await prisma.evaluation.createMany({
      data: missingSubordinateIds.map((evaluatedId) => ({
        cycleId: cycle.id,
        evaluatedId,
        managerId: managerUserCycle.id,
      })),
    });
  }

  const currentEvaluations =
    missingSubordinateIds.length > 0
      ? await prisma.evaluation.findMany({
          where: {
            cycleId: cycle.id,
            evaluatedId: { in: subordinateIds },
            current: true,
          },
          select: {
            id: true,
            evaluatedId: true,
            status: true,
            selfScore: true,
            version: true,
          },
        })
      : existingEvaluations;

  const evaluationsBySubordinateId = new Map(
    currentEvaluations.map((evaluation) => [evaluation.evaluatedId, evaluation]),
  );

  const hydratedSubordinates = subordinates.map((item) => ({
    ...item,
    evaluations: (() => {
      const evaluation = evaluationsBySubordinateId.get(item.id);
      return evaluation ? [evaluation] : [];
    })(),
  }));

  const total = hydratedSubordinates.length;
  const completed = hydratedSubordinates.filter((item) => item.evaluations[0]?.status === "COMPLETED").length;
  const pending = total - completed;

  return (
    <AppShell
      actions={<LogoutButton year={cycleYear} />}
      currentPath={`/${cycleYear}/chefia`}
      navItems={[{ href: `/${cycleYear}/chefia`, label: "Painel de Avaliação" }]}
      subtitle="Chefia Imediata"
      title="Nomos"
      userMeta={`${managerUserCycle.jobTitle} · ${managerUserCycle.department}`}
      userName={context.user.name}
    >
      <div className="grid gap-6 md:grid-cols-3">
        <div className="institutional-card p-6">
          <p className="text-sm text-on-surface-variant">Total de subordinados</p>
          <p className="mt-3 font-headline text-5xl font-black text-primary">{total}</p>
        </div>
        <div className="institutional-card p-6">
          <p className="text-sm text-on-surface-variant">Avaliações pendentes</p>
          <p className="mt-3 font-headline text-5xl font-black text-error">{pending}</p>
        </div>
        <div className="institutional-card p-6">
          <p className="text-sm text-on-surface-variant">Concluídas</p>
          <p className="mt-3 font-headline text-5xl font-black text-primary-container">{completed}</p>
        </div>
      </div>

      <section className="institutional-card mt-8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead className="bg-surface-container-low text-xs uppercase tracking-[0.24em] text-on-surface-variant">
              <tr>
                <th className="px-6 py-4">Servidor</th>
                <th className="px-6 py-4">Vínculo</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Prazo chefia</th>
                <th className="px-6 py-4">Autoavaliação</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {hydratedSubordinates.map((item) => {
                const evaluation = item.evaluations[0];
                const status = evaluation?.status ?? "PENDING";
                const selfScore = decimalToNumber(evaluation?.selfScore);
                const deadline = getDeadline(cycle.startDate, "manager");
                const canEvaluate = canManagerEvaluate(status);

                return (
                  <tr className="border-t border-transparent hover:bg-surface-container-low/30" key={item.id}>
                    <td className="px-6 py-5">
                      <p className="font-bold text-on-surface">{item.user.name}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">Mat. {item.user.registration}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-bold text-on-secondary-container">
                        {item.employmentType}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-6 py-5 text-sm text-on-surface-variant">
                      {getRemainingDays(deadline)} dias restantes
                    </td>
                    <td className="px-6 py-5 text-sm text-on-surface-variant">
                      {selfScore > 0 ? `${selfScore.toFixed(2)} pts` : "Aguardando envio"}
                    </td>
                    <td className="px-6 py-5 text-right">
                      {canEvaluate ? (
                        <Link
                          className="inline-flex min-h-11 rounded-lg bg-institutional-gradient px-4 py-2 text-xs font-bold text-on-primary"
                          href={`/${cycleYear}/chefia/avaliacoes/${evaluation?.id}`}
                        >
                          Avaliar agora
                        </Link>
                      ) : (
                        <span className="inline-flex rounded-lg bg-surface-container px-4 py-2 text-xs font-bold text-on-surface-variant">
                          Concluído
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
