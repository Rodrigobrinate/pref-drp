"use client";

import { useActionState } from "react";

import { loginAction, rhLoginAction } from "@/app/actions";

export function LoginForm({
  year,
  mode = "cycle",
}: {
  year?: number;
  mode?: "cycle" | "rh";
}) {
  const [state, formAction, pending] = useActionState(
    mode === "rh" ? rhLoginAction : loginAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-6">
      {mode === "cycle" && typeof year === "number" ? <input name="year" type="hidden" value={year} /> : null}
      <div className="space-y-1">
        <label className="ml-1 text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant" htmlFor="cpf">
          CPF
        </label>
        <input
          className="input-shell"
          id="cpf"
          name="cpf"
          placeholder="Digite seu CPF"
          required
          type="text"
        />
      </div>

      <div className="space-y-1">
        <label className="ml-1 text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant" htmlFor="password">
          Senha
        </label>
        <input
          className="input-shell"
          id="password"
          name="password"
          placeholder="Digite sua senha inicial"
          required
          type="password"
        />
      </div>

      <div className="rounded-full bg-secondary-container/40 px-4 py-3 text-xs font-medium text-on-secondary-container">
        {mode === "rh"
          ? "Acesso global do RH para gerenciamento de todos os projetos."
          : "O sistema identifica automaticamente o perfil do usuário dentro do ciclo selecionado."}
      </div>

      {state?.error ? (
        <div className="rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">{state.error}</div>
      ) : null}

      <button
        className="w-full rounded-lg bg-institutional-gradient px-6 py-4 text-sm font-bold text-on-primary transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={pending}
        type="submit"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
