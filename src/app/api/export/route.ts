import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { classifyForExport, NEEDS_REVIEW_HEADERS } from "@/lib/exportClassify";
import type { PrimoRecord } from "@/lib/primoMapper";
import { parseExportParams } from "@/lib/exportParams";
import { listMembersForExport } from "@/lib/queries";

const PRIMO_TEMPLATE_HEADERS: (keyof PrimoRecord & string)[] = [
  "province_id",
  "district_id",
  "sub_district_id",
  "zipcode",
  "tier_id",
  "tier_group_id",
  "line_mid",
  "firstname_th",
  "lastname_th",
  "firstname_en",
  "lastname_en",
  "address_no",
  "room_no",
  "building_village",
  "moo",
  "road",
  "soi",
  "address_freetext",
  "fax",
  "taxpayer_id",
  "phone_no",
  "marital_status_id",
  "marital_status",
  "birth_date",
  "gender_id",
  "gender_description",
  "occupation_id",
  "occupation_description",
  "income_id",
  "citizen_id",
  "passport_no",
  "email",
  "display_name",
  "group_id",
  "cus_ref",
  "username",
  "tier_entry_date",
  "created_date",
  "updated_date",
  "consent_term_version",
  "consent_commu_version",
  "updated_status",
];

export async function GET(request: NextRequest) {
  const parsed = parseExportParams(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { startDate, endDate, limit, order } = parsed.params;

  try {
    const rows = listMembersForExport(parsed.params);
    const { validRecords, needsReview } = classifyForExport(rows);

    const validCsv = toCsv(PRIMO_TEMPLATE_HEADERS, validRecords);
    const needsReviewCsv = toCsv(NEEDS_REVIEW_HEADERS, needsReview);

    const range = startDate || endDate ? `${startDate ?? "start"}_to_${endDate ?? "latest"}` : "all";
    const suffix = `${range}${limit ? `_${order === "desc" ? "latest" : "first"}${limit}` : ""}`;
    const zip = new JSZip();
    zip.file(`primo_export_${suffix}.csv`, validCsv);
    zip.file(`needs_review_${suffix}.csv`, needsReviewCsv);
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        // Lets the browser show real download progress (bytes received / total).
        "Content-Length": String(zipBuffer.length),
        "Content-Disposition": `attachment; filename="primo_export_${suffix}.zip"`,
        "X-Export-Total": String(rows.length),
        "X-Export-Valid": String(validRecords.length),
        "X-Export-Needs-Review": String(needsReview.length),
      },
    });
  } catch (error) {
    console.error("GET /api/export failed", error);
    return NextResponse.json({ error: "Failed to generate export" }, { status: 500 });
  }
}
