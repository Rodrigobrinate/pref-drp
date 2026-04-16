"use client";

import { useState, useTransition } from "react";

import { completeCycleAction } from "@/app/actions";

export function CompleteCycleButton({ cycleId }: { cycleId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <button
        className="min-h-11 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-on-primary transition hover:brightness-110 disabled:opacity-50"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const response = await completeCycleAction(cycleId);
            setMessage(response.message);
          })
        }
        type="button"
      >
        {pending ? "Finalizando..." : "Finalizar projeto"}
      </button>
      {message ? <span className="text-xs text-on-surface-variant">{message}</span> : null}
    </div>
  );
}
