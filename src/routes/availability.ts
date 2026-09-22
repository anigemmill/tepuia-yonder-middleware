import { Router } from "express";
import { fetchEventSeries } from "../lib/tepuiaClient.js";
import { parseEventSeries } from "../lib/parseAvailability.js";
import { EXPERIENCE_REGISTRY, findExperience } from "../lib/experienceRegistry.js";

export const availabilityRouter = Router();

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

availabilityRouter.get("/experiences", (_req, res) => {
  res.json(
    EXPERIENCE_REGISTRY.map(({ slug, label }) => ({ slug, label })),
  );
});

availabilityRouter.get("/experiences/:slug/availability", async (req, res) => {
  const { slug } = req.params;
  const { date } = req.query;

  const experience = findExperience(slug);
  if (!experience) {
    res.status(404).json({ error: `Unknown experience slug: ${slug}` });
    return;
  }

  if (typeof date !== "string" || !ISO_DATE_RE.test(date)) {
    res.status(400).json({ error: "Query param 'date' is required as YYYY-MM-DD" });
    return;
  }

  try {
    const raw = await fetchEventSeries({
      productId: experience.productId,
      attributeId: experience.attributeId,
      isoDate: date,
    });
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
