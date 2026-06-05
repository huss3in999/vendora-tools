const LINK_PREFIX = "link:";
const ANALYTICS_PREFIX = "analytics:";
const ANON_PREFIX = "anon:";
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;
const DEFAULT_BRAND_COLOR = "#2563eb";
const DEFAULT_EXPIRY_DAYS = 30;
const ANALYTICS_RETENTION_DAYS = 370;
const RESERVED_SLUGS = new Set(["admin", "api", "healthz", "assets", "favicon.ico", "robots.txt", "qr"]);
const SHORT_DOMAIN_MODES = new Set(["vendora", "smart", "ultra", "country"]);
const URL_PATH_MODES = new Set(["slug", "brand"]);
const COUNTRY_URL_STYLES = new Set(["vendora_path"]);

export default {
  async fetch(request, env, ctx) {
    try {
      return await route(request, env, ctx);
    } catch (error) {
      console.error(JSON.stringify({ level: "error", message: error?.message || String(error) }));
      return htmlPage("Something went wrong", errorPage("We could not process that request. Please try again."), {
        status: 500
      });
    }
  }
};

async function route(request, env, ctx) {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();

  if (!env.LINKS_KV) {
    return htmlPage("Setup required", errorPage("LINKS_KV is not bound."), { status: 500 });
  }

  if (url.pathname === "/healthz") return text("ok");
  if (url.pathname === "/robots.txt") return text("User-agent: *\nAllow: /\nDisallow: /admin\n");
  if (url.pathname.startsWith("/p/") && ["GET", "HEAD"].includes(request.method)) return redirectLegacyProfile(url, env);

  if (url.pathname === "/api/create" && request.method === "POST") return createLink(request, env);
  if (url.pathname === "/api/check-slug") return checkSlug(request, env);
  if (url.pathname === "/admin" && request.method === "GET") return adminPage(request, env);
  if (url.pathname === "/admin/login" && request.method === "POST") return adminLogin(request, env);
  if (url.pathname === "/admin/logout" && request.method === "POST") return adminLogout(request);
  if (url.pathname === "/admin/create" && request.method === "POST") return adminCreateLink(request, env);
  if (url.pathname === "/admin/edit" && request.method === "POST") return adminEditLink(request, env);
  if (url.pathname === "/admin/delete" && request.method === "POST") return adminDeleteLink(request, env);
  if (url.pathname === "/admin/toggle" && request.method === "POST") return adminToggleLink(request, env);
  if (url.pathname === "/" && request.method === "GET") return publicCreatorPage(env);

  if (isShortLinkHost(host, env) || url.pathname.startsWith("/r/") || url.pathname !== "/") {
    return handleShortLink(request, env, ctx);
  }

  return htmlPage("Not found", notFoundPage(), { status: 404 });
}

async function handleShortLink(request, env, ctx) {
  const url = new URL(request.url);
  const rawSegments = url.pathname.split("/").filter(Boolean);
  const segments = rawSegments[0] === "r" ? rawSegments.slice(1) : rawSegments;
  const candidate = normalizeSlug(segments.join("-"));

  if (!candidate || !SLUG_RE.test(candidate)) return htmlPage("Short link not found", notFoundPage(), { status: 404 });

  const careRedirect = resolveGccCareRedirect(candidate, env);
  if (careRedirect) {
    return Response.redirect(careRedirect, 302);
  }

  const link = await getLink(env, candidate);
  if (!link || !link.active || isExpired(link)) {
    return htmlPage("Short link not found", notFoundPage(), { status: 404 });
  }

  ctx.waitUntil(trackClick(env, request, link));

  if (link.redirectMode === "instant") {
    return Response.redirect(link.url, 302);
  }

  return htmlPage(`${link.brandName || "Opening link"} - Smart Link`, previewPage(link), {
    extraHead: `<meta http-equiv="refresh" content="1.2;url=${escapeAttr(link.url)}">`,
    googleMeasurementId: env.GOOGLE_ANALYTICS_MEASUREMENT_ID
  });
}

function redirectLegacyProfile(url, env) {
  const slug = normalizeSlug(url.pathname.slice(3).split("/")[0]);
  if (!isValidSlug(slug)) return htmlPage("Short link not found", notFoundPage(), { status: 404 });
  return Response.redirect(`${smartOrigin(env)}/${slug}`, 301);
}

function transportCareOrigin(env) {
  return env.TRANSPORT_CARE_ORIGIN || "https://getvendora.net/bahrain-saudi-gcc-transport";
}

function resolveGccCareRedirect(slug, env) {
  const base = transportCareOrigin(env).replace(/\/+$/, "");
  const englishMatch = slug.match(/^gcc-en-([a-f0-9]{8})$/);
  if (englishMatch) {
    return `${base}/care/en/?ref=GCC-${englishMatch[1].toUpperCase()}`;
  }
  const arabicMatch = slug.match(/^gcc-([a-f0-9]{8})$/);
  if (arabicMatch) {
    return `${base}/care/?ref=GCC-${arabicMatch[1].toUpperCase()}`;
  }
  return null;
}

async function createLink(request, env) {
  const form = await request.formData();
  const ipHash = await getIpHash(request, env);
  const today = dateKey();
  const anonKey = `${ANON_PREFIX}${ipHash}:${today}`;
  const anonCount = Number((await env.LINKS_KV.get(anonKey)) || "0");

  if (anonCount >= 3) {
    return json({ ok: false, message: "Free mode allows up to 3 links per day from this network." }, 429);
  }

  const turnstile = await verifyTurnstile(request, env, String(form.get("cf-turnstile-response") || ""));
  if (!turnstile.ok) return json({ ok: false, message: turnstile.message }, 400);

  const result = await saveLinkFromForm(form, env, { anonymous: true });
  if (!result.ok) return json(result, result.status || 400);

  await env.LINKS_KV.put(anonKey, String(anonCount + 1), { expirationTtl: 60 * 60 * 24 * 2 });
  return json({ ok: true, link: result.link, shortUrl: shortUrl(env, result.link), adminUrl: `${appOrigin(env)}/admin` });
}

