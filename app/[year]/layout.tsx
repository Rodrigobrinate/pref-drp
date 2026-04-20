import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { parseYearParam } from "@/lib/year-route";

export const dynamic = "force-dynamic";

export default async function YearLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ year: string }>;
}>) {
  const { year } = await params;
  const cycleYear = parseYearParam(year);

  if (cycleYear === null) {
    notFound();
  }

  const cycle = await prisma.cycle.findUnique({
    where: { year: cycleYear },
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
