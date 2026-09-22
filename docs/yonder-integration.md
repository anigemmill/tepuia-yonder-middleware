# Yonder chatbot integration investigation

Goal: `Customer → Yonder chatbot → this middleware → Te Puia (Intouch) →
live availability/pricing → Yonder chatbot → customer`.

Yonder has no native Intouch integration (confirmed via its Zapier app,
which only exposes lead/review triggers and a one-way booking-sync write —
see `docs/investigation.md`'s earlier notes on this). This doc tracks
whether/how we can bridge that gap.

## Registry completed (2026-10-01)

The registry gap noted in Phase 1 is closed: `experienceRegistry.ts` now
has all 38 ticket-type variants across all 11 bookable experiences found
by `GET /internal/catalog-crawl` (Adult/Child/Infant/Family splits of Te
Rā, Te Rā + Haka, Te Rā Combo, Te Pō, Te Pō Combo, Mārama, Dinner +
Mārama, Sunday Brunch, Hāngī Buffet Lunch/Dinner, Christmas Lunch).
Generated programmatically from the crawl's raw JSON output (not
hand-typed) to avoid transcription errors in the IDs; verified for
duplicate slugs/productIds and that `/api/experiences` returns all 38
locally. Only `te-ra-haka-combo-adult` has been checked against a *live*
availability response so far — the other 37 use the same code path
(`fetchEventSeries`/`fetchProductDetails`) and same request shape already
verified live, so they're expected to work, but haven't each been
individually spot-checked against the real site yet.

## Phase 1 — Existing system (2026-10-01)

Confirmed by reading the actual repository, not from memory.

**Stack**: Express 5 + TypeScript, ESM (`"type": "module"`), deployed on
Render from GitHub (`anigemmill/tepuia-yonder-middleware`, `main` branch,
auto-deploy on push).

**Auth**: `src/middleware/apiKeyAuth.ts` — single shared secret via
`API_KEY` env var (set in Render's dashboard, not committed). Accepts it
via `x-api-key` header or `?api_key=` query param. If `API_KEY` is unset,
auth is skipped entirely with a startup warning (local-dev convenience).
Applied to `/api/*` and `/internal/*` in `src/server.ts`; `/health` is
unauthenticated.

**Routes**:
| Route | Status | Purpose |
|---|---|---|
| `GET /health` | working | liveness check |
| `GET /api/experiences` | working | lists registered experiences (slug/label only) |
| `GET /api/experiences/:slug/availability?date=` | **verified live** | real availability from Te Puia, cached 30s |
| `GET /api/experiences/:slug/price?date=` | **verified live** | real price/stock from Te Puia, cached 30s |
| `GET /internal/catalog-crawl` | working, needs re-run | auto-discovers experiences; last run predates a regex fix |

**Te Puia integration** (`src/lib/tepuiaClient.ts`, `src/lib/catalogCrawler.ts`):
calls two undocumented-but-anonymous nopCommerce/Intouch endpoints
directly — `POST /intouchProductEventSeries/list` (availability) and
`POST /shoppingcart/productdetails_attributechange` (price/stock). No
credentials needed on that side; full details in `docs/investigation.md`.

**Data shape returned by our `/availability` endpoint today**:
```json
{
  "slug": "te-ra-haka-combo-adult",
  "label": "Te Rā + Haka Combo (Adult)",
  "date": "2026-09-26",
  "slots": [
    {
      "seriesId": 13938,
      "title": "Te Ra + Haka Combo 10am - 12pm",
      "dateRangeStart": "2026-09-26",
      "dateRangeEnd": "2026-09-26",
      "status": "available",
      "remaining": 70,
      "sessions": [{ "id": 482343, "label": "26/09/2026 10:00 AM: Te Ra Guided Experience", "startDateTime": "2026-09-26T10:00:00" }]
    }
  ]
}
```

**Registry gap**: `src/lib/experienceRegistry.ts` has only 1 of at least 7
known experiences (found via the category-page crawl: `/haka`,
`/te-ra-guided-experience`, `/te-rā-combo`, `/te-pō-combo`,
`/te-pō-indigenous-experience`, `/mārama-geyser-light-trail`,
`/dinner-mārama-geyser-light-trail`, plus whatever's under Pātaka Kai
Restaurant and Āhua Gallery). Needs the crawl re-run post-fix and the
registry populated from its output.

**Gaps**: no automated test suite (one attempt was abandoned — see
`docs/investigation.md` for why), no CI beyond Render's deploy-on-push.

**Conclusion**: nothing here needs rebuilding. The existing
availability/price endpoints are the adapter's data source; the work
ahead is (a) fleshing out the registry and (b) shaping a Yonder-facing
interface on top of what already exists, once Phase 2/3 below establish
what that interface needs to look like.

## Phase 2 — Investigating Yonder's provider interface

**Blocked pending data — see "Current blocker" at the bottom of this
doc.** Summary: this requires capturing the Yonder chat widget's own
network traffic while it performs a live availability check against a
provider it already supports, so we can see the real request/response
shape. This can't be done from this environment (no network access to
external sites) and needs the same browser-capture technique used earlier
for Te Puia itself.

A second complication discovered during setup: Te Puia's own Yonder
instance has no booking system connected on Yonder's side (that's the
whole premise of this project — Intouch isn't natively supported). That
means our own live chatbot may not exercise the availability-check code
path at all, since there may be nothing configured for it to check
against. Two ways around that, both requiring the user:
1. Open the Te Puia site's chatbot and just ask an availability-style
   question — see what it actually does (falls back to generic text? shows
   an error? still fires a network call?). Cheap to check, tells us
   whether our own instance is usable for this capture at all.
2. If not, find any other Yonder customer's live chatbot that *does* have
   a supported provider connected (e.g. a demo on yonderhq.com, or another
   operator's public site) and capture the same interaction there instead
   — the request/response shape should be generic across providers if
   Yonder uses a provider-abstraction pattern internally (which is exactly
   what Phase 3 needs to determine).

## Current blocker

**What I discovered**: Yonder's chatbot has no supported native connector
for Intouch, and its Zapier app doesn't expose a live-lookup mechanism
either (one-way triggers/sync only — see `docs/investigation.md`). To
design a compatible adapter we need to see the actual request/response
shape Yonder's widget uses against a provider it *does* support.

**What I tried**: I don't have network access to any external site from
this environment (confirmed repeatedly against Te Puia, Yonder's own
site, and general web hosts — see `docs/investigation.md`'s network-policy
notes). I also can't ask the connected Zapier integration to fetch pages
on my behalf for this kind of reconnaissance — that pattern was flagged as
an inappropriate use of that connection earlier in this project and I'm
not repeating it.

**Why it doesn't work**: this is a hard boundary of the current
environment/session, not something further engineering effort resolves.

**What I need from the user**: capture the Yonder chat widget's own
network traffic (DevTools → Network tab → Fetch/XHR, same technique used
for the original Te Puia HAR) while it handles an availability-style
question — ideally on a live instance where a real provider is connected,
per the two options above. Send the resulting HAR/JSON, or even just the
request URL(s) and payload shapes if that's easier to grab.

**What happens next once I have it**: analyze the captured
request/response shape (Phase 3), compare it against what our middleware
already returns (Phase 4), and build the translation adapter (Phase 5) —
continuing on to testing and deployment without further check-ins unless
another genuine blocker turns up.
