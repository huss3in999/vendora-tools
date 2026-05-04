import type { AppLoadContext } from "@remix-run/cloudflare";

export type AppBindings = {
  DB?: D1Database;
  SESSION_SECRET?: string;
  GOOGLE_ANALYTICS_MEASUREMENT_ID?: string;
  GOOGLE_ANALYTICS_API_SECRET?: string;
  ELASTIC_TRACKER_URL?: string;
  ELASTIC_API_KEY?: string;
};

type CloudflareLoadContext = AppLoadContext & {
  cloudflare?: {
    env?: AppBindings;
  };
  env?: AppBindings;
};

export type WorkspaceRow = {
  id: string;
  slug: string;
  name: string;
  status: "active" | "suspended" | "deleted";
  created_at: string;
  updated_at: string;
};

export type UserRow = {
  id: string;
  email: string;
  name: string;
  role: "user" | "super_admin";
  password_hash: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
};

export type WorkspaceMemberRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "owner" | "admin" | "editor" | "viewer";
  status: "active" | "invited" | "disabled";
  created_at: string;
  updated_at: string;
};

export type PageRow = {
  id: string;
  workspace_id: string;
  title: string;
  slug: string;
  status: "draft" | "published" | "archived";
  theme_json: string;
  seo_title: string | null;
  seo_description: string | null;
  allow_indexing: number;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PageBlockRow = {
  id: string;
  page_id: string;
  type:
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
  sort_order: number;
  props_json: string;
  created_at: string;
  updated_at: string;
};

export type ShortLinkRow = {
  id: string;
  workspace_id: string;
  page_id: string;
  code: string;
  status: "active" | "disabled";
  created_by_user_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionRow = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  expires_at: string;
  revoked_at: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  created_at: string;
  updated_at: string;
};

export type AnalyticsEventRow = {
  id: string;
  workspace_id: string | null;
  page_id: string | null;
  short_link_id: string | null;
  event_type: string;
  visitor_id: string | null;
  session_id: string | null;
  metadata_json: string;
  user_agent: string | null;
  referrer: string | null;
  country_code: string | null;
  occurred_at: string;
};

export type SystemSettingRow = {
  key: string;
  value_json: string;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadSubmissionRow = {
  id: string;
  workspace_id: string;
  page_id: string;
  block_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
  metadata_json: string;
  created_at: string;
};

export function getD1Database(context: AppLoadContext): D1Database | null {
  const cloudflareContext = context as CloudflareLoadContext;
  return cloudflareContext.cloudflare?.env?.DB ?? cloudflareContext.env?.DB ?? null;
}

export function getAppEnv(context: AppLoadContext): AppBindings | undefined {
  const cloudflareContext = context as CloudflareLoadContext;
  return cloudflareContext.cloudflare?.env ?? cloudflareContext.env;
}

export function requireD1Database(context: AppLoadContext): D1Database {
  const db = getD1Database(context);
  if (!db) {
    throw new Error("D1 database binding DB is not available.");
  }
  return db;
}

export function createId(prefix: string) {
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 20);
  return `${prefix}_${random}`;
}

export async function first<T>(statement: D1PreparedStatement): Promise<T | null> {
  return statement.first<T>();
}

export async function all<T>(statement: D1PreparedStatement): Promise<T[]> {
  const result = await statement.all<T>();
  return result.results ?? [];
}
