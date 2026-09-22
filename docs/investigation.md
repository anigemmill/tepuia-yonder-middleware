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

## Open questions

1. **Per-experience `productId`/`attributeId` mapping**: only one experience
   (`te-ra-haka-combo-adult`, productId 90, attributeId 229) is confirmed.
   Additional experiences need their IDs added to
   `src/lib/experienceRegistry.ts`. These can be found either via another
   traffic capture, or via the nopCommerce admin (Catalog > Products > edit
   product > Product attributes tab > edit the date attribute mapping — the
   attributeId is in that page's URL).
2. **Rate limiting / abuse detection**: unknown whether Intouch's
   infrastructure rate-limits or blocks non-browser traffic to these
   endpoints. Start with conservative polling intervals and watch for 403s.