async function checkSlug(request, env) {
  const slug = normalizeSlug(new URL(request.url).searchParams.get("slug") || "");
  if (!isValidSlug(slug)) {
    return json({ available: false, message: "Use 2-60 lowercase letters, numbers, and hyphens." });
  }
  const existing = await getLink(env, slug);
  return json({ available: !existing, message: existing ? "That slug is already taken." : "Slug is available." });
}

async function saveLinkFromForm(form, env, options = {}) {
  const slug = normalizeSlug(form.get("slug") || "");
  const existingSlug = normalizeSlug(form.get("existingSlug") || "");
  const url = String(form.get("url") || "").trim();
  const brandName = cleanText(form.get("brandName"), 80) || "";
  const brandLogo = cleanOptionalUrl(form.get("brandLogo"));
  const brandColor = normalizeColor(String(form.get("brandColor") || DEFAULT_BRAND_COLOR));
  const redirectMode = String(form.get("redirectMode") || "preview") === "instant" ? "instant" : "preview";
  const shortDomainMode = normalizeShortDomainMode(form.get("shortDomainMode"), options.anonymous);
  const urlPathMode = normalizeUrlPathMode(form.get("urlPathMode"));
  const brandHandle = normalizeBrandHandle(form.get("brandHandle") || brandName);
  const countryCode = normalizeCountryCode(form.get("countryCode"));
  const countryUrlStyle = "vendora_path";
  const customDomain = "";
  const whatsapp = cleanText(form.get("whatsapp"), 40);
  const instagram = cleanOptionalUrl(form.get("instagram"));
  const slack = cleanOptionalUrl(form.get("slack"));
  const website = cleanOptionalUrl(form.get("website"));

  if (!isValidSlug(slug)) {
    return { ok: false, message: "Choose a custom slug with 2-60 lowercase letters, numbers, and hyphens.", status: 400 };
  }
  if (!isSafeUrl(url)) {
    return {
      ok: false,
      message: "Enter a safe public http or https URL. Localhost, file, data, and javascript URLs are blocked.",
      status: 400
    };
  }
  if (shortDomainMode !== "country" && urlPathMode === "brand" && !brandHandle) {
    return { ok: false, message: "Enter a brand handle, or switch URL path format to slug-only.", status: 400 };
  }
  if (shortDomainMode === "country" && (!brandHandle || countryCode.length !== 2)) {
    return { ok: false, message: "Enter a brand handle and country code, for example cos + BH.", status: 400 };
  }

  const existing = await getLink(env, slug);
  if (existing && slug !== existingSlug) {
    return { ok: false, message: "That custom slug is already taken. Try another brand-friendly slug.", status: 409 };
  }

  const previous = existingSlug ? await getLink(env, existingSlug) : existing;
  const expiresAt = resolveExpiry(form, options, previous?.expiresAt);
  const aliasSlug =
    shortDomainMode === "country" && countryUrlStyle === "vendora_path"
      ? normalizeSlug([brandHandle, countryCode, slug].filter(Boolean).join("-"))
      : shortDomainMode !== "country" && urlPathMode === "brand" && brandHandle
        ? normalizeSlug([brandHandle, slug].filter(Boolean).join("-"))
        : "";
  if (aliasSlug && aliasSlug !== slug) {
    const existingAlias = await getLink(env, aliasSlug);
    if (existingAlias && existingAlias.slug !== existingSlug && existingAlias.slug !== slug) {
      const label = shortDomainMode === "country" ? "country path" : "brand path";
      return { ok: false, message: `The ${label} ${aliasSlug} is already taken. Try another slug.`, status: 409 };
    }
  }
  const now = new Date().toISOString();
  const link = {
    slug,
    url,
    brandName: brandName || "Business link",
    brandLogo,
    brandColor,
    redirectMode,
    shortDomainMode,
    customDomain,
    urlPathMode,
    brandHandle,
    countryCode,
    countryUrlStyle,
    aliasSlug,
    createdAt: previous?.createdAt || now,
    expiresAt,
    active: previous?.active !== false,
    clicks: previous?.clicks || 0,
    lastClickAt: previous?.lastClickAt || "",
    whatsapp,
    instagram,
    slack,
    website
  };

  if (existingSlug && existingSlug !== slug) {
    await deleteLinkData(env, existingSlug);
  }
  if (previous?.aliasSlug && previous.aliasSlug !== aliasSlug && previous.aliasSlug !== slug) {
    await env.LINKS_KV.delete(`${LINK_PREFIX}${previous.aliasSlug}`);
  }

  await putLink(env, link);
  if (aliasSlug && aliasSlug !== slug) {
    await putExpiringJson(env, `${LINK_PREFIX}${aliasSlug}`, link, expiresAt);
  }
  return { ok: true, link };
}

async function adminPage(request, env) {
  const session = await verifyAdminSession(request, env);
  if (!session.ok) return htmlPage("Admin login", adminLoginPage(session.message));

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const brand = (url.searchParams.get("brand") || "").trim().toLowerCase();
  const list = await listLinks(env);
  const filtered = list.filter((link) => {
    const matchesSearch = !q || link.slug.includes(q) || link.url.toLowerCase().includes(q) || link.brandName.toLowerCase().includes(q);
    const matchesBrand = !brand || link.brandName.toLowerCase().includes(brand);
    return matchesSearch && matchesBrand;
  });
  const analytics = await Promise.all(filtered.slice(0, 40).map(async (link) => [link.slug, await getAnalytics(env, link.slug)]));
  return htmlPage("Admin - Vendora Branded Smart Links", adminDashboard(filtered, Object.fromEntries(analytics), { q, brand }, env));
}

async function adminLogin(request, env) {
  const form = await request.formData();
  const password = String(form.get("password") || "");
  if (!env.ADMIN_PASSWORD) {
    return htmlPage("Admin setup required", errorPage("ADMIN_PASSWORD secret is not set."), { status: 500 });
  }
  const ok = await timingSafeEqual(password, env.ADMIN_PASSWORD);
  if (!ok) return htmlPage("Admin login", adminLoginPage("Invalid password."), { status: 401 });
  return new Response(null, { status: 302, headers: { Location: "/admin", "Set-Cookie": await createAdminCookie(env, request) } });
}

function adminLogout(request) {
  const secure = new URL(request.url).protocol === "https:" ? " Secure;" : "";
  return new Response(null, {
    status: 302,
    headers: { Location: "/admin", "Set-Cookie": `vsl_session=; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=0` }
  });
}

