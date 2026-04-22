const PDF_SIGNATURE = "%PDF-";
export const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024;

export function sanitizeDocumentFileName(fileName: string): string {
  return (
    fileName
      .replace(/(\.\.(\/|\\|$))+/g, "")
      .replace(/[\\/]+/g, "")
      .replace(/[^A-Za-z0-9._-]/g, "")
      .replace(/\.{2,}/g, ".")
      .replace(/^\.+/, "") || "documento.pdf"
  );
}

export function isPdfBuffer(buffer: Buffer): boolean {
  if (buffer.length < PDF_SIGNATURE.length) {
    return false;
  }

  return buffer.subarray(0, PDF_SIGNATURE.length).toString("ascii") === PDF_SIGNATURE;
}

export function validatePdfUpload(input: {
  fileName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}): { ok: true; sanitizedFileName: string } | { ok: false; message: string } {
  if (input.mimeType !== "application/pdf") {
    return { ok: false, message: "Apenas arquivos PDF são permitidos." };
  }

  if (input.size > MAX_DOCUMENT_SIZE_BYTES) {
    return { ok: false, message: "Cada PDF deve ter no máximo 20MB." };
  }

  if (!isPdfBuffer(input.buffer)) {
    return { ok: false, message: "O arquivo enviado não é um PDF válido." };
  }

  return {
    ok: true,
    sanitizedFileName: sanitizeDocumentFileName(input.fileName),
  };
}
