import { CycleStatus, EvaluationStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { getStatusBadgePresentation } from "@/lib/status-badge";

describe("status badge presentation", () => {
  it("returns cycle labels for cycle statuses", () => {
    expect(getStatusBadgePresentation(CycleStatus.OPEN, "cycle")).toEqual({
      label: "Aberto",
      className: "bg-secondary-container text-on-secondary-container",
    });

    expect(getStatusBadgePresentation(CycleStatus.COMPLETED, "cycle")).toEqual({
      label: "Encerrado",
      className: "bg-primary text-on-primary",
    });
  });

  it("returns evaluation labels for evaluation statuses", () => {
    expect(getStatusBadgePresentation(EvaluationStatus.AUTO_DONE)).toEqual({
      label: "Autoavaliação concluída",
      className: "bg-secondary-container text-on-secondary-container",
    });

    expect(getStatusBadgePresentation(EvaluationStatus.COMPLETED)).toEqual({
      label: "Fluxo concluído",
      className: "bg-primary text-on-primary",
    });
  });
});