async function adminCreateLink(request, env) {
  const session = await verifyAdminSession(request, env);
  if (!session.ok) return htmlPage("Admin login", adminLoginPage(session.message), { status: 401 });
  const result = await saveLinkFromForm(await request.formData(), env, { neverExpire: true });
  if (!result.ok) return htmlPage("Admin - Error", adminNotice(result.message, "error"), { status: result.status || 400 });
  return Response.redirect(new URL("/admin?notice=created", request.url), 302);
}

async function adminEditLink(request, env) {
  const session = await verifyAdminSession(request, env);
  if (!session.ok) return htmlPage("Admin login", adminLoginPage(session.message), { status: 401 });
  const result = await saveLinkFromForm(await request.formData(), env, { neverExpire: true });
  if (!result.ok) return htmlPage("Admin - Error", adminNotice(result.message, "error"), { status: result.status || 400 });
  return Response.redirect(new URL("/admin?notice=updated", request.url), 302);
}

async function adminDeleteLink(request, env) {
  const session = await verifyAdminSession(request, env);
  if (!session.ok) return htmlPage("Admin login", adminLoginPage(session.message), { status: 401 });
  const slug = normalizeSlug((await request.formData()).get("slug") || "");
  if (slug) {
    await deleteLinkData(env, slug);
  }
  return Response.redirect(new URL("/admin?notice=deleted", request.url), 302);
}

async function adminToggleLink(request, env) {
  const session = await verifyAdminSession(request, env);
  if (!session.ok) return htmlPage("Admin login", adminLoginPage(session.message), { status: 401 });
  const slug = normalizeSlug((await request.formData()).get("slug") || "");
  const link = await getLink(env, slug);
  if (link) {
    link.active = !link.active;
    await putLink(env, link);
  }
  return Response.redirect(new URL("/admin?notice=toggled", request.url), 302);
}

async function trackClick(env, request, link) {
  const now = new Date().toISOString();
  const date = dateKey();
  const country = request.cf?.country || "XX";
  const referrer = cleanReferrer(request.headers.get("Referer") || "direct");
  const device = detectDevice(request.headers.get("User-Agent") || "");
  const visitorId = await getIpHash(request, env);

  link.clicks = Number(link.clicks || 0) + 1;
  link.lastClickAt = now;

  const analytics = await getAnalytics(env, link.slug);
  analytics.totalClicks = Number(analytics.totalClicks || 0) + 1;
  analytics.lastClickAt = now;
  analytics.daily[date] = Number(analytics.daily[date] || 0) + 1;
  analytics.countries[country] = Number(analytics.countries[country] || 0) + 1;
  analytics.referrers[referrer] = Number(analytics.referrers[referrer] || 0) + 1;
  analytics.devices[device] = Number(analytics.devices[device] || 0) + 1;

  const dailyKey = `clicks:${link.slug}:${date}`;
  const daily = Number((await env.LINKS_KV.get(dailyKey)) || "0") + 1;
  await Promise.all([
    putLink(env, link),
    putExpiringJson(env, `${ANALYTICS_PREFIX}${link.slug}`, analytics, link.expiresAt),
    putExpiringText(env, dailyKey, String(daily), link.expiresAt),
    forwardExternalAnalytics(env, {
      eventType: "smart_link_click",
      visitorId,
      link,
      shortUrl: shortUrl(env, link),
      country,
      referrer,
      device,
      userAgent: request.headers.get("User-Agent") || "",
      timestamp: now
    })
  ]);
}

