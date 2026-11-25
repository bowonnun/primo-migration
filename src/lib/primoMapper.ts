import { lookupAddress } from "./addressLookup";
import { lookupTier } from "./tierMapping";
import { cleanName, formatPhoneNo, formatPrimoDateTime, isThaiText, lookupGender, todayIct } from "./transform";

/** Shape of one row from the members/member_tier/member_address JOIN query (see src/lib/queries.ts). */
export interface MemberJoinRow {
  source_id: string;
  member_code: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_no: string | null;
  gender: string | null;
  date_of_birth: string | null;
  register_date: string | null;
  active_status: string | null;
  created_at: string | null;
  tier_code: string | null;
  tier_type: string | null;
  tier_start_date: string | null;
  line_uid: string | null;
  line_display_name: string | null;
  line_image_url: string | null;
  source_name: string | null;
  address_no: string | null;
  alley: string | null;
  street: string | null;
  moo: string | null;
  village: string | null;
  address_detail: string | null;
  address_zipcode: number | null;
  province_name_th: string | null;
  district_name_th: string | null;
  sub_district_name_th: string | null;
  /** From member_point; null when the member has no point row yet. */
  point_balance: number | null;
  expiring_point: number | null;
  point_expiration_date: string | null;
}

/** One record in PRIMO's 42-field template, in template order. */
export interface PrimoRecord {
  province_id: number;
  district_id: number;
  sub_district_id: number;
  zipcode: string;
  tier_id: number | null;
  tier_group_id: number | null;
  line_mid: string;
  firstname_th: string;
  lastname_th: string;
  firstname_en: string;
  lastname_en: string;
  address_no: string;
  room_no: string;
  building_village: string;
  moo: string;
  road: string;
  soi: string;
  address_freetext: string;
  fax: string;
  taxpayer_id: string;
  phone_no: string;
  marital_status_id: number;
  marital_status: string;
  birth_date: string;
  gender_id: number;
  gender_description: string;
  occupation_id: number;
  occupation_description: string;
  income_id: string;
  citizen_id: string;
  passport_no: string;
  email: string;
  display_name: string;
  group_id: number;
  cus_ref: string;
  username: string;
  tier_entry_date: string;
  created_date: string;
  updated_date: string;
  consent_term_version: number;
  consent_commu_version: string;
  updated_status: number;
  point_id: number;
  current_point: number;
  /** Not part of the PRIMO template — kept for the preview UI to flag records needing attention. */
  _sourceId: string;
  _tierCode: string | null;
  _tierMapped: boolean;
  _lineImageUrl: string | null;
  _addressMatched: boolean;
  _addressNeedsReview: boolean;
}

export interface PrimoRecordOptions {
  /**
   * 'YYYY-MM-DD' written to tier_entry_date on every row. PRIMO asked for one
   * date for the whole file (the real date is to be agreed, likely migration day).
   * Defaults to today in ICT.
   */
  tierEntryDate?: string;
}

/**
 * Field rules from PRIMO's Rehearsal 1 feedback (18/11/2026):
 * - line_mid, address_freetext, display_name, cus_ref, created_date, updated_date
 *   are always blank (PRIMO fills/links them itself; sending them can conflict)
 * - occupation_description is "-" (occupation_id stays 6)
 * - birth_date is 'YYYY-MM-DD 07:00:00'; tier_entry_date is 'YYYY-MM-DD 00:00:00'
 * - point_id is 1 and current_point is member_point.point_balance as-is (negative
 *   included); a member with no member_point row gets 0 (agreed with KMKM)
 */
export function toPrimoRecord(row: MemberJoinRow, options: PrimoRecordOptions = {}): PrimoRecord {
  const tierEntryDate = options.tierEntryDate ?? todayIct();
  const address = lookupAddress({
    provinceNameTh: row.province_name_th,
    districtNameTh: row.district_name_th,
    subDistrictNameTh: row.sub_district_name_th,
    zipcode: row.address_zipcode,
  });

  const tier = lookupTier(row.tier_code);
  const gender = lookupGender(row.gender);
  const firstName = cleanName(row.first_name);
  const lastName = cleanName(row.last_name);
  const firstIsThai = isThaiText(firstName);
  const lastIsThai = isThaiText(lastName);

  return {
    province_id: address.provinceId,
    district_id: address.districtId,
    sub_district_id: address.subDistrictId,
    zipcode: row.address_zipcode ? String(row.address_zipcode) : address.zipcode,

    tier_id: tier?.tierId ?? null,
    tier_group_id: tier?.tierGroupId ?? null,

    line_mid: "",

    firstname_th: firstIsThai ? firstName : "",
    lastname_th: lastIsThai ? lastName : "",
    firstname_en: !firstIsThai ? firstName : "",
    lastname_en: !lastIsThai ? lastName : "",

    address_no: row.address_no ?? "",
    room_no: "",
    building_village: row.village ?? "",
    moo: row.moo ?? "",
    road: row.street ?? "",
    soi: row.alley ?? "",
    address_freetext: "",
    fax: "",
    taxpayer_id: "",

    phone_no: formatPhoneNo(row.phone_no),

    marital_status_id: 3,
    marital_status: "ไม่ระบุ",

    birth_date: formatPrimoDateTime(row.date_of_birth, "07:00:00"),

    gender_id: gender.genderId,
    gender_description: gender.genderDescription,

    occupation_id: 6,
    occupation_description: "-",

    income_id: "",
    citizen_id: "",
    passport_no: "",

    email: row.email ?? "",
    display_name: "",

    group_id: 1,
    cus_ref: "",
    username: row.email ?? "",

    tier_entry_date: formatPrimoDateTime(tierEntryDate, "00:00:00"),
    created_date: "",
    updated_date: "",

    consent_term_version: 1,
    consent_commu_version: "",
    updated_status: 1,

    point_id: 1,
    current_point: row.point_balance ?? 0,

    _sourceId: row.source_id,
    _tierCode: row.tier_code,
    _tierMapped: tier !== null,
    _lineImageUrl: row.line_image_url,
    _addressMatched: address.matched,
    _addressNeedsReview: address.needsReview,
  };
}
