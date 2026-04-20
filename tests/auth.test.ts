import { SystemRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  cycle: {
    findUnique: vi.fn(),
  },
  session: {
    deleteMany: vi.fn(),
    create: vi.fn(),
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

import { createSession, getPostLoginPath, getRhLandingPath, verifyCredentials, verifyGlobalRhCredentials } from "@/lib/auth";

describe("auth security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DEVELOPER_ACCESS_CPFS;
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => Promise<unknown>) => callback(prismaMock));
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

  it("routes allowlisted rh users straight to the developer console", () => {
    process.env.DEVELOPER_ACCESS_CPFS = "123.456.789-01,98765432100";

    expect(getRhLandingPath("12345678901")).toBe("/admin");
    expect(getRhLandingPath("987.654.321-00")).toBe("/admin");
    expect(getRhLandingPath("11122233344")).toBe("/rh");
  });

  it("prioritizes the admin console over role-based destinations for allowlisted cpfs", () => {
    process.env.DEVELOPER_ACCESS_CPFS = "12345678901";

    expect(getPostLoginPath({ cpf: "12345678901", role: SystemRole.EMPLOYEE, year: 2026 })).toBe("/admin");
    expect(getPostLoginPath({ cpf: "12345678901", role: SystemRole.MANAGER, year: 2026 })).toBe("/admin");
    expect(getPostLoginPath({ cpf: "12345678901", role: SystemRole.RH })).toBe("/admin");
    expect(getPostLoginPath({ cpf: "99999999999", role: SystemRole.MANAGER, year: 2026 })).toBe("/2026/chefia");
  });

  it("revokes previous sessions before creating a new one", async () => {
    const cookieStore = {
      set: vi.fn(),
    };

    vi.mocked(cookies).mockResolvedValue(cookieStore as never);
    prismaMock.session.deleteMany.mockResolvedValue({ count: 2 });
    prismaMock.session.create.mockResolvedValue({
      id: "session-1",
      token: "token",
    });

    await createSession("user-1", "cycle-1");

    expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
      },
    });
    expect(prismaMock.session.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        cycleId: "cycle-1",
      }),
    });
    expect(cookieStore.set).toHaveBeenCalled();
  });
});
