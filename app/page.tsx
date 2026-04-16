import { redirect } from "next/navigation";

import { getSessionContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSessionContext();

  if (session?.effectiveRole === "RH") {
    redirect("/rh");
  }

  const activeCycle = await prisma.cycle.findFirst({
    where: { active: true },
    orderBy: { year: "desc" },
  });

  if (!activeCycle) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="institutional-card max-w-xl p-10 text-center">
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-primary">
            Nenhum ciclo ativo
          </h1>
          <p className="mt-4 text-sm text-on-surface-variant">
            Cadastre um ciclo no painel RH para liberar o acesso contextual por ano.
          </p>
        </div>
      </main>
    );
  }

  redirect(`/${activeCycle.year}/login`);
}
