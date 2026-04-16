import { logoutAction } from "@/app/actions";

export function LogoutButton({ year, redirectTo }: { year?: number; redirectTo?: string }) {
  const action = logoutAction.bind(null, year, redirectTo);

  return (
    <form action={action}>
      <button
        className="min-h-11 rounded-lg bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-primary transition hover:bg-surface-container"
        type="submit"
      >
        Sair
      </button>
    </form>
  );
}
