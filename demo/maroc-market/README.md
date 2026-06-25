# Maroc Market BH Demo

Temporary isolated e-commerce demo for Maroc Market BH. This folder is separate from all existing production projects and is not deployed.

This is a temporary client demo and can be removed later.

## Files Created

- `index.html` customer storefront
- `admin.html` demo admin panel
- `assets/css/style.css` shared responsive design system
- `assets/js/app.js` storefront products, cart, quick view, WhatsApp ordering
- `assets/js/admin.js` password screen, product management, settings, localStorage data
- `assets/data/products.json` starter settings and product catalog
- `assets/images/` reserved for final logo, hero, category, and product images
- `assets/images/logo/` final logo folder
- `assets/images/hero/` final hero image folder
- `assets/images/products/` final product image folder
- `assets/images/categories/` final category image folder
- `assets/images/banners/` final offer banner folder
- `README.md` setup notes

## How To Open The Demo

From this folder, run a local static server so `products.json` loads correctly:

```bash
python -m http.server 4173
```

Then open:

- Storefront: `http://localhost:4173/index.html`
- Admin: `http://localhost:4173/admin.html`

If you start the server from the GitHub workspace root, open:

- `http://localhost:4173/demo/maroc-market/index.html`
- `http://localhost:4173/demo/maroc-market/admin.html`

## Admin Password

Demo password: `1234`

## Image Sizes Needed

- Logo: `500 x 500 px` transparent PNG or SVG
- Desktop hero: `1600 x 520 px` JPG/WebP
- Mobile hero: `900 x 650 px` JPG/WebP
- Product images: `800 x 800 px` JPG/WebP square
- Category images: `500 x 500 px` JPG/WebP square
- Offer banner: `1200 x 400 px` JPG/WebP
- Social sharing image: `1200 x 630 px`

## Fast Static Image Workflow

Use this for the temporary live demo. Place optimized final images in these exact paths, then redeploy the static folder.

Logo:

- `assets/images/logo/maroc-market-logo.png`

Hero:

- `assets/images/hero/hero-desktop.jpg`
- `assets/images/hero/hero-mobile.jpg`

Products:

- `assets/images/products/argan-oil.jpg`
- `assets/images/products/moroccan-soap.jpg`
- `assets/images/products/hair-mix.jpg`
- `assets/images/products/moroccan-honey.jpg`
- `assets/images/products/black-seed-oil.jpg`
- `assets/images/products/ghassoul.jpg`
- `assets/images/products/henna.jpg`
- `assets/images/products/bakhoor.jpg`

Categories:

- `assets/images/categories/hair-care.jpg`
- `assets/images/categories/skin-care.jpg`
- `assets/images/categories/natural-oils.jpg`
- `assets/images/categories/herbs.jpg`
- `assets/images/categories/moroccan-hammam.jpg`
- `assets/images/categories/perfume-bakhoor.jpg`
- `assets/images/categories/offers.jpg`

Offer banner:

- `assets/images/banners/offer-banner.jpg`

If an image file is missing, the app keeps the premium generated placeholder instead of showing a broken image.

## Image Compression Targets

- Product image: under `200 KB` when possible
- Category image: under `120 KB` when possible
- Hero image: under `350 KB` when possible
- Keep high visual quality, especially on product labels and textures.

Suggested workflow:

1. Export/crop to the required pixel size.
2. Save as JPG or WebP.
3. Compress with Squoosh, TinyPNG, Photoshop export, or another visual compressor.
4. Put the file in the matching folder.
5. Update `assets/data/products.json` or the admin image path if needed.
6. Redeploy the static demo folder.

## Data Notes

The first demo uses `localStorage` plus `assets/data/products.json` starter data. Admin changes are saved in the browser only. Clear site data/localStorage to reset to the starter catalog.

Important for live public usage: admin changes made on the live URL affect only the current browser/device. Other people will not see those changes unless the data/images are updated in the files and redeployed, or the app is later connected to Firebase/Cloudflare.

Future upload can connect to Cloudflare R2/Firebase Storage.

## Future Upgrade Notes

- Firebase or Cloudflare D1 for real product and order storage
- Cloudflare R2 image upload
- AI chat assistant for product guidance
- SEO product pages for every item
- Customer order history

## Deployment

Do not deploy this demo until the owner approves. It is intentionally isolated under `/demo/maroc-market/`.

## Cloudflare R2 Integration (Option A)

This demo is integrated with an isolated Cloudflare R2 bucket for real public image uploads.

* **Bucket Name**: `maroc-market-demo-assets`
* **Binding Name**: `MAROC_MARKET_ASSETS`

### Isolated API Endpoints
* `/demo/maroc-market/api/upload-image` (POST)
* `/demo/maroc-market/api/delete-image` (DELETE)
* `/demo/maroc-market/api/list-images` (GET)
* `/demo/maroc-market/api/assets/*` (GET - public image serving path)

### Security Rules
1. **Directory Traversal Defense**: All file paths/keys are strictly validated. Key names containing `..` or escaping the `maroc-market/` prefix are rejected with a `400 Bad Request` immediately.
2. **Access Control**: Upload, delete, and list operations require the header `x-admin-password: 1234`.
3. **MIME Validation**: Only image formats (`image/jpeg`, `image/png`, `image/webp`) are allowed for upload.
4. **Isolate Storage**: Everything uploaded is locked under the prefix `maroc-market/` with the following structures:
   - `maroc-market/logo/`
   - `maroc-market/hero/`
   - `maroc-market/products/`
   - `maroc-market/categories/`
   - `maroc-market/banners/`

> [!WARNING]
> **Stage 1 (Demo) Authentication Warning**: The password check uses a simple demo-level header (`x-admin-password: 1234`). For Stage 2 (real production use), a stronger token-based session or Cloudflare Access authentication should be configured to secure the admin upload endpoints.

### Rollback Steps
If any issues happen, revert immediately by running:
```bash
git checkout wrangler.jsonc worker.js
rmdir /s /q functions/api/maroc-market
git checkout demo/maroc-market
```

### How to Delete the Demo & R2 Bucket Later
1. Delete the R2 bucket from your Cloudflare account:
   ```bash
   npx wrangler r2 bucket delete maroc-market-demo-assets
   ```
2. Remove the folder `demo/maroc-market` from the project.
3. Revert the changes in `wrangler.jsonc` and `worker.js`.

