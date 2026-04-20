import { XMLParser } from "fast-xml-parser";

import { ADMIN_IMPORT_FIELD_ALIASES, ADMIN_IMPORT_PREVIEW_LIMIT } from "@/lib/admin-import-config";

export type AdminImportRecord = {
  cpf: string;
  nome: string;
  matricula: string;
  vinculo: string;
  secretaria: string;
  cargo: string;
  chefiaCpf?: string;
};

type SupportedFormat = "xml" | "csv";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
});

function normalizeValue(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function findValueByAliases(record: Record<string, unknown>, aliases: readonly string[]): string {
  const normalizedEntries = new Map(
    Object.entries(record).map(([key, value]) => [normalizeHeader(key), value]),
  );

  for (const alias of aliases) {
    const value = normalizedEntries.get(normalizeHeader(alias));

    if (value !== undefined) {
      return normalizeValue(value);
    }
  }

  return "";
}

function collectXmlObjects(node: unknown, bucket: Record<string, unknown>[] = []) {
  if (Array.isArray(node)) {
    node.forEach((item) => collectXmlObjects(item, bucket));
    return bucket;
  }

  if (node && typeof node === "object") {
    const objectNode = node as Record<string, unknown>;
    const keys = Object.keys(objectNode).map((key) => normalizeHeader(key));

    if (
      keys.some((key) => ADMIN_IMPORT_FIELD_ALIASES.cpf.includes(key as never)) &&
      keys.some((key) => ADMIN_IMPORT_FIELD_ALIASES.matricula.includes(key as never))
    ) {
      bucket.push(objectNode);
    }

    Object.values(objectNode).forEach((value) => collectXmlObjects(value, bucket));
  }

  return bucket;
}

function detectCsvDelimiter(headerLine: string): string {
  const candidates = [",", ";", "\t"];
  const ranked = candidates
    .map((delimiter) => ({
      delimiter,
      count: headerLine.split(delimiter).length,
    }))
    .sort((left, right) => right.count - left.count);

  return ranked[0]?.delimiter ?? ",";
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsvRecords(content: string): Record<string, unknown>[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const delimiter = detectCsvDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function normalizeImportRecords(records: Record<string, unknown>[]): AdminImportRecord[] {
  return records
    .map((record) => ({
      cpf: findValueByAliases(record, ADMIN_IMPORT_FIELD_ALIASES.cpf).replace(/\D/g, ""),
      nome: findValueByAliases(record, ADMIN_IMPORT_FIELD_ALIASES.nome),
      matricula: findValueByAliases(record, ADMIN_IMPORT_FIELD_ALIASES.matricula),
      vinculo: findValueByAliases(record, ADMIN_IMPORT_FIELD_ALIASES.vinculo),
      secretaria: findValueByAliases(record, ADMIN_IMPORT_FIELD_ALIASES.secretaria),
      cargo: findValueByAliases(record, ADMIN_IMPORT_FIELD_ALIASES.cargo),
      chefiaCpf:
        findValueByAliases(record, ADMIN_IMPORT_FIELD_ALIASES.chefiaCpf).replace(/\D/g, "") || undefined,
    }))
    .filter((record) => record.cpf || record.nome || record.matricula);
}

export function detectAdminImportFormat(fileName: string): SupportedFormat | null {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith(".xml")) {
    return "xml";
  }

  if (lowerName.endsWith(".csv")) {
    return "csv";
  }

  return null;
}

export function parseAdminImportFile(fileName: string, content: string) {
  const format = detectAdminImportFormat(fileName);

  if (!format) {
    return {
      ok: false as const,
      message: "Formato não suportado. Use XML ou CSV.",
    };
  }

  const rawRecords =
    format === "xml"
      ? collectXmlObjects(xmlParser.parse(content))
      : parseCsvRecords(content);

  const records = normalizeImportRecords(rawRecords);

  if (records.length === 0) {
    return {
      ok: false as const,
      message: "Nenhum registro reconhecido no arquivo.",
    };
  }

  return {
    ok: true as const,
    format,
    records,
    total: records.length,
    preview: records.slice(0, ADMIN_IMPORT_PREVIEW_LIMIT),
  };
}
