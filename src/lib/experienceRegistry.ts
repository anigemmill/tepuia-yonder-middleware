/**
 * Known Te Puia experience products, keyed by a stable slug for Yonder to
 * reference. productId/attributeId come from live traffic capture or the
 * nopCommerce admin (Catalog > Products > edit > Product attributes tab —
 * the attribute mapping's edit URL contains its attributeId).
 *
 * Only one entry is confirmed against live traffic so far (2026-09-22).
 * Add more as they're discovered — do not guess IDs.
 */
export interface ExperienceConfig {
  slug: string;
  label: string;
  productId: number;
  attributeId: number;
}

export const EXPERIENCE_REGISTRY: ExperienceConfig[] = [
  {
    slug: "te-ra-haka-combo-adult",
    label: "Te Rā + Haka Combo (Adult)",
    productId: 90,
    attributeId: 229,
  },
];

export function findExperience(slug: string): ExperienceConfig | undefined {
  return EXPERIENCE_REGISTRY.find((e) => e.slug === slug);
}
