# Neighbor Mailer Program

The post-install neighbor-farming channel. After every install, mail a puffy bubble
mailer (a printed card + a fridge magnet) to ~10 homes around the client. It gets
opened out of curiosity (lumpy mail beats the trash-can sort), the magnet stays on
the fridge as a standing billboard, and the card sends scans to a custom landing
page that captures leads exactly like a Facebook lead.

**Why this is the highest-trust channel BPP can run:** one install becomes a cluster
of installs. "Your neighbor just got one" is the strongest proof there is, and a BPP
truck already in the neighborhood is its own advertisement. Geographic density is a
real moat and the lowest-CPL lead you can buy.

Built 2026-06-05. Nothing here mails to a real person until Key approves the printed
pieces and the program go-live (see "Before the first real mailer" below).

---

## The pieces (all built + verified)

| Piece | File / location | What it does |
|---|---|---|
| **Landing page** | `/n/index.html` (live, noindexed) | Custom neighbor lead page. Same form + pipe as the ad landing pages; `channel=neighbor`. No phone number, form-first. Optional `?st=<street>` personalizes the headline; `?src=qr`/`?src=magnet` splits scan source. |
| **Lead pipe** | `supabase/functions/quo-ai-new-lead` | A `/n/` path now derives `lead_channel='neighbor'`. Leads land in `contacts` and get texted exactly like a Facebook lead. Verified end-to-end. |
| **Address finder (tool)** | `/tools/neighbor-finder/index.html` (noindexed) | Type the client address, get the ~10 nearest residential mailing addresses. Copy, print labels (Avery 5160), or print a hand-write sheet. |
| **Address finder (backend)** | `supabase/functions/neighbor-finder` | Free pipeline: Census geocoder + the Greenville / Spartanburg / Pickens county parcel GIS layers. Mails to the physical house (situs), not the owner's mailing address. No API keys. |
| **CRM tie-in (live)** | `crm/v3` contact address row | A "Find neighbors" button beside Map/Copy opens the finder with that contact's address prefilled (auto-runs). One tap from a finished install. |
| **Card** | `neighbor-mailer/card.html` | 5x7 double-sided. Front: warm "Hi, neighbor." Back: the offer + QR + `backuppowerpro.com/n`. No phone number. |
| **Magnet** | Key 3D-prints his own | The gift / lump in the envelope. The card carries the QR + link, so the magnet does not need one. `neighbor-mailer/magnet.html` is an optional printed-magnet reference only. |
| **QR codes** | `neighbor-mailer/assets/qr-card.svg`, `qr-magnet.svg` | Scannable, baked into the print files. Card QR -> `?src=qr`, magnet QR -> `?src=magnet`. |
| **Tracking** | PostHog | "Neighbor Mailer Funnel" insight (tile on the pinned BPP Lead Funnel dashboard): visit -> form start -> lead, split by QR vs typed. The daily rollup auto-counts the `neighbor` channel. |

---

## The post-install ritual (the repeatable loop)

Do this the day you finish an install:

1. **Find the neighbors.** In the CRM, open the client's contact and click the
   **Find neighbors** button on the address row. It opens the finder with their
   address prefilled and auto-runs. (Or open `backuppowerpro.com/tools/neighbor-finder/`
   and type any address.) You get ~10 nearby homes, nearest first.
2. **Trim if needed.** Uncheck anything that looks commercial or wrong. (Greenville
   rentals sometimes show a street name without "Rd/Ave"; they still deliver.)
3. **Get the addresses.** Either "Print hand-write sheet" (recommended, handwritten
   envelopes get opened most) or "Print labels (Avery 5160)" for speed.
4. **Stuff 10 mailers.** Card + magnet into each #0 bubble mailer. Hand-write the
   address. No return-teaser needed; the lump does the work.
