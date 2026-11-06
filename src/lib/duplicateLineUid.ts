import { getDb } from "./db";

/** line_uid → member_codes sharing it (2+), oldest registration first. */
let cache: Map<string, string[]> | null = null;

/**
 * Finds LINE UIDs shared by more than one member across the WHOLE database,
 * not just the rows of the current export — otherwise a pair split across two
 * export runs (different date ranges / limits) would slip through both.
 *
 * The DB is opened read-only, so this is computed once per server process
 * (~1s over 400k+ members). Swapping in a new members.db needs a restart anyway
 * (getDb() caches its connection too), which also refreshes this.
 */
function getDuplicateLineUids(): Map<string, string[]> {
  if (cache) return cache;

  const rows = getDb()
    .prepare(
      `SELECT line_uid, member_code FROM members
       WHERE line_uid IN (
         SELECT line_uid FROM members
         WHERE line_uid IS NOT NULL AND line_uid <> ''
         GROUP BY line_uid HAVING COUNT(*) > 1
       )
       ORDER BY line_uid, created_at, member_code`
    )
    .all() as { line_uid: string; member_code: string | null }[];

  const map = new Map<string, string[]>();
  for (const { line_uid, member_code } of rows) {
    const codes = map.get(line_uid) ?? [];
    codes.push(member_code ?? "");
    map.set(line_uid, codes);
  }
  cache = map;
  return map;
}

/** The other members' codes sharing this member's LINE UID, or [] if it's unique (or blank). */
export function findLineUidPartners(lineUid: string | null | undefined, memberCode: string | null | undefined): string[] {
  if (!lineUid) return [];
  const codes = getDuplicateLineUids().get(lineUid);
  if (!codes) return [];
  return codes.filter((c) => c !== (memberCode ?? ""));
}
