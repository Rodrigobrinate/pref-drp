import { EmploymentType, EvaluationStatus, SystemRole } from "@prisma/client";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { LogoutButton } from "@/components/logout-button";
import { StatusBadge } from "@/components/status-badge";
import { requireGlobalRhSession } from "@/lib/auth";
import { getClassification, getQuestionTypeByEmploymentType } from "@/lib/evaluation";
import { decimalToNumber } from "@/lib/evaluations-data";
import { prisma } from "@/lib/prisma";
import { parseYearParam } from "@/lib/year-route";

export const dynamic = "force-dynamic";

export default async function CycleDashboardPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  const cycleYear = parseYearParam(year);

  if (cycleYear === null) notFound();

  const context = await requireGlobalRhSession();

  const cycle = await prisma.cycle.findUnique({
    where: { year: cycleYear },
  });

  if (!cycle) notFound();

  const evaluations = await prisma.evaluation.findMany({
    where: { cycleId: cycle.id, current: true },
    include: {
      evaluated: {
        include: { user: true },
      },
      manager: {
        include: { user: true },
      },
    },
    orderBy: [{ evaluated: { department: "asc" } }, { evaluated: { user: { name: "asc" } } }],
  });

  const total = evaluations.length;
  const completed = evaluations.filter((e) => e.status === EvaluationStatus.COMPLETED).length;
  const autoDone = evaluations.filter((e) => e.status === EvaluationStatus.AUTO_DONE).length;
  const managerDone = evaluations.filter((e) => e.status === EvaluationStatus.MANAGER_DONE).length;
  const pending = evaluations.filter((e) =>
    e.status === EvaluationStatus.PENDING || e.status === EvaluationStatus.DRAFT,
  ).length;

  const completedEvaluations = evaluations.filter(
    (e) => e.status === EvaluationStatus.COMPLETED,
  );
  const avgSelfScore =
    completedEvaluations.length > 0
      ? completedEvaluations.reduce((sum, e) => sum + decimalToNumber(e.selfScore), 0) /
        completedEvaluations.length
      : null;
  const avgManagerScore =
    completedEvaluations.length > 0
      ? completedEvaluations.reduce((sum, e) => sum + decimalToNumber(e.managerScore), 0) /
        completedEvaluations.length
      : null;

  const classificationCounts = { SD: 0, AD: 0, AP: 0, NA: 0 };
  for (const e of completedEvaluations) {
    const type = getQuestionTypeByEmploymentType(
      e.evaluated.employmentType ?? EmploymentType.EFETIVO,
    );
    const score = decimalToNumber(e.finalScore);
    const cls = getClassification(score, type);
    classificationCounts[cls]++;
  }

  return (
    <AppShell
      actions={<LogoutButton redirectTo="/rh/login" />}
      currentPath="/rh"
      navItems={[
        { href: "/rh", label: "Projetos" },
        { href: `/${cycleYear}/rh/dashboard`, label: `Projeto ${cycleYear}` },
      ]}
      subtitle={`Projeto ${cycleYear} · Encerrado`}
      title="Nomos"
      userMeta="Administrador global de RH"
      userName={context.user.name}
    >
      <section className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Dashboard</p>
        <h1 className="mt-2 font-headline text-4xl font-black tracking-tight text-primary">
          {cycle.name}
        </h1>
      </section>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="institutional-card p-6">
          <p className="text-sm text-on-surface-variant">Total de avaliações</p>
          <p className="mt-3 font-headline text-5xl font-black text-primary">{total}</p>
        </div>
        <div className="institutional-card p-6">
          <p className="text-sm text-on-surface-variant">Fluxo concluído</p>
          <p className="mt-3 font-headline text-5xl font-black text-primary-container">{completed}</p>
        </div>
        <div className="institutional-card p-6">
          <p className="text-sm text-on-surface-variant">Parciais (só um lado)</p>
          <p className="mt-3 font-headline text-5xl font-black text-secondary">{autoDone + managerDone}</p>
        </div>
        <div className="institutional-card p-6">
          <p className="text-sm text-on-surface-variant">Sem avaliação</p>
          <p className="mt-3 font-headline text-5xl font-black text-error">{pending}</p>
        </div>
      </div>

      {/* Scores and classification */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="institutional-card p-6">
          <h2 className="font-headline text-xl font-bold text-primary">Médias (fluxos concluídos)</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">Média autoavaliação</span>
              <span className="font-bold text-primary">
                {avgSelfScore !== null ? avgSelfScore.toFixed(2) : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">Média chefia</span>
              <span className="font-bold text-primary">
                {avgManagerScore !== null ? avgManagerScore.toFixed(2) : "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="institutional-card p-6">
          <h2 className="font-headline text-xl font-bold text-primary">Classificação final</h2>
          <div className="mt-4 grid grid-cols-4 gap-3 text-center">
            {(["SD", "AD", "AP", "NA"] as const).map((cls) => (
              <div className="rounded-xl bg-surface-container-low p-4" key={cls}>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{cls}</p>
                <p className="mt-2 font-headline text-3xl font-black text-primary">
                  {classificationCounts[cls]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Evaluation table */}
      <section className="institutional-card mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="bg-surface-container-low text-xs uppercase tracking-[0.24em] text-on-surface-variant">
              <tr>
                <th className="px-6 py-4">Servidor</th>
                <th className="px-6 py-4">Secretaria</th>
                <th className="px-6 py-4">Chefia</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Nota servidor</th>
                <th className="px-6 py-4 text-right">Nota chefia</th>
                <th className="px-6 py-4 text-right">Classificação</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((e) => {
                const type = getQuestionTypeByEmploymentType(
                  e.evaluated.employmentType ?? EmploymentType.EFETIVO,
                );
                const finalScore = decimalToNumber(e.finalScore);
                const cls =
                  e.status === EvaluationStatus.COMPLETED
                    ? getClassification(finalScore, type)
                    : null;

                return (
                  <tr className="border-t border-outline-variant/30 hover:bg-surface-container-low/30" key={e.id}>
                    <td className="px-6 py-4">
                      <p className="font-bold text-on-surface">{e.evaluated.user.name}</p>
                      <p className="mt-0.5 text-xs text-on-surface-variant">
                        {e.evaluated.employmentType === EmploymentType.PROBATORIO ? "Probatório" : "Efetivo"}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{e.evaluated.department}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">
                      {e.manager?.user.name ?? "—"}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-on-surface">
                      {decimalToNumber(e.selfScore) > 0 ? decimalToNumber(e.selfScore).toFixed(2) : "—"}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-on-surface">
                      {decimalToNumber(e.managerScore) > 0 ? decimalToNumber(e.managerScore).toFixed(2) : "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {cls ? (
                        <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-on-primary">
                          {cls}
                        </span>
                      ) : (
                        <span className="text-sm text-on-surface-variant">—</span>
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
