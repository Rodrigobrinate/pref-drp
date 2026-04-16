export default function RhLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <div className="rounded-2xl bg-surface-container p-8">
          <div className="h-8 w-40 rounded-lg bg-surface-container" />
          <div className="mt-4 h-4 w-full rounded bg-surface-container" />
          <div className="mt-2 h-4 w-4/5 rounded bg-surface-container" />
          <div className="mt-8 h-36 rounded-xl bg-surface-container" />
        </div>
        <div className="rounded-2xl bg-surface-container p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="w-full max-w-md">
              <div className="h-8 w-56 rounded-lg bg-surface-container" />
              <div className="mt-4 h-4 w-full rounded bg-surface-container" />
            </div>
            <div className="h-10 w-32 rounded-lg bg-surface-container" />
          </div>
          <div className="mt-8 space-y-4">
            <div className="h-32 rounded-xl bg-surface-container" />
            <div className="h-32 rounded-xl bg-surface-container" />
            <div className="h-32 rounded-xl bg-surface-container" />
          </div>
        </div>
      </div>
    </div>
  );
}
