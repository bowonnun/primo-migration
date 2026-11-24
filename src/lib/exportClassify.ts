import { toPrimoRecord, type MemberJoinRow, type PrimoRecord, type PrimoRecordOptions } from "./primoMapper";
import { buildDisplayName } from "./transform";

/** Machine-readable reason, for filtering / splitting work in Excel. */
export type ReviewReasonCode = "TIER_NOT_FOUND" | "ADDRESS_MISMATCH";

/**
 * One row of needs_review.csv — meant to be handed to the team that cleans the
 * source data, so it carries enough of the member's details to decide what to
 * fix.
 */
export interface NeedsReviewRow {
  /** One or more ReviewReasonCode values joined with "|". */
  reason_code: string;
  reason: string;
  cus_ref: string;
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
 *
 * Duplicate LINE UIDs are no longer flagged: PRIMO asked for line_mid to be left
 * blank (it links LINE itself on first login), so they can't conflict on import.
 * - TIER_NOT_FOUND: tier_code doesn't resolve against the tier master data
 * - ADDRESS_MISMATCH: an address value was supplied but doesn't match PRIMO's
 *   master data (a blank field correctly falls back silently, see addressLookup.ts)
 */
export function classifyForExport(rows: MemberJoinRow[], options: PrimoRecordOptions = {}): ExportClassification {
  const validRecords: PrimoRecord[] = [];
  const needsReview: NeedsReviewRow[] = [];

  for (const row of rows) {
    const record = toPrimoRecord(row, options);

    const codes: ReviewReasonCode[] = [];
    const reasons: string[] = [];
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
      first_name: row.first_name ?? "",
      last_name: row.last_name ?? "",
      display_name: buildDisplayName(row.line_display_name, row.first_name, row.last_name),
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
    });
  }

  needsReview.sort(
    (a, b) =>
      a.register_date.localeCompare(b.register_date) || a.cus_ref.localeCompare(b.cus_ref)
  );

  return {
    total: rows.length,
    validRecords,
    needsReview,
  };
}
