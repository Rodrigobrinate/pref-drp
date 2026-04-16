import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function YearLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ year: string }>;
}>) {
  const { year } = await params;
  const cycle = await prisma.cycle.findUnique({
    where: { year: Number(year) },
    select: {
      id: true,
      year: true,
      startDate: true,
      status: true,
    },
  });

  if (!cycle) {
    notFound();
  }

  return <>{children}</>;
}
