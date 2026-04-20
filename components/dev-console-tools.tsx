"use client";

import { useActionState } from "react";

import {
  createDeveloperTestAction,
  deleteDeveloperTestAction,
  provisionDeveloperUsersAction,
} from "@/app/actions";

type ToolState =
  | {
      ok?: boolean;
      message?: string;
    }
  | undefined;

export function DevConsoleTools() {
  const [provisionState, provisionAction, provisionPending] = useActionState<ToolState, FormData>(
    async () => provisionDeveloperUsersAction(),
    undefined,
  );
  const [createState, createAction, createPending] = useActionState<ToolState, FormData>(
    async () => createDeveloperTestAction(),
    undefined,
  );
  const [deleteState, deleteAction, deletePending] = useActionState<ToolState, FormData>(
    async () => deleteDeveloperTestAction(),
    undefined,
  );

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <form action={provisionAction} className="rounded-xl bg-surface-container-low p-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Bootstrap dev</p>
        <h3 className="mt-2 font-headline text-xl font-bold text-primary">Gerar usuários da allowlist</h3>
        <p className="mt-2 text-sm text-on-surface-variant">
          Cria ou atualiza os CPFs do <code>DEVELOPER_ACCESS_CPFS</code> com senha igual ao CPF.
        </p>
        {provisionState?.message ? (
          <p className={`mt-3 text-sm ${provisionState.ok ? "text-primary" : "text-error"}`}>{provisionState.message}</p>
        ) : null}
        <button className="mt-5 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-on-primary" disabled={provisionPending} type="submit">
          {provisionPending ? "Provisionando..." : "Provisionar"}
        </button>
      </form>

      <form action={createAction} className="rounded-xl bg-surface-container-low p-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Ambiente de teste</p>
        <h3 className="mt-2 font-headline text-xl font-bold text-primary">Criar projeto de teste</h3>
        <p className="mt-2 text-sm text-on-surface-variant">
          Cria um projeto isolado com um RH, uma chefia, um servidor e uma avaliação pendente.
        </p>
        {createState?.message ? (
          <p className={`mt-3 text-sm ${createState.ok ? "text-primary" : "text-error"}`}>{createState.message}</p>
        ) : null}
        <button className="mt-5 rounded-lg bg-primary px-4 py-3 text-sm font-bold text-on-primary" disabled={createPending} type="submit">
          {createPending ? "Criando..." : "Criar teste"}
        </button>
      </form>

      <form action={deleteAction} className="rounded-xl bg-surface-container-low p-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Limpeza</p>
        <h3 className="mt-2 font-headline text-xl font-bold text-primary">Apagar projeto de teste</h3>
        <p className="mt-2 text-sm text-on-surface-variant">
          Remove o projeto de teste do seu CPF e os três usuários sintéticos vinculados a ele.
        </p>
        {deleteState?.message ? (
          <p className={`mt-3 text-sm ${deleteState.ok ? "text-primary" : "text-error"}`}>{deleteState.message}</p>
        ) : null}
        <button className="mt-5 rounded-lg bg-error px-4 py-3 text-sm font-bold text-on-primary" disabled={deletePending} type="submit">
          {deletePending ? "Apagando..." : "Apagar teste"}
        </button>
      </form>
    </div>
  );
}
