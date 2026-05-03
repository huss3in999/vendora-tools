import type {
  Block,
  BlockType,
  LeadFieldKey,
  ProductItem,
  DividerSpacingStep,
  DividerVariant,
  FaqItem,
  GalleryImage,
  PriceItem,
  SocialLink
} from "./blocks";
import { HTML_EMBED_MAX_LENGTH, sanitizeHtmlForSandboxStorage } from "./html-sanitize";

const BLOCK_TYPES = new Set<BlockType>([
  "header",
  "text",
  "link_button",
  "image",
  "video",
  "whatsapp_button",
  "divider",
  "profile",
  "social_links",
  "faq",
  "map_location",
  "price_list",
  "gallery",
  "contact_card",
  "countdown",
  "announcement",
  "html_embed",
  "form",
  "digital_products",
  "advanced_timer"
]);

const SOCIAL_PLATFORMS = new Set<SocialLink["platform"]>([
  "instagram",
  "tiktok",
  "whatsapp",
  "youtube",
  "website",
  "email"
]);
const LEAD_FIELD_KEYS = new Set<LeadFieldKey>(["name", "phone", "email", "message"]);

function randomBlockId() {
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 20);
  return `blk_${random}`;
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function validateUrlLike(value: string) {
  return value.startsWith("/") || value.startsWith("https://") || value.startsWith("http://");
}

function validateExternalUrl(value: string) {
  return value.startsWith("https://") || value.startsWith("http://");
}

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateContactHref(value: string) {
  return validateExternalUrl(value) || value.startsWith("mailto:") || value.startsWith("tel:");
}

function validatePhoneLoose(value: string) {
  return /^\+?[0-9][0-9\s\-()]{6,20}$/.test(value.trim());
}

function cleanBoolean(value: unknown) {
  return value === true || value === "true";
}

function cleanDividerStep(value: unknown): DividerSpacingStep {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 4) return 4;
  return n as DividerSpacingStep;
}

function cleanDividerVariant(value: unknown): DividerVariant {
  const s = String(value ?? "classic");
  if (s === "empty" || s === "simple" || s === "decorative" || s === "classic") return s;
  return "classic";
}

function cleanSectionColor(value: unknown): string | undefined {
  const s = cleanText(value, 16).trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s) || /^#[0-9A-Fa-f]{3}$/.test(s)) return s;
  return undefined;
}

function cleanEnabledLeadFields(value: unknown): LeadFieldKey[] {
  if (!Array.isArray(value)) return ["name", "phone", "email", "message"];
  const unique = Array.from(
    new Set(
      value
        .map((v) => String(v) as LeadFieldKey)
        .filter((v): v is LeadFieldKey => LEAD_FIELD_KEYS.has(v))
    )
  );
  return unique.length > 0 ? unique : ["name", "phone", "email", "message"];
}

function cleanProductItems(value: unknown): ProductItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 20)
    .map((item) => {
      const entry = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        title: cleanText(entry.title, 140),
        description: entry.description ? cleanText(entry.description, 500) : undefined,
        priceText: entry.priceText ? cleanText(entry.priceText, 80) : undefined,
        imageUrl: entry.imageUrl ? cleanText(entry.imageUrl, 500) : undefined,
        buttonText: cleanText(entry.buttonText, 80) || "Open",
        buttonUrl: cleanText(entry.buttonUrl, 500)
      };
    })
    .filter((item) => item.title && item.buttonUrl && validateContactHref(item.buttonUrl))
    .map((item) => ({
      ...item,
      imageUrl: item.imageUrl && validateExternalUrl(item.imageUrl) ? item.imageUrl : undefined
    }));
}

export function cleanFaqItems(value: unknown): FaqItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 10)
    .map((item) => {
      const entry = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        question: cleanText(entry.question, 160),
        answer: cleanText(entry.answer, 700)
      };
    })
    .filter((item) => item.question && item.answer);
}

export function cleanPriceItems(value: unknown): PriceItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 20)
    .map((item) => {
      const entry = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        name: cleanText(entry.name, 120),
        description: entry.description ? cleanText(entry.description, 240) : undefined,
        price: cleanText(entry.price, 80)
      };
    })
    .filter((item) => item.name && item.price);
}

export function cleanGalleryImages(value: unknown): GalleryImage[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 12)
    .map((item) => {
      const entry = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        src: cleanText(entry.src, 500),
        alt: entry.alt ? cleanText(entry.alt, 160) : undefined
      };
    })
    .filter((item) => item.src && validateExternalUrl(item.src));
}

