import { NextRequest, NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { classifyForExport, NEEDS_REVIEW_HEADERS } from "@/lib/exportClassify";
import { listMembersForExport } from "@/lib/queries";

/**
 * Every member in the whole DB that needs fixing before it can go to PRIMO,
 * as one CSV — for the review meeting / the team cleaning the source data.
 * Deliberately ignores the date / tier / limit filters of /api/export.
 */
export async function GET(request: NextRequest) {
  const activeOnly = request.nextUrl.searchParams.get("includeInactive") !== "true";

  try {
    const rows = listMembersForExport({ activeOnly });
    const { total, needsReview } = classifyForExport(rows);
    const csv = new TextEncoder().encode(toCsv(NEEDS_REVIEW_HEADERS, needsReview));
    const today = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        // Lets the browser show real download progress (bytes received / total).
        "Content-Length": String(csv.length),
        "Content-Disposition": `attachment; filename="needs_review_all_${today}.csv"`,
        "X-Export-Total": String(total),
        "X-Export-Needs-Review": String(needsReview.length),
      },
    });
  } catch (error) {
    console.error("GET /api/export/needs-review failed", error);
    return NextResponse.json({ error: "Failed to generate needs-review export" }, { status: 500 });
  }
}
