export function parseYearParam(year: string): number | null {
  if (!/^\d{4}$/.test(year)) {
    return null;
  }

  const parsed = Number(year);

  if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 9999) {
    return null;
  }

  return parsed;
}
