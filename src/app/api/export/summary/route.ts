import { NextRequest, NextResponse } from "next/server";
import { classifyForExport } from "@/lib/exportClassify";
import { listMembersForExport } from "@/lib/queries";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
    const { total, validRecords, needsReview } = classifyForExport(rows);

    return NextResponse.json({
      total,
      valid: validRecords.length,
      needsReview: needsReview.length,
    });
  } catch (error) {
    console.error("GET /api/export/summary failed", error);
    return NextResponse.json({ error: "Failed to compute export summary" }, { status: 500 });
  }
}
