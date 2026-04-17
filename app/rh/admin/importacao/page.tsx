import Link from "next/link";

import { AdminImportForm } from "@/components/admin-import-form";
import { AppShell } from "@/components/app-shell";
import { LogoutButton } from "@/components/logout-button";
import { requireDeveloperConsoleSession } from "@/lib/auth";
import { ADMIN_IMPORT_ALLOWED_CPFS_ENV, ADMIN_IMPORT_SUPPORTED_FORMATS } from "@/lib/admin-import-config";

export const dynamic = "force-dynamic";

export default async function DeveloperImportPage() {
  const context = await requireDeveloperConsoleSession();

  return (
    <AppShell
      actions={<LogoutButton redirectTo="/rh/login" />}
      currentPath="/rh/admin/importacao"
      navItems={[
        { href: "/rh", label: "Projetos" },
        { href: "/rh/admin/importacao", label: "Importação avançada" },
      ]}
      subtitle="Console de Desenvolvimento"
      title="Nomos"
      userMeta="Super admin / developer"
      userName={context.user.name}
    >
      <section className="mb-8 grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="institutional-card p-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">Pré-produção lógica</p>
          <h1 className="mt-2 font-headline text-4xl font-black tracking-tight text-primary">
            Importação preparada para XML e CSV
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">
            Esta tela só valida e mostra prévia. A persistência definitiva pode ser adicionada depois sem reescrever a
            estrutura da página.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs text-on-surface-variant">
            <span className="rounded-full bg-surface-container px-3 py-1">Formatos: {ADMIN_IMPORT_SUPPORTED_FORMATS.join(" / ")}</span>
            <span className="rounded-full bg-surface-container px-3 py-1">Allowlist via env: {ADMIN_IMPORT_ALLOWED_CPFS_ENV}</span>
          </div>
        </div>

        <div className="institutional-card p-8">
          <h2 className="font-headline text-2xl font-bold text-primary">Pontos de alteração futura</h2>
          <ul className="mt-4 space-y-3 text-sm text-on-surface-variant">
            <li>Aliases de colunas/campos em <code>lib/admin-import-config.ts</code></li>
            <li>Parser XML/CSV e normalização em <code>lib/admin-import.ts</code></li>
            <li>Ação server-side de processamento em <code>app/actions.ts</code></li>
          </ul>
          <Link className="mt-6 inline-flex rounded-lg bg-surface-container px-4 py-2 text-sm font-semibold text-primary" href="/rh">
            Voltar ao hub RH
          </Link>
        </div>
      </section>

      <AdminImportForm />
    </AppShell>
  );
}
