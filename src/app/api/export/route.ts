import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { classifyForExport } from "@/lib/exportClassify";
import type { PrimoRecord } from "@/lib/primoMapper";
import { listMembersForExport } from "@/lib/queries";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
  const params = request.nextUrl.searchParams;
  const startDate = params.get("startDate") ?? undefined;
  const endDate = params.get("endDate") ?? undefined;
  const tierCode = params.get("tier") ?? undefined;
  const activeOnly = params.get("includeInactive") !== "true";

  if (!startDate || !endDate || !DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
    return NextResponse.json({ error: "startDate and endDate are required, format YYYY-MM-DD" }, { status: 400 });
  }

  try {
    const rows = listMembersForExport({ startDate, endDate, tierCode, activeOnly });
    const { validRecords, needsReview } = classifyForExport(rows);

    const validCsv = toCsv(PRIMO_TEMPLATE_HEADERS, validRecords);
    const needsReviewCsv = toCsv(
      [
        "cus_ref",
        "display_name",
        "tier_code",
        "province_name_th",
        "district_name_th",
        "sub_district_name_th",
        "zipcode",
        "reason",
      ],
      needsReview
    );

    const zip = new JSZip();
    zip.file(`primo_export_${startDate}_to_${endDate}.csv`, validCsv);
    zip.file(`needs_review_${startDate}_to_${endDate}.csv`, needsReviewCsv);
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="primo_export_${startDate}_to_${endDate}.zip"`,
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
