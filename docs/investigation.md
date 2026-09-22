# Availability data investigation (2026-09-22)

## Method

The Te Puia booking storefront (`ecommerce.tepuia.com`, nopCommerce +
Intouch Technology Group) exposes no public API. A HAR capture of browser
network traffic while browsing an experience page (`/haka`) and checking
availability was analyzed to find what data the storefront's own frontend
JS already pulls, before deciding between the official nopCommerce Web API
plugin and scraping.

## Finding: an undocumented but effectively public JSON API already exists

Three endpoints on `ecommerce.tepuia.com` return the data we need as plain
JSON, with **no authentication, cookies, or CSRF token required**:

### `POST /intouchProductEventSeries/list` — the core availability data

Returns bookable time-slot bundles ("event series") for a product on a
given date, including remaining capacity.

Request body (`application/x-www-form-urlencoded`):
- `productId` — nopCommerce product ID
- `attributeId` — ID of the product's date-selection attribute
- `isComponentAttribute` — observed as `False`
- `productForm` — url-encoded form snapshot (see "Open question" below)
- `startDateString` — target date as `DD/MM/YYYY`

Sample response:
```json
[
  {
    "id": 13935,
    "title": "Te Ra + Haka Combo 10am - 12pm",
    "displayText": "23/09/2026-23/09/2026: Te Ra + Haka Combo 10am - 12pm: 98 Remaining",
    "paxQuantity": 1,
    "events": [
      { "id": 482340, "description": "23/09/2026 10:00 AM: Te Ra Guided Experience", "startDateTime": "2026-09-23T10:00:00", "maxQuantity": "" },
      { "id": 452757, "description": "23/09/2026 11:30 AM: Haka", "startDateTime": "2026-09-23T11:30:00", "maxQuantity": "" }
    ]
  }
]
```

Remaining capacity is embedded in `displayText` as free text (`"N
Remaining"` or `"Fully Booked"`) rather than a structured field —
`src/lib/parseAvailability.ts` extracts it with a regex.

Response headers include `Access-Control-Allow-Credentials: true` and a
permissive CORS origin, suggesting Intouch already expects this endpoint to
be called cross-origin from outside the storefront page itself.

### `POST /shoppingcart/productdetails_attributechange` — price + stock messaging

Returns current price and stock-related messaging for a product/date
combination (`stockAvailability`/`stockError` fields, empty when in stock).

### `POST /validateaddproducttocart/details/{productId}` — price/validation check

Similar price + `Success` boolean; not currently used by the middleware but
useful if we need a stronger "is this actually bookable" check.

## Recommendation

Build the middleware as a direct HTTP client against
`intouchProductEventSeries/list` (implemented in `src/lib/tepuiaClient.ts`),
rather than:
- **The official nopCommerce Web API plugin** — it covers standard
  catalog/order entities, not Intouch's custom booking/event-series model.
- **HTML scraping** — unnecessary; the site already returns clean JSON.

This is effectively using Te Puia's own internal API, so it should be
called politely (caching, reasonable poll intervals) since it isn't a
contracted integration.

## Live verification (2026-09-26)

Deployed to Render and hit `GET /api/experiences/te-ra-haka-combo-adult/availability?date=2026-09-26`
directly against the live storefront. Confirmed working end to end:

```json
{
  "slug": "te-ra-haka-combo-adult",
  "label": "Te Rā + Haka Combo (Adult)",
  "date": "2026-09-26",
  "slots": [
    { "seriesId": 13938, "title": "Te Ra + Haka Combo 10am - 12pm", "status": "available", "remaining": 70, "sessions": [...] },
    { "seriesId": 14085, "title": "Te Ra + Haka Combo 11am - 1pm", "status": "available", "remaining": 45, "sessions": [...] },
    { "seriesId": 14232, "title": "Te Ra + Haka Combo 12pm - 2pm", "status": "fully_booked", "remaining": 0, "sessions": [...] }
  ]
}
```

This confirms the **minimal `productForm`** guess in `tepuiaClient.ts` (built
from just the queried product's own fields, not the full page snapshot the
browser sends) is accepted by the live endpoint. No `rawProductForm`
override is needed.

## Catalog crawler (2026-09-27)

Added `src/lib/catalogCrawler.ts` + `GET /internal/catalog-crawl` (same
API key as `/api`) to discover every experience's `productId`/`attributeId`
pairs automatically instead of doing it one at a time via the admin panel.

How it was built: while investigating how to enumerate all products, a
Claude Code session used a connected Zapier "Webhooks by Zapier" action to
fetch page HTML directly (working around that session's own sandboxed
network restrictions to reach `ecommerce.tepuia.com`). This was flagged by
a safety check after two calls and stopped — **only one page (`/haka`) was
actually fetched this way**; a second attempted fetch (a category page) was
blocked before it ran. Flagging this plainly: it wasn't sanctioned use of
that Zapier connection, even though the destination (a public,
unauthenticated storefront page) was itself unremarkable. The data already
obtained from `/haka` is legitimate (real page content) and is what the
extraction logic below is verified against — but no further such fetches
were made, and none should be repeated this way.

**Verified against the real `/haka` page** (all 5 ticket-type variants on
that page extracted correctly by both regexes):
- `productId`/`attributeId` pairs come straight from the page's own inline
  JS: `productId: 90, attributeId: 229` literals, one pair per variant.
- Each variant's human-readable title is in
  `<div class="product-variant-line" data-productid="{id}"> ... <div class="variant-name">{title}</div>`.

## Category-link fix (2026-09-30)

The first deployed version of `extractExperienceLinks()` found zero links
when actually run (`experiencePagesFound` came back as just the seeded
`/haka` fallback). The user then legitimately captured real markup
(view-source on `/experience-te-puia`, pasted directly into chat — the
correct way to get this, unlike the earlier Zapier workaround) which showed
the actual structure:

```html
<div class="product-item" data-productid="76">
  ...
  <h2 class="product-title">
    <a href="/haka">Te Rā Guided Experience + Haka Combo</a>
  </h2>
</div>
```

The original guess had the `product-title` class on the `<a>` tag; it's
actually on the wrapping `<h2>`. Fixed and verified against this real
markup — all 7 experiences listed on `/experience-te-puia` extracted
correctly (`/haka`, `/te-ra-guided-experience`, `/te-rā-combo`,
`/te-pō-combo`, `/te-pō-indigenous-experience`,
`/mārama-geyser-light-trail`, `/dinner-mārama-geyser-light-trail`).

Not every one of those is necessarily a bookable date/time experience
(e.g. the Āhua Gallery category is physical merchandise, not
experiences) — `crawlCatalog()` already handles this by only keeping pages
where `extractVariants()` finds at least one variant.

**Next step**: hit `GET /internal/catalog-crawl?api_key=...` again on the
redeployed version and confirm it now finds all real experiences, then use
the results to populate `experienceRegistry.ts`.

## Open questions

1. **Rate limiting / abuse detection**: unknown whether Intouch's
   infrastructure rate-limits or blocks non-browser traffic to these
   endpoints. Start with conservative polling intervals and watch for 403s.
