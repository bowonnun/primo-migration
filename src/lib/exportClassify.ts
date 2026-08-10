import { toPrimoRecord, type MemberJoinRow, type PrimoRecord } from "./primoMapper";

export interface NeedsReviewRow {
  cus_ref: string;
  display_name: string;
  tier_code: string;
  province_name_th: string;
  district_name_th: string;
  sub_district_name_th: string;
  zipcode: string;
  reason: string;
}

export interface ExportClassification {
  total: number;
  validRecords: PrimoRecord[];
  needsReview: NeedsReviewRow[];
}

/**
 * Splits joined member rows into records ready for PRIMO's template vs
 * records that need a human to look at them first — a value that doesn't
 * resolve against the tier or address master data, as opposed to a field
 * that was simply left blank (which correctly falls back silently, see
 * addressLookup.ts).
 */
export function classifyForExport(rows: MemberJoinRow[]): ExportClassification {
  const validRecords: PrimoRecord[] = [];
  const needsReview: NeedsReviewRow[] = [];

  for (const row of rows) {
    const record = toPrimoRecord(row);

    if (!record._addressNeedsReview && record._tierMapped) {
      validRecords.push(record);
      continue;
    }

    const reasons: string[] = [];
    if (!record._tierMapped) reasons.push(`tier_code "${row.tier_code ?? ""}" not found in tier master data`);
    if (record._addressNeedsReview)
      reasons.push("province/district/sub_district has a value that doesn't match the address master data");

    needsReview.push({
      cus_ref: row.member_code ?? "",
      display_name: record.display_name,
      tier_code: row.tier_code ?? "",
      province_name_th: row.province_name_th ?? "",
      district_name_th: row.district_name_th ?? "",
      sub_district_name_th: row.sub_district_name_th ?? "",
      zipcode: row.address_zipcode ? String(row.address_zipcode) : "",
      reason: reasons.join("; "),
    });
  }

  return { total: rows.length, validRecords, needsReview };
}
