import { Router } from "express";
import { crawlCatalog } from "../lib/catalogCrawler.js";

export const internalRouter = Router();

/**
 * One-off/manual discovery endpoint: crawls the storefront's category
 * pages to find every experience and its ticket-type variants
 * (productId/attributeId pairs), for populating experienceRegistry.ts.
 * Not called by the availability/price routes — this is a tool for us,
 * not for Yonder.
 */
internalRouter.get("/catalog-crawl", async (_req, res) => {
  try {
    const result = await crawlCatalog();
    res.json(result);
  } catch (err) {
    res.status(502).json({
      error: "Catalog crawl failed",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});
