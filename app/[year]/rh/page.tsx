import { SystemRole } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { LogoutButton } from "@/components/logout-button";
import { ReevaluationButton } from "@/components/reevaluation-button";
import { RollbackImportButton, XmlImportForm } from "@/components/rh-forms";
import { StatusBadge } from "@/components/status-badge";
import { requireGlobalRhSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseYearParam } from "@/lib/year-route";

export const dynamic = "force-dynamic";

export default async function RhPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  const cycleYear = parseYearParam(year);

  if (cycleYear === null) {
    notFound();
  }

  const context = await requireGlobalRhSession();
  const cycle = await prisma.cycle.findUnique({
    where: { year: cycleYear },
  });

  if (!cycle) {
    notFound();
  }

  const [employees, evaluations] = await Promise.all([
    prisma.userCycle.findMany({
      where: {
        cycleId: cycle.id,
        role: SystemRole.EMPLOYEE,
      },
      select: {
        id: true,
        department: true,
        jobTitle: true,
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
            version: true,
          },
        },
      },
      orderBy: [{ department: "asc" }, { user: { name: "asc" } }],
    }),
    prisma.evaluation.count({
      where: {
        cycleId: cycle.id,
        current: true,
        status: "COMPLETED",
      },
    }),
  ]);

  return (
    <AppShell
      actions={<LogoutButton redirectTo="/rh/login" />}
      currentPath={`/${cycleYear}/rh`}
      navItems={[
        { href: "/rh", label: "Projetos" },
        { href: `/${cycleYear}/rh`, label: `Projeto ${cycleYear}` },
      ]}
      subtitle={`Projeto ${cycleYear}`}
      title="Nomos"
      userMeta="Administrador global de RH"
      userName={context.user.name}
    >
      <section className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Gestão de ciclos</p>
          <h1 className="mt-2 font-headline text-4xl font-black tracking-tight text-primary">Ciclo de Avaliação Institucional</h1>
        </div>
        <div className="headline-gradient rounded-xl px-6 py-4 text-white">
          <p className="text-xs uppercase tracking-[0.24em] text-white/70">Link dinâmico</p>
          <p className="mt-2 font-mono text-sm">{`/`}{cycleYear}/login</p>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <div className="institutional-card p-8">
          <h2 className="font-headline text-xl font-bold text-primary">Definição do ciclo</h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            A criação de novos projetos ocorre no hub global do RH e só é liberada após a finalização do ciclo aberto.
          </p>
          <div className="mt-6">
            <Link
              className="inline-flex rounded-lg bg-institutional-gradient px-5 py-3 text-sm font-bold text-on-primary"
              href="/rh"
            >
              Voltar ao hub global
            </Link>
          </div>
        </div>

        <div className="institutional-card p-8">
          <h2 className="font-headline text-xl font-bold text-primary">Importação de base XML</h2>
          <p className="mt-2 text-sm text-on-surface-variant">A importação faz upsert de usuários, retrata o organograma do ano e gera avaliações pendentes automaticamente.</p>
          <div className="mt-6">
            <XmlImportForm cycleId={cycle.id} />
          </div>
          <div className="mt-6 border-t border-outline-variant pt-6">
            <p className="mb-3 text-xs text-on-surface-variant">Reverter apaga todos os servidores e avaliações pendentes. Bloqueado se alguma avaliação já foi iniciada.</p>
            <RollbackImportButton cycleId={cycle.id} />
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="institutional-card p-6">
          <p className="text-sm text-on-surface-variant">Total de servidores</p>
          <p className="mt-3 font-headline text-5xl font-black text-primary">{employees.length}</p>
        </div>
        <div className="institutional-card p-6">
          <p className="text-sm text-on-surface-variant">Concluídos</p>
          <p className="mt-3 font-headline text-5xl font-black text-primary-container">{evaluations}</p>
        </div>
        <div className="institutional-card p-6">
          <p className="text-sm text-on-surface-variant">Pendentes</p>
          <p className="mt-3 font-headline text-5xl font-black text-error">{employees.length - evaluations}</p>
        </div>
      </div>

      <section className="institutional-card mt-8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-surface-container-low text-xs uppercase tracking-[0.24em] text-on-surface-variant">
              <tr>
                <th className="px-6 py-4">Servidor</th>
                <th className="px-6 py-4">Secretaria</th>
                <th className="px-6 py-4">Cargo</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Versão</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const evaluation = employee.evaluations[0];
                return (
                  <tr className="hover:bg-surface-container-low/30" key={employee.id}>
                    <td className="px-6 py-5">
                      <p className="font-bold text-on-surface">{employee.user.name}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">Mat. {employee.user.registration}</p>
                    </td>
                    <td className="px-6 py-5 text-sm text-on-surface-variant">{employee.department}</td>
                    <td className="px-6 py-5 text-sm text-on-surface-variant">{employee.jobTitle}</td>
                    <td className="px-6 py-5">{evaluation ? <StatusBadge status={evaluation.status} /> : "Sem avaliação"}</td>
                    <td className="px-6 py-5 text-sm text-on-surface-variant">v{evaluation?.version ?? 1}</td>
                    <td className="px-6 py-5 text-right">
                      {evaluation ? <ReevaluationButton evaluationId={evaluation.id} /> : null}
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
