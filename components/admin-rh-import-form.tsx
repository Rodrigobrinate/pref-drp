"use client";

import { useActionState } from "react";

import { adminImportRhAction } from "@/app/actions";

type ActionState =
  | {
      error?: string;
      success?: string;
    }
  | undefined;

export function AdminRhImportForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(adminImportRhAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl bg-surface px-8 py-10 text-center transition hover:bg-surface-container-low">
        <span className="text-sm font-semibold text-primary">Selecione um XML ou CSV com a lista de RH</span>
        <span className="mt-2 text-xs text-on-surface-variant">
          Os registros válidos serão persistidos como usuários RH globais.
        </span>
        <input accept=".xml,.csv,text/xml,text/csv" className="sr-only" name="file" required type="file" />
      </label>

      {state?.error ? <p className="text-sm text-error">{state.error}</p> : null}
      {state?.success ? <p className="text-sm text-primary">{state.success}</p> : null}

      <button
        className="rounded-lg bg-primary px-5 py-3 text-sm font-bold text-on-primary"
        disabled={pending}
        type="submit"
      >
        {pending ? "Importando..." : "Importar RH"}
      </button>
    </form>
  );
}
