export default function YearLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-10">
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-56 rounded-xl bg-surface-container" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-40 rounded-2xl bg-surface-container" />
          <div className="h-40 rounded-2xl bg-surface-container" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-28 rounded-2xl bg-surface-container" />
          <div className="h-28 rounded-2xl bg-surface-container" />
          <div className="h-28 rounded-2xl bg-surface-container" />
        </div>
        <div className="h-80 rounded-2xl bg-surface-container" />
      </div>
    </div>
  );
}
