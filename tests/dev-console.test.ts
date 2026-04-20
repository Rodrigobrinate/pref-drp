import { describe, expect, it } from "vitest";

import {
  DEV_TEST_PREFIX,
  DEV_USER_NAME_PREFIX,
  buildDeveloperUserBlueprint,
  buildDevTestCycleName,
  buildDevTestUsers,
  pickDevTestYear,
} from "@/lib/dev-console";

describe("dev console helpers", () => {
  it("builds the developer bootstrap identity from the allowlisted cpf", () => {
    expect(buildDeveloperUserBlueprint("123.456.789-01")).toEqual({
      cpf: "12345678901",
      name: `${DEV_USER_NAME_PREFIX} 12345678901`,
      registration: "DEV-678901",
    });
  });

  it("builds deterministic test identities for each category", () => {
    expect(buildDevTestUsers("12345678901")).toEqual([
      {
        kind: "rh",
        cpf: "99145678901",
        name: `${DEV_TEST_PREFIX} RH`,
        registration: "TSTRH-678901",
        roleLabel: "RH",
      },
      {
        kind: "manager",
        cpf: "99245678901",
        name: `${DEV_TEST_PREFIX} Chefia`,
        registration: "TSTMG-678901",
        roleLabel: "MANAGER",
      },
      {
        kind: "employee",
        cpf: "99345678901",
        name: `${DEV_TEST_PREFIX} Servidor`,
        registration: "TSTSV-678901",
        roleLabel: "EMPLOYEE",
      },
    ]);
  });

  it("builds the deterministic test project name for the developer cpf", () => {
    expect(buildDevTestCycleName("12345678901")).toBe(`${DEV_TEST_PREFIX} 12345678901`);
  });

  it("picks the first free high test year", () => {
    expect(pickDevTestYear("12345678901", [])).toBe(7901);
    expect(pickDevTestYear("12345678901", [7901])).toBe(8901);
    expect(pickDevTestYear("12345678901", [7901, 8901])).toBe(9901);
  });
});
