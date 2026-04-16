import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getSessionContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RhLoginPage() {
  const session = await getSessionContext();

  if (session?.effectiveRole === "RH") {
    redirect("/rh");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-6 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,29,68,0.08),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(0,50,107,0.08),transparent_30%)]" />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-surface-container-low text-3xl text-primary">
            N
          </div>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-primary">Console RH</h1>
          <p className="mt-3 text-sm text-on-surface-variant">
            Acesso global para gerenciar todos os projetos de avaliação.
          </p>
        </div>

        <div className="institutional-card border border-outline-variant/10 p-8">
          <LoginForm mode="rh" />
        </div>
      </div>
    </main>
  );
}
