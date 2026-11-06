import type { ExportMembersParams, ExportOrder } from "./queries";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses the shared query params of /api/export and /api/export/summary.
 * Dates, tier and limit are all optional; `order` picks which end of the
 * register_date timeline to take from ("asc" = earliest first, the default).
 */
export function parseExportParams(
  search: URLSearchParams
): { ok: true; params: ExportMembersParams } | { ok: false; error: string } {
  const startDate = search.get("startDate") || undefined;
  const endDate = search.get("endDate") || undefined;
  if ((startDate && !DATE_RE.test(startDate)) || (endDate && !DATE_RE.test(endDate))) {
    return { ok: false, error: "startDate and endDate must be formatted YYYY-MM-DD" };
  }

  const rawLimit = search.get("limit")?.trim() ?? "";
  let limit: number | undefined;
  if (rawLimit !== "") {
    const n = Number(rawLimit);
    if (!/^\d+$/.test(rawLimit) || !Number.isSafeInteger(n) || n <= 0) {
      return { ok: false, error: "limit must be a positive integer" };
    }
    limit = n;
  }

  const rawOrder = search.get("order") || "asc";
  if (rawOrder !== "asc" && rawOrder !== "desc") {
    return { ok: false, error: "order must be 'asc' or 'desc'" };
  }

  return {
    ok: true,
    params: {
      startDate,
      endDate,
      tierCode: search.get("tier") || undefined,
      activeOnly: search.get("includeInactive") !== "true",
      limit,
      order: rawOrder as ExportOrder,
    },
  };
}
