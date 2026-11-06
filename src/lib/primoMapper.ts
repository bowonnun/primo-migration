import { lookupAddress } from "./addressLookup";
import { lookupTier } from "./tierMapping";
import { buildDisplayName, formatPhoneNo, formatPrimoDate, isThaiText, lookupGender } from "./transform";

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
  /** Not part of the PRIMO template — kept for the preview UI to flag records needing attention. */
  _sourceId: string;
  _tierCode: string | null;
  _tierMapped: boolean;
  _lineImageUrl: string | null;
  _addressMatched: boolean;
  _addressNeedsReview: boolean;
}

export function toPrimoRecord(row: MemberJoinRow): PrimoRecord {
  const address = lookupAddress({
    provinceNameTh: row.province_name_th,
    districtNameTh: row.district_name_th,
    subDistrictNameTh: row.sub_district_name_th,
    zipcode: row.address_zipcode,
  });

  const tier = lookupTier(row.tier_code);
  const gender = lookupGender(row.gender);
  const firstIsThai = isThaiText(row.first_name);
  const lastIsThai = isThaiText(row.last_name);

  return {
    province_id: address.provinceId,
    district_id: address.districtId,
    sub_district_id: address.subDistrictId,
    zipcode: row.address_zipcode ? String(row.address_zipcode) : address.zipcode,

    tier_id: tier?.tierId ?? null,
    tier_group_id: tier?.tierGroupId ?? null,

    line_mid: row.line_uid ?? "",

    firstname_th: firstIsThai ? row.first_name ?? "" : "",
    lastname_th: lastIsThai ? row.last_name ?? "" : "",
    firstname_en: !firstIsThai ? row.first_name ?? "" : "",
    lastname_en: !lastIsThai ? row.last_name ?? "" : "",

    address_no: row.address_no ?? "",
    room_no: "",
    building_village: row.village ?? "",
    moo: row.moo ?? "",
    road: row.street ?? "",
    soi: row.alley ?? "",
    address_freetext: row.address_detail ?? "",
    fax: "",
    taxpayer_id: "",

    phone_no: formatPhoneNo(row.phone_no),

    marital_status_id: 3,
    marital_status: "ไม่ระบุ",

    birth_date: formatPrimoDate(row.date_of_birth),

    gender_id: gender.genderId,
    gender_description: gender.genderDescription,

    occupation_id: 6,
    occupation_description: "ไม่ระบุ",

    income_id: "",
    citizen_id: "",
    passport_no: "",

    email: row.email ?? "",
    display_name: buildDisplayName(row.line_display_name, row.first_name, row.last_name),

    group_id: 1,
    cus_ref: row.member_code ?? "",
    username: row.email ?? "",

    tier_entry_date: formatPrimoDate(row.tier_start_date),
    created_date: formatPrimoDate(row.register_date),
    updated_date: formatPrimoDate(row.register_date),

    consent_term_version: 1,
    consent_commu_version: "",
    updated_status: 1,

    _sourceId: row.source_id,
    _tierCode: row.tier_code,
    _tierMapped: tier !== null,
    _lineImageUrl: row.line_image_url,
    _addressMatched: address.matched,
    _addressNeedsReview: address.needsReview,
  };
}
