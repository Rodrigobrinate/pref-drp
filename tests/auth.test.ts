import { SystemRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  cycle: {
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  userCycle: {
    findUnique: vi.fn(),
  },
}));

const bcryptCompareMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: bcryptCompareMock,
  },
}));

import { verifyCredentials, verifyGlobalRhCredentials } from "@/lib/auth";

describe("auth security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a generic error when cpf is not found in cycle login", async () => {
    prismaMock.cycle.findUnique.mockResolvedValue({ id: "cycle-1", year: 2026 });
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(verifyCredentials("12345678901", "senhaqualquer", 2026)).resolves.toEqual({
      ok: false,
      message: "Credenciais inválidas.",
    });
  });

  it("returns a generic error when user is outside selected cycle", async () => {
    prismaMock.cycle.findUnique.mockResolvedValue({ id: "cycle-1", year: 2026 });
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      cpf: "12345678901",
      passwordHash: "hash",
      globalRole: null,
    });
    prismaMock.userCycle.findUnique.mockResolvedValue(null);

    await expect(verifyCredentials("12345678901", "senhaqualquer", 2026)).resolves.toEqual({
      ok: false,
      message: "Credenciais inválidas.",
    });
  });

  it("returns a generic error when rh account does not exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      cpf: "12345678901",
      passwordHash: "hash",
      globalRole: SystemRole.EMPLOYEE,
    });

    await expect(verifyGlobalRhCredentials("12345678901", "senhaqualquer")).resolves.toEqual({
      ok: false,
      message: "Credenciais inválidas.",
    });
  });

  it("still authenticates valid rh credentials", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      cpf: "12345678901",
      passwordHash: "hash",
      globalRole: SystemRole.RH,
    });
    bcryptCompareMock.mockResolvedValue(true);

    await expect(verifyGlobalRhCredentials("12345678901", "senhaqualquer")).resolves.toEqual({
      ok: true,
      user: {
        id: "user-1",
        cpf: "12345678901",
        passwordHash: "hash",
        globalRole: SystemRole.RH,
      },
      effectiveRole: SystemRole.RH,
    });
  });
});
