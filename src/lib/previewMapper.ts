import type { MemberJoinRow } from "./primoMapper";
import { lookupTier } from "./tierMapping";
import { buildDisplayName, formatPhoneNo, formatPrimoDate, isThaiText, lookupGender } from "./transform";

/**
 * Display-friendly shape for the member list/preview UI. Address fields are
 * passed through as raw text straight from the CRM — no province/district/
 * sub_district ID resolution here (that fuzzy-matching logic lives in
 * addressLookup.ts and is only run by the export path, since CRM naming
 * doesn't always match PRIMO's master data verbatim, e.g. "เขต บึงกุ่ม" vs
 * "บึงกุ่ม").
 */
export interface PreviewRecord {
  sourceId: string;
  cusRef: string;
  displayName: string;
  firstnameTh: string;
  lastnameTh: string;
  firstnameEn: string;
  lastnameEn: string;
  phoneNo: string;
  email: string;
  tierCode: string | null;
  tierId: number | null;
  tierGroupId: number | null;
  tierMapped: boolean;
  genderDescription: string;
  birthDate: string;
  provinceNameTh: string;
  districtNameTh: string;
  subDistrictNameTh: string;
  zipcode: string;
  createdDate: string;
  lineImageUrl: string | null;
}

export function toPreviewRecord(row: MemberJoinRow): PreviewRecord {
  const tier = lookupTier(row.tier_code);
  const gender = lookupGender(row.gender);
  const firstIsThai = isThaiText(row.first_name);
  const lastIsThai = isThaiText(row.last_name);

  return {
    sourceId: row.source_id,
    cusRef: row.member_code ?? "",
    displayName: buildDisplayName(row.line_display_name, row.first_name, row.last_name),

    firstnameTh: firstIsThai ? row.first_name ?? "" : "",
    lastnameTh: lastIsThai ? row.last_name ?? "" : "",
    firstnameEn: !firstIsThai ? row.first_name ?? "" : "",
    lastnameEn: !lastIsThai ? row.last_name ?? "" : "",

    phoneNo: formatPhoneNo(row.phone_no),
    email: row.email ?? "",

    tierCode: row.tier_code,
    tierId: tier?.tierId ?? null,
    tierGroupId: tier?.tierGroupId ?? null,
    tierMapped: tier !== null,

    genderDescription: gender.genderDescription,
    birthDate: formatPrimoDate(row.date_of_birth),

    provinceNameTh: row.province_name_th ?? "",
    districtNameTh: row.district_name_th ?? "",
    subDistrictNameTh: row.sub_district_name_th ?? "",
    zipcode: row.address_zipcode ? String(row.address_zipcode) : "",

    createdDate: formatPrimoDate(row.register_date),
    lineImageUrl: row.line_image_url,
  };
}
