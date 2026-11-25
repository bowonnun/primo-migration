import { getDb } from "./db";
import { formatPhoneNo } from "./transform";

/** normalized value → member_codes sharing it (2+), oldest registration first. */
interface DuplicateIndex {
  phone: Map<string, string[]>;
  email: Map<string, string[]>;
}

/** Keyed by activeOnly, so an export that includes inactive members checks against them too. */
const cache = new Map<boolean, DuplicateIndex>();

/** Same normalization the PRIMO file uses for phone_no, so "812345678" and "0812345678" collide. */
export function normalizePhone(raw: string | null | undefined): string {
  return formatPhoneNo(raw);
}

export function normalizeEmail(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

function groupDuplicates(rows: { key: string; member_code: string | null }[]): Map<string, string[]> {
  const all = new Map<string, string[]>();
  for (const { key, member_code } of rows) {
    if (!key) continue;
    const codes = all.get(key);
    if (codes) codes.push(member_code ?? "");
    else all.set(key, [member_code ?? ""]);
  }
  for (const [key, codes] of all) {
    if (codes.length < 2) all.delete(key);
  }
  return all;
}

/**
 * PRIMO requires phone_no and email to be unique. Duplicates are found across the
 * WHOLE database (not just the current export's rows), otherwise a pair split
 * across two export runs (different date ranges / limits) would slip through both.
 *
 * The DB is opened read-only, so this is computed once per server process.
 * Swapping in a new members.db needs a restart anyway (getDb() caches its
 * connection too), which also refreshes this.
 */
function getDuplicateIndex(activeOnly: boolean): DuplicateIndex {
  const cached = cache.get(activeOnly);
  if (cached) return cached;

  const rows = getDb()
    .prepare(
      `SELECT member_code, phone_no, email FROM members
       ${activeOnly ? "WHERE active_status COLLATE NOCASE = 'active'" : ""}
       ORDER BY register_date, member_code`
    )
    .all() as { member_code: string | null; phone_no: string | null; email: string | null }[];

  const index: DuplicateIndex = {
    phone: groupDuplicates(rows.map((r) => ({ key: normalizePhone(r.phone_no), member_code: r.member_code }))),
    email: groupDuplicates(rows.map((r) => ({ key: normalizeEmail(r.email), member_code: r.member_code }))),
  };
  cache.set(activeOnly, index);
  return index;
}

function partners(map: Map<string, string[]>, key: string, memberCode: string | null | undefined): string[] {
  if (!key) return [];
  const codes = map.get(key);
  if (!codes) return [];
  return codes.filter((c) => c !== (memberCode ?? ""));
}

/** The other members' codes sharing this member's phone_no, or [] if it's unique (or blank). */
export function findPhonePartners(phone: string | null | undefined, memberCode: string | null | undefined, activeOnly = true): string[] {
  return partners(getDuplicateIndex(activeOnly).phone, normalizePhone(phone), memberCode);
}

/** The other members' codes sharing this member's email (case-insensitive), or [] if it's unique (or blank). */
export function findEmailPartners(email: string | null | undefined, memberCode: string | null | undefined, activeOnly = true): string[] {
  return partners(getDuplicateIndex(activeOnly).email, normalizeEmail(email), memberCode);
}
