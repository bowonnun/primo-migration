import addressLookupData from "../../data/address_lookup.json";

export const ADDRESS_FALLBACK = {
  provinceId: 78,
  districtId: 929,
  subDistrictId: 7439,
  zipcode: "00000",
} as const;

export interface AddressIds {
  provinceId: number;
  districtId: number;
  subDistrictId: number;
  zipcode: string;
  /** true if province/district/sub_district all matched the PRIMO master data (not the "ไม่ระบุ" fallback). */
  matched: boolean;
  /**
   * true only when the lookup chain broke at a level where the CRM *did*
   * supply a value that just doesn't exist in PRIMO's master data (wrong
   * province/district pairing, renamed sub_district, typo, etc). false when
   * it broke because that level was simply left blank — that's expected
   * (most members never filled in sub_district) and correctly resolves to
   * the "ไม่ระบุ" fallback without needing anyone to look at it.
   */
  needsReview: boolean;
}

interface SubDistrictEntry {
  id: number;
  zipcode: string;
}

interface DistrictEntry {
  id: number;
  subdistricts: Record<string, SubDistrictEntry>;
}

interface ProvinceEntry {
  id: number;
  districts: Record<string, DistrictEntry>;
}

const LOOKUP = addressLookupData as unknown as Record<string, ProvinceEntry>;

function clean(text: string | null | undefined): string {
  return (text ?? "").trim();
}

// Administrative prefixes the CRM sometimes includes that PRIMO's master data
// never does — e.g. CRM stores Bangkok districts as "เขต บึงกุ่ม" while the
// master data just has "บึงกุ่ม" (confirmed via query: ~65% of Bangkok
// district values carry the "เขต " prefix; no อำเภอ/ตำบล/แขวง prefixes were
// found in this dataset, but they're stripped too defensively since master
// data never carries them either).
const DISTRICT_PREFIXES = [/^เขต\s*/, /^อำเภอ\s*/, /^อ\.\s*/];
const SUB_DISTRICT_PREFIXES = [/^แขวง\s*/, /^ตำบล\s*/, /^ต\.\s*/];

function cleanDistrict(text: string | null | undefined): string {
  let value = clean(text);
  for (const prefix of DISTRICT_PREFIXES) value = value.replace(prefix, "");
  return value.trim();
}

function cleanSubDistrict(text: string | null | undefined): string {
  let value = clean(text);
  for (const prefix of SUB_DISTRICT_PREFIXES) value = value.replace(prefix, "");
  return value.trim();
}

function fallback(needsReview: boolean): AddressIds {
  return {
    provinceId: ADDRESS_FALLBACK.provinceId,
    districtId: ADDRESS_FALLBACK.districtId,
    subDistrictId: ADDRESS_FALLBACK.subDistrictId,
    zipcode: ADDRESS_FALLBACK.zipcode,
    matched: false,
    needsReview,
  };
}

/**
 * Resolves province/district/sub_district Thai names from the CRM to PRIMO's
 * location IDs using /data/address_lookup.json (built from PRIMO's
 * "Location id Master Data" sheet). It's a hierarchical (cascading) lookup —
 * district is looked up within the matched province, sub_district within the
 * matched district — so a break at any level falls the whole address back to
 * the "ไม่ระบุ" (not specified) IDs, since an ID from a lower level is
 * meaningless without the right parent.
 *
 * Whether that break should be *reviewed* depends on why it broke: a blank
 * field is just missing data (silent fallback, correct per PRIMO's own
 * business rule); a non-blank field with no match is a real data problem
 * worth surfacing (wrong province/district pairing, renamed sub_district,
 * typo, "เทศบาล..." used instead of the sub_district name, etc).
 */
export function lookupAddress(input: {
  provinceNameTh: string | null;
  districtNameTh: string | null;
  subDistrictNameTh: string | null;
  zipcode: number | string | null;
}): AddressIds {
  const provinceName = clean(input.provinceNameTh);
  if (!provinceName) return fallback(false);

  const province = LOOKUP[provinceName];
  if (!province) return fallback(true); // had a value, just not a known province

  const districtName = cleanDistrict(input.districtNameTh);
  if (!districtName) return fallback(false);

  const district = province.districts[districtName];
  if (!district) return fallback(true); // had a value, doesn't exist under this province

  const subDistrictName = cleanSubDistrict(input.subDistrictNameTh);
  if (!subDistrictName) return fallback(false);

  const subDistrict = district.subdistricts[subDistrictName];
  if (!subDistrict) return fallback(true); // had a value, doesn't exist under this district

  return {
    provinceId: province.id,
    districtId: district.id,
    subDistrictId: subDistrict.id,
    zipcode: input.zipcode ? String(input.zipcode).padStart(5, "0") : subDistrict.zipcode,
    matched: true,
    needsReview: false,
  };
}
