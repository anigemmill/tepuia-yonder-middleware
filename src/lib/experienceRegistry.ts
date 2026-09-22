/**
 * Known Te Puia experience products, keyed by a stable slug for Yonder to
 * reference. productId/attributeId/title all come straight from
 * GET /internal/catalog-crawl (verified against the live storefront,
 * 2026-10-01) — none of these are guessed. See docs/investigation.md and
 * docs/yonder-integration.md for how the crawl works and what's still
 * missing (e.g. any experiences added to the site after this run).
 *
 * `bookingType` matters a lot: Te Puia/Intouch products use two different
 * booking mechanisms (discovered 2026-10-02, see docs/yonder-integration.md
 * "Booking type discovery"):
 * - "event-series": date-picker attribute, POST /intouchProductEventSeries/list
 *   with a startDateString. This is what tepuiaClient.ts implements.
 * - "event-list": dropdown attribute listing specific upcoming events,
 *   POST /intouchProductEvents/list (no "Series", no date parameter) —
 *   NOT YET IMPLEMENTED. Calling the event-series client against one of
 *   these doesn't error, it just silently returns no slots, which is worse
 *   than an error — so the availability/price routes refuse to guess and
 *   return an explicit "not yet supported" response instead.
 * - "unknown": not yet verified which type this is. Re-run
 *   GET /internal/catalog-crawl (which now detects this automatically) and
 *   update these entries from its output rather than guessing.
 */
export type BookingType = "event-series" | "event-list" | "unknown";

export interface ExperienceConfig {
  slug: string;
  label: string;
  productId: number;
  attributeId: number;
  bookingType: BookingType;
}

