const BASE_URL = "https://ecommerce.tepuia.com";

/**
 * Top-level storefront categories, taken from the homepage nav
 * (confirmed via live fetch, 2026-09-27). If Te Puia adds a new category
 * this list needs a manual update — there was no reachable sitemap.xml
 * (it redirected to the homepage) to enumerate these automatically.
 */
const KNOWN_CATEGORY_PATHS = [
  "/experience-te-puia",
  "/pataka-kai-restaurant",
  "/%C4%81hua-gallery",
];

/**
 * Te Puia/Intouch products use two different booking mechanisms depending
 * on how the product's date/event attribute is configured:
 * - "event-series": a date-picker attribute (input.eventSeriesDate),
 *   calling POST /intouchProductEventSeries/list with a startDateString —
 *   this is what tepuiaClient.ts implements today. VERIFIED working
 *   end to end (Te Rā + Haka Combo).
 * - "event-list": a dropdown attribute (select.eventDropdown) listing
 *   specific upcoming events, calling POST /intouchProductEvents/list
 *   (no "Series") — a fundamentally different request shape with no
 *   direct date parameter. NOT YET IMPLEMENTED — discovered 2026-10-02
 *   when Te Rā Guided Experience returned empty availability using the
 *   event-series client despite the underlying activity clearly running
 *   (visible as a session inside the Haka combo's response). Calling the
 *   wrong endpoint for this type doesn't error, it just silently returns
 *   nothing, which is why this needs to be flagged rather than guessed at.
 * - "unknown": couldn't find either marker near this variant's attribute
 *   block — needs investigation before relying on it.
 */
export type BookingType = "event-series" | "event-list" | "unknown";

export interface DiscoveredVariant {
  productId: number;
  attributeId: number;
  title: string;
  bookingType: BookingType;
}

export interface DiscoveredExperiencePage {
  pageUrl: string;
  variants: DiscoveredVariant[];
}

async function fetchText(path: string): Promise<string> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`GET ${path} responded ${res.status}`);
  }
  return res.text();
}

/**
 * VERIFIED against real category page HTML (view-source of
 * /experience-te-puia, provided directly by the user on 2026-09-30 — all
 * 7 listed experiences matched correctly): each product is
 * `<div class="product-item" data-productid="{id}">` containing
 * `<h2 class="product-title"><a href="{link}">{title}</a></h2>`. The class
 * is on the wrapping `<h2>`, not the `<a>` itself — the original guess had
 * this backwards.
 */
export function extractExperienceLinks(categoryHtml: string): string[] {
  const links = new Set<string>();
  const re = /<h2 class="product-title">\s*<a href="([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(categoryHtml))) {
    links.add(match[1]);
  }
  return [...links];
}

/**
 * VERIFIED against real fetches of both /haka (event-series) and
 * /te-ra-guided-experience (event-list) on 2026-10-02: every AJAX call
 * block in both product types follows the same literal pattern —
 * `url: "/intouchProductEvent[Series]/list", ... productId: N, attributeId: M`
 * — with the URL always appearing before the productId/attributeId pair
 * in source order. Which of the two URLs appears tells us the booking
 * type directly, so this single regex replaces the old
 * productId/attributeId-only extraction and adds type detection for free.
 */
function extractProductAttributeInfo(
  html: string,
): Map<number, { attributeId: number; bookingType: BookingType }> {
  const info = new Map<number, { attributeId: number; bookingType: BookingType }>();
  const re =
    /url:\s*["'](\/intouchProductEvent(?:s|Series)?\/list)["'][\s\S]{0,400}?productId:\s*(\d+),\s*attributeId:\s*(\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const productId = Number(match[2]);
    if (info.has(productId)) continue;
    const bookingType: BookingType =
      match[1] === "/intouchProductEventSeries/list" ? "event-series" : "event-list";
    info.set(productId, { attributeId: Number(match[3]), bookingType });
  }
  return info;
}

/**
 * VERIFIED against a real fetch of /haka on 2026-09-27 (all 5 variants on
 * the page matched correctly): each ticket-type variant is wrapped in
 * `<div class="product-variant-line" data-productid="{id}">`, containing a
 * `<div class="variant-name">{title}</div>` within the next ~900 chars
 * (the window has to be wide enough to skip past a picture's alt/title
 * attributes, which repeat the full title text and can be long).
 */
export function extractVariants(html: string): DiscoveredVariant[] {
  const infoByProductId = extractProductAttributeInfo(html);
  const variants: DiscoveredVariant[] = [];

  const blockRe = /data-productid="(\d+)">[\s\S]{0,900}?class="variant-name">\s*([^<]+?)\s*<\/div>/g;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(html))) {
    const productId = Number(match[1]);
    const info = infoByProductId.get(productId);
    if (info === undefined) continue;

    variants.push({
      productId,
      attributeId: info.attributeId,
      title: match[2].trim().replace(/\s+/g, " "),
      bookingType: info.bookingType,
    });
  }

  return variants;
}

export interface CrawlResult {
  categoriesCrawled: string[];
  experiencePagesFound: string[];
  experiences: DiscoveredExperiencePage[];
  errors: string[];
}

/**
 * Already confirmed working (see docs/investigation.md) — seeded so the
 * crawl still returns solid data even if category-page link discovery
 * (unverified) finds nothing.
 */
const KNOWN_EXPERIENCE_PAGE_FALLBACKS = ["/haka"];

export async function crawlCatalog(): Promise<CrawlResult> {
  const experiencePages = new Set<string>(KNOWN_EXPERIENCE_PAGE_FALLBACKS);
  const errors: string[] = [];

  for (const categoryPath of KNOWN_CATEGORY_PATHS) {
    try {
      const html = await fetchText(categoryPath);
      for (const link of extractExperienceLinks(html)) {
        experiencePages.add(link);
      }
    } catch (err) {
      errors.push(
        `Category ${categoryPath}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const experiences: DiscoveredExperiencePage[] = [];
  for (const pageUrl of experiencePages) {
    try {
      const html = await fetchText(pageUrl);
      const variants = extractVariants(html);
      if (variants.length > 0) {
        experiences.push({ pageUrl, variants });
      }
    } catch (err) {
      errors.push(
        `Page ${pageUrl}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return {
    categoriesCrawled: KNOWN_CATEGORY_PATHS,
    experiencePagesFound: [...experiencePages],
    experiences,
    errors,
  };
}
