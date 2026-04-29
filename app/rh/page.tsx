import Link from "next/link";
import { CycleStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { CompleteCycleButton } from "@/components/complete-cycle-button";
import { CycleCreateForm } from "@/components/rh-forms";
import { LogoutButton } from "@/components/logout-button";
import { canAccessDeveloperConsole, requireGlobalRhSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function GlobalRhPage() {
  const context = await requireGlobalRhSession();
  const cycles = await prisma.cycle.findMany({
    include: {
      _count: {
        select: {
          evaluations: true,
        },
      },
    },
    orderBy: { year: "desc" },
  });

  const openCycle = cycles.find((cycle) => cycle.status === CycleStatus.OPEN) ?? null;
  const nextYear = (cycles[0]?.year ?? new Date().getFullYear()) + 1;
  const hasDeveloperConsoleAccess = canAccessDeveloperConsole(context.user.cpf);

  if (hasDeveloperConsoleAccess) {
    redirect("/admin");
  }

  return (
    <AppShell
      actions={<LogoutButton redirectTo="/rh/login" />}
      currentPath="/rh"
      navItems={[{ href: "/rh", label: "Projetos" }]}
      subtitle="Gestão Global do RH"
      title="Nomos"
      userMeta="Administrador global de RH"
      userName={context.user.name}
    >
      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <div className="space-y-8">
          <section className="institutional-card p-8">
            <h2 className="font-headline text-2xl font-bold text-primary">Novo projeto</h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              O RH só pode abrir um novo projeto quando o ciclo anterior estiver finalizado.
            </p>
            {openCycle ? (
              <div className="mt-6 rounded-xl bg-tertiary-fixed px-4 py-4 text-sm text-on-error-container">
                Projeto {openCycle.year} ainda está aberto. Finalize esse ciclo antes de criar o próximo.
              </div>
            ) : (
              <div className="mt-6">
                <CycleCreateForm suggestedYear={nextYear} />
              </div>
            )}
          </section>
        </div>

        <section className="institutional-card p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-headline text-2xl font-bold text-primary">Projetos disponíveis</h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                Escolha o projeto que deseja administrar.
              </p>
            </div>
            <Link
              className="rounded-lg bg-surface-container px-4 py-2 text-sm font-semibold text-primary"
              href="/rh/login"
            >
              Login global RH
            </Link>
          </div>

          <div className="mt-8 grid gap-4">
            {cycles.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Nenhum projeto cadastrado ainda.</p>
            ) : (
              cycles.map((cycle) => (
                <article className="rounded-xl bg-surface-container-low p-6" key={cycle.id}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                        Projeto {cycle.year}
                      </p>
                      <h3 className="mt-2 font-headline text-3xl font-black text-primary">
                        {cycle.name}
                      </h3>
                      <p className="mt-2 text-sm text-on-surface-variant">
                        Status {cycle.status === CycleStatus.OPEN ? "aberto" : "finalizado"} ·{" "}
                        {cycle._count.evaluations} avaliação(ões) registradas
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        className="rounded-lg bg-institutional-gradient px-4 py-2 text-sm font-bold text-on-primary"
                        href={cycle.status === CycleStatus.OPEN ? `/${cycle.year}/rh` : `/${cycle.year}/rh/dashboard`}
                      >
                        {cycle.status === CycleStatus.OPEN ? "Gerenciar projeto" : "Ver dashboard"}
                      </Link>
                      {cycle.status === CycleStatus.OPEN ? (
                        <CompleteCycleButton cycleId={cycle.id} />
                      ) : null}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