async function forwardExternalAnalytics(env, event) {
  const jobs = [];
  if (env.GOOGLE_ANALYTICS_MEASUREMENT_ID && env.GOOGLE_ANALYTICS_API_SECRET) {
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
      env.GOOGLE_ANALYTICS_MEASUREMENT_ID
    )}&api_secret=${encodeURIComponent(env.GOOGLE_ANALYTICS_API_SECRET)}`;
    jobs.push(
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: event.visitorId,
          events: [
            {
              name: event.eventType,
              params: {
                slug: event.link.slug,
                brand_name: event.link.brandName,
                short_url: event.shortUrl,
                destination_url: event.link.url,
                redirect_mode: event.link.redirectMode,
                country: event.country,
                referrer: event.referrer,
                device: event.device
              }
            }
          ]
        })
      })
    );
  }

  if (env.ELASTIC_TRACKER_URL) {
    jobs.push(
      fetch(env.ELASTIC_TRACKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(env.ELASTIC_API_KEY ? { Authorization: `ApiKey ${env.ELASTIC_API_KEY}` } : {})
        },
        body: JSON.stringify({
          service: "vendora-branded-smart-links",
          event_type: event.eventType,
          slug: event.link.slug,
          brand_name: event.link.brandName,
          short_url: event.shortUrl,
          destination_url: event.link.url,
          redirect_mode: event.link.redirectMode,
          country: event.country,
          referrer: event.referrer,
          device: event.device,
          visitor_id: event.visitorId,
          user_agent: event.userAgent,
          timestamp: event.timestamp
        })
      })
    );
  }

  await Promise.allSettled(jobs);
}

async function putLink(env, link) {
  return putExpiringJson(env, `${LINK_PREFIX}${link.slug}`, link, link.expiresAt);
}

async function putExpiringJson(env, key, value, expiresAt) {
  return putExpiringText(env, key, JSON.stringify(value), expiresAt);
}

async function putExpiringText(env, key, value, expiresAt) {
  const expiration = toKvExpiration(expiresAt);
  if (expiration) return env.LINKS_KV.put(key, value, { expiration });
  return env.LINKS_KV.put(key, value);
}

async function deleteLinkData(env, slug) {
  const link = await getLink(env, slug);
  const keys = [`${LINK_PREFIX}${slug}`, `${ANALYTICS_PREFIX}${slug}`];
  if (link?.aliasSlug && link.aliasSlug !== slug) keys.push(`${LINK_PREFIX}${link.aliasSlug}`);
  await Promise.all([
    ...keys.map((key) => env.LINKS_KV.delete(key))
  ]);

  let cursor;
  do {
    const page = await env.LINKS_KV.list({ prefix: `clicks:${slug}:`, cursor, limit: 1000 });
    cursor = page.cursor;
    await Promise.all(page.keys.map((key) => env.LINKS_KV.delete(key.name)));
  } while (cursor);
}

async function getLink(env, slug) {
  const raw = await env.LINKS_KV.get(`${LINK_PREFIX}${slug}`);
  return raw ? safeJson(raw) : null;
}

async function listLinks(env) {
  const out = [];
  let cursor;
  do {
    const page = await env.LINKS_KV.list({ prefix: LINK_PREFIX, cursor, limit: 1000 });
    cursor = page.cursor;
    const values = await Promise.all(page.keys.map((key) => env.LINKS_KV.get(key.name)));
    for (const raw of values) {
      const link = raw ? safeJson(raw) : null;
      if (link) out.push(link);
    }
  } while (cursor);
  return out.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function getAnalytics(env, slug) {
  const raw = await env.LINKS_KV.get(`${ANALYTICS_PREFIX}${slug}`);
  return raw ? safeJson(raw) : { totalClicks: 0, lastClickAt: "", daily: {}, countries: {}, referrers: {}, devices: {} };
}

async function verifyTurnstile(request, env, token) {
  if (!env.TURNSTILE_SECRET_KEY) return { ok: true };
  if (!token) return { ok: false, message: "Please complete the Turnstile check before creating a link." };
  const body = new FormData();
  body.set("secret", env.TURNSTILE_SECRET_KEY);
  body.set("response", token);
  const ip = request.headers.get("CF-Connecting-IP") || "";
  if (ip) body.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  const result = await response.json();
  return result.success ? { ok: true } : { ok: false, message: "Turnstile verification failed. Please try again." };
}

async function getIpHash(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "local";
  return sha256(`${ip}:${env.ADMIN_PASSWORD || "vendora-smart-links"}`);
}

async function createAdminCookie(env, request) {
  const expires = Math.floor(Date.now() / 1000) + Number(env.SESSION_TTL_SECONDS || 86400);
  const nonce = crypto.randomUUID();
  const payload = `${expires}.${nonce}`;
  const sig = await hmac(payload, env.ADMIN_PASSWORD);
  const secure = new URL(request.url).protocol === "https:" ? " Secure;" : "";
  return `vsl_session=${payload}.${sig}; Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${Number(env.SESSION_TTL_SECONDS || 86400)}`;
}

async function verifyAdminSession(request, env) {
  if (!env.ADMIN_PASSWORD) return { ok: false, message: "Set ADMIN_PASSWORD before using admin." };
  const cookie = request.headers.get("Cookie") || "";
  const value = cookie.split(/;\s*/).find((part) => part.startsWith("vsl_session="))?.slice("vsl_session=".length);
  if (!value) return { ok: false, message: "Log in to manage links." };
  const parts = value.split(".");
  if (parts.length !== 3) return { ok: false, message: "Session expired. Log in again." };
  const [expires, nonce, sig] = parts;
  if (Number(expires) < Math.floor(Date.now() / 1000)) return { ok: false, message: "Session expired. Log in again." };
  const expected = await hmac(`${expires}.${nonce}`, env.ADMIN_PASSWORD);
  return { ok: await timingSafeEqual(sig, expected), message: "Session expired. Log in again." };
}

async function hmac(payload, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
}

async function sha256(value) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

function hex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function timingSafeEqual(a, b) {
  const left = new TextEncoder().encode(String(a));
  const right = new TextEncoder().encode(String(b));
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

function isSafeUrl(raw) {
  try {
    const url = new URL(String(raw));
    if (!["http:", "https:"].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host.endsWith(".local")) return false;
    if (/^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

function cleanOptionalUrl(value) {
  const textValue = String(value || "").trim();
  return textValue && isSafeUrl(textValue) ? textValue.slice(0, 500) : "";
}

function normalizeSlug(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function isValidSlug(slug) {
  return SLUG_RE.test(slug) && !RESERVED_SLUGS.has(slug);
}

function normalizeColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : DEFAULT_BRAND_COLOR;
}

function normalizeShortDomainMode(value, anonymous = false) {
  if (anonymous) return "vendora";
  const mode = String(value || "vendora");
  return SHORT_DOMAIN_MODES.has(mode) ? mode : "vendora";
}

function normalizeUrlPathMode(value) {
  const mode = String(value || "slug");
  return URL_PATH_MODES.has(mode) ? mode : "slug";
}

function normalizeCountryUrlStyle(value) {
  const style = String(value || "vendora_path");
  return COUNTRY_URL_STYLES.has(style) ? style : "vendora_path";
}

function normalizeBrandHandle(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function normalizeCountryCode(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .slice(0, 2);
}

function cleanHostname(value) {
  const host = String(value || "").trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(host)) return "";
  if (host === "localhost" || host.endsWith(".local")) return "";
  return host.slice(0, 253);
}

function resolveExpiry(form, options, previousExpiresAt) {
  if (options.anonymous) return new Date(Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  if (options.neverExpire) {
    const mode = String(form.get("expiryMode") || "never");
    if (mode === "30d") return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    if (mode === "90d") return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    if (mode === "keep") return previousExpiresAt || "";
    return "";
  }
  return previousExpiresAt || new Date(Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function toKvExpiration(expiresAt) {
  if (!expiresAt) return null;
  const seconds = Math.floor(Date.parse(expiresAt) / 1000);
  if (!Number.isFinite(seconds)) return null;
  const minimum = Math.floor(Date.now() / 1000) + 60;
  return seconds > minimum ? seconds : minimum;
}

function cleanText(value, max) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function isExpired(link) {
  return Boolean(link.expiresAt && Date.parse(link.expiresAt) < Date.now());
}

function dateKey() {
  return new Date().toISOString().slice(0, 10);
}

function safeJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function detectDevice(ua) {
  if (/mobile|iphone|android/i.test(ua)) return "mobile";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  return "desktop";
}

function cleanReferrer(value) {
  try {
    if (!value || value === "direct") return "direct";
    return new URL(value).hostname.slice(0, 80);
  } catch {
    return "unknown";
  }
}

function appOrigin(env) {
  return env.APP_ORIGIN || "https://links.getvendora.net";
}

function shortOrigin(env) {
  return env.SHORT_ORIGIN || "https://go.getvendora.net";
}

function ultraShortOrigin(env) {
  return env.ULTRA_SHORT_ORIGIN || "https://g.getvendora.net";
}

function smartOrigin(env) {
  return env.SMART_ORIGIN || "https://smart.getvendora.net";
}

function shortUrl(env, linkOrSlug) {
  const link = typeof linkOrSlug === "string" ? { slug: linkOrSlug } : linkOrSlug;
  const pathSlug = link.aliasSlug && link.urlPathMode === "brand" ? link.aliasSlug : link.slug;
  if (link.shortDomainMode === "country" && link.countryUrlStyle === "vendora_path") {
    return `${shortOrigin(env)}/${link.aliasSlug || link.slug}`;
  }
  if (link.shortDomainMode === "smart") return `${smartOrigin(env)}/${pathSlug}`;
  if (link.shortDomainMode === "ultra") return `${ultraShortOrigin(env)}/${pathSlug}`;
  return `${shortOrigin(env)}/${pathSlug}`;
}

function isShortLinkHost(host, env) {
  const allowed = [shortOrigin(env), ultraShortOrigin(env), smartOrigin(env)]
    .map((origin) => {
      try {
        return new URL(origin).hostname.toLowerCase();
      } catch {
        return "";
      }
    })
    .filter(Boolean);
  return allowed.includes(host) || host.startsWith("go.") || host.startsWith("g.") || host.startsWith("smart.");
}

function text(body, init = {}) {
  return new Response(body, { ...init, headers: { "Content-Type": "text/plain; charset=utf-8", ...(init.headers || {}) } });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function htmlPage(title, body, options = {}) {
  const googleTag = options.googleMeasurementId
    ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeAttr(options.googleMeasurementId)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${escapeAttr(options.googleMeasurementId)}');</script>`
    : "";
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><meta name="description" content="Create branded short links, QR codes, and smart redirect pages for your business.">${googleTag}${options.extraHead || ""}<style>${CSS}</style></head><body>${body}<script>${CLIENT_JS}</script></body></html>`,
    {
      status: options.status || 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
    }
  );
}

function publicCreatorPage(env) {
  const siteKey = env.TURNSTILE_SITE_KEY || "";
  const turnstileScript = siteKey ? `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>` : "";
  return htmlPage(
    "Vendora Branded Smart Links",
    `${turnstileScript}<main class="shell"><nav class="topbar"><div class="brandmark"><span></span><div><b>Vendora Smart Links</b><small>Branded short links</small></div></div><a class="ghost" href="/admin">Admin</a></nav><section class="hero"><div><p class="eyebrow">Free smart links for small businesses</p><h1>Create short links customers trust.</h1><p class="lead">Share menus, offers, WhatsApp, Instagram, and campaign URLs with a clean link and an optional brand preview before redirect.</p><div class="plans"><span>Free: 3 links/day</span><span>Auto-deleted after 30 days</span><span>QR included</span></div></div><div class="preview-card" id="livePreview"><div class="preview-logo">V</div><h2>Your Brand</h2><p>Opening your link</p><button>Continue</button><footer>Powered lightly by Vendora</footer></div></section><section class="creator-grid"><form id="createForm" class="card"><h2>Create a free smart link</h2><label>Destination URL<input required name="url" type="url" placeholder="https://yourbusiness.com/menu"></label><label>Brand name (optional)<input name="brandName" maxlength="80" placeholder="Other Stories"></label><label>Logo URL (optional)<input name="brandLogo" type="url" placeholder="https://.../logo.png"></label><label>Custom slug<input required name="slug" pattern="[a-z0-9-]{2,60}" placeholder="other-stories-menu"><small id="slugHelp">Your free link will use ${escapeHtml(shortOrigin(env))}/your-slug.</small></label><label>Brand color<input name="brandColor" type="color" value="#2563eb"></label><label>Redirect mode<select name="redirectMode"><option value="preview">Preview page</option><option value="instant">Instant redirect</option></select></label><details><summary>Optional contact links</summary><label>WhatsApp number<input name="whatsapp" placeholder="+973..." /></label><label>Instagram link<input name="instagram" type="url" placeholder="https://instagram.com/brand" /></label><label>Slack (optional)<input name="slack" type="url" placeholder="https://join.slack.com/..." /></label><label>Website link<input name="website" type="url" placeholder="https://brand.com" /></label></details>${siteKey ? `<div class="cf-turnstile" data-sitekey="${escapeAttr(siteKey)}"></div>` : `<p class="setup-note">Turnstile is not configured yet. Add keys before production traffic.</p>`}<button class="primary" type="submit">Create smart link</button><p id="formMessage" class="message"></p></form><aside class="card"><h2>Working URL options</h2><ul class="feature-list"><li><b>Ultra (1-letter):</b> ${escapeHtml(ultraShortOrigin(env))}/other-stories-menu</li><li><b>Professional:</b> ${escapeHtml(smartOrigin(env))}/other-stories-menu</li><li><b>Standard:</b> ${escapeHtml(shortOrigin(env))}/other-stories-menu</li><li><b>Slash style also works:</b> ${escapeHtml(ultraShortOrigin(env))}/other-stories/menu</li><li>No fake customer domains are shown. Every option here works on Vendora domains.</li></ul><div id="createdResult" class="result hidden"></div></aside></section><section class="pricing"><article><b>Free</b><p>3 links per day, 30-day auto-delete, Vendora short domain.</p></article><article><b>Pro</b><p>100 links, ultra-short links, QR code, analytics, brand page.</p></article><article><b>Business</b><p>Verified custom domains after DNS connection.</p></article></section><footer class="footer">Vendora branded smart links - built for trusted customer sharing.</footer></main>`
    ,
    { googleMeasurementId: env.GOOGLE_ANALYTICS_MEASUREMENT_ID }
  );
}

function previewPage(link) {
  const logo = link.brandLogo ? `<img src="${escapeAttr(link.brandLogo)}" alt="${escapeAttr(link.brandName)} logo">` : `<span>${escapeHtml((link.brandName || "B").slice(0, 1))}</span>`;
  return `<main class="center-page" style="--brand:${escapeAttr(link.brandColor || DEFAULT_BRAND_COLOR)}"><section class="open-card"><div class="open-logo">${logo}</div><h1>${escapeHtml(link.brandName || "Opening link")}</h1><p>Opening your link</p><a class="primary" href="${escapeAttr(link.url)}">Continue</a><div class="social-row">${link.whatsapp ? `<a href="https://wa.me/${escapeAttr(link.whatsapp.replace(/\D/g, ""))}">WhatsApp</a>` : ""}${link.instagram ? `<a href="${escapeAttr(link.instagram)}">Instagram</a>` : ""}${link.slack ? `<a href="${escapeAttr(link.slack)}">Slack</a>` : ""}${link.website ? `<a href="${escapeAttr(link.website)}">Website</a>` : ""}</div><footer>Powered by Vendora</footer></section><script>setTimeout(()=>{location.href=${JSON.stringify(link.url)}},1200)</script></main>`;
}

function adminLoginPage(message = "") {
  return `<main class="center-page"><form class="card login" method="post" action="/admin/login"><h1>Admin dashboard</h1><p>Manage branded links, QR codes, and analytics.</p>${message ? `<p class="message error">${escapeHtml(message)}</p>` : ""}<label>Password<input name="password" type="password" required autofocus></label><button class="primary" type="submit">Log in</button></form></main>`;
}

function adminDashboard(links, analyticsMap, filters, env) {
  return `<main class="admin-shell"><nav class="topbar"><div class="brandmark"><span></span><div><b>Vendora Link Studio</b><small>Create real, working branded short links</small></div></div><form method="post" action="/admin/logout"><button class="ghost">Log out</button></form></nav><section class="admin-intro"><div><p class="eyebrow">Admin control</p><h1>Professional links customers trust.</h1><p class="lead">Pick a domain (smart/go/g) and a path format (slug-only or brand+slug). Everything here resolves instantly and tracks clicks.</p></div><div class="metric"><b>${links.length}</b><span>links shown</span></div></section><section class="admin-grid"><form class="card create-card" method="post" action="/admin/create"><h2>Create link</h2>${adminFields({}, env)}<button class="primary wide">Create link</button></form><div class="card"><div class="card-head"><div><h2>Manage links</h2><p class="muted">Search, copy, edit, publish/unpublish, or delete.</p></div><div class="pill">${escapeHtml(shortOrigin(env).replace(/^https?:\/\//, ""))}</div></div><form class="filters"><input name="q" value="${escapeAttr(filters.q)}" placeholder="Search slug, brand, URL"><input name="brand" value="${escapeAttr(filters.brand)}" placeholder="Filter by brand"><button class="ghost">Search</button></form><div class="table-wrap"><table><thead><tr><th>Brand</th><th>Short link</th><th>Clicks</th><th>Last click</th><th>Actions</th></tr></thead><tbody>${links.map((link) => linkRow(link, analyticsMap[link.slug] || {}, env)).join("") || `<tr><td colspan="5">No links yet.</td></tr>`}</tbody></table></div></div></section></main>`;
}

function adminFields(link, env) {
  const mode = link.shortDomainMode || "vendora";
  const pathMode = link.urlPathMode || "slug";
  const expiryMode = link.expiresAt ? "keep" : "never";
  const style = "vendora_path";
  return `<input type="hidden" name="existingSlug" value="${escapeAttr(link.slug || "")}">
<div class="form-section"><h3>1. Destination</h3><label>Long URL<input required name="url" type="url" value="${escapeAttr(link.url || "")}" placeholder="https://..."></label><label>Brand name (optional)<input name="brandName" value="${escapeAttr(link.brandName || "")}" placeholder="Other Stories"></label><label>Slug<input required name="slug" value="${escapeAttr(link.slug || "")}" placeholder="offer"><small>Use a short readable word like offer, menu, booking, or newness.</small></label></div>
<div class="form-section"><h3>2. Working short URL</h3><label>Domain<select name="shortDomainMode"><option value="smart" ${mode === "smart" ? "selected" : ""}>Professional - ${escapeHtml(smartOrigin(env))}/...</option><option value="vendora" ${mode === "vendora" ? "selected" : ""}>Standard - ${escapeHtml(shortOrigin(env))}/...</option><option value="ultra" ${mode === "ultra" ? "selected" : ""}>Ultra short (1-letter) - ${escapeHtml(ultraShortOrigin(env))}/...</option><option value="country" ${mode === "country" ? "selected" : ""}>Country-style - ${escapeHtml(shortOrigin(env))}/brand-country-slug</option></select><small>All options are real Vendora domains (no fake customer domains).</small></label><label>Path format<select name="urlPathMode"><option value="slug" ${(pathMode === "slug" || mode === "country") ? "selected" : ""}>Slug only - /slug</option><option value="brand" ${pathMode === "brand" && mode !== "country" ? "selected" : ""}>Brand + slug - /brand-slug</option></select><small>Choose <b>Brand + slug</b> when you want customers to see your brand inside the URL.</small></label><fieldset class="field-group"><legend>Brand handle (optional)</legend><label>Brand handle<input name="brandHandle" value="${escapeAttr(link.brandHandle || "")}" placeholder="another-story"></label><small>Used for brand URLs like <b>g.getvendora.net/another-story-offer</b>. If empty, we auto-generate from brand name.</small></fieldset><fieldset class="field-group"><legend>Country-style URL</legend><label>Country code<input name="countryCode" value="${escapeAttr((link.countryCode || "").toUpperCase())}" maxlength="2" placeholder="BH"></label><input type="hidden" name="countryUrlStyle" value="${style}"><div class="url-suggestions" data-url-suggestions>Update fields to preview URL ideas.</div></fieldset></div>
<div class="form-section"><h3>3. Behavior and brand</h3>
<label>Expiration<select name="expiryMode"><option value="never" ${expiryMode === "never" ? "selected" : ""}>Never expire</option><option value="30d">Expire and auto-delete after 30 days</option><option value="90d">Expire and auto-delete after 90 days</option>${link.expiresAt ? `<option value="keep" selected>Keep existing expiry - ${escapeHtml(link.expiresAt.slice(0, 10))}</option>` : ""}</select></label>
<label>Logo URL<input name="brandLogo" type="url" value="${escapeAttr(link.brandLogo || "")}"></label>
<label>Brand color<input name="brandColor" type="color" value="${escapeAttr(link.brandColor || DEFAULT_BRAND_COLOR)}"></label>
<label>Redirect mode<select name="redirectMode"><option value="preview" ${link.redirectMode !== "instant" ? "selected" : ""}>Branded preview</option><option value="instant" ${link.redirectMode === "instant" ? "selected" : ""}>Instant redirect</option></select></label>
<label>WhatsApp<input name="whatsapp" value="${escapeAttr(link.whatsapp || "")}"></label>
<label>Instagram<input name="instagram" type="url" value="${escapeAttr(link.instagram || "")}"></label>
<label>Slack<input name="slack" type="url" value="${escapeAttr(link.slack || "")}"></label>
<label>Website<input name="website" type="url" value="${escapeAttr(link.website || "")}"></label></div>`;
}

function linkRow(link, analytics, env) {
  const url = shortUrl(env, link);
  const message = `Check this link from ${link.brandName}: ${url}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=800x800&format=png&data=${encodeURIComponent(url)}`;
  const expiry = link.expiresAt ? `expires ${link.expiresAt.slice(0, 10)}` : "never expires";
  return `<tr><td><b>${escapeHtml(link.brandName)}</b><small>${escapeHtml(link.redirectMode)} • ${link.active ? "published" : "hidden"} • ${escapeHtml(expiry)}</small></td><td><a href="${escapeAttr(url)}" target="_blank" rel="noreferrer">${escapeHtml(url.replace(/^https?:\/\//, ""))}</a></td><td>${analytics.totalClicks || link.clicks || 0}</td><td>${escapeHtml(analytics.lastClickAt || link.lastClickAt || "-")}</td><td class="actions"><button type="button" class="btn" data-copy="${escapeAttr(url)}">Copy link</button><button type="button" class="btn" data-copy="${escapeAttr(message)}">Copy message</button><a class="mini" href="${escapeAttr(qr)}" download="${escapeAttr(link.slug)}-qr.png">QR</a><details><summary>Edit</summary><div class="details-body"><form method="post" action="/admin/edit">${adminFields(link, env)}<button class="primary">Save changes</button></form><div class="row-actions"><form method="post" action="/admin/toggle"><input type="hidden" name="slug" value="${escapeAttr(link.slug)}"><button class="ghost">${link.active ? "Unpublish" : "Publish"}</button></form><form method="post" action="/admin/delete" onsubmit="return confirm('Delete this link and its analytics from KV?')"><input type="hidden" name="slug" value="${escapeAttr(link.slug)}"><button class="danger">Delete</button></form></div><details class="analytics"><summary>View analytics JSON</summary><pre>${escapeHtml(JSON.stringify(analytics, null, 2))}</pre></details></div></details></td></tr>`;
}

function adminNotice(message, kind) {
  return `<main class="center-page"><section class="card"><h1>${kind === "error" ? "Could not save" : "Saved"}</h1><p>${escapeHtml(message)}</p><a class="primary" href="/admin">Back to admin</a></section></main>`;
}

function errorPage(message) {
  return `<main class="center-page"><section class="card"><h1>Setup needed</h1><p>${escapeHtml(message)}</p></section></main>`;
}

function notFoundPage() {
  return `<main class="center-page"><section class="card"><h1>404</h1><p>This smart link does not exist, is inactive, or has expired.</p><a class="primary" href="https://links.getvendora.net/">Create a smart link</a></section></main>`;
}

const CLIENT_JS = `
document.addEventListener('input', () => {
  const form = document.querySelector('#createForm');
  if (form) {
    const brand = form.brandName?.value || 'Your Brand';
    const color = form.brandColor?.value || '#2563eb';
    const card = document.querySelector('#livePreview');
    if (card) {
      card.style.setProperty('--brand', color);
      card.querySelector('h2').textContent = brand;
      card.querySelector('.preview-logo').textContent = brand.slice(0, 1).toUpperCase();
    }
  }
  updateUrlSuggestions();
});
function cleanHandle(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
}
function cleanCountry(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z]/g, '').slice(0, 2);
}
function updateUrlSuggestions() {
  document.querySelectorAll('[data-url-suggestions]').forEach((box) => {
    const form = box.closest('form');
    if (!form) return;
    const brand = cleanHandle(form.brandHandle?.value || form.brandName?.value || 'brand');
    const country = cleanCountry(form.countryCode?.value || 'bh');
    const slug = cleanHandle(form.slug?.value || 'offer');
    const pathMode = String(form.urlPathMode?.value || 'slug');
    const rows = [
      'smart.getvendora.net/' + (pathMode === 'brand' ? (brand + '-' + slug) : slug),
      'go.getvendora.net/' + (pathMode === 'brand' ? (brand + '-' + slug) : slug),
      'g.getvendora.net/' + (pathMode === 'brand' ? (brand + '-' + slug) : slug),
      country.length === 2 ? ('go.getvendora.net/' + brand + '-' + country + '-' + slug) : 'go.getvendora.net/brand-country-slug'
    ];
    box.innerHTML = rows.map((item) => '<code>' + item + '</code>').join('');
  });
}
updateUrlSuggestions();
document.addEventListener('click', async (event) => {
  const target = event.target.closest('[data-copy]');
  if (!target) return;
  await navigator.clipboard.writeText(target.dataset.copy);
  const old = target.textContent;
  target.textContent = 'Copied';
  setTimeout(() => { target.textContent = old; }, 1200);
});
const form = document.querySelector('#createForm');
if (form) form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = document.querySelector('#formMessage');
  message.textContent = 'Creating...';
  const response = await fetch('/api/create', { method: 'POST', body: new FormData(form) });
  const data = await response.json();
  if (!data.ok) {
    message.textContent = data.message || 'Could not create link.';
    message.className = 'message error';
    return;
  }
  message.textContent = 'Smart link created.';
  message.className = 'message success';
  const result = document.querySelector('#createdResult');
  result.classList.remove('hidden');
  const qr = 'https://api.qrserver.com/v1/create-qr-code/?size=800x800&format=png&data=' + encodeURIComponent(data.shortUrl);
  result.innerHTML = '<h3>Your smart link</h3><a target="_blank" href="' + data.shortUrl + '">' + data.shortUrl + '</a><div class="actions"><button type="button" data-copy="' + data.shortUrl + '">Copy link</button><a class="mini" download="qr.png" href="' + qr + '">Download QR</a></div>';
});
`;

const CSS = `
:root{color-scheme:light;--ink:#111827;--muted:#64748b;--line:#e2e8f0;--bg:#f8fafc;--card:#fff;--brand:#2563eb}*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;background:linear-gradient(180deg,#f8fafc,#eef4ff);color:var(--ink)}a{color:inherit}.shell,.admin-shell{width:min(1180px,calc(100% - 32px));margin:0 auto}.topbar{display:flex;justify-content:space-between;align-items:center;margin:20px 0;padding:14px 16px;border:1px solid var(--line);border-radius:24px;background:rgba(255,255,255,.86);backdrop-filter:blur(12px);box-shadow:0 10px 30px rgba(15,23,42,.06)}.brandmark{display:flex;gap:12px;align-items:center}.brandmark span{width:38px;height:38px;border-radius:14px;background:linear-gradient(135deg,#2563eb,#22c55e)}small{display:block;color:var(--muted);font-size:12px}.hero,.admin-intro{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center;padding:54px 0}.admin-intro{grid-template-columns:1fr auto;padding:22px 0 28px}.metric{min-width:140px;border:1px solid var(--line);border-radius:26px;background:#fff;padding:20px;text-align:center;box-shadow:0 16px 45px rgba(15,23,42,.06)}.metric b{display:block;font-size:42px;letter-spacing:-.06em}.metric span{color:#64748b}.eyebrow{text-transform:uppercase;letter-spacing:.18em;color:#2563eb;font-weight:800;font-size:12px}h1{font-size:clamp(38px,5vw,64px);line-height:.98;letter-spacing:-.055em;margin:12px 0}h2{letter-spacing:-.03em}.lead{font-size:17px;line-height:1.7;color:#475569;max-width:680px}.plans{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px}.plans span,.setup-note{border:1px solid var(--line);background:white;border-radius:999px;padding:8px 12px;color:#475569}.preview-card,.open-card{border:1px solid var(--line);border-radius:34px;background:white;padding:28px;box-shadow:0 30px 80px rgba(15,23,42,.12);text-align:center}.preview-logo,.open-logo{width:78px;height:78px;margin:0 auto 16px;border-radius:24px;background:var(--brand);display:grid;place-items:center;color:white;font-weight:900;font-size:28px;overflow:hidden}.open-logo img{width:100%;height:100%;object-fit:cover}.preview-card button,.primary{display:inline-flex;align-items:center;justify-content:center;background:var(--brand,#2563eb);color:white;border:0;border-radius:16px;padding:12px 18px;text-decoration:none;font-weight:800;cursor:pointer}.wide{width:100%;margin-top:12px}.creator-grid,.admin-grid{display:grid;grid-template-columns:.82fr 1.18fr;gap:20px;align-items:start}.card{background:white;border:1px solid var(--line);border-radius:28px;padding:24px;box-shadow:0 16px 45px rgba(15,23,42,.06)}.card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}.muted{color:var(--muted);margin:6px 0 0;font-size:13px;line-height:1.4}.pill{border:1px solid var(--line);background:#f8fafc;border-radius:999px;padding:8px 12px;color:#334155;font-weight:850;white-space:nowrap}.create-card{position:sticky;top:16px}.form-section{border:1px solid #edf2f7;border-radius:22px;padding:16px;margin:14px 0;background:#fcfdff}.form-section h3{margin:0 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:.1em;color:#334155}label{display:grid;gap:7px;font-weight:750;margin:12px 0}input,select{width:100%;border:1px solid var(--line);border-radius:14px;padding:12px 13px;font:inherit;background:#fff}input[type=color]{height:48px;padding:5px}.field-group{border:1px dashed #cbd5e1;border-radius:20px;padding:14px 16px;margin:14px 0;background:#f8fafc}.field-group legend{font-weight:900;color:#334155;padding:0 8px}.url-suggestions{display:grid;gap:6px;margin-top:10px}.url-suggestions code{display:block;padding:9px 11px;border:1px solid #dbe4ef;border-radius:12px;background:white;color:#0f172a;overflow-wrap:anywhere;font-weight:800}.feature-list{padding-left:20px;line-height:1.9;color:#475569}.pricing{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:22px 0 40px}.pricing article{border:1px solid var(--line);border-radius:24px;background:white;padding:20px}.footer{text-align:center;color:#64748b;padding:30px}.center-page{min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at top left,color-mix(in srgb,var(--brand) 18%,transparent),transparent 38%),#f8fafc}.open-card{width:min(440px,100%)}.open-card p{color:#64748b}.social-row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:18px 0}.social-row a,.ghost,.mini,button{border:1px solid var(--line);background:#fff;border-radius:14px;padding:10px 12px;text-decoration:none;font-weight:750;cursor:pointer;color:#111827}.btn{background:#fff}.message{min-height:22px}.error{color:#dc2626}.success{color:#15803d}.hidden{display:none}.result{margin-top:18px;border:1px solid var(--line);border-radius:18px;padding:14px;background:#f8fafc}.filters{display:grid;grid-template-columns:1fr 1fr auto;gap:10px}.table-wrap{overflow:auto;margin-top:16px}table{width:100%;border-collapse:separate;border-spacing:0 10px}th{text-align:left;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.08em}td{background:#f8fafc;padding:12px;vertical-align:top}td:first-child{border-radius:16px 0 0 16px}td:last-child{border-radius:0 16px 16px 0}.actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.details-body{margin-top:10px}.row-actions{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0 0}.analytics{margin-top:12px}.danger{color:#dc2626}details{width:100%}details form{margin-top:12px;border-top:1px solid var(--line);padding-top:12px}details summary{cursor:pointer;font-weight:900}pre{white-space:pre-wrap;background:#0f172a;color:#dbeafe;border-radius:16px;padding:12px;max-height:260px;overflow:auto}@media(max-width:900px){.hero,.admin-intro,.creator-grid,.admin-grid,.pricing{grid-template-columns:1fr}.create-card{position:static}.topbar{border-radius:18px}.shell,.admin-shell{width:min(100% - 20px,1180px)}h1{font-size:38px}.hero{padding:28px 0}.filters{grid-template-columns:1fr}.card{padding:18px}.preview-card,.open-card{border-radius:26px}}
`;
