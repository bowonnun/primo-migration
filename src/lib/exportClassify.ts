import { findLineUidPartners } from "./duplicateLineUid";
import { toPrimoRecord, type MemberJoinRow, type PrimoRecord } from "./primoMapper";

/** Machine-readable reason, for filtering / splitting work in Excel. */
export type ReviewReasonCode = "DUPLICATE_LINE_UID" | "TIER_NOT_FOUND" | "ADDRESS_MISMATCH";

/**
 * One row of needs_review.csv — meant to be handed to the team that cleans the
 * source data, so it carries enough of the member's details to decide what to
 * fix (e.g. whether two accounts sharing a LINE UID are the same person).
 */
export interface NeedsReviewRow {
  /** One or more ReviewReasonCode values joined with "|". */
  reason_code: string;
  reason: string;
  cus_ref: string;
  /** Other member_code(s) involved in the same problem (e.g. sharing the LINE UID), joined with "|". */
  related_cus_ref: string;
  first_name: string;
  last_name: string;
  display_name: string;
  birth_date: string;
  phone_no: string;
  email: string;
  line_uid: string;
  source_name: string;
  register_date: string;
  created_at: string;
  tier_code: string;
  province_name_th: string;
  district_name_th: string;
  sub_district_name_th: string;
  zipcode: string;
}

export const NEEDS_REVIEW_HEADERS: (keyof NeedsReviewRow & string)[] = [
  "reason_code",
  "reason",
  "cus_ref",
  "related_cus_ref",
  "first_name",
  "last_name",
  "display_name",
  "birth_date",
  "phone_no",
  "email",
  "line_uid",
  "source_name",
  "register_date",
  "created_at",
  "tier_code",
  "province_name_th",
  "district_name_th",
  "sub_district_name_th",
  "zipcode",
];

export interface ExportClassification {
  total: number;
  validRecords: PrimoRecord[];
  needsReview: NeedsReviewRow[];
}

/**
 * Splits joined member rows into records ready for PRIMO's template vs
 * records that need a human to look at them first:
 * - DUPLICATE_LINE_UID: another member anywhere in the DB has the same LINE UID
 *   (checked against the whole DB, so pairs split across export runs are still caught)
 * - TIER_NOT_FOUND: tier_code doesn't resolve against the tier master data
 * - ADDRESS_MISMATCH: an address value was supplied but doesn't match PRIMO's
 *   master data (a blank field correctly falls back silently, see addressLookup.ts)
 */
export function classifyForExport(rows: MemberJoinRow[]): ExportClassification {
  const validRecords: PrimoRecord[] = [];
  const needsReview: (NeedsReviewRow & { _groupKey: string })[] = [];

  for (const row of rows) {
    const record = toPrimoRecord(row);
    const lineUidPartners = findLineUidPartners(row.line_uid, row.member_code);

    const codes: ReviewReasonCode[] = [];
    const reasons: string[] = [];
    if (lineUidPartners.length) {
      codes.push("DUPLICATE_LINE_UID");
      reasons.push(`LINE UID ซ้ำกับ ${lineUidPartners.join(", ")}`);
    }
    if (!record._tierMapped) {
      codes.push("TIER_NOT_FOUND");
      reasons.push(`tier_code "${row.tier_code ?? ""}" ไม่มีใน tier master data`);
    }
    if (record._addressNeedsReview) {
      codes.push("ADDRESS_MISMATCH");
      reasons.push("จังหวัด/อำเภอ/ตำบล มีค่าแต่ไม่ตรงกับ address master data ของ PRIMO");
    }

    if (!codes.length) {
      validRecords.push(record);
      continue;
    }

    needsReview.push({
      reason_code: codes.join("|"),
      reason: reasons.join("; "),
      cus_ref: row.member_code ?? "",
      related_cus_ref: lineUidPartners.join("|"),
      first_name: row.first_name ?? "",
      last_name: row.last_name ?? "",
      display_name: record.display_name,
      birth_date: row.date_of_birth ?? "",
      phone_no: record.phone_no,
      email: row.email ?? "",
      line_uid: row.line_uid ?? "",
      source_name: row.source_name ?? "",
      register_date: row.register_date ?? "",
      created_at: row.created_at ?? "",
      tier_code: row.tier_code ?? "",
      province_name_th: row.province_name_th ?? "",
      district_name_th: row.district_name_th ?? "",
      sub_district_name_th: row.sub_district_name_th ?? "",
      zipcode: row.address_zipcode ? String(row.address_zipcode) : "",
      // Members of the same problem group (e.g. a LINE UID pair) sort next to each other.
      _groupKey: lineUidPartners.length ? `0|${row.line_uid}` : `1|${row.member_code ?? ""}`,
    });
  }

  needsReview.sort(
    (a, b) =>
      a._groupKey.localeCompare(b._groupKey) || a.register_date.localeCompare(b.register_date) || a.cus_ref.localeCompare(b.cus_ref)
  );

  return {
    total: rows.length,
    validRecords,
    needsReview: needsReview.map(({ _groupKey, ...rest }) => {
      void _groupKey;
      return rest;
    }),
  };
}