export function cleanSocialLinks(value: unknown): SocialLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 8)
    .map((item) => {
      const entry = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const platform = String(entry.platform ?? "") as SocialLink["platform"];
      const label = cleanText(entry.label, 80);
      const href = cleanText(entry.href, 500);
      return { platform, label, href };
    })
    .filter(
      (item) =>
        SOCIAL_PLATFORMS.has(item.platform) &&
        item.label &&
        item.href &&
        (item.platform === "email"
          ? validateEmail(item.href) || item.href.startsWith("mailto:")
          : validateContactHref(item.href))
    )
    .map((item) => ({
      ...item,
      href: item.platform === "email" && validateEmail(item.href) ? `mailto:${item.href}` : item.href
    }));
}

export function sanitizeBlock(input: unknown): Block | null {
  if (!input || typeof input !== "object") return null;

  const candidate = input as { id?: unknown; type?: unknown; props?: unknown };
  if (typeof candidate.type !== "string" || !BLOCK_TYPES.has(candidate.type as BlockType)) {
    return null;
  }

  const id =
    typeof candidate.id === "string" && /^blk_[a-zA-Z0-9]+$/.test(candidate.id)
      ? candidate.id
      : randomBlockId();
  const props = candidate.props && typeof candidate.props === "object" ? candidate.props : {};
  const typedProps = props as Record<string, unknown>;

  switch (candidate.type) {
    case "header": {
      const title = cleanText(typedProps.title, 120);
      if (!title) return null;
      return {
        id,
        type: "header",
        props: {
          title,
          subtitle: typedProps.subtitle ? cleanText(typedProps.subtitle, 180) : undefined
        }
      };
    }
    case "text": {
      const text = cleanText(typedProps.text, 2000);
      if (!text) return null;
      return { id, type: "text", props: { text } };
    }
    case "link_button": {
      const label = cleanText(typedProps.label, 80);
      const href = cleanText(typedProps.href, 500);
      if (!label || !href || !validateUrlLike(href)) return null;
      return {
        id,
        type: "link_button",
        props: {
          label,
          href
        }
      };
    }
    case "image": {
      const src = cleanText(typedProps.src, 500);
      if (!src || !validateUrlLike(src)) return null;
      return {
        id,
        type: "image",
        props: {
          src,
          alt: typedProps.alt ? cleanText(typedProps.alt, 160) : undefined
        }
      };
    }
    case "video": {
      const src = cleanText(typedProps.src, 500);
      if (!src || !validateUrlLike(src)) return null;
      return { id, type: "video", props: { src } };
    }
    case "whatsapp_button": {
      const label = cleanText(typedProps.label, 80);
      const phoneE164 = cleanText(typedProps.phoneE164, 32);
      if (!label || !/^\+[1-9]\d{7,14}$/.test(phoneE164)) return null;
      return {
        id,
        type: "whatsapp_button",
        props: {
          label,
          phoneE164,
          message: typedProps.message ? cleanText(typedProps.message, 300) : undefined
        }
      };
    }
    case "divider": {
      const label = typedProps.label ? cleanText(typedProps.label, 80) : undefined;
      const variant = cleanDividerVariant(typedProps.variant);
      const indent = cleanDividerStep(typedProps.indent);
      const paddingTop = cleanDividerStep(typedProps.paddingTop);
      const paddingBottom = cleanDividerStep(typedProps.paddingBottom);
      const propsOut = {
        label,
        variant,
        indent,
        fullWidth: cleanBoolean(typedProps.fullWidth),
        softEdges: cleanBoolean(typedProps.softEdges),
        hidden: cleanBoolean(typedProps.hidden),
        editorLabel: typedProps.editorLabel ? cleanText(typedProps.editorLabel, 80) : undefined,
        paddingTop,
        paddingBottom,
        edgeIndent: cleanBoolean(typedProps.edgeIndent),
        sectionBackground: cleanSectionColor(typedProps.sectionBackground),
        extraVerticalSpacing: cleanBoolean(typedProps.extraVerticalSpacing)
      };
      return { id, type: "divider", props: propsOut };
    }
    case "profile": {
      const imageUrl = cleanText(typedProps.imageUrl, 500);
      const name = cleanText(typedProps.name, 120);
      if (!imageUrl || !validateExternalUrl(imageUrl) || !name) return null;
      return {
        id,
        type: "profile",
        props: {
          imageUrl,
          name,
          subtitle: typedProps.subtitle ? cleanText(typedProps.subtitle, 180) : undefined,
          circular: cleanBoolean(typedProps.circular)
        }
      };
    }
    case "social_links": {
      const links = cleanSocialLinks(typedProps.links);
      return { id, type: "social_links", props: { links } };
    }
    case "faq": {
      const items = cleanFaqItems(typedProps.items);
      return { id, type: "faq", props: { items } };
    }
    case "map_location": {
      const title = cleanText(typedProps.title, 120);
      const mapsUrl = cleanText(typedProps.mapsUrl, 500);
      const buttonText = cleanText(typedProps.buttonText, 80) || "Open map";
      if (!title || !mapsUrl || !validateExternalUrl(mapsUrl)) return null;
      return { id, type: "map_location", props: { title, mapsUrl, buttonText } };
    }
    case "price_list": {
      const items = cleanPriceItems(typedProps.items);
      return {
        id,
        type: "price_list",
        props: {
          title: typedProps.title ? cleanText(typedProps.title, 120) : undefined,
          items
        }
      };
    }
    case "gallery": {
      const images = cleanGalleryImages(typedProps.images);
      return { id, type: "gallery", props: { images } };
    }
    case "contact_card": {
      const phone = typedProps.phone ? cleanText(typedProps.phone, 80) : undefined;
      const whatsapp = typedProps.whatsapp ? cleanText(typedProps.whatsapp, 32) : undefined;
      const email = typedProps.email ? cleanText(typedProps.email, 160) : undefined;
      const address = typedProps.address ? cleanText(typedProps.address, 240) : undefined;
      if (!phone && !whatsapp && !email && !address) return null;
      if (whatsapp && !/^\+[1-9]\d{7,14}$/.test(whatsapp)) return null;
      if (email && !validateEmail(email)) return null;
      return { id, type: "contact_card", props: { phone, whatsapp, email, address } };
    }
    case "countdown": {
      const title = cleanText(typedProps.title, 120);
      const dateTimeText = cleanText(typedProps.dateTimeText, 120);
      if (!title || !dateTimeText) return null;
      return { id, type: "countdown", props: { title, dateTimeText } };
    }
    case "announcement": {
      const title = cleanText(typedProps.title, 120);
      const message = cleanText(typedProps.message, 600);
      if (!title || !message) return null;
      return {
        id,
        type: "announcement",
        props: { title, message, style: typedProps.style === "strong" ? "strong" : "soft" }
      };
    }
    case "html_embed": {
      const raw = cleanText(typedProps.html, HTML_EMBED_MAX_LENGTH);
      const allowScripts = cleanBoolean(typedProps.allowScripts);
      const html = sanitizeHtmlForSandboxStorage(raw, HTML_EMBED_MAX_LENGTH, { allowScripts });
      if (!html.trim()) return null;
      return { id, type: "html_embed", props: { html, allowScripts } };
    }
    case "form": {
      const title = cleanText(typedProps.title, 120) || "Contact form";
      const submitText = cleanText(typedProps.submitText, 40) || "Send";
      const enabledFields = cleanEnabledLeadFields(typedProps.enabledFields);
      return {
        id,
        type: "form",
        props: {
          title,
          enabledFields,
          submitText
        }
      };
    }
    case "digital_products": {
      const title = typedProps.title ? cleanText(typedProps.title, 120) : undefined;
      const note = typedProps.note ? cleanText(typedProps.note, 240) : undefined;
      return {
        id,
        type: "digital_products",
        props: {
          title,
          note,
          items: cleanProductItems(typedProps.items)
        }
      };
    }
    case "advanced_timer": {
      const title = cleanText(typedProps.title, 120) || "Countdown";
      const targetIso = cleanText(typedProps.targetIso, 80);
      const dateTimeText = cleanText(typedProps.dateTimeText, 120) || targetIso || "Set date/time";
      const beforeMessage = cleanText(typedProps.beforeMessage, 260) || "Ends soon";
      const afterMessage = cleanText(typedProps.afterMessage, 260) || "Offer has ended";
      const parsed = targetIso ? Date.parse(targetIso) : Number.NaN;
      if (!Number.isFinite(parsed)) {
        return {
          id,
          type: "advanced_timer",
          props: {
            title,
            targetIso: "",
            dateTimeText,
            beforeMessage,
            afterMessage
          }
        };
      }
      return {
        id,
        type: "advanced_timer",
        props: {
          title,
          targetIso: new Date(parsed).toISOString(),
          dateTimeText,
          beforeMessage,
          afterMessage
        }
      };
    }
    default:
      return null;
  }
}
