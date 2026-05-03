const SAFE_TAGS = new Set([
  "div",
  "p",
  "span",
  "strong",
  "em",
  "b",
  "i",
  "ul",
  "ol",
  "li",
  "br",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "a",
  "img",
  "section",
  "article",
  "header",
  "footer",
  "main",
  "small",
  "hr",
  "code",
  "pre",
  "blockquote",
  "style"
]);

export const HTML_EMBED_MAX_LENGTH = 1_000_000;

function safeHref(rawHref: string): string | null {
  const href = rawHref.trim();
  if (!href) return null;
  if (href === "#" || /^#[a-zA-Z0-9_-]+$/.test(href)) return href;
  // Allow same-site relative navigation (no protocol).
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (href.startsWith("?")) return href;
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return href;
  return null;
}

function safeImageSrc(rawSrc: string): string | null {
  const src = rawSrc.trim();
  if (!src) return null;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return null;
}

function pickAttr(rawAttrs: string, attr: string): string | null {
  const re = new RegExp(`\\b${attr}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'=<>\\\`]+))`, "i");
  const m = rawAttrs.match(re);
  const val = m?.[2] ?? m?.[3] ?? m?.[4];
  return val ? val.trim() : null;
}

function cleanCss(css: string): string {
  let out = css;
  out = out.replace(/@import[\s\S]*?;/gi, "");
  out = out.replace(/expression\s*\([^)]*\)/gi, "");
  out = out.replace(/javascript\s*:/gi, "");
  out = out.replace(/url\(\s*(['"]?)\s*javascript:[^)]+\)/gi, "");
  out = out.replace(/url\(\s*(['"]?)\s*data:text\/html[^)]*\)/gi, "");
  out = out.replace(/<\/style/gi, "<\\/style");
  return out.trim();
}

function stripCodeFence(input: string) {
  let s = input;
  s = s.replace(/^\s*```[a-zA-Z0-9_-]*\s*/i, "");
  s = s.replace(/\s*```\s*$/i, "");
  return s;
}

type SandboxHtmlOptions = {
  allowScripts?: boolean;
};

function stripDangerousEmbedHtml(input: string, maxLen: number, options: SandboxHtmlOptions = {}) {
  let s = stripCodeFence(String(input ?? "").slice(0, maxLen));

  if (!options.allowScripts) {
    s = s.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  }
  s = s.replace(/<(?:iframe|object|embed)\b[\s\S]*?<\/(?:iframe|object|embed)>/gi, "");
  s = s.replace(/<(?:iframe|object|embed)\b[^>]*\/?>/gi, "");
  s = s.replace(/<meta\b[^>]*\/?>/gi, "");
  s = s.replace(/<base\b[^>]*\/?>/gi, "");
  s = s.replace(/\s+srcdoc\s*=\s*("|\')(?:\\.|(?!\1)[\s\S])*\1/gi, "");
  s = s.replace(/\s+srcdoc\s*=\s*[^\s>]+/gi, "");
  if (!options.allowScripts) {
    s = s.replace(/\s+on\w+\s*=\s*("|\')(?:\\.|(?!\1)[\s\S])*\1/gi, "");
    s = s.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, "");
  }
  s = s.replace(/javascript\s*:/gi, "");
  s = s.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_full, css: string) => `<style>${cleanCss(css)}</style>`);

  return s.trim();
}

export function sanitizeHtmlForSandboxStorage(
  input: string,
  maxLen = HTML_EMBED_MAX_LENGTH,
  options: SandboxHtmlOptions = {}
): string {
  return stripDangerousEmbedHtml(input, maxLen, options);
}

function injectSandboxHead(html: string, css: string, extraHead = "") {
  const meta = '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">';
  const safeHead = `${meta}<base target="_self"><style>${css}</style>${extraHead}`;

  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/<head\b([^>]*)>/i, `<head$1>${safeHead}`);
  }

  if (/<html\b[^>]*>/i.test(html)) {
    return html.replace(/<html\b([^>]*)>/i, `<html$1><head>${safeHead}</head>`);
  }

  return `<!doctype html><html><head>${safeHead}</head><body>${html}</body></html>`;
}

function pickJsStringSetting(html: string, settingName: string): string | null {
  const re = new RegExp(`${settingName}\\s*:\\s*("([^"]+)"|'([^']+)')`, "i");
  const match = html.match(re);
  return match?.[2] ?? match?.[3] ?? null;
}

function escapeScriptString(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/<\/script/gi, "<\\/script");
}

function hostedHtmlCompatibilityScript(html: string, options: SandboxHtmlOptions) {
  if (!options.allowScripts) return "";

  const catalogApiUrl = pickJsStringSetting(html, "catalogApiUrl");
  const googleSheetWebAppUrl = pickJsStringSetting(html, "googleSheetWebAppUrl");
  const catalogRouteScript =
    catalogApiUrl && googleSheetWebAppUrl
      ? `
      var catalogApiUrl = "${escapeScriptString(catalogApiUrl)}";
      var googleSheetWebAppUrl = "${escapeScriptString(googleSheetWebAppUrl)}";
      if (catalogApiUrl && googleSheetWebAppUrl && window.fetch) {
        var nativeFetch = window.fetch.bind(window);
        window.fetch = function (input, init) {
          try {
            var rawUrl = typeof input === "string" ? input : input && input.url;
            if (rawUrl && rawUrl.indexOf(catalogApiUrl) === 0) {
              var nextUrl = googleSheetWebAppUrl + rawUrl.slice(catalogApiUrl.length);
              return nativeFetch(nextUrl, init);
            }
          } catch (error) {
            /* Keep pasted HTML running even if compatibility routing fails. */
          }
          return nativeFetch(input, init);
        };
      }
      `
      : "";

  return `<script>
    (function () {
      try {
        if (!window.location.hash && window.parent && window.parent !== window && window.parent.location.hash) {
          window.history.replaceState(null, "", window.parent.location.hash);
        }
      } catch (error) {
        /* Some sandbox/browser combinations may block parent hash access. */
      }
      try {
        var notifyParentHash = function () {
          if (!window.parent || window.parent === window) return;
          window.parent.postMessage({ type: "spp-hosted-html-hash", hash: window.location.hash || "" }, "*");
        };
        document.addEventListener("click", function (event) {
          var target = event.target;
          var link = target && target.closest ? target.closest("a[href]") : null;
          if (!link) return;
          var href = link.getAttribute("href") || "";
          if (!href || href.charAt(0) !== "#") return;
          event.preventDefault();
          if (window.location.hash === href) {
            window.dispatchEvent(new HashChangeEvent("hashchange"));
          } else {
            window.location.hash = href;
          }
        }, true);
        window.addEventListener("hashchange", notifyParentHash);
        setTimeout(notifyParentHash, 0);
      } catch (error) {
        /* Parent URL sync is best-effort only. */
      }
      ${catalogRouteScript}
    })();
  </script>`;
}

/**
 * Builds an isolated document for custom HTML blocks.
 *
 * The iframe sandbox disables scripts, while this cleanup removes the most
 * obvious active-content vectors before the HTML reaches `srcDoc`.
 */
export function buildSandboxedHtmlDocument(
  input: string,
  maxLen = HTML_EMBED_MAX_LENGTH,
  options: SandboxHtmlOptions = {}
): string {
  const cleaned = stripDangerousEmbedHtml(input, maxLen, options);
  const body = cleaned || '<p class="spp-empty">Preview empty</p>';
  const compatibility = hostedHtmlCompatibilityScript(body, options);
  const frameCss = `
    html { color-scheme: light; }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      overflow-x: hidden;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #ffffff;
      color: #111827;
    }
    img, video, svg, canvas { max-width: 100%; height: auto; }
    a { color: inherit; }
    .spp-empty { margin: 1rem; color: #6b7280; font: 14px/1.5 ui-sans-serif, system-ui, sans-serif; }
  `;

  if (/<(?:!doctype|html|head|body)\b/i.test(body)) {
    return injectSandboxHead(body, frameCss, compatibility);
  }

  return injectSandboxHead(body, frameCss, compatibility);
}

/**
 * Strict allowlist sanitizer for custom HTML embed blocks.
 * Keeps only safe tags and safe `href` attributes on `<a>`.
 */
export function sanitizePublicHtmlForEmbed(input: string, maxLen = 80_000): string {
  let s = stripCodeFence(String(input ?? "").slice(0, maxLen));

  // If a full HTML page is pasted, keep only body content.
  const bodyMatch = s.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch?.[1]) {
    s = bodyMatch[1];
  } else {
    s = s.replace(/<head\b[\s\S]*?<\/head>/gi, "");
    s = s.replace(/<title\b[\s\S]*?<\/title>/gi, "");
    s = s.replace(/<!doctype[^>]*>/gi, "");
  }

  s = s.replace(/<(?:script|iframe|object|embed)\b[\s\S]*?<\/(?:script|iframe|object|embed)>/gi, "");
  s = s.replace(/<(?:script|iframe|object|embed)\b[^>]*\/?>/gi, "");
  s = s.replace(/<(?:link|meta|base)\b[^>]*\/?>/gi, "");

  s = s.replace(/<\s*\/?\s*([a-z0-9-]+)([^>]*)>/gi, (full, rawTag: string, rawAttrs: string) => {
    const tag = rawTag.toLowerCase();
    const closing = /^<\s*\//.test(full);

    if (!SAFE_TAGS.has(tag)) return "";
    if (closing) return `</${tag}>`;
    if (tag === "br") return "<br>";
    if (tag === "hr") return "<hr>";

    if (tag === "style") {
      return "<style>";
    }

    if (tag === "a") {
      const hrefMatch = rawAttrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i);
      const rawHref = hrefMatch?.[2] ?? hrefMatch?.[3] ?? hrefMatch?.[4] ?? "";
      const href = safeHref(rawHref);
      const className = pickAttr(rawAttrs, "class");
      const id = pickAttr(rawAttrs, "id");
      const styleAttr = pickAttr(rawAttrs, "style");
      const style = styleAttr ? cleanCss(styleAttr) : "";
      // Never force a new-tab. Some embedded "stores" navigate using full absolute URLs for in-page
      // category changes; forcing target=_blank causes an about:blank hop and feels slow.
      const openNewTab = false;
      const attrs = [
        href ? `href="${href.replace(/"/g, "&quot;")}"` : "",
        openNewTab ? 'target="_blank"' : "",
        openNewTab ? 'rel="noreferrer"' : "",
        className ? `class="${className.replace(/"/g, "&quot;")}"` : "",
        id ? `id="${id.replace(/"/g, "&quot;")}"` : "",
        style ? `style="${style.replace(/"/g, "&quot;")}"` : ""
      ]
        .filter(Boolean)
        .join(" ");
      return `<a${attrs ? ` ${attrs}` : ""}>`;
    }

    if (tag === "img") {
      const src = safeImageSrc(pickAttr(rawAttrs, "src") ?? "");
      const alt = pickAttr(rawAttrs, "alt") ?? "";
      const className = pickAttr(rawAttrs, "class");
      const styleAttr = pickAttr(rawAttrs, "style");
      const style = styleAttr ? cleanCss(styleAttr) : "";
      if (!src) return "";
      const attrs = [
        `src="${src.replace(/"/g, "&quot;")}"`,
        `alt="${alt.replace(/"/g, "&quot;")}"`,
        className ? `class="${className.replace(/"/g, "&quot;")}"` : "",
        style ? `style="${style.replace(/"/g, "&quot;")}"` : "",
        'loading="lazy"'
      ]
        .filter(Boolean)
        .join(" ");
      return `<img ${attrs}>`;
    }

    const className = pickAttr(rawAttrs, "class");
    const id = pickAttr(rawAttrs, "id");
    const styleAttr = pickAttr(rawAttrs, "style");
    const style = styleAttr ? cleanCss(styleAttr) : "";
    const attrs = [
      className ? `class="${className.replace(/"/g, "&quot;")}"` : "",
      id ? `id="${id.replace(/"/g, "&quot;")}"` : "",
      style ? `style="${style.replace(/"/g, "&quot;")}"` : ""
    ]
      .filter(Boolean)
      .join(" ");
    return `<${tag}${attrs ? ` ${attrs}` : ""}>`;
  });

  s = s.replace(/<style>([\s\S]*?)<\/style>/gi, (_full, css: string) => `<style>${cleanCss(css)}</style>`);
  s = s.replace(/javascript\s*:/gi, "");
  s = s.replace(/\s+on\w+\s*=\s*("|\')(?:\\.|(?!\1)[\s\S])*\1/gi, "");
  s = s.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, "");

  return s.trim();
}
