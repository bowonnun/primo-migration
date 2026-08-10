import { NextRequest, NextResponse } from "next/server";
import { toPreviewRecord } from "@/lib/previewMapper";
import { listMembers } from "@/lib/queries";

const MAX_PAGE_SIZE = 500;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(searchParams.get("pageSize") ?? 50) || 50));
  const tierCode = searchParams.get("tier") ?? undefined;
  const activeOnly = searchParams.get("includeInactive") !== "true";

  try {
    const { rows, total } = listMembers({ page, pageSize, tierCode, activeOnly });
    const records = rows.map(toPreviewRecord);

    return NextResponse.json({
      data: records,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("GET /api/members failed", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}
