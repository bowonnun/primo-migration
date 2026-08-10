import { getDb } from "./db";
import type { MemberJoinRow } from "./primoMapper";

const BASE_SELECT = `
  m.id AS source_id, m.member_code,
  m.first_name, m.last_name, m.email, m.phone_no,
  m.gender, m.date_of_birth, m.register_date, m.active_status, m.created_at,
  m.tier_code, m.tier_type, m.tier_start_date,
  m.line_uid, m.line_display_name, m.line_image_url,
  ma.address_no, ma.alley, ma.street, ma.moo, ma.village,
  ma.address_detail, ma.zipcode AS address_zipcode,
  ma.province_name_th, ma.district_name_th, ma.sub_district_name_th
`;

const BASE_FROM = `
  FROM members m
  LEFT JOIN member_tier mt
    ON mt.member_id = m.id
    AND mt.active_status COLLATE NOCASE = 'active'
    AND mt.id = (
      SELECT MAX(id) FROM member_tier
      WHERE member_id = m.id AND active_status COLLATE NOCASE = 'active'
    )
  LEFT JOIN member_address ma
    ON ma.member_id = m.id
    AND ma.active_status = 1
    AND ma.id = (
      SELECT id FROM member_address
      WHERE member_id = m.id AND active_status = 1
      LIMIT 1
    )
`;

interface CommonFilterParams {
  tierCode?: string;
  activeOnly?: boolean;
  /** Inclusive, 'YYYY-MM-DD', filters on members.register_date's date part. */
  startDate?: string;
  /** Inclusive, 'YYYY-MM-DD', filters on members.register_date's date part. */
  endDate?: string;
}

function buildConditions({ tierCode, activeOnly = true, startDate, endDate }: CommonFilterParams) {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (activeOnly) {
    conditions.push("m.active_status COLLATE NOCASE = 'active'");
  }
  if (tierCode) {
    conditions.push("m.tier_code COLLATE NOCASE = @tierCode");
    params.tierCode = tierCode;
  }
  if (startDate) {
    conditions.push("substr(m.register_date, 1, 10) >= @startDate");
    params.startDate = startDate;
  }
  if (endDate) {
    conditions.push("substr(m.register_date, 1, 10) <= @endDate");
    params.endDate = endDate;
  }

  return { conditions, params };
}

export interface ListMembersParams extends CommonFilterParams {
  page: number;
  pageSize: number;
}

export interface ListMembersResult {
  rows: MemberJoinRow[];
  total: number;
  page: number;
  pageSize: number;
}

export function listMembers({ page, pageSize, ...filters }: ListMembersParams): ListMembersResult {
  const db = getDb();
  const { conditions, params } = buildConditions(filters);
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  // The joins below are 1:1 per members row (ON-clause subqueries constrain each
  // side to at most one match), so counting straight off `members` is equivalent
  // to counting the joined result — and avoids running the join's correlated
  // subqueries 400k+ times just to produce a total.
  const countStmt = db.prepare(`SELECT COUNT(*) AS count FROM members m ${whereClause}`);
  const { count } = countStmt.get(params) as { count: number };

  const offset = (page - 1) * pageSize;
  const rowsStmt = db.prepare(`
    SELECT ${BASE_SELECT}
    ${BASE_FROM}
    ${whereClause}
    ORDER BY m.created_at DESC
    LIMIT @limit OFFSET @offset
  `);
  const rows = rowsStmt.all({ ...params, limit: pageSize, offset }) as MemberJoinRow[];

  return { rows, total: count, page, pageSize };
}

/** No pagination — pulls every matching row for a one-shot export. */
export function listMembersForExport(filters: CommonFilterParams): MemberJoinRow[] {
  const db = getDb();
  const { conditions, params } = buildConditions(filters);
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rowsStmt = db.prepare(`
    SELECT ${BASE_SELECT}
    ${BASE_FROM}
    ${whereClause}
    ORDER BY m.register_date ASC
  `);
  return rowsStmt.all(params) as MemberJoinRow[];
}
