/** Strip Esri braces / whitespace so `{uuid}` and `uuid` compare equal. */
export function normalizeTripId(id: string | null | undefined): string {
  if (!id) return '';
  return String(id).replace(/[{}]/g, '').trim().toLowerCase();
}

export function sameTripId(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeTripId(a);
  const nb = normalizeTripId(b);
  return na.length > 0 && na === nb;
}
