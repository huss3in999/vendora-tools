import type { FaqItem, GalleryImage, PriceItem, SocialLink } from "./blocks";

/** Keeps in-progress rows while typing (name|description|price). */
export function linesToPriceItemsLenient(value: string): PriceItem[] {
  return value
    .split("\n")
    .map((line) => {
      const [name = "", description = "", price = ""] = line.split("|").map((part) => part.trim());
      return {
        name,
        description: description ? description : undefined,
        price
      };
    })
    .filter((item) => item.name || item.description || item.price);
}

export function priceItemsToLines(items: PriceItem[]): string {
  return items.map((item) => `${item.name}|${item.description ?? ""}|${item.price}`).join("\n");
}

export function normalizePriceLinesText(raw: string): string {
  return priceItemsToLines(linesToPriceItemsLenient(raw));
}

export function linesToFaqItemsLenient(value: string): FaqItem[] {
  return value
    .split("\n")
    .map((line) => {
      const [question = "", answer = ""] = line.split("|").map((part) => part.trim());
      return { question, answer };
    })
    .filter((item) => item.question || item.answer);
}

export function faqItemsToLines(items: FaqItem[]): string {
  return items.map((item) => `${item.question}|${item.answer}`).join("\n");
}

export function normalizeFaqLinesText(raw: string): string {
  return faqItemsToLines(linesToFaqItemsLenient(raw));
}

export function linesToGalleryImagesLenient(value: string): GalleryImage[] {
  return value
    .split("\n")
    .map((line) => {
      const [src = "", alt = ""] = line.split("|").map((part) => part.trim());
      return { src, alt: alt || undefined };
    })
    .filter((item) => item.src || item.alt);
}

export function galleryImagesToLines(images: GalleryImage[]): string {
  return images.map((item) => `${item.src}|${item.alt ?? ""}`).join("\n");
}

export function normalizeGalleryLinesText(raw: string): string {
  return galleryImagesToLines(linesToGalleryImagesLenient(raw));
}

export function linesToSocialLinksLenient(value: string): SocialLink[] {
  return value
    .split("\n")
    .map((line) => {
      const [platform = "website", label = "", href = ""] = line.split("|").map((part) => part.trim());
      return { platform: platform as SocialLink["platform"], label, href };
    })
    .filter((item) => item.label || item.href);
}

export function socialLinksToLines(links: SocialLink[]): string {
  return links.map((item) => `${item.platform}|${item.label}|${item.href}`).join("\n");
}

export function normalizeSocialLinesText(raw: string): string {
  return socialLinksToLines(linesToSocialLinksLenient(raw));
}
