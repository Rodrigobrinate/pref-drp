import { describe, expect, it } from "vitest";

import { buildStoragePath, isLegacyExternalUrl } from "@/lib/storage";

describe("storage", () => {
  it("builds a stable supabase storage path", () => {
    const path = buildStoragePath({
      buffer: Buffer.from("pdf"),
      fileName: "Certificado Final.pdf",
      cycleYear: 2026,
      userFolder: "Maria da Silva",
    });

    expect(path).toMatch(/^ciclo-2026\/maria-da-silva\/\d{14}-certificado-final\.pdf$/);
  });

  it("detects legacy external urls from previous providers", () => {
    expect(isLegacyExternalUrl("https://drive.google.com/file/d/abc/view", "abc")).toBe(true);
    expect(isLegacyExternalUrl("https://signed.example.com/object", "ciclo-2026/user/doc.pdf")).toBe(false);
  });
});
