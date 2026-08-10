import tierGroupData from "../../data/tier_group_mapping.json";
import tierMappingData from "../../data/tier_mapping.json";

export interface TierGroup {
  tier_group_id: number;
  tier_group_name: string;
}

export interface TierMappingEntry {
  tier_code: string;
  tier_id: number;
  tier_name: string;
  tier_group_id: number;
}

const TIER_GROUPS = tierGroupData as TierGroup[];
const TIER_MAPPINGS = tierMappingData as TierMappingEntry[];

const BY_TIER_CODE = new Map(TIER_MAPPINGS.map((t) => [t.tier_code.toLowerCase(), t]));
const GROUP_NAME_BY_ID = new Map(TIER_GROUPS.map((g) => [g.tier_group_id, g.tier_group_name]));

export interface TierMapping {
  tierId: number;
  tierName: string;
  tierGroupId: number;
  tierGroupName: string;
}

/** Looks up tier_id/tier_name/tier_group_id/tier_group_name from a CRM tier_code (data/tier_mapping.json + data/tier_group_mapping.json). Source stores lowercase, but this lowercases defensively. */
export function lookupTier(tierCode: string | null | undefined): TierMapping | null {
  if (!tierCode) return null;
  const entry = BY_TIER_CODE.get(tierCode.trim().toLowerCase());
  if (!entry) return null;

  return {
    tierId: entry.tier_id,
    tierName: entry.tier_name,
    tierGroupId: entry.tier_group_id,
    tierGroupName: GROUP_NAME_BY_ID.get(entry.tier_group_id) ?? "",
  };
}
