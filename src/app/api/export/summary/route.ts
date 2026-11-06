import { NextRequest, NextResponse } from "next/server";
import { classifyForExport } from "@/lib/exportClassify";
import { parseExportParams } from "@/lib/exportParams";
import { listMembersForExport } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const parsed = parseExportParams(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const rows = listMembersForExport(parsed.params);
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
