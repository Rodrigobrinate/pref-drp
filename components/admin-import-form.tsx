"use client";

import { useActionState } from "react";

import { adminImportPreviewAction } from "@/app/actions";

type PreviewRecord = {
  cpf: string;
  nome: string;
  matricula: string;
  vinculo: string;
  secretaria: string;
  cargo: string;
  chefiaCpf?: string;
};

type ActionState =
  | {
      error?: string;
      success?: string;
      format?: string;
      total?: number;
      preview?: PreviewRecord[];
    }
  | undefined;

export function AdminImportForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(adminImportPreviewAction, undefined);

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl bg-surface px-8 py-10 text-center transition hover:bg-surface-container-low">
          <span className="text-sm font-semibold text-primary">Selecione um XML ou CSV da base funcional</span>
          <span className="mt-2 text-xs text-on-surface-variant">
            O parser atual é configurado em <code>lib/admin-import-config.ts</code>.
          </span>
          <input accept=".xml,.csv,text/xml,text/csv" className="sr-only" name="file" required type="file" />
        </label>

        {state?.error ? <p className="text-sm text-error">{state.error}</p> : null}
        {state?.success ? <p className="text-sm text-primary">{state.success}</p> : null}

        <button
          className="rounded-lg bg-institutional-gradient px-5 py-3 text-sm font-bold text-on-primary"
          disabled={pending}
          type="submit"
        >
          {pending ? "Processando..." : "Validar arquivo"}
        </button>
      </form>

      {state?.preview?.length ? (
        <section className="institutional-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-headline text-2xl font-bold text-primary">Prévia da importação</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Formato {state.format?.toUpperCase()} · {state.total} registro(s) reconhecido(s)
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-surface-container-low text-xs uppercase tracking-[0.24em] text-on-surface-variant">
                <tr>
                  <th className="px-4 py-3">CPF</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Matrícula</th>
                  <th className="px-4 py-3">Vínculo</th>
                  <th className="px-4 py-3">Secretaria</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Chefia</th>
                </tr>
              </thead>
              <tbody>
                {state.preview.map((record, index) => (
                  <tr className="border-t border-outline-variant/20" key={`${record.cpf}-${index}`}>
                    <td className="px-4 py-3">{record.cpf || "-"}</td>
                    <td className="px-4 py-3">{record.nome || "-"}</td>
                    <td className="px-4 py-3">{record.matricula || "-"}</td>
                    <td className="px-4 py-3">{record.vinculo || "-"}</td>
                    <td className="px-4 py-3">{record.secretaria || "-"}</td>
                    <td className="px-4 py-3">{record.cargo || "-"}</td>
                    <td className="px-4 py-3">{record.chefiaCpf || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