5. **Mail them.** Drop at the post office (a lumpy magnet mailer is non-machinable,
   so it's not a 73-cent letter; see postage note below).
6. **Watch the funnel.** Scans land on `/n/`, fill the form, and get texted like any
   lead. Track conversions in the PostHog "Neighbor Mailer Funnel" tile.

Total hands-on time per install: a few minutes to pull the list + ~15 minutes to
stuff and address 10 mailers.

---

## Sourcing + cost (researched 2026-06-05)

### v1 stack (DIY lumpy mailer, recommended). Keeps the magnet + curiosity-open.

| Component | Pick | ~Per-unit |
|---|---|---|
| Bubble mailer | **Uline S-22454** #0 6x10 kraft (or ValueMailers #0) | $0.12 - 0.18 |
| Card (5x7, 2-sided) | **GotPrint**, 16pt silk/uncoated | $0.15 - 0.20 |
| Magnet (3.5x2) | **Sticker Mule** or GotPrint business-card magnet | $0.40 - 0.55 |
| Handwritten address | Do it yourself at this volume | $0.00 |
| Postage | Non-machinable First-Class / ground (lumpy) | **$1.00 - 1.50** |
| **All-in per mailer** | | **~$1.80 - 2.30** |

At 2-5 installs/week that is ~20-50 mailers/week = roughly **$36 - 115/week** plus a
few minutes of assembly. Against a ~$1,000+ install ticket, a single conversion pays
for months of the program.

**Order ~250 of each component per restock** (hits the good price tiers, ~5-12 weeks
of supply).

> **Postage is the cost wildcard, not the materials.** Assemble ONE real mailer and
> weigh/quote it at the post office before buying in bulk. That single number decides
> whether the program is $1.80 or $2.50 a piece.

### v2 path (later, only when assembly becomes the bottleneck, ~75-100+/week)

No print-and-mail API (Lob, PostGrid, Postalytics) can mail a **lumpy magnet** mailer;
they are flat-only. So automation means trading away the lump (the top open-rate lever).
Order of escalation:
1. **Hybrid:** keep DIY assembly, outsource only the handwritten address (Scribeless
   ~$2-4, Handwrytten ~$3.25). Preserves the magnet + lump.
2. **Flat (last resort):** Lob postcards (~$0.48-0.77, unique per-recipient QR, full
   automation). Loses the magnet and the lump; gains zero hand-labor.

### Address data
- **Now (free, built):** Census geocoder + county parcel GIS for all three counties.
  Zero cost, no keys. This is what `neighbor-finder` uses.
- **Paid fallback (if a county GIS ever breaks):** **Smarty US Reverse Geocoding**,
  $54/mo for 25k lookups, returns the 10 nearest USPS-standardized addresses natively.

---

## Before the first real mailer (Key approvals + checks)

1. **Approve the card + magnet content** (`card.html`, `magnet.html`). Nothing prints
   until Key signs off. Money + client perception = Key's call.
2. **Scan-test a printed card AND magnet.** Print one of each at real size and scan
   both QR codes with a phone before any bulk order. (The magnet QR is ~1 inch; verify
   it reads.)
3. **Confirm the offer numbers** on the card ($1,197-$1,497; $15k anchor) match
   current pricing.
4. **Weigh a finished mailer at the post office** for the real postage number.
5. **Phone-number note:** the pieces intentionally show NO phone number (Key's rule);
   the only CTA is the QR / `backuppowerpro.com/n`.

---

## How attribution works

- Card QR -> `backuppowerpro.com/n/?src=qr`; magnet QR -> `?src=magnet`; typed link ->
  `/n/` (counts as `typed`). PostHog splits all three via `mailer_src`.
- The `/n/` page registers `channel=neighbor` on every event; the lead row stores
  `lead_channel='neighbor'`, `lead_source='neighbor-mailer'`.
- Optional `?st=<street>` on the link personalizes the page headline ("Someone near
  Grove Rd just made the next outage a non-event") if you ever do per-cluster printing.

---

## Connected

- `docs/PARKED-WORK.md` (print-approval gate), `docs/WATCHLIST.md` (scan-test reminder),
  `PRODUCTION-SURFACE-MAP.md` (the `/n/` surface), `wiki/Ads/` (channel performance).
