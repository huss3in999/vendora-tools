import type { Block } from "./blocks";
import { sanitizeBlock } from "./block-sanitize";
import { sanitizePageTheme, type PageTheme } from "./theme";

type StarterBlock = Block extends infer T ? (T extends { id: string } ? Omit<T, "id"> : never) : never;

export type PageTemplate = {
  id: string;
  name: string;
  category: string;
  description: string;
  recommendedButtonStyle: PageTheme["buttonStyle"];
  layoutStyle: PageTheme["layoutStyle"];
  footerText: string;
  theme: PageTheme;
  blocks: StarterBlock[];
};

function theme(input: Partial<PageTheme>): PageTheme {
  return sanitizePageTheme({
    backgroundType: "gradient",
    backgroundColor: "#f8fafc",
    gradientFrom: "#e0f2fe",
    gradientTo: "#ffffff",
    primaryColor: "#4f46e5",
    textColor: "#0f172a",
    cardColor: "#ffffff",
    buttonColor: "#0f172a",
    buttonStyle: "shadow",
    fontStyle: "clean",
    layoutStyle: "centered",
    profileStyle: "circle",
    showPlatformBadge: true,
    footerText: "",
    ...input
  });
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "creator-personal-brand",
    name: "Creator / Personal Brand",
    category: "Creator",
    description: "Profile-first page for socials, content, newsletter, and featured links.",
    recommendedButtonStyle: "pill",
    layoutStyle: "centered",
    footerText: "New drops every week.",
    theme: theme({
      gradientFrom: "#ede9fe",
      gradientTo: "#fdf2f8",
      primaryColor: "#7c3aed",
      buttonColor: "#18181b",
      buttonStyle: "pill",
      layoutStyle: "centered",
      footerText: "New drops every week."
    }),
    blocks: [
      { type: "profile", props: { imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330", name: "Your Name", subtitle: "Creator, storyteller, and daily inspiration.", circular: true } },
      { type: "social_links", props: { links: [
        { platform: "instagram", label: "Instagram", href: "https://instagram.com/" },
        { platform: "youtube", label: "YouTube", href: "https://youtube.com/" },
        { platform: "website", label: "Website", href: "https://example.com" }
      ] } },
      { type: "link_button", props: { label: "Latest video", href: "https://example.com" } },
      { type: "announcement", props: { title: "Featured this week", message: "Add your newest launch, article, video, or offer here.", style: "soft" } },
      { type: "faq", props: { items: [{ question: "How can brands work with me?", answer: "Send a message with your campaign idea and timeline." }] } }
    ]
  },
  {
    id: "restaurant-food",
    name: "Restaurant / Food",
    category: "Food",
    description: "Menu, location, ordering links, and contact details for food businesses.",
    recommendedButtonStyle: "rounded",
    layoutStyle: "card_based",
    footerText: "Fresh daily. See you soon.",
    theme: theme({
      gradientFrom: "#fff7ed",
      gradientTo: "#fef3c7",
      primaryColor: "#ea580c",
      buttonColor: "#9a3412",
      buttonStyle: "rounded",
      layoutStyle: "card_based",
      profileStyle: "rounded_square",
      footerText: "Fresh daily. See you soon."
    }),
    blocks: [
      { type: "profile", props: { imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4", name: "Restaurant Name", subtitle: "Comfort food, fresh ingredients, warm service.", circular: false } },
      { type: "link_button", props: { label: "View menu", href: "https://example.com" } },
      { type: "price_list", props: { title: "Popular items", items: [
        { name: "Signature plate", description: "Chef favorite", price: "$14" },
        { name: "Family box", description: "Feeds 3-4", price: "$38" }
      ] } },
      { type: "map_location", props: { title: "Find us", mapsUrl: "https://maps.google.com", buttonText: "Open Google Maps" } },
      { type: "contact_card", props: { phone: "+1 555 123 4567", whatsapp: "+15551234567", address: "Main Street, City" } }
    ]
  },
  {
    id: "clothing-store",
    name: "Clothing Store",
    category: "Retail",
    description: "Fashion launch page with gallery, collection links, and contact options.",
    recommendedButtonStyle: "square",
    layoutStyle: "full_width_mobile",
    footerText: "Limited pieces. Restocks announced here.",
    theme: theme({
      backgroundType: "solid",
      backgroundColor: "#f5f5f4",
      primaryColor: "#44403c",
      buttonColor: "#1c1917",
      cardColor: "#ffffff",
      buttonStyle: "square",
      fontStyle: "minimal",
      layoutStyle: "full_width_mobile",
      profileStyle: "rounded_square",
      footerText: "Limited pieces. Restocks announced here."
    }),
    blocks: [
      { type: "header", props: { title: "New Collection", subtitle: "Clean essentials and seasonal drops." } },
      { type: "gallery", props: { images: [
        { src: "https://images.unsplash.com/photo-1496747611176-843222e1e57c", alt: "Clothing rack" },
        { src: "https://images.unsplash.com/photo-1483985988355-763728e1935b", alt: "Shopping" }
      ] } },
      { type: "link_button", props: { label: "Shop latest drop", href: "https://example.com" } },
      { type: "announcement", props: { title: "Restock alert", message: "Add your next drop date or promo code here.", style: "strong" } },
      { type: "social_links", props: { links: [{ platform: "instagram", label: "Instagram", href: "https://instagram.com/" }] } }
    ]
  },
  {
    id: "salon-beauty",
    name: "Salon / Beauty",
    category: "Beauty",
    description: "Polished services page for salons, beauty artists, and wellness providers.",
    recommendedButtonStyle: "pill",
    layoutStyle: "centered",
    footerText: "Appointments by request.",
    theme: theme({
      gradientFrom: "#fce7f3",
      gradientTo: "#fff1f2",
      primaryColor: "#db2777",
      buttonColor: "#be185d",
      buttonStyle: "pill",
      fontStyle: "elegant",
      layoutStyle: "centered",
      footerText: "Appointments by request."
    }),
    blocks: [
      { type: "profile", props: { imageUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035", name: "Beauty Studio", subtitle: "Hair, nails, skin, and glow-ups.", circular: true } },
      { type: "price_list", props: { title: "Services", items: [
        { name: "Hair styling", description: "Wash and finish", price: "$45" },
        { name: "Makeup session", description: "Event-ready look", price: "$80" }
      ] } },
      { type: "whatsapp_button", props: { label: "Book on WhatsApp", phoneE164: "+15551234567" } },
      { type: "gallery", props: { images: [{ src: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e", alt: "Salon work" }] } },
      { type: "faq", props: { items: [{ question: "Do I need a deposit?", answer: "Add your booking and cancellation policy here." }] } }
    ]
  },
  {
    id: "driver-transport",
    name: "Driver / Transport Service",
    category: "Transport",
    description: "Fast contact page for private drivers, delivery, airport rides, or transport.",
    recommendedButtonStyle: "shadow",
    layoutStyle: "centered",
    footerText: "Available by request.",
    theme: theme({
      gradientFrom: "#dbeafe",
      gradientTo: "#eff6ff",
      primaryColor: "#2563eb",
      buttonColor: "#1e3a8a",
      buttonStyle: "shadow",
      layoutStyle: "centered",
      footerText: "Available by request."
    }),
    blocks: [
      { type: "profile", props: { imageUrl: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d", name: "Your Transport Service", subtitle: "Airport trips, city rides, and scheduled transport.", circular: false } },
      { type: "whatsapp_button", props: { label: "Request a ride", phoneE164: "+15551234567", message: "Hi, I want to book a ride." } },
      { type: "price_list", props: { title: "Sample routes", items: [
        { name: "Airport pickup", description: "City area", price: "From $35" },
        { name: "Hourly driver", description: "Minimum 2 hours", price: "$25/hr" }
      ] } },
      { type: "map_location", props: { title: "Service area", mapsUrl: "https://maps.google.com", buttonText: "View service area" } },
      { type: "contact_card", props: { phone: "+1 555 123 4567", whatsapp: "+15551234567" } }
    ]
  },
  {
    id: "freelancer-services",
    name: "Freelancer / Services",
    category: "Services",
    description: "Clear service menu for consultants, designers, developers, and specialists.",
    recommendedButtonStyle: "outline",
    layoutStyle: "card_based",
    footerText: "Open for selected projects.",
    theme: theme({
      backgroundType: "solid",
      backgroundColor: "#f8fafc",
      primaryColor: "#0f766e",
      buttonColor: "#0f766e",
      buttonStyle: "outline",
      fontStyle: "clean",
      layoutStyle: "card_based",
      footerText: "Open for selected projects."
    }),
    blocks: [
      { type: "profile", props: { imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d", name: "Your Name", subtitle: "Independent consultant and service provider.", circular: true } },
      { type: "text", props: { text: "A short positioning statement: who you help, what problem you solve, and how to start." } },
      { type: "price_list", props: { title: "Services", items: [
        { name: "Strategy call", description: "60-minute session", price: "$150" },
        { name: "Project package", description: "Custom scope", price: "From $900" }
      ] } },
      { type: "link_button", props: { label: "View portfolio", href: "https://example.com" } },
      { type: "contact_card", props: { email: "hello@example.com", phone: "+1 555 123 4567" } }
    ]
  },
  {
    id: "event-booking",
    name: "Event / Booking Page",
    category: "Event",
    description: "Event landing page with countdown, details, map, and booking link.",
    recommendedButtonStyle: "shadow",
    layoutStyle: "full_width_mobile",
    footerText: "Save your spot before seats run out.",
    theme: theme({
      gradientFrom: "#111827",
      gradientTo: "#312e81",
      primaryColor: "#f59e0b",
      textColor: "#f8fafc",
      buttonColor: "#f59e0b",
      buttonStyle: "shadow",
      fontStyle: "bold",
      layoutStyle: "full_width_mobile",
      cardColor: "#111827",
      profileStyle: "rounded_square",
      footerText: "Save your spot before seats run out."
    }),
    blocks: [
      { type: "header", props: { title: "Event Name", subtitle: "A one-night experience, workshop, launch, or gathering." } },
      { type: "countdown", props: { title: "Event starts", dateTimeText: "June 1, 2026 at 7:00 PM" } },
      { type: "link_button", props: { label: "Reserve your spot", href: "https://example.com" } },
      { type: "map_location", props: { title: "Venue", mapsUrl: "https://maps.google.com", buttonText: "Open venue map" } },
      { type: "faq", props: { items: [{ question: "What should I bring?", answer: "Add event details, dress code, parking, or entry notes here." }] } }
    ]
  }
];

export function instantiateTemplateBlocks(
  template: PageTemplate,
  createBlockId: () => string
): Block[] {
  return template.blocks.map((starter) => {
    const id = createBlockId();
    const block = sanitizeBlock({
      id,
      type: starter.type,
      props: starter.props as Record<string, unknown>
    });
    if (!block) {
      throw new Error(`Template "${template.id}" has an invalid "${starter.type}" block (URLs, phones, or required fields).`);
    }
    return { ...block, id };
  });
}
