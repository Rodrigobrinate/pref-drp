import { requestReevaluationAction } from "@/app/actions";

export function ReevaluationButton({ evaluationId }: { evaluationId: string }) {
  const action = requestReevaluationAction.bind(null, evaluationId);

  return (
    <form action={action}>
      <button
        className="min-h-11 rounded-lg bg-surface-container px-4 py-2 text-xs font-bold text-primary transition hover:bg-surface-container-high"
        type="submit"
      >
        Solicitar reavaliação
      </button>
    </form>
  );
}
