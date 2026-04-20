import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    loginAttempt: {
      count: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import {
  MAX_ATTEMPTS,
  UNKNOWN_IP,
  WINDOW_MINUTES,
  checkRateLimit,
  clearAttempts,
  normalizeRequestIp,
  recordFailedAttempt,
} from "@/lib/rate-limit";

describe("rate limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks cpf after max attempts inside the window", async () => {
    prismaMock.loginAttempt.count.mockResolvedValue(MAX_ATTEMPTS);

    const result = await checkRateLimit("12345678901", "10.0.0.1");

    expect(result).toEqual({ blocked: true });
    expect(prismaMock.loginAttempt.count).toHaveBeenCalledWith({
      where: {
        cpf: "12345678901",
        createdAt: {
          gte: expect.any(Date),
        },
      },
    });

    const [{ where }] = prismaMock.loginAttempt.count.mock.calls[0];
    const diff = Date.now() - where.createdAt.gte.getTime();

    expect(diff).toBeGreaterThanOrEqual(WINDOW_MINUTES * 60 * 1000 - 1000);
    expect(diff).toBeLessThanOrEqual(WINDOW_MINUTES * 60 * 1000 + 1000);
  });

  it("allows cpf below the limit", async () => {
    prismaMock.loginAttempt.count.mockResolvedValue(MAX_ATTEMPTS - 1);

    await expect(checkRateLimit("12345678901", "10.0.0.1")).resolves.toEqual({ blocked: false });
  });

  it("records failed attempts", async () => {
    prismaMock.loginAttempt.create.mockResolvedValue(undefined);

    await recordFailedAttempt("12345678901", "10.0.0.1");

    expect(prismaMock.loginAttempt.create).toHaveBeenCalledWith({
      data: {
        cpf: "12345678901",
        ip: "10.0.0.1",
      },
    });
  });

  it("clears attempts after successful login", async () => {
    prismaMock.loginAttempt.deleteMany.mockResolvedValue(undefined);

    await clearAttempts("12345678901");

    expect(prismaMock.loginAttempt.deleteMany).toHaveBeenCalledWith({
      where: {
        cpf: "12345678901",
      },
    });
  });

  it("normalizes forwarded ip headers", () => {
    expect(normalizeRequestIp("203.0.113.10, 10.0.0.1")).toBe("203.0.113.10");
    expect(normalizeRequestIp("")).toBe(UNKNOWN_IP);
    expect(normalizeRequestIp(null)).toBe(UNKNOWN_IP);
  });
});
