const THAI_CHAR = /[฀-๿]/;

export function isThaiText(text: string | null | undefined): boolean {
  if (!text) return false;
  return THAI_CHAR.test(text);
}

/** Zero-width spaces/joiners, LRM/RLM, bidi embeddings/isolates, word joiner, BOM. */
const INVISIBLE_CHARS = /[​-‏‪-‮⁠-⁤⁦-⁩﻿]/g;

/**
 * Cleans a person's name for PRIMO (Rehearsal 1 feedback 6/6):
 * - drops invisible characters (e.g. a trailing zero-width space in "Atiporn")
 * - for non-Thai names, NFKC-folds decorative Unicode letters back to plain ones
 *   ("𝘕𝘢𝘵𝘵𝘢𝘱𝘰𝘯𝘨" → "Nattapong"). Chinese/Japanese/Korean names are left as they are.
 * Thai names skip NFKC: it would split SARA AM (ำ) into two characters.
 */
export function cleanName(raw: string | null | undefined): string {
  if (!raw) return "";
  const visible = raw.replace(INVISIBLE_CHARS, "");
  return (isThaiText(visible) ? visible : visible.normalize("NFKC")).trim();
}

/**
 * Normalizes a CRM phone number to digits-only, leading zero restored.
 * Handles Float-sourced values (e.g. "812345678.0" or "812345678") that lost their
 * leading zero, as well as already-clean text values. Empty/invalid input returns "".
 */
export function formatPhoneNo(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return "";
  const str = String(raw).trim();
  if (!str) return "";

  const numericMatch = str.match(/^(\d+)(\.\d+)?$/);
  if (numericMatch) {
    const digits = numericMatch[1];
    return digits.length === 9 ? `0${digits}` : digits;
  }

  // Non-numeric formatting noise (spaces, dashes, etc.) — keep digits only
  return str.replace(/\D/g, "");
}

/** Converts 'YYYY-MM-DD HH:MM:SS' (or date-only) to PRIMO's 'DD/MM/YYYY HH:MM'. Empty/invalid input returns "". */
export function formatPrimoDate(raw: string | null | undefined): string {
  if (!raw) return "";
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T]?(\d{2}:\d{2})?/);
  if (!match) return "";
  const [, year, month, day, time] = match;
  return `${day}/${month}/${year} ${time ?? "00:00"}`;
}

/**
 * PRIMO DateTime format 'YYYY-MM-DD HH:MM:SS' for a date-only value, with a fixed
 * time of day (PRIMO feedback, Rehearsal 1: birth_date → 07:00:00, tier_entry_date → 00:00:00).
 * Any time part in the input is dropped. Empty/invalid input returns "".
 */
export function formatPrimoDateTime(raw: string | null | undefined, time: string): string {
  if (!raw) return "";
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${year}-${month}-${day} ${time}`;
}

/** Today's date in Thailand (ICT, +7) as 'YYYY-MM-DD'. */
export function todayIct(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function buildDisplayName(
  lineDisplayName: string | null | undefined,
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string {
  if (lineDisplayName && lineDisplayName.trim()) return lineDisplayName.trim();
  return `${firstName ?? ""} ${lastName ?? ""}`.trim();
}

export type GenderId = 1 | 2 | 3;

export function lookupGender(gender: string | null | undefined): {
  genderId: GenderId;
  genderDescription: string;
} {
  switch ((gender ?? "").trim().toLowerCase()) {
    case "male":
      return { genderId: 1, genderDescription: "Male" };
    case "female":
      return { genderId: 2, genderDescription: "Female" };
    default:
      return { genderId: 3, genderDescription: "Not specified" };
  }
}
