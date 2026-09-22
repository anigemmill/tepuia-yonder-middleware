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

export interface DiscoveredVariant {
  productId: number;
  attributeId: number;
  title: string;
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
 * UNVERIFIED: built from standard nopCommerce theme conventions
 * (product boxes as `.product-item` with an `<a class="product-title">`),
 * not confirmed against this storefront's actual category page markup —
 * that fetch was blocked before it could be captured. Needs a live test;
 * if it returns nothing, inspect a category page's HTML directly and fix
 * this regex.
 */
function extractExperienceLinks(categoryHtml: string): string[] {
  const links = new Set<string>();
  const re = /<a[^>]+href="(\/[^"?]+)"[^>]*class="[^"]*product-title[^"]*"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(categoryHtml))) {
    links.add(match[1]);
  }
  return [...links];
}

/**
 * VERIFIED against a real fetch of /haka on 2026-09-27: the page's own
 * inline JS literally contains `productId: N, attributeId: M` pairs for
 * every ticket-type variant on the page (each pair appears twice — once
 * per event-list handler — hence the Map dedup).
 */
function extractProductAttributePairs(html: string): Map<number, number> {
  const pairs = new Map<number, number>();
  const re = /productId:\s*(\d+),\s*attributeId:\s*(\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    pairs.set(Number(match[1]), Number(match[2]));
  }
  return pairs;
}

/**
 * VERIFIED against a real fetch of /haka on 2026-09-27 (all 5 variants on
 * the page matched correctly): each ticket-type variant is wrapped in
 * `<div class="product-variant-line" data-productid="{id}">`, containing a
 * `<div class="variant-name">{title}</div>` within the next ~900 chars
 * (the window has to be wide enough to skip past a picture's alt/title
 * attributes, which repeat the full title text and can be long).
 */
function extractVariants(html: string): DiscoveredVariant[] {
  const attributeIdByProductId = extractProductAttributePairs(html);
  const variants: DiscoveredVariant[] = [];

  const blockRe = /data-productid="(\d+)">[\s\S]{0,900}?class="variant-name">\s*([^<]+?)\s*<\/div>/g;
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(html))) {
    const productId = Number(match[1]);
    const attributeId = attributeIdByProductId.get(productId);
    if (attributeId === undefined) continue;

    variants.push({
      productId,
      attributeId,
      title: match[2].trim().replace(/\s+/g, " "),
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