export const EXPERIENCE_REGISTRY: ExperienceConfig[] = [
  {
    slug: "te-ra-haka-combo-adult",
    label: "Te Rā + Haka Combo — Adult",
    productId: 90,
    attributeId: 229,
    bookingType: "event-series",
  },
  {
    slug: "te-ra-haka-combo-child-5-15",
    label: "Te Rā + Haka Combo — Child (5-15 yrs)",
    productId: 91,
    attributeId: 234,
    bookingType: "event-series",
  },
  {
    slug: "te-ra-haka-combo-infant",
    label: "Te Rā + Haka Combo — Infant",
    productId: 92,
    attributeId: 239,
    bookingType: "event-series",
  },
  {
    slug: "te-ra-haka-combo-family-2-2",
    label: "Te Rā + Haka Combo — Family (2+2)",
    productId: 93,
    attributeId: 244,
    bookingType: "event-series",
  },
  {
    slug: "te-ra-haka-combo-family-2-3",
    label: "Te Rā + Haka Combo — Family (2+3)",
    productId: 94,
    attributeId: 249,
    bookingType: "event-series",
  },
  {
    slug: "te-ra-guided-experience-adult",
    label: "Te Rā Guided Experience — Adult",
    productId: 17,
    attributeId: 42,
    bookingType: "event-list",
  },
  {
    slug: "te-ra-guided-experience-child-5-15",
    label: "Te Rā Guided Experience — Child (5-15 yrs)",
    productId: 18,
    attributeId: 47,
    bookingType: "event-list",
  },
  {
    slug: "te-ra-guided-experience-infant",
    label: "Te Rā Guided Experience — Infant",
    productId: 19,
    attributeId: 52,
    bookingType: "event-list",
  },
  {
    slug: "te-ra-guided-experience-family-2-2",
    label: "Te Rā Guided Experience — Family (2+2)",
    productId: 21,
    attributeId: 62,
    bookingType: "event-list",
  },
  {
    slug: "te-ra-guided-experience-family-2-3",
    label: "Te Rā Guided Experience — Family (2+3)",
    productId: 20,
    attributeId: 57,
    bookingType: "event-list",
  },
  {
    slug: "te-ra-combo-adult",
    label: "Te Rā Combo — Adult",
    productId: 947,
    attributeId: 4119,
    bookingType: "unknown",
  },
  {
    slug: "te-ra-combo-child-5-16",
    label: "Te Rā Combo — Child (5-16 yrs)",
    productId: 946,
    attributeId: 4114,
    bookingType: "unknown",
  },
  {
    slug: "te-ra-combo-infant",
    label: "Te Rā Combo — Infant (0-4 yrs)",
    productId: 948,
    attributeId: 4124,
    bookingType: "unknown",
  },
  {
    slug: "te-po-combo-adult",
    label: "Te Pō Combo (Te Rā, Dinner + Haka) — Adult",
    productId: 98,
    attributeId: 269,
    bookingType: "unknown",
  },
  {
    slug: "te-po-combo-child-5-15",
    label: "Te Pō Combo (Te Rā, Dinner + Haka) — Child (5-15 yrs)",
    productId: 99,
    attributeId: 274,
    bookingType: "unknown",
  },
  {
    slug: "te-po-combo-infant",
    label: "Te Pō Combo (Te Rā, Dinner + Haka) — Infant",
    productId: 100,
    attributeId: 279,
    bookingType: "unknown",
  },
  {
    slug: "te-po-adult",
    label: "Te Pō (Hāngī Dinner Buffet + Haka) — Adult",
    productId: 95,
    attributeId: 254,
    bookingType: "unknown",
  },
  {
    slug: "te-po-child-5-15",
    label: "Te Pō (Hāngī Dinner Buffet + Haka) — Child (5-15 yrs)",
    productId: 96,
    attributeId: 259,
    bookingType: "unknown",
  },
  {
    slug: "te-po-infant",
    label: "Te Pō (Hāngī Dinner Buffet + Haka) — Infant",
    productId: 97,
    attributeId: 264,
    bookingType: "unknown",
  },
  {
    slug: "marama-geyser-light-trail-adult",
    label: "Mārama: Geyser Light Trail — Adult",
    productId: 840,
    attributeId: 4384,
    bookingType: "unknown",
  },
  {
    slug: "marama-geyser-light-trail-child",
    label: "Mārama: Geyser Light Trail — Child",
    productId: 841,
    attributeId: 4389,
    bookingType: "unknown",
  },
  {
    slug: "marama-geyser-light-trail-infant",
    label: "Mārama: Geyser Light Trail — Infant",
    productId: 879,
    attributeId: 4397,
    bookingType: "unknown",
  },
  {
    slug: "marama-geyser-light-trail-family-2-2",
    label: "Mārama: Geyser Light Trail — Family (2+2)",
    productId: 842,
    attributeId: 4394,
    bookingType: "unknown",
  },
  {
    slug: "dinner-marama-geyser-light-trail-adult",
    label: "Dinner + Mārama: Geyser Light Trail — Adult",
    productId: 925,
    attributeId: 4415,
    bookingType: "unknown",
  },
  {
    slug: "dinner-marama-geyser-light-trail-child-5-15",
    label: "Dinner + Mārama: Geyser Light Trail — Child (5-15 yrs)",
    productId: 926,
    attributeId: 4414,
    bookingType: "unknown",
  },
  {
    slug: "dinner-marama-geyser-light-trail-infant",
    label: "Dinner + Mārama: Geyser Light Trail — Infant (0-4 yrs)",
    productId: 927,
    attributeId: 4416,
    bookingType: "unknown",
  },
  {
    slug: "sunday-brunch-buffet-adult",
    label: "Sunday Brunch Buffet — Adult",
    productId: 353,
    attributeId: 1143,
    bookingType: "unknown",
  },
  {
    slug: "sunday-brunch-buffet-child-5-15",
    label: "Sunday Brunch Buffet — Child (5-15 yrs)",
    productId: 354,
    attributeId: 1148,
    bookingType: "unknown",
  },
  {
    slug: "sunday-brunch-buffet-infant",
    label: "Sunday Brunch Buffet — Infant",
    productId: 355,
    attributeId: 1153,
    bookingType: "unknown",
  },
  {
    slug: "hangi-buffet-lunch-adult",
    label: "Hāngī Buffet Lunch — Adult",
    productId: 81,
    attributeId: 184,
    bookingType: "unknown",
  },
  {
    slug: "hangi-buffet-lunch-child-5-15",
    label: "Hāngī Buffet Lunch — Child (5-15 yrs)",
    productId: 82,
    attributeId: 189,
    bookingType: "unknown",
  },
  {
    slug: "hangi-buffet-lunch-infant",
    label: "Hāngī Buffet Lunch — Infant",
    productId: 86,
    attributeId: 209,
    bookingType: "unknown",
  },
  {
    slug: "hangi-buffet-dinner-adult",
    label: "Hāngī Buffet Dinner — Adult",
    productId: 83,
    attributeId: 194,
    bookingType: "unknown",
  },
  {
    slug: "hangi-buffet-dinner-child-5-15",
    label: "Hāngī Buffet Dinner — Child (5-15 yrs)",
    productId: 84,
    attributeId: 199,
    bookingType: "unknown",
  },
  {
    slug: "hangi-buffet-dinner-infant",
    label: "Hāngī Buffet Dinner — Infant",
    productId: 85,
    attributeId: 204,
    bookingType: "unknown",
  },
  {
    slug: "christmas-lunch-adult",
    label: "Christmas Buffet Lunch — Adult",
    productId: 589,
    attributeId: 2010,
    bookingType: "unknown",
  },
  {
    slug: "christmas-lunch-child-5-15",
    label: "Christmas Buffet Lunch — Child (5-15 yrs)",
    productId: 590,
    attributeId: 2015,
    bookingType: "unknown",
  },
  {
    slug: "christmas-lunch-infant",
    label: "Christmas Buffet Lunch — Infant",
    productId: 591,
    attributeId: 2020,
    bookingType: "unknown",
  },
];

export function findExperience(slug: string): ExperienceConfig | undefined {
  return EXPERIENCE_REGISTRY.find((e) => e.slug === slug);
}
