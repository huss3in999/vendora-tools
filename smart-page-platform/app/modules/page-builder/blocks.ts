export type BlockType =
  | "header"
  | "text"
  | "link_button"
  | "image"
  | "video"
  | "whatsapp_button"
  | "divider"
  | "profile"
  | "social_links"
  | "faq"
  | "map_location"
  | "price_list"
  | "gallery"
  | "contact_card"
  | "countdown"
  | "announcement"
  | "html_embed"
  | "form"
  | "digital_products"
  | "advanced_timer";

export type SocialLink = {
  platform: "instagram" | "tiktok" | "whatsapp" | "youtube" | "website" | "email";
  label: string;
  href: string;
};

export type FaqItem = { question: string; answer: string };
export type PriceItem = { name: string; description?: string; price: string };
export type GalleryImage = { src: string; alt?: string };
export type LeadFieldKey = "name" | "phone" | "email" | "message";
export type ProductItem = {
  title: string;
  description?: string;
  priceText?: string;
  imageUrl?: string;
  buttonText: string;
  buttonUrl: string;
};

/** Taplink-style divider controls (all optional for backward compatibility). */
export type DividerVariant = "classic" | "empty" | "simple" | "decorative";
export type DividerSpacingStep = 0 | 1 | 2 | 3 | 4;

export type DividerBlockProps = {
  label?: string;
  /** `classic` = split lines + optional center label (original look). */
  variant?: DividerVariant;
  /** Content density / vertical space around the divider (0x–4x). */
  indent?: DividerSpacingStep;
  fullWidth?: boolean;
  softEdges?: boolean;
  /** When true, block is omitted on the public page (still editable here). */
  hidden?: boolean;
  /** Internal name in the editor only. */
  editorLabel?: string;
  paddingTop?: DividerSpacingStep;
  paddingBottom?: DividerSpacingStep;
  edgeIndent?: boolean;
  /** Section background (#rgb or #rrggbb). */
  sectionBackground?: string;
  /** Extra gap before the divider (visual “vertical indent”). */
  extraVerticalSpacing?: boolean;
};

export type Block =
  | { id: string; type: "header"; props: { title: string; subtitle?: string } }
  | { id: string; type: "text"; props: { text: string } }
  | { id: string; type: "link_button"; props: { label: string; href: string } }
  | { id: string; type: "image"; props: { src: string; alt?: string } }
  | { id: string; type: "video"; props: { src: string } }
  | {
      id: string;
      type: "whatsapp_button";
      props: { label: string; phoneE164: string; message?: string };
    }
  | { id: string; type: "divider"; props: DividerBlockProps }
  | {
      id: string;
      type: "profile";
      props: { imageUrl: string; name: string; subtitle?: string; circular?: boolean };
    }
  | { id: string; type: "social_links"; props: { links: SocialLink[] } }
  | { id: string; type: "faq"; props: { items: FaqItem[] } }
  | { id: string; type: "map_location"; props: { title: string; mapsUrl: string; buttonText: string } }
  | { id: string; type: "price_list"; props: { title?: string; items: PriceItem[] } }
  | { id: string; type: "gallery"; props: { images: GalleryImage[] } }
  | {
      id: string;
      type: "contact_card";
      props: { phone?: string; whatsapp?: string; email?: string; address?: string };
    }
  | { id: string; type: "countdown"; props: { title: string; dateTimeText: string } }
  | {
      id: string;
      type: "announcement";
      props: { title: string; message: string; style?: "soft" | "strong" };
    }
  | { id: string; type: "html_embed"; props: { html: string; allowScripts?: boolean } }
  | {
      id: string;
      type: "form";
      props: {
        title: string;
        enabledFields: LeadFieldKey[];
        submitText: string;
      };
    }
  | {
      id: string;
      type: "digital_products";
      props: {
        title?: string;
        note?: string;
        items: ProductItem[];
      };
    }
  | {
      id: string;
      type: "advanced_timer";
      props: {
        title: string;
        targetIso: string;
        dateTimeText: string;
        beforeMessage: string;
        afterMessage: string;
      };
    };

export const PHASE1_BLOCK_LIBRARY: { type: BlockType; label: string }[] = [
  { type: "profile", label: "Avatar / Profile" },
  { type: "header", label: "Header" },
  { type: "text", label: "Text" },
  { type: "link_button", label: "Link button" },
  { type: "whatsapp_button", label: "WhatsApp / Contact button" },
  { type: "social_links", label: "Social links" },
  { type: "announcement", label: "Announcement" },
  { type: "divider", label: "Divider" },
  { type: "faq", label: "FAQ" },
  { type: "map_location", label: "Map / Location" },
  { type: "price_list", label: "Price list" },
  { type: "gallery", label: "Gallery" },
  { type: "contact_card", label: "Contact card" },
  { type: "countdown", label: "Timer / Countdown" },
  { type: "image", label: "Image" },
  { type: "video", label: "Video" },
  { type: "html_embed", label: "HTML / embed" },
  { type: "form", label: "Lead form" },
  { type: "digital_products", label: "Digital products" },
  { type: "advanced_timer", label: "Advanced timer" }
];
