import { SystemRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "nomos_session";

export async function createSession(userId: string, cycleId?: string | null): Promise<void> {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12);

  await prisma.session.create({
    data: {
      token,
      userId,
      cycleId: cycleId ?? null,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionContext() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: true,
      cycle: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  const userCycle = session.cycleId
    ? await prisma.userCycle.findUnique({
        where: {
          userId_cycleId: {
            userId: session.userId,
            cycleId: session.cycleId,
          },
        },
      })
    : null;

  const effectiveRole = session.user.globalRole ?? userCycle?.role ?? null;

  if (!effectiveRole) {
    return null;
  }

  return {
    session,
    user: session.user,
    cycle: session.cycle,
    userCycle,
    effectiveRole,
  };
}

export async function requireSessionForYear(year: number, role?: SystemRole) {
  const context = await getSessionContext();

  if (!context || !context.cycle || context.cycle.year !== year) {
    redirect(`/${year}/login`);
  }

  if (role && context.effectiveRole !== role) {
    redirect(`/${year}/${routeForRole(context.effectiveRole)}`);
  }

  return context;
}

export async function requireGlobalRhSession() {
  const context = await getSessionContext();

  if (!context || context.effectiveRole !== SystemRole.RH) {
    redirect("/rh/login");
  }

  return context;
}

export async function verifyCredentials(cpf: string, password: string, year: number) {
  const cycle = await prisma.cycle.findUnique({ where: { year } });

  if (!cycle) {
    return { ok: false as const, message: "Credenciais inválidas." };
  }

  const user = await prisma.user.findUnique({ where: { cpf } });

  if (!user) {
    return { ok: false as const, message: "Credenciais inválidas." };
  }

  const userCycle = await prisma.userCycle.findUnique({
    where: {
      userId_cycleId: {
        userId: user.id,
        cycleId: cycle.id,
      },
    },
  });

  const effectiveRole = user.globalRole ?? userCycle?.role ?? null;

  if (!effectiveRole) {
    return { ok: false as const, message: "Credenciais inválidas." };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    return { ok: false as const, message: "Credenciais inválidas." };
  }

  return { ok: true as const, user, cycle, userCycle, effectiveRole };
}

export async function verifyGlobalRhCredentials(cpf: string, password: string) {
  const user = await prisma.user.findUnique({ where: { cpf } });

  if (!user || user.globalRole !== SystemRole.RH) {
    return { ok: false as const, message: "Credenciais inválidas." };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    return { ok: false as const, message: "Credenciais inválidas." };
  }

  return {
    ok: true as const,
    user,
    effectiveRole: SystemRole.RH,
  };
}

export function routeForRole(role: SystemRole): string {
  if (role === SystemRole.RH) {
    return "rh";
  }

  if (role === SystemRole.MANAGER) {
    return "chefia";
  }

  return "servidor";
}
