import { Router } from "express";
import { fetchEventSeries, fetchProductDetails } from "../lib/tepuiaClient.js";
import { parseEventSeries } from "../lib/parseAvailability.js";
import { EXPERIENCE_REGISTRY, findExperience } from "../lib/experienceRegistry.js";
import { TtlCache } from "../lib/cache.js";
import type { RawEventSeries, RawProductDetails } from "../lib/tepuiaClient.js";

export const availabilityRouter = Router();

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Short TTL: keeps repeated lookups cheap without serving stale capacity for long.
const eventSeriesCache = new TtlCache<RawEventSeries[]>(30_000);
const productDetailsCache = new TtlCache<RawProductDetails>(30_000);

function parseDateParam(date: unknown): string | null {
  return typeof date === "string" && ISO_DATE_RE.test(date) ? date : null;
}

availabilityRouter.get("/experiences", (_req, res) => {
  res.json(EXPERIENCE_REGISTRY.map(({ slug, label }) => ({ slug, label })));
});

availabilityRouter.get("/experiences/:slug/availability", async (req, res) => {
  const experience = findExperience(req.params.slug);
  if (!experience) {
    res.status(404).json({ error: `Unknown experience slug: ${req.params.slug}` });
    return;
  }

  const date = parseDateParam(req.query.date);
  if (!date) {
    res.status(400).json({ error: "Query param 'date' is required as YYYY-MM-DD" });
    return;
  }

  try {
    const raw = await eventSeriesCache.getOrFetch(
      `${experience.productId}:${date}`,
      () =>
        fetchEventSeries({
          productId: experience.productId,
          attributeId: experience.attributeId,
          isoDate: date,
        }),
    );
    res.json({
      slug: experience.slug,
      label: experience.label,
      date,
      slots: parseEventSeries(raw),
    });
  } catch (err) {
    res.status(502).json({
      error: "Failed to fetch availability from Te Puia storefront",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

availabilityRouter.get("/experiences/:slug/price", async (req, res) => {
  const experience = findExperience(req.params.slug);
  if (!experience) {
    res.status(404).json({ error: `Unknown experience slug: ${req.params.slug}` });
    return;
  }

  const date = parseDateParam(req.query.date);
  if (!date) {
    res.status(400).json({ error: "Query param 'date' is required as YYYY-MM-DD" });
    return;
  }

  try {
    const raw = await productDetailsCache.getOrFetch(
      `${experience.productId}:${date}`,
      () =>
        fetchProductDetails({
          productId: experience.productId,
          attributeId: experience.attributeId,
          isoDate: date,
        }),
    );
    res.json({
      slug: experience.slug,
      label: experience.label,
      date,
      price: raw.Price,
      priceValue: raw.PriceValue,
      stockAvailability: raw.stockAvailability || null,
      stockError: raw.stockError || null,
    });
  } catch (err) {
    res.status(502).json({
      error: "Failed to fetch pricing from Te Puia storefront",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});
