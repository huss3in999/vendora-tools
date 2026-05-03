export type PageTheme = {
  backgroundType: "solid" | "gradient" | "image";
  backgroundColor: string;
  gradientFrom: string;
  gradientTo: string;
  backgroundImageUrl?: string;
  primaryColor: string;
  textColor: string;
  cardColor: string;
  buttonColor: string;
  buttonStyle: "rounded" | "pill" | "square" | "shadow" | "outline";
  fontStyle: "clean" | "elegant" | "bold" | "minimal";
  layoutStyle: "centered" | "full_width_mobile" | "card_based";
  profileStyle: "circle" | "rounded_square" | "square";
  showPlatformBadge: boolean;
  footerText?: string;
};

export const DEFAULT_PAGE_THEME: PageTheme = {
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
  footerText: ""
};

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
}

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function cleanExternalUrl(value: unknown) {
  const text = cleanText(value, 500);
  return text.startsWith("https://") || text.startsWith("http://") ? text : undefined;
}

function allow<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === "string" && options.includes(value as T) ? (value as T) : fallback;
}

export function sanitizePageTheme(input: unknown): PageTheme {
  const value = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  return {
    backgroundType: allow(value.backgroundType, ["solid", "gradient", "image"], DEFAULT_PAGE_THEME.backgroundType),
    backgroundColor: isHexColor(value.backgroundColor) ? value.backgroundColor : DEFAULT_PAGE_THEME.backgroundColor,
    gradientFrom: isHexColor(value.gradientFrom) ? value.gradientFrom : DEFAULT_PAGE_THEME.gradientFrom,
    gradientTo: isHexColor(value.gradientTo) ? value.gradientTo : DEFAULT_PAGE_THEME.gradientTo,
    backgroundImageUrl: cleanExternalUrl(value.backgroundImageUrl),
    primaryColor: isHexColor(value.primaryColor) ? value.primaryColor : DEFAULT_PAGE_THEME.primaryColor,
    textColor: isHexColor(value.textColor) ? value.textColor : DEFAULT_PAGE_THEME.textColor,
    cardColor: isHexColor(value.cardColor) ? value.cardColor : DEFAULT_PAGE_THEME.cardColor,
    buttonColor: isHexColor(value.buttonColor) ? value.buttonColor : DEFAULT_PAGE_THEME.buttonColor,
    buttonStyle: allow(
      value.buttonStyle,
      ["rounded", "pill", "square", "shadow", "outline"],
      DEFAULT_PAGE_THEME.buttonStyle
    ),
    fontStyle: allow(value.fontStyle, ["clean", "elegant", "bold", "minimal"], DEFAULT_PAGE_THEME.fontStyle),
    layoutStyle: allow(
      value.layoutStyle,
      ["centered", "full_width_mobile", "card_based"],
      DEFAULT_PAGE_THEME.layoutStyle
    ),
    profileStyle: allow(
      value.profileStyle,
      ["circle", "rounded_square", "square"],
      DEFAULT_PAGE_THEME.profileStyle
    ),
    showPlatformBadge: value.showPlatformBadge === false ? false : DEFAULT_PAGE_THEME.showPlatformBadge,
    footerText: cleanText(value.footerText, 120)
  };
}

export function parsePageThemeJson(themeJson: string | null | undefined): PageTheme {
  try {
    return sanitizePageTheme(themeJson ? JSON.parse(themeJson) : {});
  } catch {
    return DEFAULT_PAGE_THEME;
  }
}
