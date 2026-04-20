export const DEV_USER_NAME_PREFIX = "[DEV]";
export const DEV_TEST_PREFIX = "[DEV TESTE]";

export type DevTestUserKind = "rh" | "manager" | "employee";

type DevTestUserBlueprint = {
  kind: DevTestUserKind;
  cpf: string;
  name: string;
  registration: string;
  roleLabel: string;
};

function normalizeCpf(cpf: string) {
  return cpf.replace(/\D/g, "").padStart(11, "0").slice(-11);
}

function buildSuffix(cpf: string) {
  return normalizeCpf(cpf).slice(-8);
}

export function buildDeveloperUserBlueprint(cpf: string) {
  const normalizedCpf = normalizeCpf(cpf);
  const suffix = normalizedCpf.slice(-6);

  return {
    cpf: normalizedCpf,
    name: `${DEV_USER_NAME_PREFIX} ${normalizedCpf}`,
    registration: `DEV-${suffix}`,
  };
}

export function buildDevTestCycleName(cpf: string) {
  return `${DEV_TEST_PREFIX} ${normalizeCpf(cpf)}`;
}

export function buildDevTestUsers(cpf: string): DevTestUserBlueprint[] {
  const suffix = buildSuffix(cpf);

  return [
    {
      kind: "rh",
      cpf: `991${suffix}`,
      name: `${DEV_TEST_PREFIX} RH`,
      registration: `TSTRH-${suffix.slice(-6)}`,
      roleLabel: "RH",
    },
    {
      kind: "manager",
      cpf: `992${suffix}`,
      name: `${DEV_TEST_PREFIX} Chefia`,
      registration: `TSTMG-${suffix.slice(-6)}`,
      roleLabel: "MANAGER",
    },
    {
      kind: "employee",
      cpf: `993${suffix}`,
      name: `${DEV_TEST_PREFIX} Servidor`,
      registration: `TSTSV-${suffix.slice(-6)}`,
      roleLabel: "EMPLOYEE",
    },
  ];
}

export function pickDevTestYear(cpf: string, existingYears: number[]) {
  const suffixNumber = Number(normalizeCpf(cpf).slice(-3));
  const candidates = [7000, 8000, 9000].map((prefix) => prefix + suffixNumber);

  for (const candidate of candidates) {
    if (!existingYears.includes(candidate)) {
      return candidate;
    }
  }

  let fallback = 10000 + suffixNumber;

  while (existingYears.includes(fallback)) {
    fallback += 1000;
  }

  return fallback;
}
