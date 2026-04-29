"use client";

import { useActionState, useState, useTransition } from "react";

import { createCycleAction, importXmlAction, rollbackImportAction } from "@/app/actions";

export function CycleCreateForm({ suggestedYear }: { suggestedYear: number }) {
  const [state, formAction, pending] = useActionState(createCycleAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">
          Ano do ciclo
        </label>
        <input className="input-shell font-headline text-3xl font-black text-primary" defaultValue={suggestedYear} name="year" type="number" />
      </div>
      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">
          Data de abertura do projeto
        </label>
        <input className="input-shell font-headline text-3xl font-black text-primary" name="startDate" required type="date" />
      </div>
      {state?.error ? <p className="text-sm text-error">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-primary">{state.success}</p> : null}
      <button className="rounded-lg bg-institutional-gradient px-5 py-3 text-sm font-bold text-on-primary" disabled={pending} type="submit">
        {pending ? "Criando..." : "Novo projeto"}
      </button>
    </form>
  );
}

export function XmlImportForm({ cycleId }: { cycleId: string }) {
  const [state, formAction, pending] = useActionState(importXmlAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input name="cycleId" type="hidden" value={cycleId} />
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl bg-surface px-8 py-10 text-center transition hover:bg-surface-container-low">
        <span className="text-sm font-semibold text-primary">Arraste ou selecione o XML da base anual</span>
        <span className="mt-2 text-xs text-on-surface-variant">O parser espera campos de CPF, matrícula, vínculo, secretaria, cargo e chefia.</span>
        <input accept=".xml,text/xml" className="sr-only" name="xml" required type="file" />
      </label>
      {state?.error ? <p className="text-sm text-error">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-primary">{state.success}</p> : null}
      <button className="rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary" disabled={pending} type="submit">
        {pending ? "Importando..." : "Importar XML"}
      </button>
    </form>
  );
}

export function RollbackImportButton({ cycleId }: { cycleId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function handleClick() {
    if (!confirm("Isso apagará todos os servidores e avaliações pendentes do ciclo. Continuar?")) {
      return;
    }
    startTransition(async () => {
      const res = await rollbackImportAction(cycleId);
      setResult(res ?? null);
    });
  }

  return (
    <div className="space-y-3">
      <button
        className="rounded-lg border border-error px-5 py-3 text-sm font-bold text-error transition hover:bg-error/10 disabled:opacity-50"
        disabled={isPending}
        onClick={handleClick}
        type="button"
      >
        {isPending ? "Revertendo..." : "Reverter importação"}
      </button>
      {result ? (
        <p className={`text-sm ${result.ok ? "text-primary" : "text-error"}`}>{result.message}</p>
      ) : null}
    </div>
  );
}

export function DeveloperConsoleCard() {
  return (
    <div className="rounded-xl bg-surface-container-low p-6">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">Developer Console</p>
      <h3 className="mt-2 font-headline text-2xl font-bold text-primary">Painel administrativo</h3>
      <p className="mt-2 text-sm text-on-surface-variant">
        Área reservada para importação XML/CSV, atalhos críticos e administração de alto privilégio.
      </p>
      <a className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary" href="/admin">
        Abrir console
      </a>
    </div>
  );
}
