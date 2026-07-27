/** Normalize Esri `{GUID}` / plain UUID for comparisons. */
export function normalizeStopId(id: string): string {
  return id.replace(/[{}]/g, '').toLowerCase();
}

export function stopIdsMatch(a: string, b: string): boolean {
  return normalizeStopId(a) === normalizeStopId(b);
}
