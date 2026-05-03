import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const isRemote = process.argv.includes("--remote");

const workspace = {
  id: "ws_demo_showcase",
  slug: "demo-showcase",
  name: "Smart Page Demo Showcase"
};

const demos = [
  {
    id: "pg_demo_creator",
    shortLinkId: "sl_demo_creator",
    code: "demo-creator",
    title: "Maya Rivers - Creator Demo",
    slug: "demo-creator",
    seoTitle: "Creator Link-in-Bio Demo - Smart Page Platform",
    seoDescription:
      "Explore a professional creator link-in-bio demo with profile, social links, gallery, FAQ, lead form, and analytics-ready public page blocks.",
    theme: {
      backgroundType: "gradient",
      backgroundColor: "#f8fafc",
      gradientFrom: "#fdf2f8",
      gradientTo: "#eef2ff",
      primaryColor: "#be185d",
      textColor: "#1f1720",
      cardColor: "#ffffff",
      buttonColor: "#be185d",
      buttonStyle: "pill",
      fontStyle: "elegant",
      layoutStyle: "card_based",
      profileStyle: "circle",
      showPlatformBadge: true,
      footerText: "Creator demo built with Smart Page Platform"
    },
    blocks: [
      { id: "blk_demo_creator_profile", type: "profile", props: { imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330", name: "Maya Rivers", subtitle: "Creator, photographer, and weekly style notes.", circular: true } },
      { id: "blk_demo_creator_social", type: "social_links", props: { links: [
        { platform: "instagram", label: "Instagram", href: "https://instagram.com/" },
        { platform: "tiktok", label: "TikTok", href: "https://www.tiktok.com/" },
        { platform: "youtube", label: "YouTube", href: "https://www.youtube.com/" },
        { platform: "website", label: "Portfolio", href: "https://example.com/" }
      ] } },
      { id: "blk_demo_creator_announce", type: "announcement", props: { title: "New guide is live", message: "Download the creator media kit template and learn how to pitch brands with a cleaner page.", style: "strong" } },
      { id: "blk_demo_creator_link1", type: "link_button", props: { label: "Download media kit", href: "https://example.com/media-kit" } },
      { id: "blk_demo_creator_link2", type: "link_button", props: { label: "Book a collaboration call", href: "https://example.com/book" } },
      { id: "blk_demo_creator_gallery", type: "gallery", props: { images: [
        { src: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f", alt: "Editorial outfit" },
        { src: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b", alt: "Studio portrait" },
        { src: "https://images.unsplash.com/photo-1496747611176-843222e1e57c", alt: "Fashion details" }
      ] } },
      { id: "blk_demo_creator_faq", type: "faq", props: { items: [
        { question: "Can brands contact me here?", answer: "Yes. Add a lead form, email, WhatsApp, or booking link to collect serious inquiries." },
        { question: "Can I change the style?", answer: "Yes. Theme controls change colors, button style, layout, profile shape, footer text, and more." }
      ] } },
      { id: "blk_demo_creator_form", type: "form", props: { title: "Collaboration inquiry", enabledFields: ["name", "email", "message"], submitText: "Send inquiry" } }
    ]
  },
  {
    id: "pg_demo_restaurant",
    shortLinkId: "sl_demo_restaurant",
    code: "demo-restaurant",
    title: "Olive & Flame - Restaurant Demo",
    slug: "demo-restaurant",
    seoTitle: "Restaurant Link Page Demo - Menu, WhatsApp, Map, and Offers",
    seoDescription:
      "See a restaurant landing page demo with menu links, WhatsApp ordering, location, FAQs, gallery, price highlights, and mobile-first design.",
    theme: {
      backgroundType: "gradient",
      backgroundColor: "#fff7ed",
      gradientFrom: "#fff7ed",
      gradientTo: "#fef3c7",
      primaryColor: "#9a3412",
      textColor: "#24150f",
      cardColor: "#ffffff",
      buttonColor: "#9a3412",
      buttonStyle: "rounded",
      fontStyle: "clean",
      layoutStyle: "centered",
      profileStyle: "rounded_square",
      showPlatformBadge: true,
      footerText: "Restaurant demo built with Smart Page Platform"
    },
    blocks: [
      { id: "blk_demo_rest_profile", type: "profile", props: { imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5", name: "Olive & Flame", subtitle: "Fresh bowls, grilled plates, and fast WhatsApp ordering.", circular: false } },
      { id: "blk_demo_rest_announce", type: "announcement", props: { title: "Lunch offer", message: "Order before 3 PM and get a free iced tea with every signature bowl.", style: "soft" } },
      { id: "blk_demo_rest_whatsapp", type: "whatsapp_button", props: { label: "Order on WhatsApp", phoneE164: "+15551234567", message: "Hi, I want to order from Olive & Flame." } },
      { id: "blk_demo_rest_menu", type: "link_button", props: { label: "View full menu", href: "https://example.com/menu" } },
      { id: "blk_demo_rest_prices", type: "price_list", props: { title: "Popular items", items: [
        { name: "Grilled chicken bowl", description: "Rice, salad, garlic sauce, house pickles", price: "$8.90" },
        { name: "Halloumi wrap", description: "Warm wrap, herb sauce, tomato, greens", price: "$6.50" },
        { name: "Family mezze box", description: "Dips, bread, salad, grilled skewers", price: "$24" }
      ] } },
      { id: "blk_demo_rest_gallery", type: "gallery", props: { images: [
        { src: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c", alt: "Healthy bowl" },
        { src: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1", alt: "Grilled plate" },
        { src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836", alt: "Restaurant table" }
      ] } },
      { id: "blk_demo_rest_map", type: "map_location", props: { title: "Visit us in Seef", mapsUrl: "https://maps.google.com/", buttonText: "Open location" } },
      { id: "blk_demo_rest_faq", type: "faq", props: { items: [
        { question: "Do you deliver?", answer: "Yes. Add WhatsApp, delivery links, or direct ordering links to your public page." },
        { question: "Can I show offers?", answer: "Use announcement, price list, image, and timer blocks to highlight current offers." }
      ] } }
    ]
  },
  {
    id: "pg_demo_salon",
    shortLinkId: "sl_demo_salon",
    code: "demo-salon",
    title: "Luma Beauty Lounge - Salon Demo",
    slug: "demo-salon",
    seoTitle: "Salon Landing Page Demo - Booking, Prices, Gallery, Contact",
    seoDescription:
      "Preview a salon and beauty landing page with booking links, service prices, gallery, FAQ, contact card, and WhatsApp button.",
    theme: {
      backgroundType: "gradient",
      backgroundColor: "#fdf2f8",
      gradientFrom: "#fdf2f8",
      gradientTo: "#fff1f2",
      primaryColor: "#9f1239",
      textColor: "#241118",
      cardColor: "#ffffff",
      buttonColor: "#9f1239",
      buttonStyle: "shadow",
      fontStyle: "minimal",
      layoutStyle: "card_based",
      profileStyle: "rounded_square",
      showPlatformBadge: true,
      footerText: "Salon demo built with Smart Page Platform"
    },
    blocks: [
      { id: "blk_demo_salon_profile", type: "profile", props: { imageUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e", name: "Luma Beauty Lounge", subtitle: "Hair, nails, brows, and bridal beauty appointments.", circular: false } },
      { id: "blk_demo_salon_whatsapp", type: "whatsapp_button", props: { label: "Book appointment", phoneE164: "+15557654321", message: "Hi, I want to book an appointment at Luma Beauty Lounge." } },
      { id: "blk_demo_salon_prices", type: "price_list", props: { title: "Service menu", items: [
        { name: "Signature blowout", description: "Wash, style, and finish", price: "$35" },
        { name: "Gel manicure", description: "Cuticle care and gel polish", price: "$28" },
        { name: "Brow shaping", description: "Shape, tint, and finish", price: "$18" }
      ] } },
      { id: "blk_demo_salon_gallery", type: "gallery", props: { images: [
        { src: "https://images.unsplash.com/photo-1560066984-138dadb4c035", alt: "Salon styling" },
        { src: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f", alt: "Beauty salon" },
        { src: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da", alt: "Beauty details" }
      ] } },
      { id: "blk_demo_salon_contact", type: "contact_card", props: { phone: "+1 555 765 4321", whatsapp: "+15557654321", email: "hello@example.com", address: "Manama Beauty District" } },
      { id: "blk_demo_salon_faq", type: "faq", props: { items: [
        { question: "Can clients book directly?", answer: "Yes. Use a WhatsApp button, booking link, or lead form so visitors can contact you fast." },
        { question: "Can I show a service list?", answer: "Yes. Price list blocks are designed for salon, restaurant, service, and freelance menus." }
      ] } }
    ]
  }
];

function sqlString(value) {
  return String(value).replaceAll("'", "''");
}

function insertPageSql(demo) {
  const theme = sqlString(JSON.stringify(demo.theme));
  const seoTitle = sqlString(demo.seoTitle);
  const seoDescription = sqlString(demo.seoDescription);
  const statements = [];

  statements.push(`INSERT INTO pages (id, workspace_id, title, slug, status, theme_json, seo_title, seo_description, allow_indexing, published_at, created_at, updated_at)\nVALUES ('${demo.id}', '${workspace.id}', '${sqlString(demo.title)}', '${demo.slug}', 'published', '${theme}', '${seoTitle}', '${seoDescription}', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)\nON CONFLICT(id) DO UPDATE SET title = excluded.title, slug = excluded.slug, status = 'published', theme_json = excluded.theme_json, seo_title = excluded.seo_title, seo_description = excluded.seo_description, allow_indexing = 1, published_at = COALESCE(pages.published_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP;`);
  statements.push(`DELETE FROM page_blocks WHERE page_id = '${demo.id}';`);
  demo.blocks.forEach((block, index) => {
    statements.push(`INSERT INTO page_blocks (id, page_id, type, sort_order, props_json) VALUES ('${block.id}', '${demo.id}', '${block.type}', ${index}, '${sqlString(JSON.stringify(block.props))}');`);
  });
  statements.push(`INSERT INTO short_links (id, workspace_id, page_id, code, status, created_at, updated_at)\nVALUES ('${demo.shortLinkId}', '${workspace.id}', '${demo.id}', '${demo.code}', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)\nON CONFLICT(id) DO UPDATE SET workspace_id = excluded.workspace_id, page_id = excluded.page_id, code = excluded.code, status = 'active', updated_at = CURRENT_TIMESTAMP;`);
  statements.push(`UPDATE short_links SET status = 'disabled', updated_at = CURRENT_TIMESTAMP WHERE code = '${demo.code}' AND id != '${demo.shortLinkId}';`);
  return statements.join("\n");
}

const sql = [
  "PRAGMA foreign_keys = ON;",
  `INSERT INTO workspaces (id, slug, name, status, created_at, updated_at) VALUES ('${workspace.id}', '${workspace.slug}', '${workspace.name}', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET slug = excluded.slug, name = excluded.name, status = 'active', updated_at = CURRENT_TIMESTAMP;`,
  ...demos.map(insertPageSql),
  "UPDATE pages SET allow_indexing = 0, updated_at = CURRENT_TIMESTAMP WHERE slug = 'hussain' AND title = 'hussain';"
].join("\n\n");

const dir = mkdtempSync(join(tmpdir(), "spp-demo-seed-"));
const file = join(dir, "demo-seed.sql");
writeFileSync(file, sql, "utf8");

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const args = ["wrangler", "d1", "execute", "smart-page-platform", isRemote ? "--remote" : "--local", "--file", file];
const result = spawnSync(npx, args, { stdio: "inherit", shell: process.platform === "win32" });
rmSync(dir, { recursive: true, force: true });

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Seeded ${demos.length} professional demo pages ${isRemote ? "remotely" : "locally"}.`);
