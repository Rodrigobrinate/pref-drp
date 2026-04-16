import { describe, expect, it } from "vitest";

import {
  MAX_DOCUMENT_SIZE_BYTES,
  isPdfBuffer,
  sanitizeDocumentFileName,
  validatePdfUpload,
} from "@/lib/upload-security";

describe("upload security", () => {
  it("sanitizes unsafe file names", () => {
    expect(sanitizeDocumentFileName("../certificado final?.pdf")).toBe("certificadofinal.pdf");
  });

  it("detects pdf signature from buffer", () => {
    expect(isPdfBuffer(Buffer.from("%PDF-1.7 test", "ascii"))).toBe(true);
    expect(isPdfBuffer(Buffer.from("not a pdf", "ascii"))).toBe(false);
  });

  it("rejects forged pdf uploads", () => {
    const result = validatePdfUpload({
      fileName: "comprovante.pdf",
      mimeType: "application/pdf",
      size: 128,
      buffer: Buffer.from("plain text", "utf8"),
    });

    expect(result).toEqual({
      ok: false,
      message: "O arquivo enviado não é um PDF válido.",
    });
  });

  it("accepts a valid pdf upload", () => {
    const result = validatePdfUpload({
      fileName: "comprovante.pdf",
      mimeType: "application/pdf",
      size: 128,
      buffer: Buffer.from("%PDF-1.7 test", "ascii"),
    });

    expect(result).toEqual({
      ok: true,
      sanitizedFileName: "comprovante.pdf",
    });
  });

  it("rejects oversized uploads", () => {
    const result = validatePdfUpload({
      fileName: "comprovante.pdf",
      mimeType: "application/pdf",
      size: MAX_DOCUMENT_SIZE_BYTES + 1,
      buffer: Buffer.from("%PDF-1.7 test", "ascii"),
    });

    expect(result).toEqual({
      ok: false,
      message: "Cada PDF deve ter no máximo 10MB.",
    });
  });
});
