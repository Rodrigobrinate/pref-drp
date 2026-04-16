import { prisma } from "@/lib/prisma";

export const MAX_ATTEMPTS = 5;
export const WINDOW_MINUTES = 15;
export const UNKNOWN_IP = "unknown";

function getWindowStart(now: Date = new Date()) {
  return new Date(now.getTime() - WINDOW_MINUTES * 60 * 1000);
}

export function normalizeRequestIp(ip: string | null | undefined): string {
  if (!ip) {
    return UNKNOWN_IP;
  }

  const firstIp = ip.split(",")[0]?.trim();
  return firstIp || UNKNOWN_IP;
}

export async function checkRateLimit(cpf: string, ip: string) {
  const attempts = await prisma.loginAttempt.count({
    where: {
      cpf,
      ip,
      createdAt: {
        gte: getWindowStart(),
      },
    },
  });

  return { blocked: attempts >= MAX_ATTEMPTS };
}

export async function recordFailedAttempt(cpf: string, ip: string) {
  await prisma.loginAttempt.create({
    data: {
      cpf,
      ip,
    },
  });
}

export async function clearAttempts(cpf: string) {
  await prisma.loginAttempt.deleteMany({
    where: {
      cpf,
    },
  });
}
