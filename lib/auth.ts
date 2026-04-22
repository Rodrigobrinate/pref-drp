import { SystemRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";
import { ADMIN_IMPORT_ALLOWED_CPFS_ENV } from "@/lib/admin-import-config";
import { buildDeveloperUserBlueprint } from "@/lib/dev-console";

const SESSION_COOKIE = "nomos_session";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export async function createSession(userId: string, cycleId?: string | null): Promise<void> {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.$transaction(async (tx) => {
    await tx.session.deleteMany({
      where: {
        userId,
        expiresAt: { lt: new Date() },
      },
    });

    await tx.session.create({
      data: {
        token,
        userId,
        cycleId: cycleId ?? null,
        expiresAt,
      },
    });
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

  if (!context) {
    redirect(`/${year}/login`);
  }

  if (canAccessDeveloperConsole(context.user.cpf)) {
    redirect("/admin");
  }

  if (!context.cycle || context.cycle.year !== year) {
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

  if (canAccessDeveloperConsole(context.user.cpf)) {
    redirect("/admin");
  }

  return context;
}

function getDeveloperAccessCpfs(): Set<string> {
  const raw = process.env[ADMIN_IMPORT_ALLOWED_CPFS_ENV] ?? "";
  return new Set(
    raw
      .split(",")
      .map((value) => value.replace(/\D/g, ""))
      .filter(Boolean),
  );
}

export function listDeveloperAccessCpfs(): string[] {
  return Array.from(getDeveloperAccessCpfs());
}

export function canAccessDeveloperConsole(cpf: string | null | undefined): boolean {
  if (!cpf) {
    return false;
  }

  return getDeveloperAccessCpfs().has(cpf.replace(/\D/g, ""));
}

export async function provisionDeveloperAccessUser(cpf: string) {
  const normalizedCpf = cpf.replace(/\D/g, "");

  if (!canAccessDeveloperConsole(normalizedCpf)) {
    throw new Error("CPF fora da allowlist do console de desenvolvimento.");
  }

  const passwordHash = await bcrypt.hash(normalizedCpf, 10);
  const blueprint = buildDeveloperUserBlueprint(normalizedCpf);

  return prisma.user.upsert({
    where: { cpf: normalizedCpf },
    create: {
      cpf: blueprint.cpf,
      name: blueprint.name,
      registration: blueprint.registration,
      passwordHash,
      globalRole: SystemRole.RH,
    },
    update: {
      name: blueprint.name,
      registration: blueprint.registration,
      passwordHash,
      globalRole: SystemRole.RH,
    },
  });
}

export function getRhLandingPath(cpf: string | null | undefined): string {
  return canAccessDeveloperConsole(cpf) ? "/admin" : "/rh";
}

export function getPostLoginPath(input: {
  cpf: string | null | undefined;
  role: SystemRole;
  year?: number;
}): string {
  if (canAccessDeveloperConsole(input.cpf)) {
    return "/admin";
  }

  if (input.role === SystemRole.RH) {
    return "/rh";
  }

  if (typeof input.year !== "number") {
    return "/";
  }

  return `/${input.year}/${routeForRole(input.role)}`;
}

export async function requireDeveloperConsoleSession() {
  const context = await getSessionContext();

  if (!context) {
    redirect("/rh/login");
  }

  if (!canAccessDeveloperConsole(context.user.cpf)) {
    redirect(
      getPostLoginPath({
        cpf: context.user.cpf,
        role: context.effectiveRole,
        year: context.cycle?.year,
      }),
    );
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
