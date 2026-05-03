import type { Block } from "./blocks";

const META_TITLE_MAX = 70;
const META_DESC_MAX = 320;

export function sanitizeSeoTitle(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  return s.slice(0, META_TITLE_MAX);
}

export function sanitizeSeoDescription(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  return s.slice(0, META_DESC_MAX);
}

/** Prefer subtitle-like fields, then first text block; fallback empty (caller applies title fallback). */
export function deriveMetaDescription(blocks: Block[], pageTitle: string): string {
  for (const b of blocks) {
    if (b.type === "profile" && b.props.subtitle?.trim()) {
      return cleanSnippet(b.props.subtitle, META_DESC_MAX);
    }
  }
  for (const b of blocks) {
    if (b.type === "header" && b.props.subtitle?.trim()) {
      return cleanSnippet(b.props.subtitle, META_DESC_MAX);
    }
  }
  for (const b of blocks) {
    if (b.type === "text" && b.props.text?.trim()) {
      return cleanSnippet(b.props.text, META_DESC_MAX);
    }
  }
  const base = pageTitle.trim() || "Smart page";
  return `${base} - Links, updates, and contact in one page.`.slice(0, META_DESC_MAX);
}

function cleanSnippet(text: string, max: number) {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max - 1)}...`;
}

export function resolvePublicMetaTitle(pageTitle: string, seoTitle: string | null | undefined): string {
  const custom = seoTitle?.trim();
  if (custom) return custom.slice(0, META_TITLE_MAX);
  return pageTitle.trim() || "Smart page";
}

export function resolvePublicMetaDescription(
  blocks: Block[],
  pageTitle: string,
  seoDescription: string | null | undefined
): string {
  const custom = seoDescription?.trim();
  if (custom) return custom.slice(0, META_DESC_MAX);
  return deriveMetaDescription(blocks, pageTitle);
}

/** HTTPS preferred; caller passes validated absolute URLs only. */
export function pickOgImage(blocks: Block[]): string | undefined {
  for (const b of blocks) {
    if (b.type === "profile" && isHttpsUrl(b.props.imageUrl)) return b.props.imageUrl;
  }
  for (const b of blocks) {
    if (b.type === "gallery") {
      for (const img of b.props.images) {
        if (isHttpsUrl(img.src)) return img.src;
      }
    }
  }
  for (const b of blocks) {
    if (b.type === "image" && isHttpsUrl(b.props.src)) return b.props.src;
  }
  return undefined;
}

function isHttpsUrl(url: string) {
  return url.startsWith("https://") || url.startsWith("http://");
}

export type StickyContact = { href: string; label: string };

export function pickStickyContact(blocks: Block[]): StickyContact | null {
  for (const b of blocks) {
    if (b.type === "whatsapp_button") {
      const message = b.props.message ? `?text=${encodeURIComponent(b.props.message)}` : "";
      const href = `https://wa.me/${b.props.phoneE164.replace("+", "")}${message}`;
      return { href, label: b.props.label };
    }
  }
  for (const b of blocks) {
    if (b.type === "contact_card" && b.props.phone?.trim()) {
      const tel = b.props.phone.replace(/\s+/g, "");
      return { href: `tel:${tel}`, label: "Call" };
    }
  }
  return null;
}
