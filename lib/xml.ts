import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
});

type EmployeeRecord = {
  cpf: string;
  nome: string;
  matricula: string;
  vinculo: string;
  secretaria: string;
  cargo: string;
  chefiaCpf?: string;
};

function normalizeValue(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function collectObjects(node: unknown, bucket: Record<string, unknown>[] = []) {
  if (Array.isArray(node)) {
    node.forEach((item) => collectObjects(item, bucket));
    return bucket;
  }

  if (node && typeof node === "object") {
    const objectNode = node as Record<string, unknown>;
    const keys = Object.keys(objectNode).map((key) => key.toLowerCase());

    if (keys.includes("cpf") && keys.some((key) => key.includes("matricula"))) {
      bucket.push(objectNode);
    }

    Object.values(objectNode).forEach((value) => collectObjects(value, bucket));
  }

  return bucket;
}

export function parseXmlEmployees(xml: string): EmployeeRecord[] {
  const parsed = parser.parse(xml);
  const records = collectObjects(parsed);

  return records.map((record) => ({
    cpf: normalizeValue(record.cpf).replace(/\D/g, ""),
    nome: normalizeValue(record.nome ?? record.name),
    matricula: normalizeValue(record.matricula ?? record.registration),
    vinculo: normalizeValue(record.vinculo ?? record.tipoVinculo ?? record.role),
    secretaria: normalizeValue(record.secretaria ?? record.department),
    cargo: normalizeValue(record.cargo ?? record.jobTitle),
    chefiaCpf: normalizeValue(record.chefiaCpf ?? record.managerCpf).replace(/\D/g, "") || undefined,
  }));
}
