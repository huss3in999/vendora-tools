# GCC Airport SEO & “Real Company” Playbook

Generated for Vendora Transport — **GCC section only** (no global tools mixing).

## Your Search Console data (Mar–Jun 2026)

**Airport-related queries (impressions, weak clicks):**

| Query | Impressions | Avg position |
|-------|-------------|--------------|
| توصيل من البحرين الى مطار الدمام | 15 | 43 |
| مواصلات من البحرين الى مطار الدمام | 5 | 7.8 |
| bahrain to dammam airport service | 10 | 74 |
| transport bahrain to dammam airport | 9 | 63 |
| airport pickup saudi arabia | 7 | 79 |

**Airport pages:** indexed but low clicks — body content + company trust + Maps/GBP matter more than meta title changes.

**Do NOT change meta titles** on pages already winning: Qatar, Kuwait, main Dammam route.

---

## What Google actually uses (not myths)

| Signal | Helps? | Notes |
|--------|--------|-------|
| **Real text** (Arabic + airport codes BAH/DMM) | ✅ Strong | In `<h1>`, paragraphs, FAQ — you have this |
| **Schema LocalBusiness + Service + FAQ** | ✅ Strong | Added on airport hub |
| **Flag emojis 🇧🇭🇸🇦 in HTML** | ⚪ Small | Fine for users; Google reads text “Bahrain”, “BAH” more |
| **HTML/CSS route diagram** | ⚪ Medium | Helps users + semantic text; not a Google Maps replacement |
| **Embedded Google Map iframe** | ⚪ Medium | OK for UX; not required for ranking |
| **Real photos** (cars, team, office) | ✅ Strong | Especially for Maps / local pack |
| **Google Business Profile** | ✅✅ Critical | Often beats websites for “taxi to airport” |
| **Reviews on Google** | ✅✅ Critical | Real company signal |
| **Consistent NAP** (name, address, phone) | ✅ Strong | Same phone +973 3322 5954 everywhere |
| **Changing winning page titles** | ❌ Risk | Avoid |

Google does **not** need fancy drawings. It needs: **clear service text, trust, local presence, clicks, reviews.**

---

## “Real company” checklist (you do these — not code)

1. **Google Business Profile** — category: airport shuttle / taxi / transportation. Service area: Bahrain + Eastern Province SA. Link: `/bahrain-saudi-gcc-transport/`
2. **Same phone everywhere:** +973 3322 5954
3. **Business address** — if you have office/showroom in Manama, add to GBP + contact page (we used generic Manama in schema until you confirm exact address)
4. **5–10 real Google reviews** from customers (Arabic + English)
5. **Photos:** GMC/XL vehicle, driver at airport, WhatsApp screenshot (optional)
6. **Bing Places** — same info (meta tag already on main site)
7. **Search Console** — URL-prefix property for `/bahrain-saudi-gcc-transport/` only
8. **Request indexing** for airport hub + DMM routes after deploy

---

## Safe code changes made (airport-only)

- `site.css` — airport route visual + IATA table styles
- `airport-transfer/` — hub: IATA table, BAH↔DMM visual, company block, LocalBusiness schema, extra search phrases
- `dammam-airport-to-bahrain/` — DMM→BAH visual, extra keywords
- `bahrain-to-dammam-airport/` — BAH→DMM visual, flags, keywords
- `bahrain-airport-transfer/` — BAH flag badge in hero
- `index.html` (GCC home only) — nav link “المطار” + airport card (no global site changes)

**Not touched:** `bahrain-to-qatar/`, `bahrain-to-kuwait/`, `bahrain-to-dammam/` (main), meta titles, canonical, sitemap.

---

## After deploy

```powershell
cd "E:\Users\Hussain Alyaqoob\Documents\GitHub\public"
npx wrangler deploy
```

Then in Search Console → URL Inspection → Request indexing:

- `/bahrain-saudi-gcc-transport/airport-transfer/`
- `/bahrain-saudi-gcc-transport/bahrain-to-dammam-airport/`
- `/bahrain-saudi-gcc-transport/dammam-airport-to-bahrain/`
- `/bahrain-saudi-gcc-transport/bahrain-airport-transfer/`

Monitor after 2–4 weeks: filter Performance by page path `airport`.

---

## What to send us for next step

1. Exact **business address** in Bahrain (for schema + GBP)
2. **Google Business Profile** link (if created)
3. 2–3 **real photos** (vehicle at BAH or DMM) — we can add with `alt` text only on airport pages
4. Confirm if you want **English airport pages** for DMM routes (GSC shows EN taxi queries at position 55+)
