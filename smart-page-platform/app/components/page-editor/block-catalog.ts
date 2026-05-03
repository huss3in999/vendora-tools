import type { BlockType } from "~/modules/page-builder/blocks";

export type CatalogBlockEntry =
  | {
      kind: "live";
      type: BlockType;
      label: string;
      description: string;
      icon: string;
    }
  | {
      kind: "soon";
      id: string;
      label: string;
      description: string;
      icon: string;
    };

export const BLOCK_GROUPS: { title: string; blocks: CatalogBlockEntry[] }[] = [
  {
    title: "Basic blocks",
    blocks: [
      {
        kind: "live",
        type: "header",
        label: "Section header",
        description: "Bold title with optional subtitle.",
        icon: "H"
      },
      {
        kind: "live",
        type: "text",
        label: "Text",
        description: "Paragraph or short bio.",
        icon: "T"
      },
      {
        kind: "live",
        type: "link_button",
        label: "Link button",
        description: "Primary call-to-action link.",
        icon: "→"
      },
      {
        kind: "live",
        type: "image",
        label: "Image",
        description: "Single banner or hero image URL.",
        icon: "◼"
      },
      {
        kind: "live",
        type: "divider",
        label: "Divider",
        description: "Separate sections loosely.",
        icon: "—"
      },
      {
        kind: "live",
        type: "announcement",
        label: "Announcement",
        description: "Highlight news or offers.",
        icon: "!"
      },
      {
        kind: "live",
        type: "html_embed",
        label: "HTML / embed",
        description: "Custom HTML with strict safety limits.",
        icon: "</>"
      }
    ]
  },
  {
    title: "Profile blocks",
    blocks: [
      {
        kind: "live",
        type: "profile",
        label: "Avatar / Profile",
        description: "Photo, name, and tagline.",
        icon: "◎"
      },
      {
        kind: "live",
        type: "social_links",
        label: "Social links",
        description: "Instagram, YouTube, site, email.",
        icon: "♥"
      },
      {
        kind: "live",
        type: "whatsapp_button",
        label: "WhatsApp button",
        description: "Opens chat with prefilled message.",
        icon: "W"
      },
      {
        kind: "live",
        type: "contact_card",
        label: "Contact card",
        description: "Phone, WhatsApp, email, address.",
        icon: "✆"
      }
    ]
  },
  {
    title: "Business blocks",
    blocks: [
      {
        kind: "live",
        type: "price_list",
        label: "Price list",
        description: "Menus and packages.",
        icon: "$"
      },
      {
        kind: "live",
        type: "faq",
        label: "FAQ",
        description: "Questions visitors ask often.",
        icon: "?"
      },
      {
        kind: "live",
        type: "map_location",
        label: "Map / Location",
        description: "Link out to Google Maps.",
        icon: "⌖"
      },
      {
        kind: "live",
        type: "gallery",
        label: "Gallery",
        description: "Grid of image URLs.",
        icon: "▦"
      },
      {
        kind: "live",
        type: "video",
        label: "Video",
        description: "Embed a hosted video URL.",
        icon: "▶"
      },
      {
        kind: "live",
        type: "countdown",
        label: "Timer / Countdown",
        description: "Event date shown prominently.",
        icon: "⏱"
      }
    ]
  },
  {
    title: "Advanced blocks",
    blocks: [
      {
        kind: "live",
        type: "form",
        label: "Forms",
        description: "Collect name, phone, email, and message leads.",
        icon: "☰"
      },
      {
        kind: "live",
        type: "digital_products",
        label: "Digital products",
        description: "Show products and send users to external checkout/contact.",
        icon: "⬇"
      },
      {
        kind: "live",
        type: "advanced_timer",
        label: "Advanced timers",
        description: "Countdown with before/after messages.",
        icon: "⏳"
      }
    ]
  }
];

export function catalogLiveBlocks(): Extract<CatalogBlockEntry, { kind: "live" }>[] {
  return BLOCK_GROUPS.flatMap((g) => g.blocks).filter((b): b is Extract<CatalogBlockEntry, { kind: "live" }> => b.kind === "live");
}

export function catalogLiveBlockGroups(): {
  title: string;
  blocks: Extract<CatalogBlockEntry, { kind: "live" }>[];
}[] {
  return BLOCK_GROUPS.filter((g) => g.blocks.some((b) => b.kind === "live")).map((g) => ({
    title: g.title,
    blocks: g.blocks.filter((b): b is Extract<CatalogBlockEntry, { kind: "live" }> => b.kind === "live")
  }));
}

export function catalogSoonBlocks(): Extract<CatalogBlockEntry, { kind: "soon" }>[] {
  return BLOCK_GROUPS.flatMap((g) => g.blocks).filter((b): b is Extract<CatalogBlockEntry, { kind: "soon" }> => b.kind === "soon");
}

/** Groups that contain at least one “soon” tile (for headings in the add-block picker). */
export function catalogSoonBlockGroups(): {
  title: string;
  blocks: Extract<CatalogBlockEntry, { kind: "soon" }>[];
}[] {
  return BLOCK_GROUPS.filter((g) => g.blocks.some((b) => b.kind === "soon")).map((g) => ({
    title: g.title,
    blocks: g.blocks.filter((b): b is Extract<CatalogBlockEntry, { kind: "soon" }> => b.kind === "soon")
  }));
}

export function labelForBlockType(type: BlockType): string {
  for (const g of BLOCK_GROUPS) {
    for (const b of g.blocks) {
      if (b.kind === "live" && b.type === type) return b.label;
    }
  }
  return type.replace(/_/g, " ");
}
