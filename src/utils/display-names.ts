/**
 * Display helpers for raw DB names like "KIGALI CONVENTION(302R) - KIMIRONKO
 * BUS PARK". The dashboard shows normalized names with the route code pulled
 * out as a separate tag instead of repeated in every label.
 */

/** Short words that should be title-cased even though they look like acronyms. */
const SMALL_WORDS = new Set(['bus', 'the', 'of', 'and', 'via', 'to', 'at', 'de', 'la', 'du', 'kwa']);

function titleWord(word: string): string {
  // Keep short all-caps tokens (KCC, KIE) as acronyms.
  if (word.length <= 3 && /^[A-Z]+$/.test(word) && !SMALL_WORDS.has(word.toLowerCase())) {
    return word;
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function toTitleCase(raw: string): string {
  return raw.split(/\s+/).filter(Boolean).map(titleWord).join(' ');
}

/** Pull "(302R)"-style codes out of a name. */
export function stripRouteCodes(raw: string): { name: string; codes: string[] } {
  const codes: string[] = [];
  const name = raw
    .replace(/\(([^)]*)\)/g, (_m, code: string) => {
      const trimmed = code.trim();
      if (trimmed && !codes.includes(trimmed)) codes.push(trimmed);
      return '';
    })
    .replace(/\s{2,}/g, ' ')
    .trim();
  return { name, codes };
}

/** "KIGALI CONVENTION(302R)" → "Kigali Convention" */
export function formatStopName(raw?: string | null): string {
  if (!raw) return '';
  return toTitleCase(stripRouteCodes(raw).name);
}

/** "KIGALI CONVENTION(302R) - KIMIRONKO BUS PARK" → { name: "Kigali Convention – Kimironko Bus Park", code: "302R" } */
export function formatRouteName(raw?: string | null): { name: string; code?: string } {
  if (!raw) return { name: '' };
  const { name, codes } = stripRouteCodes(raw);
  const pretty = name
    .split(/\s*[-–—]\s*/)
    .filter(Boolean)
    .map(toTitleCase)
    .join(' – ');
  return { name: pretty, code: codes[0] };
}

/** True when the driver name is missing or a seed placeholder like "Driver". */
export function isPlaceholderDriver(name?: string | null): boolean {
  if (!name) return true;
  const t = name.trim().toLowerCase();
  return t === '' || t === 'driver' || t === 'unknown' || t === 'n/a';
}
