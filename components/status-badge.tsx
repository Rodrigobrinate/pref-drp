import { cn } from "@/lib/utils";
import { getStatusBadgePresentation, type StatusBadgeKind, type StatusBadgeValue } from "@/lib/status-badge";

export function StatusBadge({ status, kind = "evaluation" }: { status: StatusBadgeValue; kind?: StatusBadgeKind }) {
  const presentation = getStatusBadgePresentation(status, kind);

  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold", presentation.className)}>
      {presentation.label}
    </span>
  );
}
