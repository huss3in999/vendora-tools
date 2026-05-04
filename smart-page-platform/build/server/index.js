import { jsx, jsxs, Fragment as Fragment$1 } from "react/jsx-runtime";
import { RemixServer, Meta, Links, Outlet, ScrollRestoration, Scripts, Link, useLoaderData, useActionData, useNavigation, useSearchParams, Form, redirect as redirect$1, useLocation, NavLink } from "@remix-run/react";
import { renderToReadableStream } from "react-dom/server";
import { redirect, createCookieSessionStorage, json, createCookie } from "@remix-run/cloudflare";
import { useState, useEffect, useRef, Fragment, useMemo } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
async function handleRequest(request, responseStatusCode, responseHeaders, remixContext) {
  const stream = await renderToReadableStream(
    /* @__PURE__ */ jsx(RemixServer, { context: remixContext, url: request.url }),
    {
      onError(error) {
        console.error(error);
        responseStatusCode = 500;
      }
    }
  );
  responseHeaders.set("Content-Type", "text/html; charset=utf-8");
  return new Response(stream, {
    status: responseStatusCode,
    headers: responseHeaders
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest
}, Symbol.toStringTag, { value: "Module" }));
const tailwindCss = "/assets/tailwind-BRFRRv5n.css";
const links = () => [{ rel: "stylesheet", href: tailwindCss }];
const meta$7 = () => {
  return [
    { title: "Smart Page Platform - Link in Bio Website Builder" },
    {
      name: "description",
      content: "Create fast mobile landing pages, link-in-bio websites, short links, forms, analytics, and hosted HTML pages on Cloudflare."
    },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
    { property: "og:site_name", content: "Smart Page Platform" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" }
  ];
};
function App() {
  return /* @__PURE__ */ jsxs("html", { lang: "en", className: "h-full bg-slate-50", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {})
    ] }),
    /* @__PURE__ */ jsxs("body", { className: "h-full text-slate-900", children: [
      /* @__PURE__ */ jsx(Outlet, {}),
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: App,
  links,
  meta: meta$7
}, Symbol.toStringTag, { value: "Module" }));
const BLOCK_GROUPS = [
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
function catalogLiveBlockGroups() {
  return BLOCK_GROUPS.filter((g) => g.blocks.some((b) => b.kind === "live")).map((g) => ({
    title: g.title,
    blocks: g.blocks.filter((b) => b.kind === "live")
  }));
}
function labelForBlockType(type) {
  for (const g of BLOCK_GROUPS) {
    for (const b of g.blocks) {
      if (b.kind === "live" && b.type === type) return b.label;
    }
  }
  return type.replace(/_/g, " ");
}
function AddBlockModal(props) {
  if (!props.open) return null;
  const liveGroups = catalogLiveBlockGroups();
  return /* @__PURE__ */ jsxs("div", { className: "fixed inset-0 z-50 flex items-end justify-center sm:items-center", role: "dialog", "aria-modal": "true", "aria-labelledby": "add-block-title", children: [
    /* @__PURE__ */ jsx("button", { type: "button", className: "absolute inset-0 bg-black/75 backdrop-blur-md", onClick: props.onClose, "aria-label": "Close add block dialog" }),
    /* @__PURE__ */ jsxs("div", { className: "relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col rounded-t-[1.25rem] border border-zinc-700 bg-zinc-900 shadow-2xl sm:max-h-[88vh] sm:rounded-[1.25rem]", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsx("h2", { id: "add-block-title", className: "text-xl font-semibold tracking-tight text-white", children: "New block" }),
          /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-zinc-400", children: "All available blocks are ready to use." })
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            className: "rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white",
            onClick: props.onClose,
            "aria-label": "Close",
            children: /* @__PURE__ */ jsx("span", { className: "text-xl leading-none", children: "×" })
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-y-auto px-4 pb-6 pt-2 sm:px-6", children: /* @__PURE__ */ jsx("div", { className: "space-y-6", children: liveGroups.map((group) => /* @__PURE__ */ jsxs("section", { children: [
        /* @__PURE__ */ jsx("h3", { className: "mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500", children: group.title }),
        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5", children: group.blocks.map((entry2) => /* @__PURE__ */ jsx(
          TileButton,
          {
            entry: entry2,
            onPick: () => props.onPickLive(entry2.type),
            onClose: props.onClose
          },
          entry2.type
        )) })
      ] }, group.title)) }) }),
      /* @__PURE__ */ jsx("div", { className: "flex justify-end border-t border-zinc-800 px-5 py-3 sm:px-6", children: /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          className: "rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white",
          onClick: props.onClose,
          children: "Close"
        }
      ) })
    ] })
  ] });
}
function TileButton(props) {
  return /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      onClick: () => {
        props.onPick();
        props.onClose();
      },
      className: "flex flex-col items-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-800/60 p-3 text-center transition hover:border-brand-500/60 hover:bg-zinc-700/80 active:scale-[0.98]",
      children: [
        /* @__PURE__ */ jsx("span", { className: "flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-2xl text-zinc-100 shadow-inner ring-1 ring-white/5", children: props.entry.icon }),
        /* @__PURE__ */ jsx("span", { className: "text-[11px] font-medium leading-tight text-zinc-100", children: props.entry.label })
      ]
    }
  );
}
function DraftLinesField(props) {
  const [text, setText] = useState(() => props.canonical);
  useEffect(() => {
    setText(props.canonical);
  }, [props.resetKey]);
  useEffect(() => {
    if (props.normalize(text) !== props.canonical) {
      setText(props.canonical);
    }
  }, [props.canonical, props.normalize, text]);
  return /* @__PURE__ */ jsxs("div", { className: "space-y-1 md:col-span-2", children: [
    /* @__PURE__ */ jsx(
      "textarea",
      {
        value: text,
        onChange: (event) => {
          const next = event.target.value;
          setText(next);
          props.onDraftChange(next);
        },
        placeholder: props.placeholder,
        spellCheck: false,
        className: "min-h-28 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/55"
      }
    ),
    /* @__PURE__ */ jsx("div", { className: "text-xs text-zinc-500", children: props.help })
  ] });
}
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
function Input(props) {
  const { className, variant = "default", ...rest } = props;
  return /* @__PURE__ */ jsx(
    "input",
    {
      className: cn(
        variant === "dark" ? [
          "h-10 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 text-sm text-zinc-100",
          "placeholder:text-zinc-500",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/55 focus:border-brand-500"
        ] : [
          "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900",
          "placeholder:text-slate-400",
          "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        ],
        className
      ),
      ...rest
    }
  );
}
const STEP_LABELS = ["0x", "1x", "2x", "3x", "4x"];
const VARIANTS = [
  { value: "empty", title: "Empty", hint: "Spacer only" },
  { value: "simple", title: "Simple line", hint: "Single rule" },
  { value: "decorative", title: "Decorative", hint: "Line · ★ · line" },
  { value: "classic", title: "Split + label", hint: "Original look" }
];
function StepSlider(props) {
  return /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-zinc-300", children: props.label }),
      /* @__PURE__ */ jsx("span", { className: "text-xs font-semibold text-brand-400", children: STEP_LABELS[props.value] })
    ] }),
    /* @__PURE__ */ jsx(
      "input",
      {
        type: "range",
        min: 0,
        max: 4,
        step: 1,
        value: props.value,
        onChange: (e) => props.onChange(Number(e.target.value)),
        className: "h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-brand-500"
      }
    )
  ] });
}
function ToggleRow(props) {
  return /* @__PURE__ */ jsxs(
    "label",
    {
      className: cn(
        "flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-zinc-700/80 bg-zinc-950/50 px-4 py-3",
        props.disabled && "cursor-not-allowed opacity-45"
      ),
      children: [
        /* @__PURE__ */ jsxs("span", { children: [
          /* @__PURE__ */ jsx("span", { className: "block text-sm font-medium text-zinc-200", children: props.label }),
          props.description ? /* @__PURE__ */ jsx("span", { className: "mt-0.5 block text-xs text-zinc-500", children: props.description }) : null
        ] }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "checkbox",
            className: "mt-1 h-4 w-4 shrink-0 rounded border-zinc-600 bg-zinc-900 text-brand-600 focus:ring-brand-500/50",
            checked: props.checked,
            disabled: props.disabled,
            onChange: (e) => props.onChange(e.target.checked)
          }
        )
      ]
    }
  );
}
function DividerBlockEditor(props) {
  const [tab, setTab] = useState("content");
  const p = props.props;
  const variant = p.variant ?? "classic";
  const indent = p.indent ?? 2;
  const paddingTop = p.paddingTop ?? 0;
  const paddingBottom = p.paddingBottom ?? 0;
  const tabs = /* @__PURE__ */ jsx("div", { className: "mb-4 flex gap-8 border-b border-zinc-700", children: [
    ["content", "Content"],
    ["settings", "Settings"],
    ["section", "Section"]
  ].map(([id2, label]) => /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      className: cn(
        "relative pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] transition",
        tab === id2 ? "text-white" : "text-zinc-500 hover:text-zinc-300"
      ),
      onClick: () => setTab(id2),
      children: [
        label,
        tab === id2 ? /* @__PURE__ */ jsx("span", { className: "absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-500" }) : null
      ]
    },
    id2
  )) });
  return /* @__PURE__ */ jsxs("div", { className: "md:col-span-2", children: [
    tabs,
    tab === "content" ? /* @__PURE__ */ jsxs("div", { className: "space-y-5", children: [
      /* @__PURE__ */ jsx(
        StepSlider,
        {
          label: "Indent size",
          value: indent,
          onChange: (v) => props.onPatch({ indent: v })
        }
      ),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "mb-2 text-sm font-medium text-zinc-300", children: "Divider type" }),
        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-2 sm:grid-cols-4", children: VARIANTS.map((opt) => /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: () => props.onPatch({ variant: opt.value }),
            className: cn(
              "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition",
              variant === opt.value ? "border-brand-500/80 bg-brand-500/10 ring-1 ring-brand-500/30" : "border-zinc-700 bg-zinc-950/60 hover:border-zinc-600"
            ),
            children: [
              /* @__PURE__ */ jsx("span", { className: "text-xs font-semibold text-zinc-100", children: opt.title }),
              /* @__PURE__ */ jsx("span", { className: "text-[10px] leading-tight text-zinc-500", children: opt.hint })
            ]
          },
          opt.value
        )) })
      ] }),
      variant !== "empty" ? /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm font-medium text-zinc-300", children: "Line settings" }),
        /* @__PURE__ */ jsx(
          ToggleRow,
          {
            label: "Full width line",
            description: "Bleed closer to screen edges on narrow layouts.",
            checked: Boolean(p.fullWidth),
            onChange: (v) => props.onPatch({ fullWidth: v })
          }
        ),
        /* @__PURE__ */ jsx(
          ToggleRow,
          {
            label: "Translucent edges",
            description: "Soft fade at the ends of the rule.",
            checked: Boolean(p.softEdges),
            onChange: (v) => props.onPatch({ softEdges: v })
          }
        )
      ] }) : null,
      variant !== "empty" ? /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-zinc-300", children: variant === "decorative" ? "Optional caption (under star)" : "Center label (optional)" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            variant: "dark",
            value: p.label ?? "",
            onChange: (e) => props.onPatch({ label: e.target.value || void 0 }),
            placeholder: variant === "simple" ? "Usually left blank for a plain line" : "e.g. Section title"
          }
        )
      ] }) : null
    ] }) : null,
    tab === "settings" ? /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsx(
        ToggleRow,
        {
          label: "Hide block on public page",
          description: "Keeps the block in the editor; visitors won’t see it.",
          checked: Boolean(p.hidden),
          onChange: (v) => props.onPatch({ hidden: v })
        }
      ),
      /* @__PURE__ */ jsx(
        ToggleRow,
        {
          label: "Extra vertical spacing",
          description: "Adds space above this divider.",
          checked: Boolean(p.extraVerticalSpacing),
          onChange: (v) => props.onPatch({ extraVerticalSpacing: v })
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-zinc-300", children: "Block name (editor only)" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            variant: "dark",
            value: p.editorLabel ?? "",
            onChange: (e) => props.onPatch({ editorLabel: e.target.value || void 0 }),
            placeholder: "e.g. Hero → links divider"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-4 rounded-xl border border-zinc-800/80 bg-zinc-950/30 px-4 py-3 opacity-70", children: [
        /* @__PURE__ */ jsxs("span", { children: [
          /* @__PURE__ */ jsx("span", { className: "block text-sm font-medium text-zinc-400", children: "Show according to schedule" }),
          /* @__PURE__ */ jsx("span", { className: "mt-0.5 block text-xs text-zinc-600", children: "Time-based visibility." })
        ] }),
        /* @__PURE__ */ jsx("span", { className: "shrink-0 text-[10px] font-bold uppercase tracking-wide text-zinc-500", children: "Soon" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-4 rounded-xl border border-zinc-800/80 bg-zinc-950/30 px-4 py-3 opacity-70", children: [
        /* @__PURE__ */ jsxs("span", { children: [
          /* @__PURE__ */ jsx("span", { className: "block text-sm font-medium text-zinc-400", children: "Show by days of the week" }),
          /* @__PURE__ */ jsx("span", { className: "mt-0.5 block text-xs text-zinc-600", children: "Limit visibility to selected weekdays." })
        ] }),
        /* @__PURE__ */ jsx("span", { className: "shrink-0 text-[10px] font-bold uppercase tracking-wide text-zinc-500", children: "Soon" })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-zinc-600", children: "Schedule rules are planned for a later release." })
    ] }) : null,
    tab === "section" ? /* @__PURE__ */ jsxs("div", { className: "space-y-5", children: [
      /* @__PURE__ */ jsx(
        StepSlider,
        {
          label: "Top padding",
          value: paddingTop,
          onChange: (v) => props.onPatch({ paddingTop: v })
        }
      ),
      /* @__PURE__ */ jsx(
        StepSlider,
        {
          label: "Bottom padding",
          value: paddingBottom,
          onChange: (v) => props.onPatch({ paddingBottom: v })
        }
      ),
      /* @__PURE__ */ jsx(
        ToggleRow,
        {
          label: "Edge indent",
          description: "Narrow the divider within the page column.",
          checked: Boolean(p.edgeIndent),
          onChange: (v) => props.onPatch({ edgeIndent: v })
        }
      ),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-zinc-300", children: "Section background" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            variant: "dark",
            value: p.sectionBackground ?? "",
            onChange: (e) => props.onPatch({ sectionBackground: e.target.value.trim() || void 0 }),
            placeholder: "#0f172a or #fff"
          }
        ),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-zinc-500", children: "Hex color only. Leave empty for no band behind this block." })
      ] })
    ] }) : null
  ] });
}
const HTML_EMBED_MAX_LENGTH = 1e6;
function cleanCss(css) {
  let out = css;
  out = out.replace(/@import[\s\S]*?;/gi, "");
  out = out.replace(/expression\s*\([^)]*\)/gi, "");
  out = out.replace(/javascript\s*:/gi, "");
  out = out.replace(/url\(\s*(['"]?)\s*javascript:[^)]+\)/gi, "");
  out = out.replace(/url\(\s*(['"]?)\s*data:text\/html[^)]*\)/gi, "");
  out = out.replace(/<\/style/gi, "<\\/style");
  return out.trim();
}
function stripCodeFence(input) {
  let s = input;
  s = s.replace(/^\s*```[a-zA-Z0-9_-]*\s*/i, "");
  s = s.replace(/\s*```\s*$/i, "");
  return s;
}
function stripDangerousEmbedHtml(input, maxLen, options = {}) {
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
  s = s.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_full, css) => `<style>${cleanCss(css)}</style>`);
  return s.trim();
}
function sanitizeHtmlForSandboxStorage(input, maxLen = HTML_EMBED_MAX_LENGTH, options = {}) {
  return stripDangerousEmbedHtml(input, maxLen, options);
}
function injectSandboxHead(html, css, extraHead = "") {
  const meta2 = '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">';
  const safeHead = `${meta2}<base target="_self"><style>${css}</style>${extraHead}`;
  if (/<head\b[^>]*>/i.test(html)) {
    return html.replace(/<head\b([^>]*)>/i, `<head$1>${safeHead}`);
  }
  if (/<html\b[^>]*>/i.test(html)) {
    return html.replace(/<html\b([^>]*)>/i, `<html$1><head>${safeHead}</head>`);
  }
  return `<!doctype html><html><head>${safeHead}</head><body>${html}</body></html>`;
}
function pickJsStringSetting(html, settingName) {
  const re = new RegExp(`${settingName}\\s*:\\s*("([^"]+)"|'([^']+)')`, "i");
  const match = html.match(re);
  return (match == null ? void 0 : match[2]) ?? (match == null ? void 0 : match[3]) ?? null;
}
function escapeScriptString(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/<\/script/gi, "<\\/script");
}
function hostedHtmlCompatibilityScript(html, options) {
  if (!options.allowScripts) return "";
  const catalogApiUrl = pickJsStringSetting(html, "catalogApiUrl");
  const googleSheetWebAppUrl = pickJsStringSetting(html, "googleSheetWebAppUrl");
  const catalogRouteScript = catalogApiUrl && googleSheetWebAppUrl ? `
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
      ` : "";
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
  <\/script>`;
}
function buildSandboxedHtmlDocument(input, maxLen = HTML_EMBED_MAX_LENGTH, options = {}) {
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
const META_TITLE_MAX = 70;
const META_DESC_MAX = 320;
function deriveMetaDescription(blocks, pageTitle) {
  var _a, _b, _c;
  for (const b of blocks) {
    if (b.type === "profile" && ((_a = b.props.subtitle) == null ? void 0 : _a.trim())) {
      return cleanSnippet(b.props.subtitle, META_DESC_MAX);
    }
  }
  for (const b of blocks) {
    if (b.type === "header" && ((_b = b.props.subtitle) == null ? void 0 : _b.trim())) {
      return cleanSnippet(b.props.subtitle, META_DESC_MAX);
    }
  }
  for (const b of blocks) {
    if (b.type === "text" && ((_c = b.props.text) == null ? void 0 : _c.trim())) {
      return cleanSnippet(b.props.text, META_DESC_MAX);
    }
  }
  const base = pageTitle.trim() || "Smart page";
  return `${base} - Links, updates, and contact in one page.`.slice(0, META_DESC_MAX);
}
function cleanSnippet(text, max) {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max - 1)}...`;
}
function resolvePublicMetaTitle(pageTitle, seoTitle) {
  const custom = seoTitle == null ? void 0 : seoTitle.trim();
  if (custom) return custom.slice(0, META_TITLE_MAX);
  return pageTitle.trim() || "Smart page";
}
function resolvePublicMetaDescription(blocks, pageTitle, seoDescription) {
  const custom = seoDescription == null ? void 0 : seoDescription.trim();
  if (custom) return custom.slice(0, META_DESC_MAX);
  return deriveMetaDescription(blocks, pageTitle);
}
function pickOgImage(blocks) {
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
  return void 0;
}
function isHttpsUrl(url) {
  return url.startsWith("https://") || url.startsWith("http://");
}
function pickStickyContact(blocks) {
  var _a;
  for (const b of blocks) {
    if (b.type === "whatsapp_button") {
      const message = b.props.message ? `?text=${encodeURIComponent(b.props.message)}` : "";
      const href = `https://wa.me/${b.props.phoneE164.replace("+", "")}${message}`;
      return { href, label: b.props.label };
    }
  }
  for (const b of blocks) {
    if (b.type === "contact_card" && ((_a = b.props.phone) == null ? void 0 : _a.trim())) {
      const tel = b.props.phone.replace(/\s+/g, "");
      return { href: `tel:${tel}`, label: "Call" };
    }
  }
  return null;
}
const DEFAULT_PAGE_THEME = {
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
function isHexColor(value) {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
}
function cleanText$1(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}
function cleanExternalUrl(value) {
  const text = cleanText$1(value, 500);
  return text.startsWith("https://") || text.startsWith("http://") ? text : void 0;
}
function allow(value, options, fallback) {
  return typeof value === "string" && options.includes(value) ? value : fallback;
}
function sanitizePageTheme(input) {
  const value = input && typeof input === "object" ? input : {};
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
    footerText: cleanText$1(value.footerText, 120)
  };
}
function parsePageThemeJson(themeJson) {
  try {
    return sanitizePageTheme(themeJson ? JSON.parse(themeJson) : {});
  } catch {
    return DEFAULT_PAGE_THEME;
  }
}
function trackClick(trackingCode, block) {
  if (!trackingCode || block.type !== "link_button" && block.type !== "whatsapp_button") {
    return;
  }
  const formData = new FormData();
  formData.set("intent", "track_click");
  formData.set("blockId", block.id);
  formData.set("blockType", block.type);
  const url = `/p/${encodeURIComponent(trackingCode)}`;
  if (navigator.sendBeacon) {
    const queued = navigator.sendBeacon(url, formData);
    if (queued) return;
  }
  void fetch(url, {
    method: "POST",
    body: formData,
    keepalive: true
  }).catch(() => {
  });
}
function pageStyle(theme2) {
  const base = {
    color: theme2.textColor,
    backgroundColor: theme2.backgroundColor
  };
  if (theme2.backgroundType === "gradient") {
    base.backgroundImage = `linear-gradient(145deg, ${theme2.gradientFrom}, ${theme2.gradientTo})`;
  }
  if (theme2.backgroundType === "image" && theme2.backgroundImageUrl) {
    base.backgroundImage = `linear-gradient(rgba(255,255,255,0.72), rgba(255,255,255,0.9)), url(${theme2.backgroundImageUrl})`;
    base.backgroundSize = "cover";
    base.backgroundPosition = "center";
    base.backgroundAttachment = "fixed";
  }
  return base;
}
function fontClassName(theme2) {
  if (theme2.fontStyle === "elegant") return "font-serif";
  if (theme2.fontStyle === "bold") return "font-sans font-semibold";
  if (theme2.fontStyle === "minimal") return "font-mono";
  return "font-sans";
}
function layoutClassName(theme2, stickyPad) {
  const pad = stickyPad ? "pb-28 md:pb-20" : "pb-16 md:pb-20";
  if (theme2.layoutStyle === "full_width_mobile") return `mx-auto w-full max-w-2xl px-4 pt-10 ${pad} sm:px-7 sm:pt-14`;
  if (theme2.layoutStyle === "card_based") return `mx-auto w-full max-w-xl px-5 ${pad} pt-10 sm:px-8 sm:pt-14`;
  return `mx-auto w-full max-w-xl px-5 ${pad} pt-10 sm:px-8 sm:pt-14`;
}
function buttonRadius(theme2) {
  if (theme2.buttonStyle === "pill") return "999px";
  if (theme2.buttonStyle === "square") return "6px";
  return "18px";
}
function buttonStyle(theme2, variant = "primary") {
  const color = variant === "whatsapp" ? "#10b981" : theme2.buttonColor;
  return {
    color: theme2.buttonStyle === "outline" ? color : "#ffffff",
    background: theme2.buttonStyle === "outline" ? "transparent" : color,
    border: `1px solid ${color}`,
    borderRadius: buttonRadius(theme2),
    boxShadow: theme2.buttonStyle === "shadow" ? "0 18px 35px rgba(15, 23, 42, 0.18)" : "none"
  };
}
function cardStyle(theme2) {
  return {
    backgroundColor: theme2.cardColor,
    color: theme2.textColor,
    borderColor: "rgba(148, 163, 184, 0.28)"
  };
}
function cardClassName(extra = "") {
  return `rounded-[1.35rem] border border-black/[0.06] p-5 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.35)] backdrop-blur-sm ${extra}`;
}
function htmlEmbedSandbox(allowScripts) {
  const base = "allow-forms allow-popups allow-popups-to-escape-sandbox";
  if (!allowScripts) return base;
  return `${base} allow-scripts allow-same-origin allow-modals allow-downloads`;
}
function isStandaloneHtmlPage(blocks) {
  var _a;
  return blocks.length === 1 && ((_a = blocks[0]) == null ? void 0 : _a.type) === "html_embed";
}
function StandaloneHtmlPageFrame(props) {
  const iframeRef = useRef(null);
  useEffect(() => {
    function syncHashToFrame() {
      var _a;
      const hash = window.location.hash;
      if (!hash || !((_a = iframeRef.current) == null ? void 0 : _a.contentWindow)) return;
      try {
        if (iframeRef.current.contentWindow.location.hash !== hash) {
          iframeRef.current.contentWindow.location.hash = hash;
        }
      } catch {
      }
    }
    function syncHashFromFrame(event) {
      var _a;
      if (event.source !== ((_a = iframeRef.current) == null ? void 0 : _a.contentWindow)) return;
      const data = event.data;
      if ((data == null ? void 0 : data.type) !== "spp-hosted-html-hash" || typeof data.hash !== "string" || !data.hash.startsWith("#")) return;
      if (window.location.hash === data.hash) return;
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${data.hash}`);
    }
    const timer = window.setTimeout(syncHashToFrame, 50);
    window.addEventListener("hashchange", syncHashToFrame);
    window.addEventListener("message", syncHashFromFrame);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", syncHashToFrame);
      window.removeEventListener("message", syncHashFromFrame);
    };
  }, []);
  return /* @__PURE__ */ jsx(
    "iframe",
    {
      ref: iframeRef,
      title: "Hosted HTML page",
      sandbox: htmlEmbedSandbox(props.block.props.allowScripts),
      referrerPolicy: "no-referrer",
      srcDoc: buildSandboxedHtmlDocument(props.block.props.html, HTML_EMBED_MAX_LENGTH, {
        allowScripts: props.block.props.allowScripts
      }),
      className: "fixed inset-0 h-screen w-screen border-0 bg-white",
      style: { height: "100dvh", width: "100vw" }
    }
  );
}
function DividerView(props) {
  const { block: b, theme: theme2 } = props;
  if (b.props.hidden) return null;
  const lineColor = theme2.textColor;
  const indent = b.props.indent ?? 2;
  const pyPx = [6, 10, 14, 20, 28][indent];
  const variant = b.props.variant ?? "classic";
  const ptPx = [0, 8, 14, 20, 28][b.props.paddingTop ?? 0];
  const pbPx = [0, 8, 14, 20, 28][b.props.paddingBottom ?? 0];
  const hasSectionChrome = ptPx > 0 || pbPx > 0 || Boolean(b.props.sectionBackground && b.props.sectionBackground.trim());
  const lineSegmentStyle = (flex) => b.props.softEdges ? {
    height: 1,
    flex: flex ? 1 : void 0,
    width: flex ? void 0 : "100%",
    backgroundImage: `linear-gradient(90deg, transparent, ${lineColor} 22%, ${lineColor} 78%, transparent)`
  } : {
    height: 1,
    flex: flex ? 1 : void 0,
    width: flex ? void 0 : "100%",
    backgroundColor: lineColor
  };
  const innerMx = b.props.edgeIndent ? "mx-auto max-w-[88%]" : "";
  const fullW = b.props.fullWidth ? "relative -mx-5 w-[calc(100%+2.5rem)] sm:-mx-8 sm:w-[calc(100%+4rem)]" : "";
  function inner() {
    if (variant === "empty") {
      const heights = [12, 20, 28, 38, 48];
      return /* @__PURE__ */ jsx(
        "div",
        {
          className: `w-full ${innerMx} ${fullW}`,
          style: { height: heights[indent] },
          "aria-hidden": true
        }
      );
    }
    const wrapStyle = { paddingTop: pyPx, paddingBottom: pyPx };
    if (variant === "simple") {
      return /* @__PURE__ */ jsx("div", { className: `flex items-center ${innerMx} ${fullW}`, style: wrapStyle, children: /* @__PURE__ */ jsx("div", { style: lineSegmentStyle(false) }) });
    }
    if (variant === "decorative") {
      return /* @__PURE__ */ jsxs("div", { className: `flex flex-col items-center gap-2 ${innerMx} ${fullW}`, style: wrapStyle, children: [
        /* @__PURE__ */ jsxs("div", { className: "flex w-full items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { style: lineSegmentStyle(true) }),
          /* @__PURE__ */ jsx("span", { className: "shrink-0 text-sm opacity-70", "aria-hidden": true, children: "?" }),
          /* @__PURE__ */ jsx("div", { style: lineSegmentStyle(true) })
        ] }),
        b.props.label ? /* @__PURE__ */ jsx("span", { className: "text-[10px] font-semibold uppercase tracking-[0.2em] opacity-55", children: b.props.label }) : null
      ] });
    }
    return /* @__PURE__ */ jsxs(
      "div",
      {
        className: `flex items-center gap-3 text-center text-xs font-semibold uppercase tracking-[0.2em] opacity-55 ${innerMx} ${fullW}`,
        style: wrapStyle,
        children: [
          /* @__PURE__ */ jsx("div", { style: lineSegmentStyle(true) }),
          b.props.label ? /* @__PURE__ */ jsx("span", { children: b.props.label }) : null,
          /* @__PURE__ */ jsx("div", { style: lineSegmentStyle(true) })
        ]
      }
    );
  }
  const padStyle = {
    paddingTop: hasSectionChrome ? ptPx : void 0,
    paddingBottom: hasSectionChrome ? pbPx : void 0,
    backgroundColor: b.props.sectionBackground || void 0
  };
  const outerClass = `rounded-2xl${b.props.edgeIndent && hasSectionChrome ? " mx-1" : ""}`;
  const body = /* @__PURE__ */ jsxs(Fragment$1, { children: [
    b.props.extraVerticalSpacing ? /* @__PURE__ */ jsx("div", { className: "h-4", "aria-hidden": true }) : null,
    inner()
  ] });
  if (hasSectionChrome) {
    return /* @__PURE__ */ jsx("section", { className: outerClass, style: padStyle, children: body });
  }
  return /* @__PURE__ */ jsx("div", { children: body });
}
function profileRadius(theme2, circular) {
  if (theme2.profileStyle === "square") return "10px";
  if (theme2.profileStyle === "rounded_square") return "28px";
  return circular === false ? "28px" : "999px";
}
function SocialIcon(props) {
  return /* @__PURE__ */ jsx("span", { className: "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold uppercase text-white", style: { backgroundColor: props.color }, children: props.label.slice(0, 2) });
}
function AdvancedTimerCard(props) {
  const { block, theme: theme2 } = props;
  const target = useMemo(() => Date.parse(block.props.targetIso), [block.props.targetIso]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!Number.isFinite(target)) return;
    const timer = setInterval(() => setNow(Date.now()), 1e3);
    return () => clearInterval(timer);
  }, [target]);
  const ended = Number.isFinite(target) ? now >= target : false;
  const remainingMs = Number.isFinite(target) ? Math.max(target - now, 0) : 0;
  const days = Math.floor(remainingMs / (1e3 * 60 * 60 * 24));
  const hours = Math.floor(remainingMs / (1e3 * 60 * 60) % 24);
  const minutes = Math.floor(remainingMs / (1e3 * 60) % 60);
  const seconds = Math.floor(remainingMs / 1e3 % 60);
  return /* @__PURE__ */ jsxs("section", { className: cardClassName("text-center"), style: cardStyle(theme2), children: [
    /* @__PURE__ */ jsx("div", { className: "text-sm font-bold uppercase tracking-[0.18em] opacity-60", children: "Advanced timer" }),
    /* @__PURE__ */ jsx("h2", { className: "mt-2 text-2xl font-black", children: block.props.title }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm opacity-70", children: block.props.dateTimeText }),
    Number.isFinite(target) ? /* @__PURE__ */ jsx("div", { className: "mt-4 grid grid-cols-4 gap-2 text-center", children: [
      [days, "Days"],
      [hours, "Hours"],
      [minutes, "Minutes"],
      [seconds, "Seconds"]
    ].map(([value, label]) => /* @__PURE__ */ jsxs("div", { className: "rounded-xl px-2 py-3", style: { backgroundColor: `${theme2.primaryColor}18` }, children: [
      /* @__PURE__ */ jsx("div", { className: "text-lg font-black", children: String(value).padStart(2, "0") }),
      /* @__PURE__ */ jsx("div", { className: "mt-1 text-[10px] uppercase tracking-[0.15em] opacity-70", children: label })
    ] }, String(label))) }) : null,
    /* @__PURE__ */ jsx("p", { className: "mt-4 text-sm font-semibold", style: { color: ended ? "#ef4444" : theme2.primaryColor }, children: ended ? block.props.afterMessage : block.props.beforeMessage })
  ] });
}
function RenderBlocks(props) {
  const theme2 = props.theme ?? DEFAULT_PAGE_THEME;
  const stickyPad = props.stickyPad ?? false;
  return /* @__PURE__ */ jsx("main", { className: `${layoutClassName(theme2, stickyPad)} ${fontClassName(theme2)}`, style: { color: theme2.textColor }, children: /* @__PURE__ */ jsx("div", { className: theme2.layoutStyle === "card_based" ? "space-y-5 rounded-[2rem] bg-white/35 p-3 backdrop-blur-md sm:p-4" : "space-y-5", children: props.blocks.map((b) => {
    switch (b.type) {
      case "header":
        return /* @__PURE__ */ jsxs("section", { className: "px-2 text-center", children: [
          /* @__PURE__ */ jsx("h1", { className: "text-4xl font-black tracking-tight sm:text-5xl", style: { color: theme2.textColor }, children: b.props.title }),
          b.props.subtitle ? /* @__PURE__ */ jsx("p", { className: "mx-auto mt-3 max-w-md text-base leading-7 opacity-75", children: b.props.subtitle }) : null
        ] }, b.id);
      case "text":
        return /* @__PURE__ */ jsx("section", { className: cardClassName("text-center"), style: cardStyle(theme2), children: /* @__PURE__ */ jsx("p", { className: "whitespace-pre-wrap text-base leading-7 opacity-85", children: b.props.text }) }, b.id);
      case "link_button":
        return /* @__PURE__ */ jsx(
          "a",
          {
            href: b.props.href,
            onClick: () => trackClick(props.trackingCode, b),
            className: "flex min-h-14 w-full items-center justify-center px-5 py-4 text-center text-sm font-bold transition hover:-translate-y-0.5",
            style: buttonStyle(theme2),
            children: b.props.label
          },
          b.id
        );
      case "image":
        return /* @__PURE__ */ jsx("figure", { className: "overflow-hidden rounded-3xl border shadow-sm shadow-slate-200/70", style: cardStyle(theme2), children: /* @__PURE__ */ jsx("img", { src: b.props.src, alt: b.props.alt ?? "", className: "h-auto w-full object-cover", loading: "lazy" }) }, b.id);
      case "video":
        return /* @__PURE__ */ jsx("div", { className: "overflow-hidden rounded-3xl border bg-black shadow-sm shadow-slate-200/70", children: /* @__PURE__ */ jsx("video", { src: b.props.src, controls: true, className: "h-auto w-full" }) }, b.id);
      case "whatsapp_button": {
        const message = b.props.message ? `?text=${encodeURIComponent(b.props.message)}` : "";
        const href = `https://wa.me/${b.props.phoneE164.replace("+", "")}${message}`;
        return /* @__PURE__ */ jsx(
          "a",
          {
            href,
            target: "_blank",
            rel: "noreferrer",
            onClick: () => trackClick(props.trackingCode, b),
            className: "flex min-h-14 w-full items-center justify-center px-5 py-4 text-center text-sm font-bold transition hover:-translate-y-0.5",
            style: buttonStyle(theme2, "whatsapp"),
            children: b.props.label
          },
          b.id
        );
      }
      case "divider":
        return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx(DividerView, { block: b, theme: theme2 }) }, b.id);
      case "profile":
        return /* @__PURE__ */ jsxs("section", { className: "px-2 text-center", children: [
          /* @__PURE__ */ jsx(
            "img",
            {
              src: b.props.imageUrl,
              alt: b.props.name,
              className: "mx-auto h-28 w-28 border-4 border-white object-cover shadow-xl shadow-slate-300/70",
              style: { borderRadius: profileRadius(theme2, b.props.circular) },
              loading: "lazy"
            }
          ),
          /* @__PURE__ */ jsx("h1", { className: "mt-4 text-3xl font-black tracking-tight", children: b.props.name }),
          b.props.subtitle ? /* @__PURE__ */ jsx("p", { className: "mt-1 text-base opacity-70", children: b.props.subtitle }) : null
        ] }, b.id);
      case "social_links":
        return /* @__PURE__ */ jsx("section", { className: "flex flex-wrap justify-center gap-2", children: b.props.links.map((link) => /* @__PURE__ */ jsxs(
          "a",
          {
            href: link.href,
            target: link.href.startsWith("mailto:") ? void 0 : "_blank",
            rel: "noreferrer",
            className: "flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5",
            style: cardStyle(theme2),
            children: [
              /* @__PURE__ */ jsx(SocialIcon, { label: link.platform, color: theme2.primaryColor }),
              link.label
            ]
          },
          `${link.platform}-${link.href}`
        )) }, b.id);
      case "faq":
        return /* @__PURE__ */ jsxs("section", { className: cardClassName("space-y-3"), style: cardStyle(theme2), children: [
          /* @__PURE__ */ jsx("h2", { className: "text-sm font-bold uppercase tracking-[0.18em] opacity-60", children: "FAQ" }),
          b.props.items.map((item) => /* @__PURE__ */ jsxs("details", { className: "group rounded-2xl p-4", style: { backgroundColor: `${theme2.primaryColor}12` }, children: [
            /* @__PURE__ */ jsx("summary", { className: "cursor-pointer text-sm font-bold", children: item.question }),
            /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm leading-6 opacity-75", children: item.answer })
          ] }, item.question))
        ] }, b.id);
      case "map_location":
        return /* @__PURE__ */ jsxs("section", { className: cardClassName("space-y-4 text-center"), style: cardStyle(theme2), children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h2", { className: "text-xl font-black", children: b.props.title }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm opacity-60", children: "Location and directions" })
          ] }),
          /* @__PURE__ */ jsx("a", { href: b.props.mapsUrl, target: "_blank", rel: "noreferrer", className: "flex min-h-11 w-full items-center justify-center px-4 py-3 text-sm font-bold", style: buttonStyle(theme2), children: b.props.buttonText })
        ] }, b.id);
      case "price_list":
        return /* @__PURE__ */ jsxs("section", { className: cardClassName("space-y-3"), style: cardStyle(theme2), children: [
          b.props.title ? /* @__PURE__ */ jsx("h2", { className: "text-xl font-black", children: b.props.title }) : null,
          b.props.items.filter((item) => item.name || item.description || item.price).map((item) => /* @__PURE__ */ jsxs(
            "div",
            {
              className: "flex items-start justify-between gap-4 rounded-2xl p-4",
              style: { backgroundColor: `${theme2.primaryColor}10` },
              children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("div", { className: "font-bold", children: item.name || "�" }),
                  item.description ? /* @__PURE__ */ jsx("div", { className: "mt-1 text-sm opacity-70", children: item.description }) : null
                ] }),
                /* @__PURE__ */ jsx("div", { className: "shrink-0 font-black", children: item.price || "�" })
              ]
            },
            `${item.name}-${item.price}-${item.description ?? ""}`
          ))
        ] }, b.id);
      case "html_embed":
        return /* @__PURE__ */ jsx(
          "section",
          {
            className: cardClassName("html-embed-root overflow-hidden p-2"),
            style: cardStyle(theme2),
            children: /* @__PURE__ */ jsx(
              "iframe",
              {
                title: "Custom HTML block",
                sandbox: htmlEmbedSandbox(b.props.allowScripts),
                referrerPolicy: "no-referrer",
                srcDoc: buildSandboxedHtmlDocument(b.props.html, HTML_EMBED_MAX_LENGTH, {
                  allowScripts: b.props.allowScripts
                }),
                className: "h-[640px] w-full rounded-[1rem] border border-black/10 bg-white"
              }
            )
          },
          b.id
        );
      case "form":
        return /* @__PURE__ */ jsxs("section", { className: cardClassName("space-y-4"), style: cardStyle(theme2), children: [
          /* @__PURE__ */ jsx("h2", { className: "text-xl font-black", children: b.props.title }),
          /* @__PURE__ */ jsxs("form", { method: "post", action: `/p/${encodeURIComponent(props.code)}`, className: "space-y-3", children: [
            /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "submit_lead" }),
            /* @__PURE__ */ jsx("input", { type: "hidden", name: "blockId", value: b.id }),
            b.props.enabledFields.includes("name") ? /* @__PURE__ */ jsx("input", { name: "name", placeholder: "Name", className: "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-slate-900" }) : null,
            b.props.enabledFields.includes("phone") ? /* @__PURE__ */ jsx("input", { name: "phone", placeholder: "Phone", className: "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-slate-900" }) : null,
            b.props.enabledFields.includes("email") ? /* @__PURE__ */ jsx("input", { name: "email", type: "email", placeholder: "Email", className: "h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-slate-900" }) : null,
            b.props.enabledFields.includes("message") ? /* @__PURE__ */ jsx("textarea", { name: "message", placeholder: "Message", rows: 4, className: "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-900" }) : null,
            /* @__PURE__ */ jsx("button", { type: "submit", className: "flex min-h-11 w-full items-center justify-center px-4 py-3 text-sm font-bold", style: buttonStyle(theme2), children: b.props.submitText })
          ] })
        ] }, b.id);
      case "digital_products":
        return /* @__PURE__ */ jsxs("section", { className: cardClassName("space-y-4"), style: cardStyle(theme2), children: [
          b.props.title ? /* @__PURE__ */ jsx("h2", { className: "text-xl font-black", children: b.props.title }) : null,
          /* @__PURE__ */ jsx("p", { className: "text-xs opacity-70", children: b.props.note || "Payment integration planned later." }),
          /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 gap-3", children: b.props.items.map((item) => /* @__PURE__ */ jsxs("article", { className: "rounded-2xl border border-black/10 bg-white/55 p-3", children: [
            item.imageUrl ? /* @__PURE__ */ jsx("img", { src: item.imageUrl, alt: item.title, className: "mb-3 h-40 w-full rounded-xl object-cover", loading: "lazy" }) : null,
            /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-3", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("h3", { className: "font-bold", children: item.title }),
                item.description ? /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm opacity-75", children: item.description }) : null
              ] }),
              item.priceText ? /* @__PURE__ */ jsx("div", { className: "shrink-0 font-black", children: item.priceText }) : null
            ] }),
            /* @__PURE__ */ jsx("a", { href: item.buttonUrl, target: "_blank", rel: "noreferrer", className: "mt-3 flex min-h-10 w-full items-center justify-center px-4 py-2 text-sm font-bold", style: buttonStyle(theme2), children: item.buttonText })
          ] }, `${item.title}-${item.buttonUrl}`)) })
        ] }, b.id);
      case "advanced_timer":
        return /* @__PURE__ */ jsx(AdvancedTimerCard, { block: b, theme: theme2 }, b.id);
      case "gallery":
        return /* @__PURE__ */ jsx("section", { className: "grid grid-cols-2 gap-2", children: b.props.images.map((image) => /* @__PURE__ */ jsx(
          "img",
          {
            src: image.src,
            alt: image.alt ?? "",
            loading: "lazy",
            className: "aspect-square w-full rounded-2xl object-cover shadow-sm shadow-slate-200/70"
          },
          image.src
        )) }, b.id);
      case "contact_card":
        return /* @__PURE__ */ jsxs("section", { className: cardClassName("space-y-3"), style: cardStyle(theme2), children: [
          /* @__PURE__ */ jsx("h2", { className: "text-xl font-black", children: "Contact" }),
          /* @__PURE__ */ jsxs("div", { className: "grid gap-2 text-sm", children: [
            b.props.phone ? /* @__PURE__ */ jsxs("a", { href: `tel:${b.props.phone}`, className: "rounded-2xl p-3 font-semibold", style: { backgroundColor: `${theme2.primaryColor}10` }, children: [
              "Phone: ",
              b.props.phone
            ] }) : null,
            b.props.whatsapp ? /* @__PURE__ */ jsxs("a", { href: `https://wa.me/${b.props.whatsapp.replace("+", "")}`, target: "_blank", rel: "noreferrer", className: "rounded-2xl bg-emerald-50 p-3 font-semibold text-emerald-800", children: [
              "WhatsApp: ",
              b.props.whatsapp
            ] }) : null,
            b.props.email ? /* @__PURE__ */ jsxs("a", { href: `mailto:${b.props.email}`, className: "rounded-2xl p-3 font-semibold", style: { backgroundColor: `${theme2.primaryColor}10` }, children: [
              "Email: ",
              b.props.email
            ] }) : null,
            b.props.address ? /* @__PURE__ */ jsxs("div", { className: "rounded-2xl p-3 font-semibold", style: { backgroundColor: `${theme2.primaryColor}10` }, children: [
              "Address: ",
              b.props.address
            ] }) : null
          ] })
        ] }, b.id);
      case "countdown":
        return /* @__PURE__ */ jsxs("section", { className: cardClassName("text-center"), style: cardStyle(theme2), children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-bold uppercase tracking-[0.18em] opacity-60", children: "Save the date" }),
          /* @__PURE__ */ jsx("h2", { className: "mt-2 text-2xl font-black", children: b.props.title }),
          /* @__PURE__ */ jsx("p", { className: "mt-2 px-4 py-3 text-sm font-bold text-white", style: buttonStyle(theme2), children: b.props.dateTimeText })
        ] }, b.id);
      case "announcement":
        return /* @__PURE__ */ jsxs(
          "section",
          {
            className: "rounded-3xl p-5 shadow-sm",
            style: b.props.style === "strong" ? { backgroundColor: theme2.primaryColor, color: "#ffffff" } : cardStyle(theme2),
            children: [
              /* @__PURE__ */ jsx("h2", { className: "text-xl font-black", children: b.props.title }),
              /* @__PURE__ */ jsx("p", { className: "mt-2 whitespace-pre-wrap text-sm leading-6 opacity-85", children: b.props.message })
            ]
          },
          b.id
        );
      default:
        return null;
    }
  }) }) });
}
function PublicPageFrame(props) {
  const theme2 = props.theme ?? DEFAULT_PAGE_THEME;
  const sticky = pickStickyContact(props.blocks);
  return /* @__PURE__ */ jsxs("div", { className: `min-h-screen ${fontClassName(theme2)}`, style: pageStyle(theme2), children: [
    theme2.showPlatformBadge ? /* @__PURE__ */ jsx("div", { className: "mx-auto flex max-w-5xl justify-end px-4 pt-4", children: /* @__PURE__ */ jsxs("div", { className: "rounded-full bg-white/75 px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur", style: { color: theme2.textColor }, children: [
      "Smart Page /p/",
      props.code
    ] }) }) : null,
    /* @__PURE__ */ jsx(RenderBlocks, { code: props.code, blocks: props.blocks, trackingCode: props.trackingCode, theme: theme2, stickyPad: Boolean(sticky) }),
    theme2.footerText ? /* @__PURE__ */ jsx("footer", { className: `mx-auto max-w-xl px-6 text-center text-sm opacity-70 ${sticky ? "pb-24 md:pb-10" : "pb-10"}`, style: { color: theme2.textColor }, children: theme2.footerText }) : sticky ? /* @__PURE__ */ jsx("div", { className: "h-14 md:h-0", "aria-hidden": true }) : null,
    sticky ? /* @__PURE__ */ jsx("div", { className: "fixed bottom-0 left-0 right-0 z-30 border-t border-white/25 bg-white/90 px-4 py-3 shadow-[0_-12px_40px_-24px_rgba(15,23,42,0.55)] backdrop-blur-md md:hidden", children: /* @__PURE__ */ jsx(
      "a",
      {
        href: sticky.href,
        target: sticky.href.startsWith("tel:") ? void 0 : "_blank",
        rel: "noreferrer",
        className: "flex min-h-12 w-full max-w-xl mx-auto items-center justify-center rounded-2xl px-5 text-center text-sm font-bold text-white shadow-lg shadow-emerald-900/25 transition active:scale-[0.99]",
        style: {
          background: sticky.href.includes("wa.me") ? "#10b981" : theme2.buttonColor
        },
        children: sticky.label
      }
    ) }) : null
  ] });
}
function EditorPhonePreview(props) {
  return /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 shadow-2xl ring-1 ring-white/5", children: [
    /* @__PURE__ */ jsx("div", { className: "mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500", children: "Live preview" }),
    /* @__PURE__ */ jsx("div", { className: "mx-auto aspect-[9/17] w-full max-w-[340px] max-h-[min(620px,68vh)] overflow-hidden rounded-[2rem] border-[10px] border-zinc-950 bg-zinc-950 shadow-inner", children: /* @__PURE__ */ jsx("div", { className: "h-full overflow-y-auto rounded-[1.6rem] bg-white", style: { WebkitOverflowScrolling: "touch" }, children: /* @__PURE__ */ jsx(PublicPageFrame, { code: "preview", blocks: props.blocks, theme: props.theme }) }) }),
    /* @__PURE__ */ jsxs("div", { className: "mx-auto mt-4 flex max-w-[340px] items-center gap-2", children: [
      props.previewHref ? /* @__PURE__ */ jsx(
        Link,
        {
          to: props.previewHref,
          target: "_blank",
          rel: "noreferrer",
          className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-zinc-200 transition hover:bg-zinc-700",
          "aria-label": "Open public page in new tab",
          title: "Public view",
          children: /* @__PURE__ */ jsxs("svg", { className: "h-5 w-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", "aria-hidden": true, children: [
            /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" }),
            /* @__PURE__ */ jsx(
              "path",
              {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: 2,
                d: "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              }
            )
          ] })
        }
      ) : /* @__PURE__ */ jsx("span", { className: "h-11 w-11 shrink-0", "aria-hidden": true }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: props.onAddBlock,
          className: "min-h-[46px] flex-1 rounded-full bg-brand-600 px-4 text-center text-sm font-bold uppercase tracking-[0.12em] text-white shadow-lg shadow-brand-900/40 transition hover:bg-brand-500 active:scale-[0.98]",
          children: "Add block"
        }
      ),
      /* @__PURE__ */ jsx(
        "span",
        {
          className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-800/50 text-lg text-zinc-600",
          title: "More block tools coming soon",
          "aria-hidden": true,
          children: "≡"
        }
      )
    ] }),
    /* @__PURE__ */ jsx("p", { className: "mt-3 text-center text-xs text-zinc-500", children: props.label })
  ] });
}
function EditorSection(props) {
  return /* @__PURE__ */ jsxs("section", { className: "overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900/55 shadow-xl shadow-black/35 ring-1 ring-white/[0.04]", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-start justify-between gap-4 border-b border-zinc-700/70 px-4 py-4 sm:px-5", children: [
      /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-base font-semibold text-white", children: props.title }),
        props.description ? /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-zinc-400", children: props.description }) : null
      ] }),
      props.right ? /* @__PURE__ */ jsx("div", { className: "flex shrink-0 flex-wrap items-center justify-end gap-2", children: props.right }) : null
    ] }),
    /* @__PURE__ */ jsx("div", { className: "p-4 sm:p-5", children: props.children })
  ] });
}
function Card(props) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: cn(
        "rounded-xl border border-slate-200 bg-white shadow-sm",
        props.className
      ),
      children: props.children
    }
  );
}
function CardHeader(props) {
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: cn(
        "flex items-start justify-between gap-4 border-b border-slate-200 p-5",
        props.className
      ),
      children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "text-base font-semibold text-slate-900", children: props.title }),
          props.description ? /* @__PURE__ */ jsx("div", { className: "mt-1 text-sm text-slate-600", children: props.description }) : null
        ] }),
        props.right ? /* @__PURE__ */ jsx("div", { children: props.right }) : null
      ]
    }
  );
}
function CardBody(props) {
  return /* @__PURE__ */ jsx("div", { className: cn("p-5", props.className), children: props.children });
}
function SeoFields(props) {
  const editor = props.appearance === "editor";
  const innerProps = {
    seoTitle: props.seoTitle,
    seoDescription: props.seoDescription,
    allowIndexing: props.allowIndexing,
    onSeoTitle: props.onSeoTitle,
    onSeoDescription: props.onSeoDescription,
    onAllowIndexing: props.onAllowIndexing,
    editor
  };
  if (editor) {
    return /* @__PURE__ */ jsx(
      EditorSection,
      {
        title: "Search visibility",
        description: "Controls how /p links appear in Google when published. Leave SEO fields blank to derive title and snippet from your page content.",
        children: /* @__PURE__ */ jsx(SeoFieldsInner, { ...innerProps })
      }
    );
  }
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(
      CardHeader,
      {
        title: "Search visibility",
        description: "Controls how /p links appear in Google when published. Leave SEO fields blank to derive title and snippet from your page content."
      }
    ),
    /* @__PURE__ */ jsx(CardBody, { className: "space-y-4", children: /* @__PURE__ */ jsx(SeoFieldsInner, { ...innerProps }) })
  ] });
}
function SeoFieldsInner(props) {
  const editor = props.editor;
  const labelCls = editor ? "text-sm font-medium text-zinc-300" : "text-sm font-medium text-slate-700";
  const textareaCls = editor ? "w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/55" : "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500";
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsx("input", { type: "hidden", name: "allowIndexing", value: props.allowIndexing ? "1" : "0" }),
    /* @__PURE__ */ jsxs(
      "label",
      {
        className: `flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${editor ? "border-zinc-600 bg-zinc-950/80" : "border-slate-200 bg-slate-50"}`,
        children: [
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "checkbox",
              className: "mt-1",
              checked: props.allowIndexing,
              onChange: (event) => props.onAllowIndexing(event.target.checked)
            }
          ),
          /* @__PURE__ */ jsxs("span", { children: [
            /* @__PURE__ */ jsx("span", { className: `block text-sm font-semibold ${editor ? "text-white" : "text-slate-900"}`, children: "Allow search engines to index this page" }),
            /* @__PURE__ */ jsx("span", { className: `mt-1 block text-xs ${editor ? "text-zinc-400" : "text-slate-600"}`, children: "Turn off for private pages—your public URL still works by link, but won't appear in Google or the platform sitemap." })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-1 md:col-span-2", children: [
        /* @__PURE__ */ jsx("label", { className: labelCls, children: "SEO title (optional)" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            name: "seoTitle",
            variant: editor ? "dark" : "default",
            value: props.seoTitle,
            onChange: (event) => props.onSeoTitle(event.target.value),
            placeholder: "Overrides browser tab title when set"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1 md:col-span-2", children: [
        /* @__PURE__ */ jsx("label", { className: labelCls, children: "SEO description (optional)" }),
        /* @__PURE__ */ jsx(
          "textarea",
          {
            name: "seoDescription",
            value: props.seoDescription,
            onChange: (event) => props.onSeoDescription(event.target.value),
            placeholder: "Short summary for Google & social previews—defaults from profile subtitle or first text block.",
            rows: 3,
            className: textareaCls
          }
        )
      ] })
    ] })
  ] });
}
function buttonClassName(props = {}) {
  const { variant = "primary", size = "md", className } = props;
  return cn(
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition",
    "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-white",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    size === "sm" ? "h-9 px-3" : "h-10 px-4",
    variant === "primary" && "bg-brand-600 text-white hover:bg-brand-700",
    variant === "secondary" && "bg-slate-900 text-white hover:bg-slate-800",
    variant === "ghost" && "bg-transparent text-slate-900 hover:bg-slate-100",
    variant === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
    className
  );
}
function Button(props) {
  const {
    children,
    type = "button",
    variant = "primary",
    size = "md",
    className,
    ...rest
  } = props;
  return /* @__PURE__ */ jsx(
    "button",
    {
      type,
      className: buttonClassName({ variant, size, className }),
      ...rest,
      children
    }
  );
}
const BLOCK_TYPES = /* @__PURE__ */ new Set([
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
const SOCIAL_PLATFORMS = /* @__PURE__ */ new Set([
  "instagram",
  "tiktok",
  "whatsapp",
  "youtube",
  "website",
  "email"
]);
const LEAD_FIELD_KEYS = /* @__PURE__ */ new Set(["name", "phone", "email", "message"]);
function randomBlockId() {
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 20);
  return `blk_${random}`;
}
function cleanText(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}
function validateUrlLike(value) {
  return value.startsWith("/") || value.startsWith("https://") || value.startsWith("http://");
}
function validateExternalUrl(value) {
  return value.startsWith("https://") || value.startsWith("http://");
}
function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function validateContactHref(value) {
  return validateExternalUrl(value) || value.startsWith("mailto:") || value.startsWith("tel:");
}
function cleanBoolean(value) {
  return value === true || value === "true";
}
function cleanDividerStep(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 4) return 4;
  return n;
}
function cleanDividerVariant(value) {
  const s = String(value ?? "classic");
  if (s === "empty" || s === "simple" || s === "decorative" || s === "classic") return s;
  return "classic";
}
function cleanSectionColor(value) {
  const s = cleanText(value, 16).trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(s) || /^#[0-9A-Fa-f]{3}$/.test(s)) return s;
  return void 0;
}
function cleanEnabledLeadFields(value) {
  if (!Array.isArray(value)) return ["name", "phone", "email", "message"];
  const unique = Array.from(
    new Set(
      value.map((v) => String(v)).filter((v) => LEAD_FIELD_KEYS.has(v))
    )
  );
  return unique.length > 0 ? unique : ["name", "phone", "email", "message"];
}
function cleanProductItems(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((item) => {
    const entry2 = item && typeof item === "object" ? item : {};
    return {
      title: cleanText(entry2.title, 140),
      description: entry2.description ? cleanText(entry2.description, 500) : void 0,
      priceText: entry2.priceText ? cleanText(entry2.priceText, 80) : void 0,
      imageUrl: entry2.imageUrl ? cleanText(entry2.imageUrl, 500) : void 0,
      buttonText: cleanText(entry2.buttonText, 80) || "Open",
      buttonUrl: cleanText(entry2.buttonUrl, 500)
    };
  }).filter((item) => item.title && item.buttonUrl && validateContactHref(item.buttonUrl)).map((item) => ({
    ...item,
    imageUrl: item.imageUrl && validateExternalUrl(item.imageUrl) ? item.imageUrl : void 0
  }));
}
function cleanFaqItems(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).map((item) => {
    const entry2 = item && typeof item === "object" ? item : {};
    return {
      question: cleanText(entry2.question, 160),
      answer: cleanText(entry2.answer, 700)
    };
  }).filter((item) => item.question && item.answer);
}
function cleanPriceItems(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((item) => {
    const entry2 = item && typeof item === "object" ? item : {};
    return {
      name: cleanText(entry2.name, 120),
      description: entry2.description ? cleanText(entry2.description, 240) : void 0,
      price: cleanText(entry2.price, 80)
    };
  }).filter((item) => item.name && item.price);
}
function cleanGalleryImages(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 12).map((item) => {
    const entry2 = item && typeof item === "object" ? item : {};
    return {
      src: cleanText(entry2.src, 500),
      alt: entry2.alt ? cleanText(entry2.alt, 160) : void 0
    };
  }).filter((item) => item.src && validateExternalUrl(item.src));
}
function cleanSocialLinks(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((item) => {
    const entry2 = item && typeof item === "object" ? item : {};
    const platform = String(entry2.platform ?? "");
    const label = cleanText(entry2.label, 80);
    const href = cleanText(entry2.href, 500);
    return { platform, label, href };
  }).filter(
    (item) => SOCIAL_PLATFORMS.has(item.platform) && item.label && item.href && (item.platform === "email" ? validateEmail(item.href) || item.href.startsWith("mailto:") : validateContactHref(item.href))
  ).map((item) => ({
    ...item,
    href: item.platform === "email" && validateEmail(item.href) ? `mailto:${item.href}` : item.href
  }));
}
function sanitizeBlock(input) {
  if (!input || typeof input !== "object") return null;
  const candidate = input;
  if (typeof candidate.type !== "string" || !BLOCK_TYPES.has(candidate.type)) {
    return null;
  }
  const id2 = typeof candidate.id === "string" && /^blk_[a-zA-Z0-9]+$/.test(candidate.id) ? candidate.id : randomBlockId();
  const props = candidate.props && typeof candidate.props === "object" ? candidate.props : {};
  const typedProps = props;
  switch (candidate.type) {
    case "header": {
      const title = cleanText(typedProps.title, 120);
      if (!title) return null;
      return {
        id: id2,
        type: "header",
        props: {
          title,
          subtitle: typedProps.subtitle ? cleanText(typedProps.subtitle, 180) : void 0
        }
      };
    }
    case "text": {
      const text = cleanText(typedProps.text, 2e3);
      if (!text) return null;
      return { id: id2, type: "text", props: { text } };
    }
    case "link_button": {
      const label = cleanText(typedProps.label, 80);
      const href = cleanText(typedProps.href, 500);
      if (!label || !href || !validateUrlLike(href)) return null;
      return {
        id: id2,
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
        id: id2,
        type: "image",
        props: {
          src,
          alt: typedProps.alt ? cleanText(typedProps.alt, 160) : void 0
        }
      };
    }
    case "video": {
      const src = cleanText(typedProps.src, 500);
      if (!src || !validateUrlLike(src)) return null;
      return { id: id2, type: "video", props: { src } };
    }
    case "whatsapp_button": {
      const label = cleanText(typedProps.label, 80);
      const phoneE164 = cleanText(typedProps.phoneE164, 32);
      if (!label || !/^\+[1-9]\d{7,14}$/.test(phoneE164)) return null;
      return {
        id: id2,
        type: "whatsapp_button",
        props: {
          label,
          phoneE164,
          message: typedProps.message ? cleanText(typedProps.message, 300) : void 0
        }
      };
    }
    case "divider": {
      const label = typedProps.label ? cleanText(typedProps.label, 80) : void 0;
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
        editorLabel: typedProps.editorLabel ? cleanText(typedProps.editorLabel, 80) : void 0,
        paddingTop,
        paddingBottom,
        edgeIndent: cleanBoolean(typedProps.edgeIndent),
        sectionBackground: cleanSectionColor(typedProps.sectionBackground),
        extraVerticalSpacing: cleanBoolean(typedProps.extraVerticalSpacing)
      };
      return { id: id2, type: "divider", props: propsOut };
    }
    case "profile": {
      const imageUrl = cleanText(typedProps.imageUrl, 500);
      const name = cleanText(typedProps.name, 120);
      if (!imageUrl || !validateExternalUrl(imageUrl) || !name) return null;
      return {
        id: id2,
        type: "profile",
        props: {
          imageUrl,
          name,
          subtitle: typedProps.subtitle ? cleanText(typedProps.subtitle, 180) : void 0,
          circular: cleanBoolean(typedProps.circular)
        }
      };
    }
    case "social_links": {
      const links2 = cleanSocialLinks(typedProps.links);
      return { id: id2, type: "social_links", props: { links: links2 } };
    }
    case "faq": {
      const items = cleanFaqItems(typedProps.items);
      return { id: id2, type: "faq", props: { items } };
    }
    case "map_location": {
      const title = cleanText(typedProps.title, 120);
      const mapsUrl = cleanText(typedProps.mapsUrl, 500);
      const buttonText = cleanText(typedProps.buttonText, 80) || "Open map";
      if (!title || !mapsUrl || !validateExternalUrl(mapsUrl)) return null;
      return { id: id2, type: "map_location", props: { title, mapsUrl, buttonText } };
    }
    case "price_list": {
      const items = cleanPriceItems(typedProps.items);
      return {
        id: id2,
        type: "price_list",
        props: {
          title: typedProps.title ? cleanText(typedProps.title, 120) : void 0,
          items
        }
      };
    }
    case "gallery": {
      const images = cleanGalleryImages(typedProps.images);
      return { id: id2, type: "gallery", props: { images } };
    }
    case "contact_card": {
      const phone = typedProps.phone ? cleanText(typedProps.phone, 80) : void 0;
      const whatsapp = typedProps.whatsapp ? cleanText(typedProps.whatsapp, 32) : void 0;
      const email = typedProps.email ? cleanText(typedProps.email, 160) : void 0;
      const address = typedProps.address ? cleanText(typedProps.address, 240) : void 0;
      if (!phone && !whatsapp && !email && !address) return null;
      if (whatsapp && !/^\+[1-9]\d{7,14}$/.test(whatsapp)) return null;
      if (email && !validateEmail(email)) return null;
      return { id: id2, type: "contact_card", props: { phone, whatsapp, email, address } };
    }
    case "countdown": {
      const title = cleanText(typedProps.title, 120);
      const dateTimeText = cleanText(typedProps.dateTimeText, 120);
      if (!title || !dateTimeText) return null;
      return { id: id2, type: "countdown", props: { title, dateTimeText } };
    }
    case "announcement": {
      const title = cleanText(typedProps.title, 120);
      const message = cleanText(typedProps.message, 600);
      if (!title || !message) return null;
      return {
        id: id2,
        type: "announcement",
        props: { title, message, style: typedProps.style === "strong" ? "strong" : "soft" }
      };
    }
    case "html_embed": {
      const raw = cleanText(typedProps.html, HTML_EMBED_MAX_LENGTH);
      const allowScripts = cleanBoolean(typedProps.allowScripts);
      const html = sanitizeHtmlForSandboxStorage(raw, HTML_EMBED_MAX_LENGTH, { allowScripts });
      if (!html.trim()) return null;
      return { id: id2, type: "html_embed", props: { html, allowScripts } };
    }
    case "form": {
      const title = cleanText(typedProps.title, 120) || "Contact form";
      const submitText = cleanText(typedProps.submitText, 40) || "Send";
      const enabledFields = cleanEnabledLeadFields(typedProps.enabledFields);
      return {
        id: id2,
        type: "form",
        props: {
          title,
          enabledFields,
          submitText
        }
      };
    }
    case "digital_products": {
      const title = typedProps.title ? cleanText(typedProps.title, 120) : void 0;
      const note = typedProps.note ? cleanText(typedProps.note, 240) : void 0;
      return {
        id: id2,
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
          id: id2,
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
        id: id2,
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
function theme(input) {
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
const PAGE_TEMPLATES = [
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
function instantiateTemplateBlocks(template, createBlockId) {
  return template.blocks.map((starter) => {
    const id2 = createBlockId();
    const block = sanitizeBlock({
      id: id2,
      type: starter.type,
      props: starter.props
    });
    if (!block) {
      throw new Error(`Template "${template.id}" has an invalid "${starter.type}" block (URLs, phones, or required fields).`);
    }
    return { ...block, id: id2 };
  });
}
function TemplatePicker(props) {
  const [preview, setPreview] = useState(null);
  const previewBlocks = useMemo(
    () => preview ? instantiateTemplateBlocks(preview, props.createBlockId) : [],
    [preview, props.createBlockId]
  );
  const editor = props.appearance === "editor";
  function requestApply(template) {
    if (props.currentBlocksCount > 0 && !window.confirm(
      "Replace your current blocks and theme with this template? This updates the editor only — click Save or Publish afterward to store your changes."
    )) {
      return;
    }
    props.onApply(template);
    setPreview(null);
  }
  const pickerBody = /* @__PURE__ */ jsxs(Fragment$1, { children: [
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3", children: PAGE_TEMPLATES.map((template) => /* @__PURE__ */ jsxs(
      "div",
      {
        className: `flex flex-col rounded-xl border p-4 shadow-sm ${editor ? "border-zinc-600 bg-gradient-to-br from-zinc-900 to-zinc-950 ring-1 ring-white/[0.05]" : "border-slate-200 bg-gradient-to-br from-white to-slate-50"}`,
        children: [
          /* @__PURE__ */ jsx("div", { className: `text-xs font-semibold uppercase tracking-wide ${editor ? "text-brand-400" : "text-brand-700"}`, children: template.category }),
          /* @__PURE__ */ jsx("div", { className: `mt-1 font-semibold ${editor ? "text-white" : "text-slate-950"}`, children: template.name }),
          /* @__PURE__ */ jsx("p", { className: `mt-2 min-h-12 flex-1 text-sm leading-6 ${editor ? "text-zinc-400" : "text-slate-600"}`, children: template.description }),
          /* @__PURE__ */ jsxs("p", { className: `mt-3 text-xs italic ${editor ? "text-zinc-500" : "text-slate-500"}`, children: [
            "Footer: ",
            template.footerText
          ] }),
          /* @__PURE__ */ jsxs("div", { className: `mt-3 flex flex-wrap gap-2 text-xs ${editor ? "text-zinc-400" : "text-slate-600"}`, children: [
            /* @__PURE__ */ jsxs("span", { className: `rounded-full px-2 py-1 font-medium ${editor ? "bg-zinc-800 text-zinc-200" : "bg-slate-100"}`, children: [
              "Button: ",
              template.recommendedButtonStyle
            ] }),
            /* @__PURE__ */ jsxs("span", { className: `rounded-full px-2 py-1 font-medium ${editor ? "bg-zinc-800 text-zinc-200" : "bg-slate-100"}`, children: [
              "Layout: ",
              template.layoutStyle
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "mt-4 grid grid-cols-2 gap-2", children: [
            /* @__PURE__ */ jsx(Button, { type: "button", size: "sm", variant: "secondary", className: "w-full", onClick: () => setPreview(template), children: "Preview" }),
            /* @__PURE__ */ jsx(Button, { type: "button", size: "sm", className: "w-full", onClick: () => requestApply(template), children: "Apply" })
          ] })
        ]
      },
      template.id
    )) }),
    /* @__PURE__ */ jsx("p", { className: `mt-4 text-xs ${editor ? "text-zinc-500" : "text-slate-500"}`, children: "Applying updates theme and blocks in the editor only. Use Save or Publish to persist." })
  ] });
  return /* @__PURE__ */ jsxs(Fragment$1, { children: [
    editor ? /* @__PURE__ */ jsx(
      EditorSection,
      {
        title: "Templates",
        description: "Preview a preset, then apply to load theme and starter blocks. Same look as Taplink-style bios.",
        children: pickerBody
      }
    ) : /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(
        CardHeader,
        {
          title: "Templates",
          description: "Preview a preset, then apply to load theme and starter blocks. Same look as Taplink-style bios."
        }
      ),
      /* @__PURE__ */ jsx(CardBody, { children: pickerBody })
    ] }),
    preview ? /* @__PURE__ */ jsxs("div", { className: "fixed inset-0 z-50 flex items-end justify-center sm:items-center", children: [
      /* @__PURE__ */ jsx("button", { type: "button", className: "absolute inset-0 bg-black/70 backdrop-blur-sm", onClick: () => setPreview(null), "aria-label": "Close preview" }),
      /* @__PURE__ */ jsxs(
        "div",
        {
          className: `relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl shadow-2xl sm:max-h-[90vh] sm:rounded-2xl ${editor ? "border border-zinc-700 bg-zinc-950 text-zinc-100" : "bg-white"}`,
          children: [
            /* @__PURE__ */ jsxs("div", { className: `flex items-start justify-between gap-3 border-b px-5 py-4 ${editor ? "border-zinc-700" : "border-slate-200"}`, children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("div", { className: `text-xs font-semibold uppercase ${editor ? "text-brand-400" : "text-brand-700"}`, children: preview.category }),
                /* @__PURE__ */ jsx("div", { className: `text-lg font-semibold ${editor ? "text-white" : "text-slate-950"}`, children: preview.name }),
                /* @__PURE__ */ jsx("p", { className: `mt-1 text-sm ${editor ? "text-zinc-400" : "text-slate-600"}`, children: preview.description })
              ] }),
              /* @__PURE__ */ jsx(Button, { type: "button", size: "sm", variant: "ghost", onClick: () => setPreview(null), children: "Close" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "overflow-y-auto px-4 py-4", children: [
              /* @__PURE__ */ jsx("div", { className: `rounded-xl p-3 ${editor ? "bg-zinc-900" : "bg-slate-100"}`, children: /* @__PURE__ */ jsx("div", { className: "mx-auto aspect-[9/17] max-h-[55vh] w-full max-w-[320px] overflow-hidden rounded-[2rem] border-[8px] border-zinc-950 bg-zinc-950 shadow-lg", children: /* @__PURE__ */ jsx("div", { className: "h-full overflow-y-auto rounded-[1.5rem] bg-white", children: /* @__PURE__ */ jsx(PublicPageFrame, { code: "preview", blocks: previewBlocks, theme: sanitizePageTheme(preview.theme) }) }) }) }),
              /* @__PURE__ */ jsxs("div", { className: "mt-4 flex flex-col gap-2 sm:flex-row", children: [
                /* @__PURE__ */ jsx(Button, { type: "button", className: "flex-1", variant: "secondary", onClick: () => setPreview(null), children: "Cancel" }),
                /* @__PURE__ */ jsx(Button, { type: "button", className: "flex-1", onClick: () => requestApply(preview), children: "Apply template" })
              ] })
            ] })
          ]
        }
      )
    ] }) : null
  ] });
}
function linesToPriceItemsLenient(value) {
  return value.split("\n").map((line) => {
    const [name = "", description = "", price = ""] = line.split("|").map((part) => part.trim());
    return {
      name,
      description: description ? description : void 0,
      price
    };
  }).filter((item) => item.name || item.description || item.price);
}
function priceItemsToLines(items) {
  return items.map((item) => `${item.name}|${item.description ?? ""}|${item.price}`).join("\n");
}
function normalizePriceLinesText(raw) {
  return priceItemsToLines(linesToPriceItemsLenient(raw));
}
function linesToFaqItemsLenient(value) {
  return value.split("\n").map((line) => {
    const [question = "", answer = ""] = line.split("|").map((part) => part.trim());
    return { question, answer };
  }).filter((item) => item.question || item.answer);
}
function faqItemsToLines(items) {
  return items.map((item) => `${item.question}|${item.answer}`).join("\n");
}
function normalizeFaqLinesText(raw) {
  return faqItemsToLines(linesToFaqItemsLenient(raw));
}
function linesToGalleryImagesLenient(value) {
  return value.split("\n").map((line) => {
    const [src = "", alt = ""] = line.split("|").map((part) => part.trim());
    return { src, alt: alt || void 0 };
  }).filter((item) => item.src || item.alt);
}
function galleryImagesToLines(images) {
  return images.map((item) => `${item.src}|${item.alt ?? ""}`).join("\n");
}
function normalizeGalleryLinesText(raw) {
  return galleryImagesToLines(linesToGalleryImagesLenient(raw));
}
function linesToSocialLinksLenient(value) {
  return value.split("\n").map((line) => {
    const [platform = "website", label = "", href = ""] = line.split("|").map((part) => part.trim());
    return { platform, label, href };
  }).filter((item) => item.label || item.href);
}
function socialLinksToLines(links2) {
  return links2.map((item) => `${item.platform}|${item.label}|${item.href}`).join("\n");
}
function normalizeSocialLinesText(raw) {
  return socialLinksToLines(linesToSocialLinksLenient(raw));
}
function getD1Database(context) {
  var _a, _b, _c;
  const cloudflareContext = context;
  return ((_b = (_a = cloudflareContext.cloudflare) == null ? void 0 : _a.env) == null ? void 0 : _b.DB) ?? ((_c = cloudflareContext.env) == null ? void 0 : _c.DB) ?? null;
}
function getAppEnv(context) {
  var _a;
  const cloudflareContext = context;
  return ((_a = cloudflareContext.cloudflare) == null ? void 0 : _a.env) ?? cloudflareContext.env;
}
function requireD1Database(context) {
  const db2 = getD1Database(context);
  if (!db2) {
    throw new Error("D1 database binding DB is not available.");
  }
  return db2;
}
function createId(prefix) {
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 20);
  return `${prefix}_${random}`;
}
function isLikelyMissingSeoColumnsError(error) {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("no such column") || msg.includes("doesn't exist") || msg.includes("DOES NOT EXIST");
}
const PAGE_ROW_SELECT_LEGACY = `SELECT id, workspace_id, title, slug, status, theme_json,
          published_at, created_at, updated_at
          FROM pages
          WHERE workspace_id = ? AND id = ?`;
const PAGE_ROW_SELECT_FULL = `SELECT id, workspace_id, title, slug, status, theme_json,
                  seo_title, seo_description, allow_indexing,
                  published_at, created_at, updated_at
          FROM pages
          WHERE workspace_id = ? AND id = ?`;
async function loadEditablePageRow(db2, workspaceId, pageId) {
  try {
    const row = await db2.prepare(PAGE_ROW_SELECT_FULL).bind(workspaceId, pageId).first();
    return row ?? null;
  } catch (error) {
    if (!isLikelyMissingSeoColumnsError(error)) throw error;
    const legacy = await db2.prepare(PAGE_ROW_SELECT_LEGACY).bind(workspaceId, pageId).first();
    if (!legacy) return null;
    return {
      ...legacy,
      seo_title: null,
      seo_description: null,
      allow_indexing: 1
    };
  }
}
async function queryPageSummaries(db2, workspaceId, limit) {
  const fullSql = `SELECT
            pages.id,
            pages.workspace_id,
            pages.title,
            pages.slug,
            pages.status,
            pages.theme_json,
            pages.seo_title,
            pages.seo_description,
            pages.allow_indexing,
            pages.published_at,
            pages.created_at,
            pages.updated_at,
            short_links.code AS short_code,
            short_links.status AS short_link_status
          FROM pages
          LEFT JOIN short_links ON short_links.page_id = pages.id
          WHERE pages.workspace_id = ?
            AND pages.status != 'archived'
          ORDER BY pages.updated_at DESC`;
  const legacySql = `SELECT
            pages.id,
            pages.workspace_id,
            pages.title,
            pages.slug,
            pages.status,
            pages.theme_json,
            pages.published_at,
            pages.created_at,
            pages.updated_at,
            short_links.code AS short_code,
            short_links.status AS short_link_status
          FROM pages
          LEFT JOIN short_links ON short_links.page_id = pages.id
          WHERE pages.workspace_id = ?
            AND pages.status != 'archived'
          ORDER BY pages.updated_at DESC`;
  const limitTail = limit != null ? " LIMIT ?" : "";
  try {
    const stmt = db2.prepare(fullSql + limitTail);
    const result = limit != null ? await stmt.bind(workspaceId, limit).all() : await stmt.bind(workspaceId).all();
    return result.results ?? [];
  } catch (error) {
    if (!isLikelyMissingSeoColumnsError(error)) throw error;
    const stmt = db2.prepare(legacySql + limitTail);
    const result = limit != null ? await stmt.bind(workspaceId, limit).all() : await stmt.bind(workspaceId).all();
    return (result.results ?? []).map((row) => ({
      ...row,
      seo_title: null,
      seo_description: null,
      allow_indexing: 1
    }));
  }
}
function normalizeSlug$1(slug) {
  return slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || `page-${Date.now()}`;
}
function parsePropsJson(propsJson) {
  try {
    const parsed = JSON.parse(propsJson);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function rowToBlock(row) {
  const props = parsePropsJson(row.props_json);
  switch (row.type) {
    case "header":
      return {
        id: row.id,
        type: "header",
        props: {
          title: String(props.title ?? ""),
          subtitle: props.subtitle ? String(props.subtitle) : void 0
        }
      };
    case "text":
      return { id: row.id, type: "text", props: { text: String(props.text ?? "") } };
    case "link_button":
      return {
        id: row.id,
        type: "link_button",
        props: { label: String(props.label ?? ""), href: String(props.href ?? "/") }
      };
    case "image":
      return {
        id: row.id,
        type: "image",
        props: {
          src: String(props.src ?? ""),
          alt: props.alt ? String(props.alt) : void 0
        }
      };
    case "video":
      return { id: row.id, type: "video", props: { src: String(props.src ?? "") } };
    case "whatsapp_button":
      return {
        id: row.id,
        type: "whatsapp_button",
        props: {
          label: String(props.label ?? "Chat on WhatsApp"),
          phoneE164: String(props.phoneE164 ?? ""),
          message: props.message ? String(props.message) : void 0
        }
      };
    case "divider": {
      const normalized = sanitizeBlock({ id: row.id, type: "divider", props });
      if (!normalized || normalized.type !== "divider") {
        return { id: row.id, type: "divider", props: {} };
      }
      return normalized;
    }
    case "profile":
      return {
        id: row.id,
        type: "profile",
        props: {
          imageUrl: String(props.imageUrl ?? ""),
          name: String(props.name ?? ""),
          subtitle: props.subtitle ? String(props.subtitle) : void 0,
          circular: props.circular === true
        }
      };
    case "social_links":
      return { id: row.id, type: "social_links", props: { links: cleanSocialLinks(props.links) } };
    case "faq":
      return { id: row.id, type: "faq", props: { items: cleanFaqItems(props.items) } };
    case "map_location":
      return {
        id: row.id,
        type: "map_location",
        props: {
          title: String(props.title ?? ""),
          mapsUrl: String(props.mapsUrl ?? ""),
          buttonText: String(props.buttonText ?? "Open map")
        }
      };
    case "price_list":
      return {
        id: row.id,
        type: "price_list",
        props: { title: props.title ? String(props.title) : void 0, items: cleanPriceItems(props.items) }
      };
    case "gallery":
      return { id: row.id, type: "gallery", props: { images: cleanGalleryImages(props.images) } };
    case "contact_card":
      return {
        id: row.id,
        type: "contact_card",
        props: {
          phone: props.phone ? String(props.phone) : void 0,
          whatsapp: props.whatsapp ? String(props.whatsapp) : void 0,
          email: props.email ? String(props.email) : void 0,
          address: props.address ? String(props.address) : void 0
        }
      };
    case "countdown":
      return {
        id: row.id,
        type: "countdown",
        props: { title: String(props.title ?? ""), dateTimeText: String(props.dateTimeText ?? "") }
      };
    case "announcement":
      return {
        id: row.id,
        type: "announcement",
        props: {
          title: String(props.title ?? ""),
          message: String(props.message ?? ""),
          style: props.style === "strong" ? "strong" : "soft"
        }
      };
    case "html_embed": {
      const normalized = sanitizeBlock({ id: row.id, type: "html_embed", props });
      if (!normalized || normalized.type !== "html_embed") {
        return { id: row.id, type: "html_embed", props: { html: "<p></p>" } };
      }
      return normalized;
    }
    case "form": {
      const normalized = sanitizeBlock({ id: row.id, type: "form", props });
      if (!normalized || normalized.type !== "form") {
        return {
          id: row.id,
          type: "form",
          props: { title: "Contact form", enabledFields: ["name", "phone", "email", "message"], submitText: "Send" }
        };
      }
      return normalized;
    }
    case "digital_products": {
      const normalized = sanitizeBlock({ id: row.id, type: "digital_products", props });
      if (!normalized || normalized.type !== "digital_products") {
        return { id: row.id, type: "digital_products", props: { items: [] } };
      }
      return normalized;
    }
    case "advanced_timer": {
      const normalized = sanitizeBlock({ id: row.id, type: "advanced_timer", props });
      if (!normalized || normalized.type !== "advanced_timer") {
        return {
          id: row.id,
          type: "advanced_timer",
          props: {
            title: "Countdown",
            targetIso: "",
            dateTimeText: "",
            beforeMessage: "Ends soon",
            afterMessage: "Offer ended"
          }
        };
      }
      return normalized;
    }
  }
}
function uniqueBlocks(blocks) {
  const seenIds = /* @__PURE__ */ new Set();
  return blocks.map((block, index) => {
    const id2 = block.id && !seenIds.has(block.id) ? block.id : createId("blk");
    seenIds.add(id2);
    return {
      ...block,
      id: id2,
      sortOrder: index
    };
  });
}
function parseBlocksJson(blocksJson) {
  let parsed;
  try {
    parsed = JSON.parse(blocksJson);
  } catch {
    throw new Error("invalid_blocks_json");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("invalid_blocks");
  }
  if (parsed.length > 50) {
    throw new Error("too_many_blocks");
  }
  const blocks = parsed.map(sanitizeBlock);
  if (blocks.some((block) => !block)) {
    throw new Error("invalid_blocks");
  }
  return blocks;
}
async function ensureUniqueSlug(db2, workspaceId, preferredSlug, pageId) {
  const baseSlug = normalizeSlug$1(preferredSlug);
  let slug = baseSlug;
  let suffix = 2;
  while (true) {
    const existing = await db2.prepare("SELECT id FROM pages WHERE workspace_id = ? AND slug = ? AND id != ?").bind(workspaceId, slug, pageId ?? "").first();
    if (!existing) return slug;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}
async function ensureUniqueShortCode(db2, preferredCode, shortLinkId) {
  const baseCode = normalizeSlug$1(preferredCode);
  let code = baseCode;
  let suffix = 2;
  while (true) {
    const existing = await db2.prepare("SELECT id FROM short_links WHERE code = ? AND id != ?").bind(code, shortLinkId ?? "").first();
    if (!existing) return code;
    code = `${baseCode}-${suffix}`;
    suffix += 1;
  }
}
function pageRepository(db2) {
  return {
    async listPages(workspaceId) {
      return queryPageSummaries(db2, workspaceId);
    },
    async workspacePageStats(workspaceId) {
      const [totalRow, publishedRow, draftRow, latestPages] = await Promise.all([
        db2.prepare("SELECT COUNT(*) AS value FROM pages WHERE workspace_id = ? AND status != 'archived'").bind(workspaceId).first(),
        db2.prepare("SELECT COUNT(*) AS value FROM pages WHERE workspace_id = ? AND status = 'published'").bind(workspaceId).first(),
        db2.prepare("SELECT COUNT(*) AS value FROM pages WHERE workspace_id = ? AND status = 'draft'").bind(workspaceId).first(),
        queryPageSummaries(db2, workspaceId, 5)
      ]);
      return {
        totalPages: (totalRow == null ? void 0 : totalRow.value) ?? 0,
        publishedPages: (publishedRow == null ? void 0 : publishedRow.value) ?? 0,
        draftPages: (draftRow == null ? void 0 : draftRow.value) ?? 0,
        latestPages
      };
    },
    async createPage(input) {
      const pageId = input.pageId ?? createId("pg");
      const slug = await ensureUniqueSlug(db2, input.workspaceId, input.slug ?? input.title, pageId);
      const title = input.title.trim() || "Untitled page";
      if (title.length > 120) {
        throw new Error("page_title_too_long");
      }
      await db2.prepare(
        `INSERT INTO pages
            (id, workspace_id, title, slug, created_by_user_id, updated_by_user_id)
          VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(pageId, input.workspaceId, title, slug, input.userId, input.userId).run();
      return this.getPageForWorkspace(input.workspaceId, pageId);
    },
    async getPageForWorkspace(workspaceId, pageId) {
      const page = await loadEditablePageRow(db2, workspaceId, pageId);
      if (!page) return null;
      const blocksResult = await db2.prepare(
        `SELECT id, page_id, type, sort_order, props_json, created_at, updated_at
          FROM page_blocks
          WHERE page_id = ?
          ORDER BY sort_order ASC`
      ).bind(page.id).all();
      const shortLink = await db2.prepare("SELECT id, code, status FROM short_links WHERE page_id = ? LIMIT 1").bind(page.id).first();
      return {
        page,
        blocks: (blocksResult.results ?? []).map(rowToBlock),
        theme: parsePageThemeJson(page.theme_json),
        shortLink
      };
    },
    async savePage(input) {
      const page = await this.getPageForWorkspace(input.workspaceId, input.pageId);
      if (!page) {
        throw new Error("page_not_found");
      }
      const slug = await ensureUniqueSlug(db2, input.workspaceId, input.slug, input.pageId);
      const title = input.title.trim() || "Untitled page";
      if (title.length > 120) {
        throw new Error("page_title_too_long");
      }
      const blocks = uniqueBlocks(input.blocks);
      const previousBlockIds = new Set(page.blocks.map((b) => b.id));
      const nextBlockIds = new Set(blocks.map((b) => b.id));
      const removedBlockIds = Array.from(previousBlockIds).filter((id2) => !nextBlockIds.has(id2));
      const theme2 = sanitizePageTheme(input.theme ?? DEFAULT_PAGE_THEME);
      const seoTitle = input.seoTitle === void 0 ? page.page.seo_title : input.seoTitle === "" || input.seoTitle === null ? null : input.seoTitle.trim().slice(0, 70) || null;
      const seoDescription = input.seoDescription === void 0 ? page.page.seo_description : input.seoDescription === "" || input.seoDescription === null ? null : input.seoDescription.trim().slice(0, 320) || null;
      const allowIndexing = input.allowIndexing === void 0 ? page.page.allow_indexing !== 0 : input.allowIndexing ? 1 : 0;
      try {
        await db2.prepare(
          `UPDATE pages
          SET title = ?, slug = ?, theme_json = ?,
              seo_title = ?, seo_description = ?, allow_indexing = ?,
              updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND workspace_id = ?`
        ).bind(
          title,
          slug,
          JSON.stringify(theme2),
          seoTitle,
          seoDescription,
          allowIndexing,
          input.userId,
          input.pageId,
          input.workspaceId
        ).run();
      } catch (error) {
        if (!isLikelyMissingSeoColumnsError(error)) throw error;
        await db2.prepare(
          `UPDATE pages
          SET title = ?, slug = ?, theme_json = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND workspace_id = ?`
        ).bind(title, slug, JSON.stringify(theme2), input.userId, input.pageId, input.workspaceId).run();
      }
      await db2.batch([
        db2.prepare("DELETE FROM page_blocks WHERE page_id = ?").bind(input.pageId),
        ...blocks.map(
          (block) => db2.prepare(
            `INSERT INTO page_blocks
                (id, page_id, type, sort_order, props_json)
              VALUES (?, ?, ?, ?, ?)`
          ).bind(block.id, input.pageId, block.type, block.sortOrder, JSON.stringify(block.props))
        )
      ]);
      if (removedBlockIds.length > 0) {
        await db2.batch(
          removedBlockIds.map(
            (blockId) => db2.prepare("DELETE FROM lead_submissions WHERE page_id = ? AND block_id = ?").bind(input.pageId, blockId)
          )
        );
      }
      return this.getPageForWorkspace(input.workspaceId, input.pageId);
    },
    async setPublishStatus(input) {
      var _a, _b;
      const page = await this.getPageForWorkspace(input.workspaceId, input.pageId);
      if (!page) {
        throw new Error("page_not_found");
      }
      if (input.status === "published") {
        const shortLinkId = ((_a = page.shortLink) == null ? void 0 : _a.id) ?? createId("sl");
        const shortCode = await ensureUniqueShortCode(db2, page.page.slug, (_b = page.shortLink) == null ? void 0 : _b.id);
        await db2.batch([
          db2.prepare(
            `UPDATE pages
              SET status = 'published',
                published_at = CURRENT_TIMESTAMP,
                updated_by_user_id = ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND workspace_id = ?`
          ).bind(input.userId, input.pageId, input.workspaceId),
          db2.prepare("UPDATE short_links SET status = 'disabled', updated_at = CURRENT_TIMESTAMP WHERE page_id = ? AND id != ?").bind(input.pageId, shortLinkId),
          page.shortLink ? db2.prepare(
            "UPDATE short_links SET code = ?, status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
          ).bind(shortCode, page.shortLink.id) : db2.prepare(
            `INSERT INTO short_links
                    (id, workspace_id, page_id, code, created_by_user_id)
                  VALUES (?, ?, ?, ?, ?)`
          ).bind(shortLinkId, input.workspaceId, input.pageId, shortCode, input.userId)
        ]);
      } else {
        await db2.batch([
          db2.prepare(
            `UPDATE pages
              SET status = 'draft', updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ? AND workspace_id = ?`
          ).bind(input.userId, input.pageId, input.workspaceId),
          db2.prepare("UPDATE short_links SET status = 'disabled', updated_at = CURRENT_TIMESTAMP WHERE page_id = ?").bind(input.pageId)
        ]);
      }
      return this.getPageForWorkspace(input.workspaceId, input.pageId);
    },
    async getPublishedPageByCode(code) {
      const row = await db2.prepare(
        `SELECT pages.workspace_id, pages.id
          FROM short_links
          JOIN pages ON pages.id = short_links.page_id
          WHERE short_links.code = ?
            AND short_links.status = 'active'
            AND pages.status = 'published'
          LIMIT 1`
      ).bind(code).first();
      if (!row) return null;
      return this.getPageForWorkspace(row.workspace_id, row.id);
    },
    async listIndexablePublishedPages() {
      try {
        const result = await db2.prepare(
          `SELECT short_links.code AS code, pages.updated_at AS updated_at
          FROM pages
          INNER JOIN short_links ON short_links.page_id = pages.id
          WHERE pages.status = 'published'
            AND pages.allow_indexing = 1
            AND short_links.status = 'active'
          ORDER BY pages.updated_at DESC`
        ).all();
        return result.results ?? [];
      } catch (error) {
        if (!isLikelyMissingSeoColumnsError(error)) throw error;
        const result = await db2.prepare(
          `SELECT short_links.code AS code, pages.updated_at AS updated_at
          FROM pages
          INNER JOIN short_links ON short_links.page_id = pages.id
          WHERE pages.status = 'published'
            AND short_links.status = 'active'
          ORDER BY pages.updated_at DESC`
        ).all();
        return result.results ?? [];
      }
    }
  };
}
function getSessionSecret(context) {
  var _a, _b, _c;
  const loadContext = context;
  return ((_b = (_a = loadContext == null ? void 0 : loadContext.cloudflare) == null ? void 0 : _a.env) == null ? void 0 : _b.SESSION_SECRET) ?? ((_c = loadContext == null ? void 0 : loadContext.env) == null ? void 0 : _c.SESSION_SECRET) ?? "phase1-dev-secret-change-me";
}
function createSessionStorage(context) {
  return createCookieSessionStorage({
    cookie: {
      name: "__spp_session",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
      sameSite: "lax",
      secrets: [getSessionSecret(context)],
      secure: true
    }
  });
}
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
function toSqlDate(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}
function normalizeSessionWorkspaceId(workspaceId) {
  const normalized = workspaceId == null ? void 0 : workspaceId.trim();
  return normalized ? normalized : null;
}
async function getClientIpHash(request) {
  var _a, _b;
  const ip = request.headers.get("CF-Connecting-IP") ?? ((_b = (_a = request.headers.get("X-Forwarded-For")) == null ? void 0 : _a.split(",")[0]) == null ? void 0 : _b.trim());
  if (!ip) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function toUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.platform_role === "super_admin" ? "super_admin" : "owner",
    workspaceId: row.workspace_id ?? ""
  };
}
async function getSession(request, context) {
  const cookie = request.headers.get("Cookie");
  return createSessionStorage(context).getSession(cookie);
}
async function commitSession(session, context) {
  return createSessionStorage(context).commitSession(session);
}
async function destroySession(session, context) {
  return createSessionStorage(context).destroySession(session);
}
async function getUser(request, context) {
  const session = await getSession(request, context);
  const db2 = context ? getD1Database(context) : null;
  if (db2) {
    const sessionId = session.get("sessionId");
    if (!sessionId) return null;
    const row = await db2.prepare(
      `SELECT
          users.id,
          users.email,
          users.name,
          users.role AS platform_role,
          sessions.workspace_id,
          workspace_members.role AS workspace_role
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        LEFT JOIN workspace_members
          ON workspace_members.user_id = users.id
          AND workspace_members.workspace_id = sessions.workspace_id
          AND workspace_members.status = 'active'
        WHERE sessions.id = ?
          AND sessions.revoked_at IS NULL
          AND sessions.expires_at > CURRENT_TIMESTAMP
        LIMIT 1`
    ).bind(sessionId).first();
    return row ? toUser(row) : null;
  }
  const userId = session.get("userId");
  return userId ? { id: userId } : null;
}
async function requireUser(request, context) {
  const user = await getUser(request, context);
  if (!user) throw redirect("/login");
  return user;
}
async function requireUserId(request, context) {
  const user = await requireUser(request, context);
  return user.id;
}
async function requireUserRole(request, context, requiredRole) {
  const user = await requireUser(request, context);
  if (!isRoleAllowed(user.role)) {
    throw redirect(user.role === "super_admin" ? "/admin" : "/app");
  }
  return user;
}
async function createUserSession(params) {
  const session = await getSession(params.request, params.context);
  const db2 = params.context ? getD1Database(params.context) : null;
  if (db2) {
    const sessionId = createId("ses");
    const expiresAt = toSqlDate(new Date(Date.now() + SESSION_TTL_SECONDS * 1e3));
    const workspaceId = normalizeSessionWorkspaceId(params.workspaceId);
    await db2.prepare(
      `INSERT INTO sessions
          (id, user_id, workspace_id, expires_at, user_agent, ip_hash)
        VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      sessionId,
      params.userId,
      workspaceId,
      expiresAt,
      params.request.headers.get("User-Agent"),
      await getClientIpHash(params.request)
    ).run();
    session.set("sessionId", sessionId);
  } else {
    session.set("userId", params.userId);
  }
  return redirect(params.redirectTo, {
    headers: {
      "Set-Cookie": await commitSession(session, params.context)
    }
  });
}
async function logout(request, context) {
  const session = await getSession(request, context);
  const db2 = context ? getD1Database(context) : null;
  const sessionId = session.get("sessionId");
  if (db2 && sessionId) {
    await db2.prepare(
      "UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(sessionId).run();
  }
  return redirect("/login", {
    headers: {
      "Set-Cookie": await destroySession(session, context)
    }
  });
}
function isRoleAllowed(userRole, required) {
  return userRole === "super_admin";
}
const meta$6 = () => [{ title: "Page editor - Smart Page Platform" }];
function editorErrorMessage(error) {
  if (error instanceof Error) {
    if (error.message === "page_not_found") return "That page could not be found in your workspace.";
    if (error.message === "invalid_blocks_json") return "Block data was not valid JSON. Please reload and try again.";
    if (error.message === "invalid_blocks") return "One or more blocks is missing required fields or has invalid values.";
    if (error.message === "too_many_blocks") return "Pages can contain up to 50 blocks in Phase 1.";
    if (error.message === "page_title_too_long") return "Page title must be 120 characters or less.";
  }
  return "Page save failed. Please check the fields and try again.";
}
function noticeMessage(notice) {
  if (notice === "save") return "Page saved successfully.";
  if (notice === "publish") return "Page published successfully.";
  if (notice === "unpublish") return "Page unpublished successfully.";
  if (notice === "created") return "Page created successfully.";
  return "Page updated successfully.";
}
async function loader$f({ request, context, params }) {
  const user = await requireUser(request, context);
  const db2 = requireD1Database(context);
  const repo = pageRepository(db2);
  const pageId = params.pageId ?? "unknown";
  let page = await repo.getPageForWorkspace(user.workspaceId, pageId);
  if (!page && pageId === "demo") {
    page = await repo.createPage({
      workspaceId: user.workspaceId,
      userId: user.id,
      title: "Demo smart page",
      slug: "demo",
      pageId: "demo"
    });
  }
  if (!page) {
    throw new Response("Page not found", { status: 404 });
  }
  return page;
}
async function action$6({ request, context, params }) {
  const user = await requireUser(request, context);
  const db2 = requireD1Database(context);
  const repo = pageRepository(db2);
  const pageId = params.pageId ?? "";
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "save");
  const title = String(form.get("title") ?? "Untitled page");
  const slug = String(form.get("slug") ?? title);
  const blocksJson = String(form.get("blocksJson") ?? "[]");
  const themeJson = String(form.get("themeJson") ?? "{}");
  const seoTitle = String(form.get("seoTitle") ?? "");
  const seoDescription = String(form.get("seoDescription") ?? "");
  const allowIndexing = String(form.get("allowIndexing") ?? "1") !== "0";
  try {
    const blocks = parseBlocksJson(blocksJson);
    const theme2 = sanitizePageTheme(JSON.parse(themeJson));
    await repo.savePage({
      workspaceId: user.workspaceId,
      userId: user.id,
      pageId,
      title,
      slug,
      blocks,
      theme: theme2,
      seoTitle,
      seoDescription,
      allowIndexing
    });
    if (intent === "publish" || intent === "unpublish") {
      await repo.setPublishStatus({
        workspaceId: user.workspaceId,
        userId: user.id,
        pageId,
        status: intent === "publish" ? "published" : "draft"
      });
    }
  } catch (error) {
    return json({ ok: false, error: editorErrorMessage(error) }, { status: 400 });
  }
  return redirect$1(`/app/pages/${pageId}/edit?notice=${intent}`);
}
function updateBlock(blocks, index, nextBlock) {
  return blocks.map((block, blockIndex) => blockIndex === index ? nextBlock : block);
}
function reorderBlocks(blocks, from, to) {
  if (from === to || from < 0 || to < 0 || from >= blocks.length || to >= blocks.length) {
    return blocks;
  }
  const next = [...blocks];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed);
  return next;
}
function createClientBlockId() {
  return `blk_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
}
function defaultBlock(type) {
  const id2 = createClientBlockId();
  switch (type) {
    case "header":
      return { id: id2, type, props: { title: "New section", subtitle: "Optional subtitle" } };
    case "text":
      return { id: id2, type, props: { text: "Write something useful here." } };
    case "link_button":
      return { id: id2, type, props: { label: "Open link", href: "/" } };
    case "image":
      return { id: id2, type, props: { src: "", alt: "" } };
    case "video":
      return { id: id2, type, props: { src: "" } };
    case "whatsapp_button":
      return { id: id2, type, props: { label: "Chat on WhatsApp", phoneE164: "+15551234567" } };
    case "divider":
      return { id: id2, type, props: { variant: "classic", indent: 2, label: "" } };
    case "profile":
      return {
        id: id2,
        type,
        props: {
          imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
          name: "Your name",
          subtitle: "What you do",
          circular: true
        }
      };
    case "social_links":
      return {
        id: id2,
        type,
        props: {
          links: [
            { platform: "instagram", label: "Instagram", href: "https://instagram.com/" },
            { platform: "website", label: "Website", href: "https://example.com" }
          ]
        }
      };
    case "faq":
      return { id: id2, type, props: { items: [{ question: "What do you offer?", answer: "A short answer for visitors." }] } };
    case "map_location":
      return { id: id2, type, props: { title: "Visit us", mapsUrl: "https://maps.google.com", buttonText: "Open in Google Maps" } };
    case "price_list":
      return {
        id: id2,
        type,
        props: { title: "Services", items: [{ name: "Consultation", description: "Intro session", price: "$50" }] }
      };
    case "gallery":
      return {
        id: id2,
        type,
        props: { images: [{ src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee", alt: "Gallery image" }] }
      };
    case "contact_card":
      return { id: id2, type, props: { phone: "+1 555 123 4567", whatsapp: "+15551234567", email: "hello@example.com", address: "City, Country" } };
    case "countdown":
      return { id: id2, type, props: { title: "Coming soon", dateTimeText: "June 1, 2026 at 7:00 PM" } };
    case "announcement":
      return { id: id2, type, props: { title: "New announcement", message: "Share an update with your visitors.", style: "soft" } };
    case "html_embed":
      return {
        id: id2,
        type,
        props: {
          html: "<p>Add your <strong>HTML</strong> here.</p><style>body { padding: 24px; }</style>",
          allowScripts: false
        }
      };
    case "form":
      return {
        id: id2,
        type,
        props: {
          title: "Contact form",
          enabledFields: ["name", "phone", "email", "message"],
          submitText: "Send"
        }
      };
    case "digital_products":
      return {
        id: id2,
        type,
        props: {
          title: "Featured products",
          note: "Payment integration planned later.",
          items: [
            {
              title: "Starter guide",
              description: "Short description",
              priceText: "$19",
              imageUrl: "",
              buttonText: "Order on WhatsApp",
              buttonUrl: "https://wa.me/15551234567"
            }
          ]
        }
      };
    case "advanced_timer":
      return {
        id: id2,
        type,
        props: {
          title: "Limited offer",
          targetIso: new Date(Date.now() + 1e3 * 60 * 60 * 24).toISOString(),
          dateTimeText: "Ends tomorrow",
          beforeMessage: "Offer ending soon",
          afterMessage: "Offer has ended"
        }
      };
  }
}
function FieldTextarea(props) {
  return /* @__PURE__ */ jsxs("div", { className: "space-y-1 md:col-span-2", children: [
    /* @__PURE__ */ jsx(
      "textarea",
      {
        value: props.value,
        onChange: (event) => props.onChange(event.target.value),
        placeholder: props.placeholder,
        className: "min-h-28 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/55"
      }
    ),
    /* @__PURE__ */ jsx("div", { className: "text-xs text-zinc-500", children: props.help })
  ] });
}
function ThemeSelect(props) {
  return /* @__PURE__ */ jsxs("label", { className: "space-y-1", children: [
    /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-zinc-300", children: props.label }),
    /* @__PURE__ */ jsx(
      "select",
      {
        value: props.value,
        onChange: (event) => props.onChange(event.target.value),
        className: "w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/55",
        children: props.options.map((option) => /* @__PURE__ */ jsx("option", { value: option.value, children: option.label }, option.value))
      }
    )
  ] });
}
function ThemeColorInput(props) {
  return /* @__PURE__ */ jsxs("label", { className: "space-y-1", children: [
    /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-zinc-300", children: props.label }),
    /* @__PURE__ */ jsx(
      "input",
      {
        type: "color",
        value: props.value,
        onChange: (event) => props.onChange(event.target.value),
        className: "h-10 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-2 py-1"
      }
    )
  ] });
}
function AppearanceFields(props) {
  function patch(next) {
    props.onChange(sanitizePageTheme({ ...props.theme, ...next }));
  }
  return /* @__PURE__ */ jsxs(EditorSection, { title: "Appearance / Theme", description: "Style this public page without changing its blocks.", children: [
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-2", children: [
      /* @__PURE__ */ jsx(
        ThemeSelect,
        {
          label: "Page background",
          value: props.theme.backgroundType,
          onChange: (value) => patch({ backgroundType: value }),
          options: [
            { value: "solid", label: "Solid color" },
            { value: "gradient", label: "Simple gradient" },
            { value: "image", label: "Background image URL" }
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        Input,
        {
          variant: "dark",
          value: props.theme.backgroundImageUrl ?? "",
          onChange: (event) => patch({ backgroundImageUrl: event.target.value }),
          placeholder: "Background image URL"
        }
      ),
      /* @__PURE__ */ jsx(ThemeColorInput, { label: "Background color", value: props.theme.backgroundColor, onChange: (value) => patch({ backgroundColor: value }) }),
      /* @__PURE__ */ jsx(ThemeColorInput, { label: "Gradient from", value: props.theme.gradientFrom, onChange: (value) => patch({ gradientFrom: value }) }),
      /* @__PURE__ */ jsx(ThemeColorInput, { label: "Gradient to", value: props.theme.gradientTo, onChange: (value) => patch({ gradientTo: value }) }),
      /* @__PURE__ */ jsx(ThemeColorInput, { label: "Primary color", value: props.theme.primaryColor, onChange: (value) => patch({ primaryColor: value }) }),
      /* @__PURE__ */ jsx(ThemeColorInput, { label: "Text color", value: props.theme.textColor, onChange: (value) => patch({ textColor: value }) }),
      /* @__PURE__ */ jsx(ThemeColorInput, { label: "Card color", value: props.theme.cardColor, onChange: (value) => patch({ cardColor: value }) }),
      /* @__PURE__ */ jsx(ThemeColorInput, { label: "Button color", value: props.theme.buttonColor, onChange: (value) => patch({ buttonColor: value }) }),
      /* @__PURE__ */ jsx(
        ThemeSelect,
        {
          label: "Button style",
          value: props.theme.buttonStyle,
          onChange: (value) => patch({ buttonStyle: value }),
          options: [
            { value: "rounded", label: "Rounded" },
            { value: "pill", label: "Pill" },
            { value: "square", label: "Square" },
            { value: "shadow", label: "Shadow" },
            { value: "outline", label: "Outline" }
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        ThemeSelect,
        {
          label: "Font style",
          value: props.theme.fontStyle,
          onChange: (value) => patch({ fontStyle: value }),
          options: [
            { value: "clean", label: "Clean default" },
            { value: "elegant", label: "Elegant" },
            { value: "bold", label: "Bold" },
            { value: "minimal", label: "Minimal" }
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        ThemeSelect,
        {
          label: "Layout style",
          value: props.theme.layoutStyle,
          onChange: (value) => patch({ layoutStyle: value }),
          options: [
            { value: "centered", label: "Centered compact" },
            { value: "full_width_mobile", label: "Full-width mobile" },
            { value: "card_based", label: "Card-based" }
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        ThemeSelect,
        {
          label: "Profile/avatar style",
          value: props.theme.profileStyle,
          onChange: (value) => patch({ profileStyle: value }),
          options: [
            { value: "circle", label: "Circle" },
            { value: "rounded_square", label: "Rounded square" },
            { value: "square", label: "Square" }
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        Input,
        {
          variant: "dark",
          value: props.theme.footerText ?? "",
          onChange: (event) => patch({ footerText: event.target.value }),
          placeholder: "Footer text"
        }
      ),
      /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-300", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "checkbox",
            checked: props.theme.showPlatformBadge,
            onChange: (event) => patch({ showPlatformBadge: event.target.checked })
          }
        ),
        "Show Smart Page badge"
      ] })
    ] }),
    /* @__PURE__ */ jsxs(
      "div",
      {
        className: "mt-4 rounded-xl border border-zinc-600 p-4 text-sm shadow-inner shadow-black/20",
        style: { background: props.theme.cardColor, color: props.theme.textColor },
        children: [
          /* @__PURE__ */ jsx("div", { className: "font-semibold", children: "Live style preview" }),
          /* @__PURE__ */ jsx("div", { className: "mt-2 inline-flex px-4 py-2 text-sm font-bold text-white", style: { background: props.theme.buttonColor, borderRadius: props.theme.buttonStyle === "pill" ? "999px" : props.theme.buttonStyle === "square" ? "4px" : "16px" }, children: "Sample button" })
        ]
      }
    )
  ] });
}
function BlockFields(props) {
  const { block, index, totalBlocks, onChange, onReorder, onDelete } = props;
  function patch(nextProps) {
    onChange({ ...block, props: { ...block.props, ...nextProps } });
  }
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: "overflow-hidden rounded-xl border border-zinc-600 bg-zinc-950/90 shadow-lg shadow-black/40 ring-1 ring-white/[0.04]",
      onDragOver: (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      },
      onDrop: (event) => {
        event.preventDefault();
        const raw = event.dataTransfer.getData("application/x-sp-block-index");
        const from = Number(raw);
        if (!Number.isFinite(from)) return;
        onReorder(from, index);
      },
      children: [
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2 border-b border-zinc-700 bg-zinc-900/80 px-3 py-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 flex-col items-center gap-1", children: [
            /* @__PURE__ */ jsx(
              "div",
              {
                draggable: true,
                role: "button",
                tabIndex: 0,
                onDragStart: (event) => {
                  event.dataTransfer.setData("application/x-sp-block-index", String(index));
                  event.dataTransfer.effectAllowed = "move";
                  event.currentTarget.style.opacity = "0.6";
                },
                onDragEnd: (event) => {
                  event.currentTarget.style.opacity = "1";
                },
                className: "flex h-10 w-10 cursor-grab touch-none select-none items-center justify-center rounded-lg border border-zinc-600 bg-zinc-950 text-zinc-400 shadow-sm hover:bg-zinc-800 active:cursor-grabbing",
                "aria-label": "Drag to reorder",
                title: "Drag to reorder",
                children: /* @__PURE__ */ jsx("span", { className: "text-base leading-none tracking-tighter", children: "⋮⋮" })
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-0.5", children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  disabled: index === 0,
                  onClick: () => onReorder(index, index - 1),
                  className: "rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 text-[10px] font-bold leading-none text-zinc-300 shadow-sm hover:bg-zinc-800 disabled:opacity-25",
                  "aria-label": "Move block up",
                  children: "↑"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  disabled: index >= totalBlocks - 1,
                  onClick: () => onReorder(index, index + 1),
                  className: "rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 text-[10px] font-bold leading-none text-zinc-300 shadow-sm hover:bg-zinc-800 disabled:opacity-25",
                  "aria-label": "Move block down",
                  children: "↓"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "min-w-0 flex-1", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-2", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("div", { className: "text-sm font-semibold text-white", children: [
                index + 1,
                ". ",
                labelForBlockType(block.type)
              ] }),
              /* @__PURE__ */ jsx("div", { className: "text-xs text-zinc-500", children: block.type === "divider" && block.props.editorLabel ? /* @__PURE__ */ jsx("span", { className: "text-brand-400/90", children: block.props.editorLabel }) : "Reorder by dragging — add unlimited blocks of any type." })
            ] }),
            /* @__PURE__ */ jsx(Button, { type: "button", size: "sm", variant: "danger", onClick: onDelete, children: "Delete" })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-3 p-4 md:grid-cols-2 md:p-5", children: [
          block.type === "header" ? /* @__PURE__ */ jsxs(Fragment$1, { children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.title,
                onChange: (event) => patch({ title: event.target.value }),
                placeholder: "Title"
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.subtitle ?? "",
                onChange: (event) => patch({ subtitle: event.target.value }),
                placeholder: "Subtitle"
              }
            )
          ] }) : null,
          block.type === "text" ? /* @__PURE__ */ jsx(
            "textarea",
            {
              value: block.props.text,
              onChange: (event) => patch({ text: event.target.value }),
              placeholder: "Text",
              className: "min-h-24 rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/55 md:col-span-2"
            }
          ) : null,
          block.type === "link_button" ? /* @__PURE__ */ jsxs(Fragment$1, { children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.label,
                onChange: (event) => patch({ label: event.target.value }),
                placeholder: "Button label"
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.href,
                onChange: (event) => patch({ href: event.target.value }),
                placeholder: "https://..."
              }
            )
          ] }) : null,
          block.type === "image" ? /* @__PURE__ */ jsxs(Fragment$1, { children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.src,
                onChange: (event) => patch({ src: event.target.value }),
                placeholder: "Image URL"
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.alt ?? "",
                onChange: (event) => patch({ alt: event.target.value }),
                placeholder: "Alt text"
              }
            )
          ] }) : null,
          block.type === "video" ? /* @__PURE__ */ jsx(
            Input,
            {
              variant: "dark",
              value: block.props.src,
              onChange: (event) => patch({ src: event.target.value }),
              placeholder: "Video URL",
              className: "md:col-span-2"
            }
          ) : null,
          block.type === "whatsapp_button" ? /* @__PURE__ */ jsxs(Fragment$1, { children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.label,
                onChange: (event) => patch({ label: event.target.value }),
                placeholder: "Button label"
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.phoneE164,
                onChange: (event) => patch({ phoneE164: event.target.value }),
                placeholder: "+15551234567"
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.message ?? "",
                onChange: (event) => patch({ message: event.target.value }),
                placeholder: "Optional message",
                className: "md:col-span-2"
              }
            )
          ] }) : null,
          block.type === "divider" ? /* @__PURE__ */ jsx(DividerBlockEditor, { props: block.props, onPatch: (next) => patch(next) }) : null,
          block.type === "html_embed" ? /* @__PURE__ */ jsxs("div", { className: "space-y-2 md:col-span-2", children: [
            /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-zinc-300", children: "HTML" }),
            /* @__PURE__ */ jsx(
              "textarea",
              {
                value: block.props.html,
                onChange: (event) => patch({ html: event.target.value }),
                spellCheck: false,
                className: "min-h-48 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/55",
                placeholder: "<p>...</p>"
              }
            ),
            /* @__PURE__ */ jsxs("label", { className: "flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-100", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  checked: Boolean(block.props.allowScripts),
                  onChange: (event) => patch({ allowScripts: event.target.checked }),
                  className: "mt-0.5"
                }
              ),
              /* @__PURE__ */ jsx("span", { children: "Allow sandboxed JavaScript for this HTML block. Use this only for HTML templates you trust; it remains isolated from Smart Page, but the template code can run inside its own frame." })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-zinc-500", children: "Paste a complete HTML document or a smaller snippet. CSS inside style tags is supported inside a sandboxed preview." }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-zinc-500", children: "Iframes, embeds, and unsafe URLs are blocked for visitor safety. JavaScript is blocked unless the checkbox above is enabled." }),
            /* @__PURE__ */ jsx(
              "iframe",
              {
                title: "Custom HTML preview",
                sandbox: `allow-forms allow-popups allow-popups-to-escape-sandbox${block.props.allowScripts ? " allow-scripts" : ""}`,
                referrerPolicy: "no-referrer",
                srcDoc: buildSandboxedHtmlDocument(block.props.html, HTML_EMBED_MAX_LENGTH, {
                  allowScripts: block.props.allowScripts
                }),
                className: "h-[420px] w-full rounded-xl border border-zinc-700 bg-white"
              }
            )
          ] }) : null,
          block.type === "form" ? /* @__PURE__ */ jsxs("div", { className: "space-y-3 md:col-span-2", children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.title,
                onChange: (event) => patch({ title: event.target.value }),
                placeholder: "Form title"
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-zinc-700 bg-zinc-950/40 p-3", children: [
              /* @__PURE__ */ jsx("div", { className: "text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400", children: "Enabled fields" }),
              /* @__PURE__ */ jsx("div", { className: "mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4", children: ["name", "phone", "email", "message"].map((fieldKey) => {
                const enabled = block.props.enabledFields.includes(fieldKey);
                return /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 rounded-lg border border-zinc-700 px-2 py-2 text-xs text-zinc-300", children: [
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "checkbox",
                      checked: enabled,
                      onChange: (event) => patch({
                        enabledFields: event.target.checked ? Array.from(/* @__PURE__ */ new Set([...block.props.enabledFields, fieldKey])) : block.props.enabledFields.filter((v) => v !== fieldKey)
                      })
                    }
                  ),
                  fieldKey
                ] }, fieldKey);
              }) })
            ] }),
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.submitText,
                onChange: (event) => patch({ submitText: event.target.value }),
                placeholder: "Submit button text"
              }
            )
          ] }) : null,
          block.type === "digital_products" ? /* @__PURE__ */ jsxs("div", { className: "space-y-3 md:col-span-2", children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.title ?? "",
                onChange: (event) => patch({ title: event.target.value }),
                placeholder: "Block title"
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.note ?? "",
                onChange: (event) => patch({ note: event.target.value }),
                placeholder: "Payment integration planned later."
              }
            ),
            /* @__PURE__ */ jsx(
              DraftLinesField,
              {
                resetKey: block.id,
                canonical: block.props.items.map(
                  (item) => [
                    item.title,
                    item.description ?? "",
                    item.priceText ?? "",
                    item.imageUrl ?? "",
                    item.buttonText,
                    item.buttonUrl
                  ].join("|")
                ).join("\n"),
                normalize: (raw) => raw.split("\n").map((line) => line.trim()).filter(Boolean).join("\n"),
                onDraftChange: (raw) => patch({
                  items: raw.split("\n").map((line) => {
                    const [title = "", description = "", priceText = "", imageUrl = "", buttonText = "", buttonUrl = ""] = line.split("|").map((part) => part.trim());
                    return { title, description, priceText, imageUrl, buttonText, buttonUrl };
                  }).filter((item) => item.title || item.buttonUrl)
                }),
                placeholder: "Title|Description|$19|https://image|Button text|https://checkout-or-wa",
                help: "One product per line: title|description|price text|image URL|button text|button URL."
              }
            )
          ] }) : null,
          block.type === "advanced_timer" ? /* @__PURE__ */ jsxs("div", { className: "space-y-3 md:col-span-2", children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.title,
                onChange: (event) => patch({ title: event.target.value }),
                placeholder: "Timer title"
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.targetIso,
                onChange: (event) => patch({ targetIso: event.target.value }),
                placeholder: "2026-12-31T23:59:00Z"
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.dateTimeText,
                onChange: (event) => patch({ dateTimeText: event.target.value }),
                placeholder: "Ends Dec 31, 2026 at 11:59 PM"
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.beforeMessage,
                onChange: (event) => patch({ beforeMessage: event.target.value }),
                placeholder: "Message before ending"
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.afterMessage,
                onChange: (event) => patch({ afterMessage: event.target.value }),
                placeholder: "Message after ending"
              }
            )
          ] }) : null,
          block.type === "profile" ? /* @__PURE__ */ jsxs(Fragment$1, { children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.imageUrl,
                onChange: (event) => patch({ imageUrl: event.target.value }),
                placeholder: "Profile image URL"
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.name,
                onChange: (event) => patch({ name: event.target.value }),
                placeholder: "Name"
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.subtitle ?? "",
                onChange: (event) => patch({ subtitle: event.target.value }),
                placeholder: "Subtitle"
              }
            ),
            /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-300", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "checkbox",
                  checked: Boolean(block.props.circular),
                  onChange: (event) => patch({ circular: event.target.checked })
                }
              ),
              "Circular image"
            ] })
          ] }) : null,
          block.type === "social_links" ? /* @__PURE__ */ jsx(
            DraftLinesField,
            {
              resetKey: block.id,
              canonical: socialLinksToLines(block.props.links),
              normalize: normalizeSocialLinesText,
              onDraftChange: (raw) => patch({ links: linesToSocialLinksLenient(raw) }),
              placeholder: "instagram|Instagram|https://instagram.com/yourname",
              help: "One link per line: platform|label|url. Platforms: instagram, tiktok, whatsapp, youtube, website, email."
            }
          ) : null,
          block.type === "faq" ? /* @__PURE__ */ jsx(
            DraftLinesField,
            {
              resetKey: block.id,
              canonical: faqItemsToLines(block.props.items),
              normalize: normalizeFaqLinesText,
              onDraftChange: (raw) => patch({ items: linesToFaqItemsLenient(raw) }),
              placeholder: "Question?|Answer text",
              help: "One FAQ per line: question|answer."
            }
          ) : null,
          block.type === "map_location" ? /* @__PURE__ */ jsxs(Fragment$1, { children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.title,
                onChange: (event) => patch({ title: event.target.value }),
                placeholder: "Location title"
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.buttonText,
                onChange: (event) => patch({ buttonText: event.target.value }),
                placeholder: "Button text"
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.mapsUrl,
                onChange: (event) => patch({ mapsUrl: event.target.value }),
                placeholder: "Google Maps URL",
                className: "md:col-span-2"
              }
            )
          ] }) : null,
          block.type === "price_list" ? /* @__PURE__ */ jsxs(Fragment$1, { children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.title ?? "",
                onChange: (event) => patch({ title: event.target.value }),
                placeholder: "Optional list title",
                className: "md:col-span-2"
              }
            ),
            /* @__PURE__ */ jsx(
              DraftLinesField,
              {
                resetKey: block.id,
                canonical: priceItemsToLines(block.props.items),
                normalize: normalizePriceLinesText,
                onDraftChange: (raw) => patch({ items: linesToPriceItemsLenient(raw) }),
                placeholder: "Service name|Description|$50",
                help: "One item per line: name|description|price. You can type the name first, then add price—nothing will jump away while you edit."
              }
            )
          ] }) : null,
          block.type === "gallery" ? /* @__PURE__ */ jsx(
            DraftLinesField,
            {
              resetKey: block.id,
              canonical: galleryImagesToLines(block.props.images),
              normalize: normalizeGalleryLinesText,
              onDraftChange: (raw) => patch({ images: linesToGalleryImagesLenient(raw) }),
              placeholder: "https://example.com/image.jpg|Alt text",
              help: "One image per line: image URL|alt text. External image URLs only for Phase 1."
            }
          ) : null,
          block.type === "contact_card" ? /* @__PURE__ */ jsxs(Fragment$1, { children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.phone ?? "",
                onChange: (event) => patch({ phone: event.target.value }),
                placeholder: "Phone"
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.whatsapp ?? "",
                onChange: (event) => patch({ whatsapp: event.target.value }),
                placeholder: "WhatsApp +15551234567"
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.email ?? "",
                onChange: (event) => patch({ email: event.target.value }),
                placeholder: "Email"
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.address ?? "",
                onChange: (event) => patch({ address: event.target.value }),
                placeholder: "Address"
              }
            )
          ] }) : null,
          block.type === "countdown" ? /* @__PURE__ */ jsxs(Fragment$1, { children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.title,
                onChange: (event) => patch({ title: event.target.value }),
                placeholder: "Title"
              }
            ),
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.dateTimeText,
                onChange: (event) => patch({ dateTimeText: event.target.value }),
                placeholder: "Date/time text"
              }
            )
          ] }) : null,
          block.type === "announcement" ? /* @__PURE__ */ jsxs(Fragment$1, { children: [
            /* @__PURE__ */ jsx(
              Input,
              {
                variant: "dark",
                value: block.props.title,
                onChange: (event) => patch({ title: event.target.value }),
                placeholder: "Title"
              }
            ),
            /* @__PURE__ */ jsxs(
              "select",
              {
                value: block.props.style ?? "soft",
                onChange: (event) => patch({ style: event.target.value }),
                className: "rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/55",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "soft", children: "Soft highlight" }),
                  /* @__PURE__ */ jsx("option", { value: "strong", children: "Strong highlight" })
                ]
              }
            ),
            /* @__PURE__ */ jsx(
              FieldTextarea,
              {
                value: block.props.message,
                onChange: (value) => patch({ message: value }),
                placeholder: "Announcement message",
                help: "Short update or note for visitors."
              }
            )
          ] }) : null
        ] })
      ]
    }
  );
}
function PageEditor() {
  var _a;
  const data = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const [title, setTitle] = useState(data.page.title);
  const [slug, setSlug] = useState(data.page.slug);
  const [blocks, setBlocks] = useState(data.blocks);
  const [theme2, setTheme] = useState(data.theme);
  const [seoTitle, setSeoTitle] = useState(data.page.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(data.page.seo_description ?? "");
  const [allowIndexing, setAllowIndexing] = useState(
    data.page.allow_indexing === void 0 ? true : data.page.allow_indexing !== 0
  );
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const blocksJson = useMemo(() => JSON.stringify(blocks), [blocks]);
  const themeJson = useMemo(() => JSON.stringify(theme2), [theme2]);
  const isSubmitting = navigation.state !== "idle";
  const notice = searchParams.get("notice");
  const publicCode = data.page.status === "published" && ((_a = data.shortLink) == null ? void 0 : _a.status) === "active" ? data.shortLink.code : null;
  const previewCode = publicCode ?? data.page.slug;
  function addBlock(type) {
    setBlocks((current) => [...current, defaultBlock(type)]);
  }
  function applyTemplate(template) {
    setTheme(sanitizePageTheme(template.theme));
    setBlocks(instantiateTemplateBlocks(template, createClientBlockId));
  }
  const publishControls = /* @__PURE__ */ jsxs(Fragment$1, { children: [
    /* @__PURE__ */ jsx(Button, { form: "page-editor-form", type: "submit", size: "sm", name: "intent", value: "save", disabled: isSubmitting, children: "Save" }),
    data.page.status === "published" ? /* @__PURE__ */ jsx(
      Button,
      {
        form: "page-editor-form",
        type: "submit",
        size: "sm",
        name: "intent",
        value: "unpublish",
        variant: "ghost",
        disabled: isSubmitting,
        children: "Draft"
      }
    ) : /* @__PURE__ */ jsx(Button, { form: "page-editor-form", type: "submit", size: "sm", name: "intent", value: "publish", disabled: isSubmitting, children: "Publish" })
  ] });
  const shareControls = publicCode ? /* @__PURE__ */ jsxs(Fragment$1, { children: [
    /* @__PURE__ */ jsx(
      Link,
      {
        to: `/p/${previewCode}`,
        target: "_blank",
        rel: "noreferrer",
        className: buttonClassName({ size: "sm", variant: "secondary" }),
        children: "View"
      }
    ),
    /* @__PURE__ */ jsx(
      Button,
      {
        type: "button",
        size: "sm",
        variant: "ghost",
        onClick: () => {
          var _a2;
          return void ((_a2 = navigator.clipboard) == null ? void 0 : _a2.writeText(`${window.location.origin}/p/${publicCode}`));
        },
        children: "Copy"
      }
    )
  ] }) : null;
  return /* @__PURE__ */ jsxs("div", { className: "relative pb-28 lg:pb-10", children: [
    /* @__PURE__ */ jsxs(Form, { id: "page-editor-form", method: "post", className: "space-y-6", children: [
      /* @__PURE__ */ jsx("input", { type: "hidden", name: "blocksJson", value: blocksJson }),
      /* @__PURE__ */ jsx("input", { type: "hidden", name: "themeJson", value: themeJson }),
      /* @__PURE__ */ jsxs("div", { className: "xl:grid xl:grid-cols-[minmax(0,1fr)_min(380px,42%)] xl:items-start xl:gap-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "min-w-0 space-y-6", children: [
          /* @__PURE__ */ jsxs(
            EditorSection,
            {
              title: "Page",
              description: `${data.page.status} · ${data.page.id}`,
              right: /* @__PURE__ */ jsxs("div", { className: "hidden flex-wrap items-center justify-end gap-2 lg:flex", children: [
                shareControls,
                publishControls
              ] }),
              children: [
                (actionData == null ? void 0 : actionData.ok) === false ? /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200", children: actionData.error }) : null,
                notice ? /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-lg border border-emerald-500/35 bg-emerald-950/35 px-3 py-2 text-sm text-emerald-200", children: noticeMessage(notice) }) : null,
                /* @__PURE__ */ jsxs("div", { className: "mb-6 rounded-xl border border-zinc-600 bg-zinc-950/60 p-4 text-sm text-zinc-300", children: [
                  /* @__PURE__ */ jsx("div", { className: "font-medium text-white", children: "Public short link" }),
                  /* @__PURE__ */ jsx("div", { className: "mt-1 font-mono text-xs text-zinc-400", children: publicCode ? `/p/${publicCode}` : "Publish to activate /p/… link" })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-2", children: [
                  /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                    /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-zinc-300", children: "Page title" }),
                    /* @__PURE__ */ jsx(Input, { name: "title", variant: "dark", value: title, onChange: (event) => setTitle(event.target.value) })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                    /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-zinc-300", children: "Slug" }),
                    /* @__PURE__ */ jsx(Input, { name: "slug", variant: "dark", value: slug, onChange: (event) => setSlug(event.target.value) })
                  ] })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "xl:hidden", children: /* @__PURE__ */ jsx(
            EditorPhonePreview,
            {
              blocks,
              theme: theme2,
              label: "Scroll the preview — matches your public page.",
              onAddBlock: () => setAddBlockOpen(true),
              previewHref: publicCode ? `/p/${previewCode}` : void 0
            }
          ) }),
          /* @__PURE__ */ jsx(
            EditorSection,
            {
              title: "Blocks",
              description: "Reorder blocks below or tap Add block.",
              right: /* @__PURE__ */ jsx(Button, { type: "button", size: "sm", onClick: () => setAddBlockOpen(true), children: "Add block" }),
              children: /* @__PURE__ */ jsx("div", { className: "space-y-3", children: blocks.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-dashed border-zinc-600 bg-zinc-950/50 p-6 text-center text-sm text-zinc-400", children: [
                /* @__PURE__ */ jsx("p", { children: "No blocks yet." }),
                /* @__PURE__ */ jsx(Button, { type: "button", size: "sm", className: "mt-4", onClick: () => setAddBlockOpen(true), children: "Add block" }),
                /* @__PURE__ */ jsx("p", { className: "mt-3 text-xs text-zinc-500", children: "Or apply a template below for starter content." })
              ] }) : blocks.map((block, index) => /* @__PURE__ */ jsx(
                BlockFields,
                {
                  block,
                  index,
                  totalBlocks: blocks.length,
                  onChange: (nextBlock) => setBlocks((current) => updateBlock(current, index, nextBlock)),
                  onReorder: (from, to) => setBlocks((current) => reorderBlocks(current, from, to)),
                  onDelete: () => setBlocks((current) => current.filter((_, blockIndex) => blockIndex !== index))
                },
                block.id
              )) })
            }
          ),
          /* @__PURE__ */ jsx(
            TemplatePicker,
            {
              appearance: "editor",
              currentBlocksCount: blocks.length,
              createBlockId: createClientBlockId,
              onApply: applyTemplate
            }
          ),
          /* @__PURE__ */ jsx(AppearanceFields, { theme: theme2, onChange: setTheme }),
          /* @__PURE__ */ jsx(
            SeoFields,
            {
              appearance: "editor",
              seoTitle,
              seoDescription,
              allowIndexing,
              onSeoTitle: setSeoTitle,
              onSeoDescription: setSeoDescription,
              onAllowIndexing: setAllowIndexing
            }
          )
        ] }),
        /* @__PURE__ */ jsx("aside", { className: "sticky top-6 mt-6 hidden min-w-0 max-w-none xl:mt-0 xl:block", children: /* @__PURE__ */ jsx(
          EditorPhonePreview,
          {
            blocks,
            theme: theme2,
            label: "Updates as you edit blocks and theme.",
            onAddBlock: () => setAddBlockOpen(true),
            previewHref: publicCode ? `/p/${previewCode}` : void 0
          }
        ) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(AddBlockModal, { open: addBlockOpen, onClose: () => setAddBlockOpen(false), onPickLive: (type) => addBlock(type) }),
    /* @__PURE__ */ jsx("div", { className: "fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-zinc-950/96 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_40px_rgba(0,0,0,0.45)] backdrop-blur-md lg:hidden", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto flex max-w-lg items-center gap-2 px-3 py-3", children: [
      /* @__PURE__ */ jsx(
        Button,
        {
          type: "button",
          size: "sm",
          className: "shrink-0 rounded-full bg-brand-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-md shadow-brand-900/25 hover:bg-brand-500",
          onClick: () => setAddBlockOpen(true),
          children: "Add block"
        }
      ),
      shareControls ? /* @__PURE__ */ jsx("div", { className: "flex shrink-0 gap-1", children: shareControls }) : null,
      /* @__PURE__ */ jsx("div", { className: "flex flex-1 justify-end gap-2", children: publishControls })
    ] }) })
  ] });
}
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$6,
  default: PageEditor,
  loader: loader$f,
  meta: meta$6
}, Symbol.toStringTag, { value: "Module" }));
const SECTIONS = [
  {
    title: "Billing",
    description: "Reserved for subscriptions, invoices, and plan controls in a later phase."
  },
  {
    title: "AI usage",
    description: "Reserved for future usage limits, provider settings, and audit controls."
  },
  {
    title: "Custom domains",
    description: "Reserved for domain verification, certificates, and routing controls."
  },
  {
    title: "Abuse review",
    description: "Reserved for reports, takedowns, and safety review workflows."
  },
  {
    title: "Feature flags",
    description: "Reserved for gradual rollout controls and tenant-level experiments."
  }
];
function AdminSettings() {
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(
      CardHeader,
      {
        title: "Platform settings",
        description: "Read-only placeholders for future platform controls. Nothing here activates Phase 2 features yet."
      }
    ),
    /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 gap-3 md:grid-cols-2", children: SECTIONS.map((section) => /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-200 bg-slate-50 p-4", children: [
      /* @__PURE__ */ jsx("div", { className: "font-medium text-slate-900", children: section.title }),
      /* @__PURE__ */ jsx("div", { className: "mt-1 text-sm text-slate-600", children: section.description }),
      /* @__PURE__ */ jsx("div", { className: "mt-3 text-xs font-medium uppercase tracking-wide text-slate-500", children: "Not enabled in Phase 1" })
    ] }, section.title)) }) })
  ] });
}
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AdminSettings
}, Symbol.toStringTag, { value: "Module" }));
function rows(result) {
  return result.results ?? [];
}
function adminRepository(db2) {
  return {
    async listUsers() {
      const result = await db2.prepare(
        `SELECT id, email, name, role, created_at, last_login_at
          FROM users
          ORDER BY created_at DESC
          LIMIT 100`
      ).all();
      return rows(result);
    },
    async listWorkspaces() {
      const result = await db2.prepare(
        `SELECT
            workspaces.id,
            workspaces.name,
            workspaces.slug,
            workspaces.status,
            workspaces.created_at,
            COUNT(DISTINCT CASE WHEN workspace_members.role = 'owner' THEN workspace_members.user_id END) AS owner_count,
            COUNT(DISTINCT pages.id) AS page_count
          FROM workspaces
          LEFT JOIN workspace_members ON workspace_members.workspace_id = workspaces.id
          LEFT JOIN pages ON pages.workspace_id = workspaces.id
          GROUP BY workspaces.id
          ORDER BY workspaces.created_at DESC
          LIMIT 100`
      ).all();
      return rows(result);
    },
    async listPages() {
      const result = await db2.prepare(
        `SELECT
            pages.id,
            workspaces.name AS workspace_name,
            workspaces.slug AS workspace_slug,
            pages.title,
            pages.status,
            short_links.code AS short_code,
            pages.created_at,
            pages.updated_at
          FROM pages
          JOIN workspaces ON workspaces.id = pages.workspace_id
          LEFT JOIN short_links
            ON short_links.page_id = pages.id
            AND short_links.status = 'active'
          ORDER BY pages.updated_at DESC
          LIMIT 100`
      ).all();
      return rows(result);
    },
    async platformSummary() {
      const [usersRow, workspacesRow, pagesRow, publishedPagesRow, viewsRow, clicksRow, leadsRow] = await Promise.all([
        db2.prepare("SELECT COUNT(*) AS value FROM users").first(),
        db2.prepare("SELECT COUNT(*) AS value FROM workspaces").first(),
        db2.prepare("SELECT COUNT(*) AS value FROM pages").first(),
        db2.prepare("SELECT COUNT(*) AS value FROM pages WHERE status = 'published'").first(),
        db2.prepare("SELECT COUNT(*) AS value FROM analytics_events WHERE event_type = 'page_view'").first(),
        db2.prepare(
          "SELECT COUNT(*) AS value FROM analytics_events WHERE event_type IN ('link_click', 'whatsapp_click')"
        ).first(),
        db2.prepare("SELECT COUNT(*) AS value FROM lead_submissions").first()
      ]);
      return {
        totalUsers: (usersRow == null ? void 0 : usersRow.value) ?? 0,
        totalWorkspaces: (workspacesRow == null ? void 0 : workspacesRow.value) ?? 0,
        totalPages: (pagesRow == null ? void 0 : pagesRow.value) ?? 0,
        totalPublishedPages: (publishedPagesRow == null ? void 0 : publishedPagesRow.value) ?? 0,
        totalPageViews: (viewsRow == null ? void 0 : viewsRow.value) ?? 0,
        totalClicks: (clicksRow == null ? void 0 : clicksRow.value) ?? 0,
        totalLeads: (leadsRow == null ? void 0 : leadsRow.value) ?? 0
      };
    }
  };
}
async function loader$e({ request, context }) {
  await requireUserRole(request, context);
  const db2 = requireD1Database(context);
  const workspaces = await adminRepository(db2).listWorkspaces();
  return { workspaces };
}
function AdminTenants() {
  const data = useLoaderData();
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(
      CardHeader,
      {
        title: "Tenants",
        description: "Read-only workspace overview for Phase 1.",
        right: /* @__PURE__ */ jsx(Input, { placeholder: "Filter tenants (coming later)", className: "w-56 bg-slate-50", readOnly: true })
      }
    ),
    /* @__PURE__ */ jsx(CardBody, { children: data.workspaces.length === 0 ? /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700", children: "No workspaces yet." }) : /* @__PURE__ */ jsx("div", { className: "overflow-hidden rounded-lg border border-slate-200", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left text-sm", children: [
      /* @__PURE__ */ jsx("thead", { className: "bg-slate-50 text-slate-600", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Workspace" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Status" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Owners" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Pages" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Created" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-slate-200", children: data.workspaces.map((workspace) => /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsxs("td", { className: "px-4 py-3", children: [
          /* @__PURE__ */ jsx("div", { className: "font-medium text-slate-900", children: workspace.name }),
          /* @__PURE__ */ jsx("div", { className: "text-slate-600", children: workspace.slug })
        ] }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3 capitalize text-slate-700", children: workspace.status }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-slate-600", children: workspace.owner_count }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-slate-600", children: workspace.page_count }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-slate-600", children: workspace.created_at })
      ] }, workspace.id)) })
    ] }) }) })
  ] });
}
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AdminTenants,
  loader: loader$e
}, Symbol.toStringTag, { value: "Module" }));
const visitorCookie = createCookie("__spp_vid", {
  httpOnly: true,
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
  sameSite: "lax",
  secure: true
});
function numberFromRow(row) {
  return (row == null ? void 0 : row.value) ?? 0;
}
function sanitizeMetadata(metadata) {
  if (!metadata) return "{}";
  const safeEntries = Object.entries(metadata).filter(([key]) => ["block_id", "block_type", "target_kind", "short_code"].includes(key)).map(([key, value]) => [key, value]);
  return JSON.stringify(Object.fromEntries(safeEntries));
}
function cleanEventName(eventType) {
  return eventType.replace(/[^a-zA-Z0-9_]/g, "_");
}
function clientIdFromVisitor(visitorId) {
  return (visitorId == null ? void 0 : visitorId.replace(/^vis_/, "")) || crypto.randomUUID();
}
function trackerPayload(input) {
  return {
    service: "smart-page-platform",
    event_type: input.eventType,
    workspace_id: input.workspaceId,
    page_id: input.pageId,
    short_link_id: input.shortLinkId ?? null,
    visitor_id: input.visitorId ?? null,
    referrer: input.referrer ?? null,
    user_agent: input.userAgent ?? null,
    metadata: input.metadata ?? {},
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function forwardExternalAnalytics(env, input) {
  if (!env) return;
  const jobs = [];
  const googleMeasurementId = env.GOOGLE_ANALYTICS_MEASUREMENT_ID;
  const googleApiSecret = env.GOOGLE_ANALYTICS_API_SECRET;
  if (googleMeasurementId && googleApiSecret) {
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
      googleMeasurementId
    )}&api_secret=${encodeURIComponent(googleApiSecret)}`;
    jobs.push(
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientIdFromVisitor(input.visitorId),
          events: [
            {
              name: cleanEventName(input.eventType),
              params: {
                workspace_id: input.workspaceId,
                page_id: input.pageId,
                short_link_id: input.shortLinkId ?? void 0,
                referrer: input.referrer ?? void 0,
                ...input.metadata
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
          ...env.ELASTIC_API_KEY ? { Authorization: `ApiKey ${env.ELASTIC_API_KEY}` } : {}
        },
        body: JSON.stringify(trackerPayload(input))
      })
    );
  }
  await Promise.allSettled(jobs);
}
async function getOrCreateVisitorId(request) {
  const cookieHeader = request.headers.get("Cookie");
  const existing = await visitorCookie.parse(cookieHeader);
  if (typeof existing === "string" && existing.startsWith("vis_")) {
    return { visitorId: existing, setCookie: null };
  }
  const visitorId = createId("vis");
  return {
    visitorId,
    setCookie: await visitorCookie.serialize(visitorId)
  };
}
function analyticsRepository(db2) {
  return {
    async trackEvent(input) {
      await db2.prepare(
        `INSERT INTO analytics_events
            (
              id,
              workspace_id,
              page_id,
              short_link_id,
              event_type,
              visitor_id,
              metadata_json,
              user_agent,
              referrer
            )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        createId("evt"),
        input.workspaceId,
        input.pageId,
        input.shortLinkId ?? null,
        input.eventType,
        input.visitorId ?? null,
        sanitizeMetadata(input.metadata),
        input.userAgent ?? null,
        input.referrer ?? null
      ).run();
    },
    async ownerSummary(workspaceId) {
      const [viewsRow, clicksRow, topPagesResult, topClickedBlocksResult] = await Promise.all([
        db2.prepare(
          "SELECT COUNT(*) AS value FROM analytics_events WHERE workspace_id = ? AND event_type = 'page_view'"
        ).bind(workspaceId).first(),
        db2.prepare(
          `SELECT COUNT(*) AS value
            FROM analytics_events
            WHERE workspace_id = ?
              AND event_type IN ('link_click', 'whatsapp_click')`
        ).bind(workspaceId).first(),
        db2.prepare(
          `SELECT
              pages.id AS page_id,
              pages.title,
              COUNT(analytics_events.id) AS views
            FROM pages
            LEFT JOIN analytics_events
              ON analytics_events.page_id = pages.id
              AND analytics_events.event_type = 'page_view'
            WHERE pages.workspace_id = ?
            GROUP BY pages.id, pages.title
            ORDER BY views DESC, pages.updated_at DESC
            LIMIT 5`
        ).bind(workspaceId).all(),
        db2.prepare(
          `SELECT
              analytics_events.page_id,
              pages.title AS page_title,
              json_extract(analytics_events.metadata_json, '$.block_id') AS block_id,
              json_extract(analytics_events.metadata_json, '$.block_type') AS block_type,
              COUNT(*) AS clicks
            FROM analytics_events
            JOIN pages ON pages.id = analytics_events.page_id
            WHERE analytics_events.workspace_id = ?
              AND analytics_events.event_type IN ('link_click', 'whatsapp_click')
            GROUP BY analytics_events.page_id, block_id, block_type
            ORDER BY clicks DESC
            LIMIT 5`
        ).bind(workspaceId).all()
      ]);
      return {
        totalPageViews: numberFromRow(viewsRow),
        totalClicks: numberFromRow(clicksRow),
        topPages: topPagesResult.results ?? [],
        topClickedBlocks: topClickedBlocksResult.results ?? []
      };
    },
    async platformSummary() {
      const [workspacesRow, pagesRow, viewsRow, clicksRow] = await Promise.all([
        db2.prepare("SELECT COUNT(*) AS value FROM workspaces").first(),
        db2.prepare("SELECT COUNT(*) AS value FROM pages").first(),
        db2.prepare("SELECT COUNT(*) AS value FROM analytics_events WHERE event_type = 'page_view'").first(),
        db2.prepare(
          "SELECT COUNT(*) AS value FROM analytics_events WHERE event_type IN ('link_click', 'whatsapp_click')"
        ).first()
      ]);
      return {
        totalWorkspaces: numberFromRow(workspacesRow),
        totalPages: numberFromRow(pagesRow),
        totalPageViews: numberFromRow(viewsRow),
        totalClicks: numberFromRow(clicksRow)
      };
    }
  };
}
async function loader$d({ request, context }) {
  const user = await requireUser(request, context);
  const db2 = requireD1Database(context);
  const summary = await analyticsRepository(db2).ownerSummary(user.workspaceId);
  return { summary };
}
function OwnerAnalytics() {
  const { summary } = useLoaderData();
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(
        CardHeader,
        {
          title: "Analytics",
          description: "Privacy-conscious Phase 1 summary for published page views and clicks."
        }
      ),
      /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-200 p-4", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm text-slate-600", children: "Total page views" }),
          /* @__PURE__ */ jsx("div", { className: "mt-1 text-2xl font-semibold", children: summary.totalPageViews })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-200 p-4", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm text-slate-600", children: "Total clicks" }),
          /* @__PURE__ */ jsx("div", { className: "mt-1 text-2xl font-semibold", children: summary.totalClicks })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { title: "Top pages", description: "Total views by page." }),
      /* @__PURE__ */ jsx(CardBody, { children: summary.topPages.length === 0 ? /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700", children: "No page views yet." }) : /* @__PURE__ */ jsx("div", { className: "divide-y divide-slate-200 rounded-lg border border-slate-200", children: summary.topPages.map((page) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-4", children: [
        /* @__PURE__ */ jsx("div", { className: "font-medium text-slate-900", children: page.title }),
        /* @__PURE__ */ jsxs("div", { className: "text-sm text-slate-600", children: [
          page.views,
          " views"
        ] })
      ] }, page.page_id)) }) })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { title: "Top clicked blocks", description: "Most-clicked link/contact blocks." }),
      /* @__PURE__ */ jsx(CardBody, { children: summary.topClickedBlocks.length === 0 ? /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700", children: "No clicks yet." }) : /* @__PURE__ */ jsx("div", { className: "divide-y divide-slate-200 rounded-lg border border-slate-200", children: summary.topClickedBlocks.map((block) => /* @__PURE__ */ jsxs(
        "div",
        {
          className: "flex items-center justify-between p-4",
          children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { className: "font-medium text-slate-900", children: block.page_title }),
              /* @__PURE__ */ jsxs("div", { className: "text-sm text-slate-600", children: [
                block.block_type,
                " - ",
                block.block_id
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "text-sm text-slate-600", children: [
              block.clicks,
              " clicks"
            ] })
          ]
        },
        `${block.page_id}-${block.block_id}-${block.block_type}`
      )) }) })
    ] })
  ] });
}
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: OwnerAnalytics,
  loader: loader$d
}, Symbol.toStringTag, { value: "Module" }));
function escapeXml(raw) {
  return raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
async function loader$c({ request, context }) {
  const origin = new URL(request.url).origin;
  const db2 = getD1Database(context);
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  let urls = [
    {
      loc: `${origin}/`,
      lastmod: today,
      changefreq: "weekly",
      priority: "1.0"
    }
  ];
  if (db2) {
    const rows2 = await pageRepository(db2).listIndexablePublishedPages();
    urls = [
      ...urls,
      ...rows2.map((row) => ({
        loc: `${origin}/p/${encodeURIComponent(row.code)}`,
        lastmod: row.updated_at.slice(0, 10),
        changefreq: "weekly",
        priority: "0.8"
      }))
    ];
  }
  const urlEntries = urls.map(
    (entry2) => `<url><loc>${escapeXml(entry2.loc)}</loc><lastmod>${escapeXml(entry2.lastmod)}</lastmod>${entry2.changefreq ? `<changefreq>${escapeXml(entry2.changefreq)}</changefreq>` : ""}${entry2.priority ? `<priority>${escapeXml(entry2.priority)}</priority>` : ""}</url>`
  ).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlEntries}</urlset>`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=900"
    }
  });
}
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$c
}, Symbol.toStringTag, { value: "Module" }));
async function loader$b({ request, context }) {
  await requireUserRole(request, context);
  const db2 = requireD1Database(context);
  const summary = await adminRepository(db2).platformSummary();
  return { summary };
}
function SuperAdminDashboard() {
  const { summary } = useLoaderData();
  return /* @__PURE__ */ jsx("div", { className: "space-y-6", children: /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(
      CardHeader,
      {
        title: "Super admin dashboard",
        description: "Read-only Phase 1 platform overview."
      }
    ),
    /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-200 p-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm text-slate-600", children: "Users" }),
        /* @__PURE__ */ jsx("div", { className: "mt-1 text-2xl font-semibold", children: summary.totalUsers })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-200 p-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm text-slate-600", children: "Workspaces" }),
        /* @__PURE__ */ jsx("div", { className: "mt-1 text-2xl font-semibold", children: summary.totalWorkspaces })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-200 p-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm text-slate-600", children: "Pages" }),
        /* @__PURE__ */ jsx("div", { className: "mt-1 text-2xl font-semibold", children: summary.totalPages })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-200 p-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm text-slate-600", children: "Published pages" }),
        /* @__PURE__ */ jsx("div", { className: "mt-1 text-2xl font-semibold", children: summary.totalPublishedPages })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-200 p-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm text-slate-600", children: "Views" }),
        /* @__PURE__ */ jsx("div", { className: "mt-1 text-2xl font-semibold", children: summary.totalPageViews })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-200 p-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm text-slate-600", children: "Clicks" }),
        /* @__PURE__ */ jsx("div", { className: "mt-1 text-2xl font-semibold", children: summary.totalClicks })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-200 p-4", children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm text-slate-600", children: "Lead submissions" }),
        /* @__PURE__ */ jsx("div", { className: "mt-1 text-2xl font-semibold", children: summary.totalLeads ?? 0 })
      ] })
    ] }) })
  ] }) });
}
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: SuperAdminDashboard,
  loader: loader$b
}, Symbol.toStringTag, { value: "Module" }));
function workspaceRepository(db2) {
  return {
    async getWorkspace(workspaceId) {
      return db2.prepare("SELECT id, slug, name, status, created_at, updated_at FROM workspaces WHERE id = ?").bind(workspaceId).first();
    },
    async updateWorkspaceName(input) {
      const name = input.name.trim();
      if (!name) {
        throw new Error("workspace_name_required");
      }
      await db2.prepare("UPDATE workspaces SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(name, input.workspaceId).run();
      return this.getWorkspace(input.workspaceId);
    },
    async getCurrentAccount(userId, workspaceId) {
      return db2.prepare(
        `SELECT
            users.id,
            users.email,
            users.name,
            CASE
              WHEN users.role = 'super_admin' THEN 'super_admin'
              ELSE workspace_members.role
            END AS role,
            ? AS workspaceId
          FROM users
          LEFT JOIN workspace_members
            ON workspace_members.user_id = users.id
            AND workspace_members.workspace_id = ?
          WHERE users.id = ?
          LIMIT 1`
      ).bind(workspaceId, workspaceId, userId).first();
    }
  };
}
async function loader$a({ request, context }) {
  const user = await requireUser(request, context);
  const db2 = requireD1Database(context);
  const repo = workspaceRepository(db2);
  const [workspace, account] = await Promise.all([
    repo.getWorkspace(user.workspaceId),
    repo.getCurrentAccount(user.id, user.workspaceId)
  ]);
  if (!workspace || !account) {
    throw new Response("Workspace not found", { status: 404 });
  }
  return { workspace, account };
}
async function action$5({ request, context }) {
  const user = await requireUser(request, context);
  const db2 = requireD1Database(context);
  const form = await request.formData();
  const name = String(form.get("workspaceName") ?? "");
  try {
    await workspaceRepository(db2).updateWorkspaceName({
      workspaceId: user.workspaceId,
      name
    });
  } catch {
    return json({ ok: false, error: "Workspace name is required." }, { status: 400 });
  }
  return redirect$1("/app/settings?notice=settings-updated");
}
function OwnerSettings() {
  const data = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const isSubmitting = navigation.state !== "idle";
  const notice = searchParams.get("notice");
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(
        CardHeader,
        {
          title: "Workspace settings",
          description: "Basic workspace identity for Phase 1."
        }
      ),
      /* @__PURE__ */ jsxs(CardBody, { children: [
        (actionData == null ? void 0 : actionData.ok) === false ? /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700", children: actionData.error }) : null,
        notice === "settings-updated" ? /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700", children: "Workspace settings updated." }) : null,
        /* @__PURE__ */ jsxs(Form, { method: "post", className: "space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-3 md:grid-cols-2", children: [
            /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-slate-700", children: "Workspace name" }),
              /* @__PURE__ */ jsx(Input, { name: "workspaceName", defaultValue: data.workspace.name, required: true })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
              /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-slate-700", children: "Workspace slug" }),
              /* @__PURE__ */ jsx(Input, { value: data.workspace.slug, readOnly: true, className: "bg-slate-50" })
            ] })
          ] }),
          /* @__PURE__ */ jsx(Button, { type: "submit", disabled: isSubmitting, children: isSubmitting ? "Saving..." : "Save workspace" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { title: "Account", description: "Current signed-in user." }),
      /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-3 text-sm md:grid-cols-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-200 p-4", children: [
          /* @__PURE__ */ jsx("div", { className: "text-slate-500", children: "Name" }),
          /* @__PURE__ */ jsx("div", { className: "mt-1 font-medium text-slate-900", children: data.account.name })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-200 p-4", children: [
          /* @__PURE__ */ jsx("div", { className: "text-slate-500", children: "Email" }),
          /* @__PURE__ */ jsx("div", { className: "mt-1 font-medium text-slate-900", children: data.account.email })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-200 p-4", children: [
          /* @__PURE__ */ jsx("div", { className: "text-slate-500", children: "Role" }),
          /* @__PURE__ */ jsx("div", { className: "mt-1 font-medium capitalize text-slate-900", children: data.account.role })
        ] })
      ] }) })
    ] })
  ] });
}
const route7 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$5,
  default: OwnerSettings,
  loader: loader$a
}, Symbol.toStringTag, { value: "Module" }));
async function loader$9({ request }) {
  const origin = new URL(request.url).origin;
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /app/",
    "Disallow: /admin/",
    "Disallow: /login",
    "Disallow: /signup",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    ""
  ].join("\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
const route8 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$9
}, Symbol.toStringTag, { value: "Module" }));
async function loader$8({ request, context }) {
  await requireUserRole(request, context);
  const db2 = requireD1Database(context);
  const pages = await adminRepository(db2).listPages();
  return { pages };
}
function AdminPages() {
  const data = useLoaderData();
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(
      CardHeader,
      {
        title: "Pages",
        description: "Read-only platform page inventory.",
        right: /* @__PURE__ */ jsx(Input, { placeholder: "Filter pages (coming later)", className: "w-56 bg-slate-50", readOnly: true })
      }
    ),
    /* @__PURE__ */ jsx(CardBody, { children: data.pages.length === 0 ? /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700", children: "No pages yet." }) : /* @__PURE__ */ jsx("div", { className: "overflow-hidden rounded-lg border border-slate-200", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left text-sm", children: [
      /* @__PURE__ */ jsx("thead", { className: "bg-slate-50 text-slate-600", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Page" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Workspace" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Status" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Short link" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Updated" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-slate-200", children: data.pages.map((page) => /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsxs("td", { className: "px-4 py-3", children: [
          /* @__PURE__ */ jsx("div", { className: "font-medium text-slate-900", children: page.title }),
          /* @__PURE__ */ jsxs("div", { className: "text-slate-600", children: [
            "Created ",
            page.created_at
          ] })
        ] }),
        /* @__PURE__ */ jsxs("td", { className: "px-4 py-3", children: [
          /* @__PURE__ */ jsx("div", { className: "text-slate-900", children: page.workspace_name }),
          /* @__PURE__ */ jsx("div", { className: "text-slate-600", children: page.workspace_slug })
        ] }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3 capitalize text-slate-700", children: page.status }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: page.short_code ? /* @__PURE__ */ jsx(Link, { to: `/p/${page.short_code}`, target: "_blank", rel: "noreferrer", children: /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "ghost", children: [
          "/p/",
          page.short_code
        ] }) }) : /* @__PURE__ */ jsx("span", { className: "text-slate-500", children: "Not published" }) }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-slate-600", children: page.updated_at })
      ] }, page.id)) })
    ] }) }) })
  ] });
}
const route9 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AdminPages,
  loader: loader$8
}, Symbol.toStringTag, { value: "Module" }));
async function loader$7({ request, context }) {
  await requireUserRole(request, context);
  const db2 = requireD1Database(context);
  const users = await adminRepository(db2).listUsers();
  return { users };
}
function AdminUsers() {
  const data = useLoaderData();
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(
      CardHeader,
      {
        title: "Users",
        description: "Read-only platform users. Destructive actions are intentionally disabled in Phase 1.",
        right: /* @__PURE__ */ jsx(Input, { placeholder: "Search users (coming later)", className: "w-56 bg-slate-50", readOnly: true })
      }
    ),
    /* @__PURE__ */ jsx(CardBody, { children: data.users.length === 0 ? /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700", children: "No users yet." }) : /* @__PURE__ */ jsx("div", { className: "overflow-hidden rounded-lg border border-slate-200", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left text-sm", children: [
      /* @__PURE__ */ jsx("thead", { className: "bg-slate-50 text-slate-600", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "User" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Role" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Created" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Last login" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-slate-200", children: data.users.map((user) => /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsxs("td", { className: "px-4 py-3", children: [
          /* @__PURE__ */ jsx("div", { className: "font-medium text-slate-900", children: user.name }),
          /* @__PURE__ */ jsx("div", { className: "text-slate-600", children: user.email })
        ] }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3 capitalize text-slate-700", children: user.role }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-slate-600", children: user.created_at }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-slate-600", children: user.last_login_at ?? "Never" })
      ] }, user.id)) })
    ] }) }) })
  ] });
}
const route10 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AdminUsers,
  loader: loader$7
}, Symbol.toStringTag, { value: "Module" }));
async function loader$6({ request, context }) {
  const user = await requireUser(request, context);
  const db2 = requireD1Database(context);
  const [analytics, pageStats] = await Promise.all([
    analyticsRepository(db2).ownerSummary(user.workspaceId),
    pageRepository(db2).workspacePageStats(user.workspaceId)
  ]);
  return {
    totalPages: pageStats.totalPages,
    publishedPages: pageStats.publishedPages,
    draftPages: pageStats.draftPages,
    visitsCount: analytics.totalPageViews,
    clicksCount: analytics.totalClicks,
    latestPages: pageStats.latestPages
  };
}
function OwnerDashboard() {
  const data = useLoaderData();
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(
        CardHeader,
        {
          title: "Owner dashboard",
          description: "Your workspace at a glance.",
          right: /* @__PURE__ */ jsx(Link, { to: "/app/pages", children: /* @__PURE__ */ jsx(Button, { size: "sm", children: "Manage pages" }) })
        }
      ),
      /* @__PURE__ */ jsx(CardBody, { children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-4 md:grid-cols-5", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-200 p-4", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm text-slate-600", children: "Total pages" }),
          /* @__PURE__ */ jsx("div", { className: "mt-1 text-2xl font-semibold", children: data.totalPages })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-200 p-4", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm text-slate-600", children: "Published" }),
          /* @__PURE__ */ jsx("div", { className: "mt-1 text-2xl font-semibold", children: data.publishedPages })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-200 p-4", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm text-slate-600", children: "Drafts" }),
          /* @__PURE__ */ jsx("div", { className: "mt-1 text-2xl font-semibold", children: data.draftPages })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-200 p-4", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm text-slate-600", children: "Views" }),
          /* @__PURE__ */ jsx("div", { className: "mt-1 text-2xl font-semibold", children: data.visitsCount })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-slate-200 p-4", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm text-slate-600", children: "Clicks" }),
          /* @__PURE__ */ jsx("div", { className: "mt-1 text-2xl font-semibold", children: data.clicksCount })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs(Card, { children: [
      /* @__PURE__ */ jsx(CardHeader, { title: "Latest page activity", description: "Recently updated workspace pages." }),
      /* @__PURE__ */ jsx(CardBody, { children: data.latestPages.length === 0 ? /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700", children: "No page activity yet. Create a page to get started." }) : /* @__PURE__ */ jsx("div", { className: "divide-y divide-slate-200 rounded-lg border border-slate-200", children: data.latestPages.map((page) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "font-medium text-slate-900", children: page.title }),
          /* @__PURE__ */ jsxs("div", { className: "text-sm text-slate-600", children: [
            page.status,
            " - updated ",
            page.updated_at
          ] })
        ] }),
        /* @__PURE__ */ jsx(Link, { to: `/app/pages/${page.id}/edit`, children: /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", children: "Open" }) })
      ] }, page.id)) }) })
    ] })
  ] });
}
const route11 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: OwnerDashboard,
  loader: loader$6
}, Symbol.toStringTag, { value: "Module" }));
function leadRepository(db2) {
  return {
    async create(input) {
      const id2 = createId("lead");
      await db2.prepare(
        `INSERT INTO lead_submissions
            (id, workspace_id, page_id, block_id, name, phone, email, message, metadata_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id2,
        input.workspaceId,
        input.pageId,
        input.blockId,
        input.name ?? null,
        input.phone ?? null,
        input.email ?? null,
        input.message ?? null,
        JSON.stringify(input.metadata ?? {})
      ).run();
      return id2;
    },
    async recentForWorkspace(workspaceId, limit = 200) {
      const result = await db2.prepare(
        `SELECT
            lead_submissions.id,
            lead_submissions.workspace_id,
            lead_submissions.page_id,
            lead_submissions.block_id,
            lead_submissions.name,
            lead_submissions.phone,
            lead_submissions.email,
            lead_submissions.message,
            lead_submissions.metadata_json,
            lead_submissions.created_at,
            pages.title AS page_title
          FROM lead_submissions
          JOIN pages ON pages.id = lead_submissions.page_id
          WHERE lead_submissions.workspace_id = ?
          ORDER BY lead_submissions.created_at DESC
          LIMIT ?`
      ).bind(workspaceId, limit).all();
      return result.results ?? [];
    },
    async countAll() {
      const row = await db2.prepare("SELECT COUNT(*) AS value FROM lead_submissions").first();
      return (row == null ? void 0 : row.value) ?? 0;
    },
    async recentForBlock(pageId, blockId, sinceIso) {
      const row = await db2.prepare(
        `SELECT COUNT(*) AS value
          FROM lead_submissions
          WHERE page_id = ? AND block_id = ? AND created_at >= ?`
      ).bind(pageId, blockId, sinceIso).first();
      return (row == null ? void 0 : row.value) ?? 0;
    }
  };
}
async function loader$5({ request, context }) {
  const user = await requireUser(request, context);
  const db2 = requireD1Database(context);
  const leads = await leadRepository(db2).recentForWorkspace(user.workspaceId, 300);
  return { leads };
}
function OwnerLeads() {
  const { leads } = useLoaderData();
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(
      CardHeader,
      {
        title: "Leads",
        description: "Private lead submissions from your published form blocks."
      }
    ),
    /* @__PURE__ */ jsx(CardBody, { children: leads.length === 0 ? /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700", children: "No leads yet." }) : /* @__PURE__ */ jsx("div", { className: "overflow-x-auto rounded-lg border border-slate-200", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left text-sm", children: [
      /* @__PURE__ */ jsx("thead", { className: "bg-slate-50 text-slate-600", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Page" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Name" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Phone" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Email" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Message" }),
        /* @__PURE__ */ jsx("th", { className: "px-4 py-3 font-medium", children: "Date" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-slate-200", children: leads.map((lead) => /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3 font-medium text-slate-900", children: lead.page_title }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-slate-700", children: lead.name || "—" }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-slate-700", children: lead.phone || "—" }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-slate-700", children: lead.email || "—" }),
        /* @__PURE__ */ jsx("td", { className: "max-w-sm whitespace-pre-wrap px-4 py-3 text-slate-700", children: lead.message || "—" }),
        /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-slate-600", children: lead.created_at })
      ] }, lead.id)) })
    ] }) }) })
  ] });
}
const route12 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: OwnerLeads,
  loader: loader$5
}, Symbol.toStringTag, { value: "Module" }));
function StatusBadge(props) {
  return /* @__PURE__ */ jsx(
    "span",
    {
      className: cn(
        "rounded-full px-2 py-1 text-xs font-medium capitalize",
        props.status === "published" && "bg-emerald-50 text-emerald-700",
        props.status === "draft" && "bg-amber-50 text-amber-700",
        props.status === "archived" && "bg-slate-100 text-slate-600"
      ),
      children: props.status
    }
  );
}
function pageActionError(error) {
  if (error instanceof Error && error.message === "page_not_found") {
    return "That page could not be found in your workspace.";
  }
  if (error instanceof Error && error.message === "page_title_too_long") {
    return "Page title must be 120 characters or less.";
  }
  return "Page action failed. Please try again.";
}
async function loader$4({ request, context }) {
  const user = await requireUser(request, context);
  const db2 = requireD1Database(context);
  const pages = await pageRepository(db2).listPages(user.workspaceId);
  return { pages };
}
async function action$4({ request, context }) {
  const user = await requireUser(request, context);
  const db2 = requireD1Database(context);
  const repo = pageRepository(db2);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "create");
  try {
    if (intent === "publish" || intent === "unpublish") {
      const pageId = String(form.get("pageId") ?? "");
      if (!pageId) {
        return json({ ok: false, error: "Choose a page before changing publish status." }, { status: 400 });
      }
      await repo.setPublishStatus({
        workspaceId: user.workspaceId,
        userId: user.id,
        pageId,
        status: intent === "publish" ? "published" : "draft"
      });
      return redirect$1(`/app/pages?notice=${intent === "publish" ? "published" : "unpublished"}`);
    }
    const title = String(form.get("title") ?? "").trim();
    if (!title) {
      return json({ ok: false, error: "Enter a page title before creating a page." }, { status: 400 });
    }
    const page = await repo.createPage({
      workspaceId: user.workspaceId,
      userId: user.id,
      title,
      slug: title
    });
    if (!page) {
      return json({ ok: false, error: "Unable to create page. Please try again." }, { status: 500 });
    }
    return redirect$1(`/app/pages/${page.page.id}/edit?notice=created`);
  } catch (error) {
    return json({ ok: false, error: pageActionError(error) }, { status: 400 });
  }
}
function OwnerPages() {
  const data = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const notice = searchParams.get("notice");
  const isSubmitting = navigation.state !== "idle";
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(
      CardHeader,
      {
        title: "Pages",
        description: "Create pages, manage publish status, and open public short links.",
        right: /* @__PURE__ */ jsxs(Form, { method: "post", className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "create" }),
          /* @__PURE__ */ jsx(Input, { name: "title", placeholder: "New page title", className: "w-44" }),
          /* @__PURE__ */ jsx(Button, { type: "submit", size: "sm", disabled: isSubmitting, children: isSubmitting ? "Working..." : "Create page" })
        ] })
      }
    ),
    /* @__PURE__ */ jsxs(CardBody, { children: [
      (actionData == null ? void 0 : actionData.ok) === false ? /* @__PURE__ */ jsx("div", { className: "mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700", children: actionData.error }) : null,
      notice ? /* @__PURE__ */ jsxs("div", { className: "mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700", children: [
        "Page ",
        notice,
        " successfully."
      ] }) : null,
      data.pages.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-700", children: [
        /* @__PURE__ */ jsx("div", { className: "font-medium text-slate-900", children: "No pages yet" }),
        /* @__PURE__ */ jsx("div", { className: "mt-1", children: "Create your first smart page to start publishing." })
      ] }) : /* @__PURE__ */ jsx("div", { className: "divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white", children: data.pages.map((p) => {
        const publicCode = p.status === "published" && p.short_link_status === "active" ? p.short_code : null;
        return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
              /* @__PURE__ */ jsx("div", { className: "font-medium text-slate-900", children: p.title }),
              /* @__PURE__ */ jsx(StatusBadge, { status: p.status })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "mt-1 text-sm text-slate-600", children: publicCode ? /* @__PURE__ */ jsxs("span", { children: [
              "Short link: /p/",
              publicCode
            ] }) : /* @__PURE__ */ jsx("span", { children: "No public short link until published." }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
            publicCode ? /* @__PURE__ */ jsxs(Fragment$1, { children: [
              /* @__PURE__ */ jsx(
                Link,
                {
                  to: `/p/${publicCode}`,
                  target: "_blank",
                  rel: "noreferrer",
                  className: buttonClassName({ size: "sm", variant: "ghost" }),
                  children: "View public"
                }
              ),
              /* @__PURE__ */ jsx(
                Button,
                {
                  type: "button",
                  size: "sm",
                  variant: "ghost",
                  onClick: () => {
                    var _a;
                    return void ((_a = navigator.clipboard) == null ? void 0 : _a.writeText(`${window.location.origin}/p/${publicCode}`));
                  },
                  children: "Copy link"
                }
              )
            ] }) : null,
            /* @__PURE__ */ jsxs(Form, { method: "post", children: [
              /* @__PURE__ */ jsx("input", { type: "hidden", name: "pageId", value: p.id }),
              p.status === "published" ? /* @__PURE__ */ jsx(Button, { type: "submit", name: "intent", value: "unpublish", size: "sm", variant: "secondary", disabled: isSubmitting, children: "Unpublish" }) : /* @__PURE__ */ jsx(Button, { type: "submit", name: "intent", value: "publish", size: "sm", variant: "secondary", disabled: isSubmitting, children: "Publish" })
            ] }),
            /* @__PURE__ */ jsx(
              Link,
              {
                to: `/app/pages/${p.id}/edit`,
                className: buttonClassName({ size: "sm" }),
                children: "Edit"
              }
            )
          ] })
        ] }, p.id);
      }) })
    ] })
  ] });
}
const route13 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$4,
  default: OwnerPages,
  loader: loader$4
}, Symbol.toStringTag, { value: "Module" }));
async function loader$3() {
  return new Response("ok", { headers: { "Content-Type": "text/plain" } });
}
const route14 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader: loader$3
}, Symbol.toStringTag, { value: "Module" }));
function demoBlocks(code) {
  return code === "demo" ? [
    {
      id: "profile",
      type: "profile",
      props: {
        imageUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
        name: "Demo creator",
        subtitle: "Links, offers, updates, and contact in one smart page.",
        circular: true
      }
    },
    {
      id: "h",
      type: "header",
      props: { title: "Demo smart page", subtitle: "A richer Phase 1 public page." }
    },
    {
      id: "social",
      type: "social_links",
      props: {
        links: [
          { platform: "instagram", label: "Instagram", href: "https://instagram.com/" },
          { platform: "website", label: "Website", href: "https://example.com" }
        ]
      }
    },
    {
      id: "t",
      type: "text",
      props: {
        text: "Use profiles, links, FAQs, prices, galleries, maps, and announcements without uploads or heavy scripts."
      }
    },
    {
      id: "b",
      type: "link_button",
      props: { label: "Back to home", href: "/" }
    },
    {
      id: "w",
      type: "whatsapp_button",
      props: { label: "Chat on WhatsApp", phoneE164: "+15551234567" }
    },
    {
      id: "faq",
      type: "faq",
      props: {
        items: [
          {
            question: "Can this page be edited?",
            answer: "Yes. Owners can add, reorder, save, and publish blocks from the editor."
          }
        ]
      }
    }
  ] : [
    {
      id: "h",
      type: "header",
      props: { title: "Unknown short code", subtitle: `Code: ${code}` }
    },
    { id: "t", type: "text", props: { text: "That page is not published." } },
    { id: "b", type: "link_button", props: { label: "Home", href: "/" } }
  ];
}
const meta$5 = ({ data }) => {
  if (!data) {
    return [{ title: "Public page - Smart Page Platform" }, { name: "robots", content: "noindex, nofollow" }];
  }
  const title = data.metaTitle || data.title || "Smart page";
  const description = data.metaDescription || "";
  const ogTags = data.ogImage ? [
    { property: "og:image", content: data.ogImage },
    { name: "twitter:image", content: data.ogImage }
  ] : [];
  return [
    { title },
    { name: "description", content: description },
    { name: "robots", content: data.robots },
    { tagName: "link", rel: "canonical", href: data.canonicalUrl },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: data.canonicalUrl },
    {
      name: "twitter:card",
      content: data.ogImage ? "summary_large_image" : "summary"
    },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    ...ogTags
  ];
};
async function loader$2({ request, params, context }) {
  const url = new URL(request.url);
  const leadStatus = (() => {
    const raw = url.searchParams.get("lead");
    return raw === "ok" || raw === "invalid" ? raw : void 0;
  })();
  const code = params.code ?? "unknown";
  const origin = new URL(request.url).origin;
  const canonicalUrl = `${origin}/p/${encodeURIComponent(code)}`;
  const db2 = getD1Database(context);
  const fallbackMeta = (blocks2, titleFallback) => ({
    metaTitle: resolvePublicMetaTitle(titleFallback, null),
    metaDescription: resolvePublicMetaDescription(blocks2, titleFallback, null),
    ogImage: pickOgImage(blocks2)
  });
  if (db2) {
    const publishedPage = await pageRepository(db2).getPublishedPageByCode(code);
    if (publishedPage) {
      const visitor = await getOrCreateVisitorId(request);
      const blocks3 = publishedPage.blocks;
      const pageTitle = publishedPage.page.title;
      const metaTitle = resolvePublicMetaTitle(pageTitle, publishedPage.page.seo_title);
      const metaDescription = resolvePublicMetaDescription(blocks3, pageTitle, publishedPage.page.seo_description);
      const ogImage = pickOgImage(blocks3);
      const allowIndexing = publishedPage.page.allow_indexing !== 0;
      const robots = publishedPage.page.status === "published" && allowIndexing ? "index, follow" : "noindex, nofollow";
      try {
        if (publishedPage.shortLink) {
          const event = {
            workspaceId: publishedPage.page.workspace_id,
            pageId: publishedPage.page.id,
            shortLinkId: publishedPage.shortLink.id,
            eventType: "page_view",
            visitorId: visitor.visitorId,
            userAgent: request.headers.get("User-Agent"),
            referrer: request.headers.get("Referer"),
            metadata: {
              short_code: code
            }
          };
          await analyticsRepository(db2).trackEvent(event);
          await forwardExternalAnalytics(getAppEnv(context), event);
        }
      } catch {
      }
      const payload = {
        code,
        blocks: blocks3,
        theme: publishedPage.theme,
        title: pageTitle,
        status: publishedPage.page.status,
        trackingEnabled: true,
        robots,
        canonicalUrl,
        metaTitle,
        metaDescription,
        ogImage,
        leadStatus
      };
      return json(payload, visitor.setCookie ? { headers: { "Set-Cookie": visitor.setCookie } } : void 0);
    }
    const blocks2 = demoBlocks("unknown");
    const fm2 = fallbackMeta(blocks2, "Not published");
    return json({
      code,
      blocks: blocks2,
      theme: DEFAULT_PAGE_THEME,
      title: "Not published",
      status: "draft",
      trackingEnabled: false,
      robots: "noindex, nofollow",
      canonicalUrl,
      metaTitle: fm2.metaTitle,
      metaDescription: fm2.metaDescription,
      ogImage: fm2.ogImage,
      leadStatus
    });
  }
  const blocks = demoBlocks(code);
  const fm = fallbackMeta(blocks, code === "demo" ? "Demo smart page" : "Public page");
  return json({
    code,
    blocks,
    theme: DEFAULT_PAGE_THEME,
    title: code === "demo" ? "Demo smart page" : "Public page",
    status: "draft",
    trackingEnabled: false,
    robots: "noindex, nofollow",
    canonicalUrl,
    metaTitle: fm.metaTitle,
    metaDescription: fm.metaDescription,
    ogImage: fm.ogImage,
    leadStatus
  });
}
async function action$3({ request, params, context }) {
  const code = params.code ?? "unknown";
  const db2 = getD1Database(context);
  if (!db2) {
    return new Response(null, { status: 204 });
  }
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  if (intent !== "track_click" && intent !== "submit_lead") {
    return new Response(null, { status: 204 });
  }
  try {
    const publishedPage = await pageRepository(db2).getPublishedPageByCode(code);
    if (!(publishedPage == null ? void 0 : publishedPage.shortLink)) {
      return new Response(null, { status: 204 });
    }
    if (intent === "submit_lead") {
      const formBlockId = String(form.get("blockId") ?? "");
      const formBlock = publishedPage.blocks.find((block) => block.id === formBlockId && block.type === "form");
      if (!formBlock || formBlock.type !== "form") {
        return new Response(null, { status: 204 });
      }
      const name = String(form.get("name") ?? "").trim().slice(0, 120);
      const phone = String(form.get("phone") ?? "").trim().slice(0, 40);
      const email = String(form.get("email") ?? "").trim().slice(0, 160);
      const message = String(form.get("message") ?? "").trim().slice(0, 2e3);
      const enabled = new Set(formBlock.props.enabledFields);
      const normalized = {
        name: enabled.has("name") ? name : "",
        phone: enabled.has("phone") ? phone : "",
        email: enabled.has("email") ? email : "",
        message: enabled.has("message") ? message : ""
      };
      if (!normalized.name && !normalized.phone && !normalized.email && !normalized.message) {
        return new Response(null, { status: 400 });
      }
      if (normalized.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
        return Response.redirect(new URL(`/p/${encodeURIComponent(code)}?lead=invalid`, request.url), 302);
      }
      if (normalized.phone && !/^\+?[0-9][0-9\s\-()]{6,20}$/.test(normalized.phone)) {
        return Response.redirect(new URL(`/p/${encodeURIComponent(code)}?lead=invalid`, request.url), 302);
      }
      const now = Date.now();
      const recentIso = new Date(now - 6e4).toISOString();
      const recentCount = await leadRepository(db2).recentForBlock(publishedPage.page.id, formBlock.id, recentIso);
      if (recentCount >= 8) {
        return new Response(null, { status: 429 });
      }
      await leadRepository(db2).create({
        workspaceId: publishedPage.page.workspace_id,
        pageId: publishedPage.page.id,
        blockId: formBlock.id,
        name: normalized.name || void 0,
        phone: normalized.phone || void 0,
        email: normalized.email || void 0,
        message: normalized.message || void 0,
        metadata: {
          code,
          userAgent: request.headers.get("User-Agent") ?? void 0,
          referrer: request.headers.get("Referer") ?? void 0
        }
      });
      return Response.redirect(new URL(`/p/${encodeURIComponent(code)}?lead=ok`, request.url), 302);
    }
    const blockId = String(form.get("blockId") ?? "");
    const blockType = String(form.get("blockType") ?? "");
    const trackedBlock = publishedPage.blocks.find((block) => block.id === blockId && block.type === blockType);
    if (!trackedBlock || trackedBlock.type !== "link_button" && trackedBlock.type !== "whatsapp_button") {
      return new Response(null, { status: 204 });
    }
    const visitor = await getOrCreateVisitorId(request);
    const event = {
      workspaceId: publishedPage.page.workspace_id,
      pageId: publishedPage.page.id,
      shortLinkId: publishedPage.shortLink.id,
      eventType: trackedBlock.type === "whatsapp_button" ? "whatsapp_click" : "link_click",
      visitorId: visitor.visitorId,
      userAgent: request.headers.get("User-Agent"),
      referrer: request.headers.get("Referer"),
      metadata: {
        block_id: trackedBlock.id,
        block_type: trackedBlock.type,
        target_kind: trackedBlock.type === "whatsapp_button" ? "contact" : "link",
        short_code: code
      }
    };
    await analyticsRepository(db2).trackEvent(event);
    await forwardExternalAnalytics(getAppEnv(context), event);
    return new Response(null, {
      status: 204,
      headers: visitor.setCookie ? { "Set-Cookie": visitor.setCookie } : void 0
    });
  } catch {
    return new Response(null, { status: 204 });
  }
}
function PublicPage() {
  const data = useLoaderData();
  const standaloneHtmlBlock = isStandaloneHtmlPage(data.blocks) && data.blocks[0].type === "html_embed" ? data.blocks[0] : null;
  if (standaloneHtmlBlock) {
    return /* @__PURE__ */ jsx(StandaloneHtmlPageFrame, { block: standaloneHtmlBlock });
  }
  return /* @__PURE__ */ jsxs(Fragment$1, { children: [
    data.leadStatus === "ok" ? /* @__PURE__ */ jsx("div", { className: "fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 shadow", children: "Lead submitted successfully." }) : null,
    data.leadStatus === "invalid" ? /* @__PURE__ */ jsx("div", { className: "fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 shadow", children: "Please check email/phone format and try again." }) : null,
    /* @__PURE__ */ jsx(
      PublicPageFrame,
      {
        code: data.code,
        blocks: data.blocks,
        theme: data.theme,
        trackingCode: data.trackingEnabled ? data.code : void 0
      }
    )
  ] });
}
const route15 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$3,
  default: PublicPage,
  loader: loader$2,
  meta: meta$5
}, Symbol.toStringTag, { value: "Module" }));
async function action$2({ request, context }) {
  return logout(request, context);
}
function Logout() {
  return null;
}
const route16 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$2,
  default: Logout
}, Symbol.toStringTag, { value: "Module" }));
const db = {
  usersById: /* @__PURE__ */ new Map(),
  usersByEmail: /* @__PURE__ */ new Map(),
  workspacesById: /* @__PURE__ */ new Map(),
  workspacesBySlug: /* @__PURE__ */ new Map(),
  passwordsByUserId: /* @__PURE__ */ new Map()
};
function id(prefix) {
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}
function memoryAuthStore() {
  return {
    async createWorkspace(input) {
      const ws = { id: id("ws"), ...input };
      db.workspacesById.set(ws.id, ws);
      db.workspacesBySlug.set(ws.slug, ws);
      return ws;
    },
    async getWorkspaceById(workspaceId) {
      return db.workspacesById.get(workspaceId) ?? null;
    },
    async createUser(input) {
      const normalizedEmail = input.email.trim().toLowerCase();
      if (db.usersByEmail.has(normalizedEmail)) {
        throw new Error("email_taken");
      }
      const user = {
        id: id("usr"),
        email: normalizedEmail,
        name: input.name.trim(),
        role: input.role,
        workspaceId: input.workspaceId
      };
      db.usersById.set(user.id, user);
      db.usersByEmail.set(user.email, user);
      db.passwordsByUserId.set(user.id, { userId: user.id, password: input.password });
      return user;
    },
    async createOwnerSignup(input) {
      const workspace = await this.createWorkspace({
        name: input.workspaceName,
        slug: input.workspaceSlug
      });
      const user = await this.createUser({
        email: input.email,
        name: input.name,
        role: "owner",
        workspaceId: workspace.id,
        password: input.password
      });
      return { user, workspace };
    },
    async verifyLogin(input) {
      const normalizedEmail = input.email.trim().toLowerCase();
      const user = db.usersByEmail.get(normalizedEmail);
      if (!user) return null;
      const rec = db.passwordsByUserId.get(user.id);
      if (!rec) return null;
      if (rec.password !== input.password) return null;
      return user;
    }
  };
}
const PASSWORD_ALGORITHM = "pbkdf2_sha256";
const PASSWORD_ITERATIONS = 1e5;
const SALT_BYTES = 32;
const KEY_BITS = 256;
function base64UrlEncode(bytes) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
function base64UrlDecode(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "="
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
function toArrayBuffer(bytes) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}
async function derivePasswordKey(password, salt, iterations) {
  const material = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(new TextEncoder().encode(password)),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      iterations
    },
    material,
    KEY_BITS
  );
  return new Uint8Array(bits);
}
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derivePasswordKey(password, salt, PASSWORD_ITERATIONS);
  return [
    PASSWORD_ALGORITHM,
    String(PASSWORD_ITERATIONS),
    base64UrlEncode(salt),
    base64UrlEncode(hash)
  ].join("$");
}
async function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const [algorithm, iterationsText, saltText, hashText] = storedHash.split("$");
  if (algorithm !== PASSWORD_ALGORITHM || !iterationsText || !saltText || !hashText) {
    return false;
  }
  const iterations = Number(iterationsText);
  if (!Number.isSafeInteger(iterations) || iterations < 1e5) {
    return false;
  }
  const salt = base64UrlDecode(saltText);
  const expectedHash = base64UrlDecode(hashText);
  const actualHash = await derivePasswordKey(password, salt, iterations);
  return constantTimeEqual(actualHash, expectedHash);
}
function normalizeEmail(email) {
  return email.trim().toLowerCase();
}
function normalizeSlug(slug) {
  return slug.trim().toLowerCase();
}
function toAuthUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.platform_role === "super_admin" ? "super_admin" : "owner",
    workspaceId: row.workspace_id ?? ""
  };
}
function createD1AuthStore(deps) {
  const { db: db2 } = deps;
  return {
    async createWorkspace(input) {
      const workspace = {
        id: createId("ws"),
        name: input.name.trim(),
        slug: normalizeSlug(input.slug)
      };
      await db2.prepare("INSERT INTO workspaces (id, slug, name) VALUES (?, ?, ?)").bind(workspace.id, workspace.slug, workspace.name).run();
      return workspace;
    },
    async getWorkspaceById(workspaceId) {
      return db2.prepare("SELECT id, slug, name FROM workspaces WHERE id = ?").bind(workspaceId).first();
    },
    async createUser(input) {
      const normalizedEmail = normalizeEmail(input.email);
      const existing = await db2.prepare("SELECT id FROM users WHERE email = ?").bind(normalizedEmail).first();
      if (existing) {
        throw new Error("email_taken");
      }
      const userId = createId("usr");
      const memberId = createId("wm");
      const passwordHash = await hashPassword(input.password);
      const platformRole = input.role === "super_admin" ? "super_admin" : "user";
      const workspaceRole = input.role === "owner" ? "owner" : "viewer";
      await db2.batch([
        db2.prepare(
          "INSERT INTO users (id, email, name, role, password_hash) VALUES (?, ?, ?, ?, ?)"
        ).bind(userId, normalizedEmail, input.name.trim(), platformRole, passwordHash),
        db2.prepare(
          "INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, ?)"
        ).bind(memberId, input.workspaceId, userId, workspaceRole)
      ]);
      return {
        id: userId,
        email: normalizedEmail,
        name: input.name.trim(),
        role: input.role,
        workspaceId: input.workspaceId
      };
    },
    async createOwnerSignup(input) {
      const normalizedEmail = normalizeEmail(input.email);
      const workspaceSlug = normalizeSlug(input.workspaceSlug);
      const existingUser = await db2.prepare("SELECT id FROM users WHERE email = ?").bind(normalizedEmail).first();
      if (existingUser) {
        throw new Error("email_taken");
      }
      const existingWorkspace = await db2.prepare("SELECT id FROM workspaces WHERE slug = ?").bind(workspaceSlug).first();
      if (existingWorkspace) {
        throw new Error("workspace_slug_taken");
      }
      const workspace = {
        id: createId("ws"),
        name: input.workspaceName.trim(),
        slug: workspaceSlug
      };
      const user = {
        id: createId("usr"),
        email: normalizedEmail,
        name: input.name.trim(),
        role: "owner",
        workspaceId: workspace.id
      };
      const memberId = createId("wm");
      const passwordHash = await hashPassword(input.password);
      await db2.batch([
        db2.prepare("INSERT INTO workspaces (id, slug, name) VALUES (?, ?, ?)").bind(workspace.id, workspace.slug, workspace.name),
        db2.prepare(
          "INSERT INTO users (id, email, name, role, password_hash) VALUES (?, ?, ?, 'user', ?)"
        ).bind(user.id, user.email, user.name, passwordHash),
        db2.prepare(
          "INSERT INTO workspace_members (id, workspace_id, user_id, role) VALUES (?, ?, ?, 'owner')"
        ).bind(memberId, workspace.id, user.id)
      ]);
      return { user, workspace };
    },
    async verifyLogin(input) {
      const row = await db2.prepare(
        `SELECT
            users.id,
            users.email,
            users.name,
            users.role AS platform_role,
            users.password_hash,
            workspace_members.workspace_id,
            workspace_members.role AS workspace_role
          FROM users
          LEFT JOIN workspace_members
            ON workspace_members.user_id = users.id
            AND workspace_members.status = 'active'
          WHERE users.email = ?
          ORDER BY
            CASE workspace_members.role
              WHEN 'owner' THEN 1
              WHEN 'admin' THEN 2
              WHEN 'editor' THEN 3
              WHEN 'viewer' THEN 4
              ELSE 5
            END
          LIMIT 1`
      ).bind(normalizeEmail(input.email)).first();
      if (!row) return null;
      const validPassword = await verifyPassword(input.password, row.password_hash);
      if (!validPassword) return null;
      if (row.platform_role !== "super_admin" && !row.workspace_id) {
        return null;
      }
      await db2.prepare("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?").bind(row.id).run();
      return toAuthUser(row);
    }
  };
}
function authStore(context) {
  const db2 = context ? getD1Database(context) : null;
  if (db2) {
    return createD1AuthStore({ db: db2 });
  }
  return memoryAuthStore();
}
const meta$4 = () => [
  { title: "Sign up - Smart Page Platform" },
  { name: "robots", content: "noindex, nofollow" }
];
async function action$1({ request, context }) {
  const form = await request.formData();
  const name = String(form.get("name") ?? "");
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const workspaceName = String(form.get("workspaceName") ?? "");
  const workspaceSlug = String(form.get("workspaceSlug") ?? "");
  const fields = { name, email, workspaceName, workspaceSlug };
  if (!name || !email || !password || !workspaceName || !workspaceSlug) {
    return { ok: false, error: "Please fill all fields.", fields };
  }
  if (password.length < 10) {
    return { ok: false, error: "Use a password with at least 10 characters.", fields };
  }
  const store = authStore(context);
  try {
    const { user, workspace } = await store.createOwnerSignup({
      email,
      name,
      password,
      workspaceName,
      workspaceSlug
    });
    return createUserSession({
      request,
      context,
      userId: user.id,
      workspaceId: workspace.id,
      redirectTo: "/app"
    });
  } catch (e) {
    if (e instanceof Error && e.message === "email_taken") {
      return { ok: false, error: "That email is already in use.", fields };
    }
    if (e instanceof Error && e.message === "workspace_slug_taken") {
      return { ok: false, error: "That workspace slug is already in use.", fields };
    }
    return { ok: false, error: "Signup failed. Please try again.", fields };
  }
}
function Signup() {
  const data = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";
  return /* @__PURE__ */ jsx("div", { className: "min-h-screen px-6 py-10", children: /* @__PURE__ */ jsx("div", { className: "mx-auto max-w-md", children: /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(
      CardHeader,
      {
        title: "Create your account",
        description: "Phase 1 creates an owner user and a workspace (tenant)."
      }
    ),
    /* @__PURE__ */ jsxs(CardBody, { children: [
      /* @__PURE__ */ jsxs(Form, { method: "post", className: "space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-slate-700", children: "Name" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              name: "name",
              required: true,
              placeholder: "Hussain",
              defaultValue: (data == null ? void 0 : data.ok) === false ? data.fields.name : ""
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-slate-700", children: "Email" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              name: "email",
              type: "email",
              required: true,
              placeholder: "you@company.com",
              defaultValue: (data == null ? void 0 : data.ok) === false ? data.fields.email : ""
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-slate-700", children: "Password" }),
          /* @__PURE__ */ jsx(Input, { name: "password", type: "password", required: true })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-3 md:grid-cols-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-slate-700", children: "Workspace name" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                name: "workspaceName",
                required: true,
                placeholder: "My Salon",
                defaultValue: (data == null ? void 0 : data.ok) === false ? data.fields.workspaceName : ""
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-slate-700", children: "Workspace slug" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                name: "workspaceSlug",
                required: true,
                placeholder: "mysalon",
                defaultValue: (data == null ? void 0 : data.ok) === false ? data.fields.workspaceSlug : ""
              }
            )
          ] })
        ] }),
        (data == null ? void 0 : data.ok) === false ? /* @__PURE__ */ jsx("div", { className: "rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700", children: data.error }) : null,
        /* @__PURE__ */ jsx(Button, { type: "submit", className: "w-full", disabled: isSubmitting, children: isSubmitting ? "Creating account..." : "Sign up" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-4 text-sm text-slate-600", children: [
        "Already have an account?",
        " ",
        /* @__PURE__ */ jsx(Link, { to: "/login", className: "text-brand-700 hover:underline", children: "Log in" })
      ] })
    ] })
  ] }) }) });
}
const route17 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1,
  default: Signup,
  meta: meta$4
}, Symbol.toStringTag, { value: "Module" }));
function Logo(props) {
  const tone = props.tone ?? "light";
  return /* @__PURE__ */ jsx("div", { className: props.className, children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
    /* @__PURE__ */ jsx("div", { className: "h-8 w-8 shrink-0 rounded-lg bg-brand-600" }),
    /* @__PURE__ */ jsxs("div", { className: "leading-tight", children: [
      /* @__PURE__ */ jsx(
        "div",
        {
          className: tone === "dark" ? "text-sm font-semibold text-white" : "text-sm font-semibold text-slate-900",
          children: "Smart Page Platform"
        }
      ),
      /* @__PURE__ */ jsx("div", { className: tone === "dark" ? "text-xs text-zinc-400" : "text-xs text-slate-500", children: "Phase 1" })
    ] })
  ] }) });
}
const meta$3 = () => [
  { title: "Smart Page Platform - Link-in-Bio, Landing Pages, and Hosted HTML Sites" },
  {
    name: "description",
    content: "Create mobile landing pages, link-in-bio websites, short links, forms, analytics, templates, themes, and hosted HTML pages for creators and small businesses."
  },
  {
    name: "keywords",
    content: "link in bio builder, landing page builder, smart page platform, short link page, hosted HTML website, WhatsApp landing page, small business landing page, creator page builder, Linktree alternative, Taplink alternative, Beacons alternative"
  },
  { name: "robots", content: "index, follow" },
  { property: "og:title", content: "Smart Page Platform - Build a polished public page for your business" },
  {
    property: "og:description",
    content: "A Cloudflare-powered page builder for creators, shops, restaurants, salons, freelancers, and anyone who needs a public page with links, forms, analytics, templates, and HTML support."
  },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary_large_image" }
];
const featureGroups = [
  {
    eyebrow: "Page builder",
    title: "Build pages that feel finished, not temporary.",
    items: [
      "Profile and avatar blocks",
      "Link buttons and WhatsApp buttons",
      "FAQ, price list, map, contact card, gallery, divider, announcement, and timer blocks",
      "Full HTML embed support for custom mini-sites"
    ]
  },
  {
    eyebrow: "Business tools",
    title: "Give owners simple controls without making the dashboard heavy.",
    items: [
      "Owner dashboard with page stats",
      "Views, clicks, top pages, and top clicked blocks",
      "Lead/contact form storage",
      "Publish, unpublish, short links, and indexing controls"
    ]
  },
  {
    eyebrow: "SEO foundation",
    title: "Public pages are prepared for search and sharing.",
    items: [
      "Sitemap and robots.txt support",
      "Canonical public URLs",
      "SEO title and description controls",
      "Open Graph and Twitter metadata from page content"
    ]
  }
];
const demoPages = [
  {
    title: "Creator demo",
    href: "/p/demo-creator",
    description: "Profile, social links, gallery, media kit, FAQ, and collaboration form.",
    accent: "bg-[#f8e8ef]"
  },
  {
    title: "Restaurant demo",
    href: "/p/demo-restaurant",
    description: "Menu highlights, WhatsApp ordering, map, offers, gallery, and FAQ.",
    accent: "bg-[#fbecd8]"
  },
  {
    title: "Salon demo",
    href: "/p/demo-salon",
    description: "Booking CTA, service prices, beauty gallery, contact card, and client FAQ.",
    accent: "bg-[#f6e8eb]"
  }
];
const templates = [
  "Creator / Personal Brand",
  "Restaurant / Food",
  "Clothing Store",
  "Salon / Beauty",
  "Driver / Transport Service",
  "Freelancer / Services",
  "Event / Booking Page"
];
const comparison = [
  ["One public URL", "Share a page that contains links, offers, forms, contact, and custom sections."],
  ["No-code first", "Owners can create and publish without touching code."],
  ["Code when needed", "Advanced users can paste hosted HTML for a more custom website style."],
  ["Cloudflare-friendly", "D1-backed storage, Workers deployment, and fast public rendering."],
  ["Privacy-conscious analytics", "Simple performance data without storing raw IP addresses."],
  ["Multi-tenant ready", "Owner and super admin dashboards are separated and role-protected."]
];
function Index() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Smart Page Platform",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://smart.getvendora.net/",
    description: "A Cloudflare-powered link-in-bio, landing page, short link, and hosted HTML page builder for creators and small businesses.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD"
    }
  };
  return /* @__PURE__ */ jsxs("main", { className: "min-h-screen bg-[#f6f4ee] text-[#1e2420]", children: [
    /* @__PURE__ */ jsx("script", { type: "application/ld+json", dangerouslySetInnerHTML: { __html: JSON.stringify(structuredData) } }),
    /* @__PURE__ */ jsxs("section", { className: "relative overflow-hidden px-4 pb-16 pt-4 sm:px-6 lg:px-8", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(92,120,82,0.16),transparent_32%),radial-gradient(circle_at_92%_18%,rgba(206,154,102,0.16),transparent_30%),linear-gradient(180deg,#fbfaf6_0%,#f1ede4_100%)]" }),
      /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-7xl", children: [
        /* @__PURE__ */ jsxs("header", { className: "flex items-center justify-between rounded-3xl border border-[#d8d1c2] bg-white/75 px-4 py-3 shadow-sm backdrop-blur animate-[sppFadeDown_0.65s_ease-out_both]", children: [
          /* @__PURE__ */ jsx(Logo, {}),
          /* @__PURE__ */ jsxs("nav", { className: "hidden items-center gap-7 text-sm font-semibold text-[#596157] md:flex", "aria-label": "Homepage navigation", children: [
            /* @__PURE__ */ jsx("a", { href: "#features", className: "transition hover:text-[#1e2420]", children: "Features" }),
            /* @__PURE__ */ jsx("a", { href: "#demos", className: "transition hover:text-[#1e2420]", children: "Demos" }),
            /* @__PURE__ */ jsx("a", { href: "#templates", className: "transition hover:text-[#1e2420]", children: "Templates" }),
            /* @__PURE__ */ jsx("a", { href: "#seo", className: "transition hover:text-[#1e2420]", children: "SEO" }),
            /* @__PURE__ */ jsx("a", { href: "#workflow", className: "transition hover:text-[#1e2420]", children: "How it works" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(Link, { to: "/login", className: buttonClassName({ variant: "ghost", className: "rounded-full px-4" }), children: "Log in" }),
            /* @__PURE__ */ jsx(Link, { to: "/signup", className: buttonClassName({ className: "rounded-full bg-[#26352b] px-5 hover:bg-[#1c281f]" }), children: "Start free" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid min-h-[calc(100svh-96px)] items-center gap-10 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-12", children: [
          /* @__PURE__ */ jsxs("div", { className: "max-w-2xl animate-[sppRise_0.8s_ease-out_0.08s_both]", children: [
            /* @__PURE__ */ jsx("p", { className: "inline-flex rounded-full border border-[#d8d1c2] bg-white/70 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#6b705f]", children: "Link-in-bio, landing pages, hosted HTML" }),
            /* @__PURE__ */ jsx("h1", { className: "mt-5 text-[2.65rem] font-semibold leading-[1.03] tracking-[-0.055em] text-[#1c211d] sm:text-5xl lg:text-[4.35rem]", children: "A polished public page for every business link." }),
            /* @__PURE__ */ jsx("p", { className: "mt-5 max-w-xl text-base leading-8 text-[#5d635b] sm:text-lg", children: "Smart Page Platform helps owners launch mobile pages with templates, useful content blocks, short links, analytics, SEO controls, and safe custom HTML when a simple page needs to become a mini-site." }),
            /* @__PURE__ */ jsxs("div", { className: "mt-7 flex flex-col gap-3 sm:flex-row", children: [
              /* @__PURE__ */ jsx(Link, { to: "/signup", className: buttonClassName({ className: "h-11 rounded-full bg-[#26352b] px-6 text-sm hover:bg-[#1c281f]" }), children: "Create your first page" }),
              /* @__PURE__ */ jsx(Link, { to: "/p/demo-creator", className: buttonClassName({ variant: "ghost", className: "h-11 rounded-full border border-[#d8d1c2] bg-white/70 px-6 text-sm" }), children: "See creator demo" })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "mt-8 grid max-w-xl grid-cols-3 gap-3 text-sm", children: [
              ["20+", "content blocks"],
              ["7", "starter templates"],
              ["D1", "persistent backend"]
            ].map(([value, label]) => /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-[#d8d1c2] bg-white/60 p-4", children: [
              /* @__PURE__ */ jsx("div", { className: "text-2xl font-semibold tracking-[-0.03em]", children: value }),
              /* @__PURE__ */ jsx("div", { className: "mt-1 text-xs font-medium uppercase tracking-[0.12em] text-[#777d72]", children: label })
            ] }, label)) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "relative mx-auto w-full max-w-3xl animate-[sppFloatIn_0.85s_ease-out_0.16s_both]", children: [
            /* @__PURE__ */ jsxs("div", { className: "absolute -left-3 top-10 hidden rounded-2xl border border-[#d8d1c2] bg-white px-4 py-3 text-sm shadow-xl lg:block animate-[sppBob_6s_ease-in-out_infinite]", children: [
              /* @__PURE__ */ jsx("div", { className: "text-xs uppercase tracking-[0.16em] text-[#7a8276]", children: "Analytics" }),
              /* @__PURE__ */ jsx("div", { className: "mt-1 text-xl font-semibold", children: "+428 views" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "absolute -right-3 bottom-10 hidden rounded-2xl bg-[#26352b] px-4 py-3 text-sm text-white shadow-xl lg:block animate-[sppBob_7s_ease-in-out_0.8s_infinite]", children: [
              /* @__PURE__ */ jsx("div", { className: "text-xs uppercase tracking-[0.16em] text-white/55", children: "Top action" }),
              /* @__PURE__ */ jsx("div", { className: "mt-1 font-semibold", children: "WhatsApp click" })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "rounded-[2rem] border border-[#d8d1c2] bg-white p-3 shadow-[0_28px_80px_rgba(47,55,48,0.16)] sm:p-4", children: /* @__PURE__ */ jsx("div", { className: "rounded-[1.5rem] bg-[#f9f7f1] p-4 sm:p-5", children: /* @__PURE__ */ jsxs("div", { className: "grid gap-4 lg:grid-cols-[0.78fr_1.22fr]", children: [
              /* @__PURE__ */ jsxs("div", { className: "rounded-[1.25rem] bg-[#26352b] p-4 text-white", children: [
                /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
                  /* @__PURE__ */ jsx("span", { className: "text-xs font-semibold uppercase tracking-[0.18em] text-white/55", children: "Owner preview" }),
                  /* @__PURE__ */ jsx("span", { className: "rounded-full bg-white/10 px-2.5 py-1 text-xs", children: "Published" })
                ] }),
                /* @__PURE__ */ jsx("div", { className: "mt-9 h-16 w-16 rounded-2xl bg-gradient-to-br from-[#d6a15f] to-[#f2d5a2]" }),
                /* @__PURE__ */ jsx("h2", { className: "mt-5 text-2xl font-semibold tracking-[-0.04em]", children: "Aisha Studio" }),
                /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm leading-6 text-white/68", children: "Offers, booking links, prices, location, and WhatsApp in one elegant page." }),
                /* @__PURE__ */ jsxs("div", { className: "mt-6 space-y-2", children: [
                  /* @__PURE__ */ jsx("div", { className: "rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-[#26352b]", children: "Book on WhatsApp" }),
                  /* @__PURE__ */ jsx("div", { className: "rounded-xl bg-white/12 px-4 py-3 text-center text-sm font-semibold", children: "View services" }),
                  /* @__PURE__ */ jsx("div", { className: "rounded-xl bg-white/12 px-4 py-3 text-center text-sm font-semibold", children: "Instagram gallery" })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
                /* @__PURE__ */ jsxs("div", { className: "rounded-[1.25rem] border border-[#ded8ca] bg-white p-4", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3 border-b border-[#ece7dc] pb-3", children: [
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("div", { className: "text-sm font-semibold", children: "Builder dashboard" }),
                      /* @__PURE__ */ jsx("div", { className: "text-xs text-[#777d72]", children: "Edit, publish, and track one page." })
                    ] }),
                    /* @__PURE__ */ jsx("div", { className: "rounded-full bg-[#e8efe5] px-3 py-1 text-xs font-semibold text-[#3a5c3c]", children: "Live" })
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "mt-4 grid grid-cols-3 gap-3 text-center", children: [
                    ["8.4k", "views"],
                    ["1.9k", "clicks"],
                    ["12", "leads"]
                  ].map(([value, label]) => /* @__PURE__ */ jsxs("div", { className: "rounded-xl bg-[#f6f4ee] p-3", children: [
                    /* @__PURE__ */ jsx("div", { className: "font-semibold", children: value }),
                    /* @__PURE__ */ jsx("div", { className: "mt-1 text-[11px] uppercase tracking-[0.12em] text-[#777d72]", children: label })
                  ] }, label)) })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
                  /* @__PURE__ */ jsxs("div", { className: "rounded-[1.25rem] border border-[#ded8ca] bg-white p-4", children: [
                    /* @__PURE__ */ jsx("div", { className: "text-xs font-bold uppercase tracking-[0.15em] text-[#8a715b]", children: "Blocks" }),
                    /* @__PURE__ */ jsx("div", { className: "mt-3 flex flex-wrap gap-2 text-xs font-medium text-[#4f574d]", children: ["FAQ", "Gallery", "Map", "Form", "HTML", "Links"].map((tag) => /* @__PURE__ */ jsx("span", { className: "rounded-full bg-[#f1ede4] px-3 py-1", children: tag }, tag)) })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "rounded-[1.25rem] border border-[#ded8ca] bg-white p-4", children: [
                    /* @__PURE__ */ jsx("div", { className: "text-xs font-bold uppercase tracking-[0.15em] text-[#8a715b]", children: "SEO" }),
                    /* @__PURE__ */ jsxs("div", { className: "mt-3 space-y-2 text-sm text-[#4f574d]", children: [
                      /* @__PURE__ */ jsx("div", { className: "h-2 w-full rounded bg-[#e8efe5]" }),
                      /* @__PURE__ */ jsx("div", { className: "h-2 w-4/5 rounded bg-[#e8efe5]" }),
                      /* @__PURE__ */ jsx("div", { className: "text-xs text-[#777d72]", children: "Sitemap + metadata ready" })
                    ] })
                  ] })
                ] })
              ] })
            ] }) }) })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("section", { id: "features", className: "border-y border-[#ddd6c8] bg-white px-4 py-16 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsx("div", { className: "mx-auto max-w-7xl", children: /* @__PURE__ */ jsxs("div", { className: "grid gap-10 lg:grid-cols-[0.75fr_1.25fr]", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs font-bold uppercase tracking-[0.22em] text-[#7c654e]", children: "Features" }),
        /* @__PURE__ */ jsx("h2", { className: "mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#1c211d] sm:text-4xl", children: "Everything needed for a useful public page." }),
        /* @__PURE__ */ jsx("p", { className: "mt-4 leading-7 text-[#636961]", children: "The homepage should rank because it explains the product clearly: what it does, who it helps, and why a business would use it instead of a basic link list." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid gap-4 md:grid-cols-3", children: featureGroups.map((group) => /* @__PURE__ */ jsxs("article", { className: "rounded-3xl border border-[#ddd6c8] bg-[#fbfaf6] p-5 transition hover:-translate-y-1 hover:shadow-xl", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs font-bold uppercase tracking-[0.18em] text-[#7c654e]", children: group.eyebrow }),
        /* @__PURE__ */ jsx("h3", { className: "mt-3 text-xl font-semibold tracking-[-0.03em]", children: group.title }),
        /* @__PURE__ */ jsx("ul", { className: "mt-5 space-y-3 text-sm leading-6 text-[#5d635b]", children: group.items.map((item) => /* @__PURE__ */ jsxs("li", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsx("span", { className: "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6f8b68]" }),
          /* @__PURE__ */ jsx("span", { children: item })
        ] }, item)) })
      ] }, group.title)) })
    ] }) }) }),
    /* @__PURE__ */ jsx("section", { id: "demos", className: "bg-white px-4 py-16 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-7xl", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col justify-between gap-6 md:flex-row md:items-end", children: [
        /* @__PURE__ */ jsxs("div", { className: "max-w-2xl", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-bold uppercase tracking-[0.22em] text-[#7c654e]", children: "Live demos" }),
          /* @__PURE__ */ jsx("h2", { className: "mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl", children: "Preview real page types before creating your own." }),
          /* @__PURE__ */ jsx("p", { className: "mt-4 leading-7 text-[#636961]", children: "These demos are separate from test pages. They are designed to show visitors how a finished Smart Page can look for different business types." })
        ] }),
        /* @__PURE__ */ jsx(Link, { to: "/signup", className: buttonClassName({ variant: "ghost", className: "w-fit rounded-full border border-[#d8d1c2] bg-white px-5" }), children: "Build your version" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-8 grid gap-4 md:grid-cols-3", children: demoPages.map((demo) => /* @__PURE__ */ jsxs(Link, { to: demo.href, className: "group rounded-3xl border border-[#ddd6c8] bg-[#fbfaf6] p-4 transition hover:-translate-y-1 hover:shadow-xl", children: [
        /* @__PURE__ */ jsxs("div", { className: `h-36 rounded-2xl ${demo.accent} p-4`, children: [
          /* @__PURE__ */ jsx("div", { className: "h-10 w-10 rounded-xl bg-[#26352b]" }),
          /* @__PURE__ */ jsx("div", { className: "mt-7 h-3 w-2/3 rounded-full bg-[#26352b]/25" }),
          /* @__PURE__ */ jsx("div", { className: "mt-3 h-3 w-1/2 rounded-full bg-[#26352b]/15" }),
          /* @__PURE__ */ jsx("div", { className: "mt-5 h-9 rounded-xl bg-white/80 shadow-sm" })
        ] }),
        /* @__PURE__ */ jsx("h3", { className: "mt-5 text-xl font-semibold tracking-[-0.03em] text-[#1c211d]", children: demo.title }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm leading-6 text-[#636961]", children: demo.description }),
        /* @__PURE__ */ jsx("span", { className: "mt-4 inline-flex text-sm font-semibold text-[#3d5b42] group-hover:underline", children: "Open demo page" })
      ] }, demo.href)) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { id: "templates", className: "bg-[#f6f4ee] px-4 py-16 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-7xl", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col justify-between gap-6 md:flex-row md:items-end", children: [
        /* @__PURE__ */ jsxs("div", { className: "max-w-2xl", children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-bold uppercase tracking-[0.22em] text-[#7c654e]", children: "Templates" }),
          /* @__PURE__ */ jsx("h2", { className: "mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl", children: "Start with a business type, then customize everything." })
        ] }),
        /* @__PURE__ */ jsx(Link, { to: "/signup", className: buttonClassName({ variant: "ghost", className: "w-fit rounded-full border border-[#d8d1c2] bg-white px-5" }), children: "Try templates" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4", children: templates.map((template) => /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-[#d8d1c2] bg-white p-5 text-sm font-semibold text-[#28302a] transition hover:-translate-y-1 hover:shadow-lg", children: template }, template)) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { id: "workflow", className: "bg-[#26352b] px-4 py-16 text-white sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr]", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs font-bold uppercase tracking-[0.22em] text-white/45", children: "How it works" }),
        /* @__PURE__ */ jsx("h2", { className: "mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl", children: "Create, publish, measure, improve." }),
        /* @__PURE__ */ jsx("p", { className: "mt-4 leading-7 text-white/65", children: "Owners do not need to understand hosting, analytics scripts, or database setup. They create the page, publish it, and share one clean short link." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid gap-3 md:grid-cols-2", children: [
        ["1", "Create a workspace and page"],
        ["2", "Choose a template and theme"],
        ["3", "Add blocks, forms, links, or HTML"],
        ["4", "Publish and watch analytics"]
      ].map(([number, label]) => /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-white/12 bg-white/7 p-5", children: [
        /* @__PURE__ */ jsx("div", { className: "flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-[#26352b]", children: number }),
        /* @__PURE__ */ jsx("div", { className: "mt-5 text-lg font-semibold", children: label })
      ] }, number)) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { id: "seo", className: "bg-white px-4 py-16 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-7xl", children: [
      /* @__PURE__ */ jsxs("div", { className: "max-w-3xl", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs font-bold uppercase tracking-[0.22em] text-[#7c654e]", children: "SEO and indexing" }),
        /* @__PURE__ */ jsx("h2", { className: "mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl", children: "Made for Google to understand the product and the public pages." }),
        /* @__PURE__ */ jsx("p", { className: "mt-4 leading-7 text-[#636961]", children: "The platform exposes a real homepage, robots.txt, sitemap.xml, indexable published pages, canonical URLs, and page-level SEO metadata. Private dashboards remain blocked from search." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3", children: comparison.map(([title, copy]) => /* @__PURE__ */ jsxs("article", { className: "rounded-3xl border border-[#ddd6c8] bg-[#fbfaf6] p-5", children: [
        /* @__PURE__ */ jsx("h3", { className: "font-semibold", children: title }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm leading-6 text-[#636961]", children: copy })
      ] }, title)) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { className: "bg-[#f6f4ee] px-4 py-16 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-4xl rounded-[2rem] border border-[#d8d1c2] bg-white p-8 text-center shadow-sm sm:p-10", children: [
      /* @__PURE__ */ jsx("p", { className: "text-xs font-bold uppercase tracking-[0.22em] text-[#7c654e]", children: "Start free" }),
      /* @__PURE__ */ jsx("h2", { className: "mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl", children: "Launch a page today, then improve it as your business grows." }),
      /* @__PURE__ */ jsx("p", { className: "mx-auto mt-4 max-w-2xl leading-7 text-[#636961]", children: "Use Smart Page for your bio link, service menu, WhatsApp contact page, local business page, product links, or hosted HTML mini-site." }),
      /* @__PURE__ */ jsxs("div", { className: "mt-7 flex flex-col justify-center gap-3 sm:flex-row", children: [
        /* @__PURE__ */ jsx(Link, { to: "/signup", className: buttonClassName({ className: "h-11 rounded-full bg-[#26352b] px-7 hover:bg-[#1c281f]" }), children: "Sign up free" }),
        /* @__PURE__ */ jsx(Link, { to: "/login", className: buttonClassName({ variant: "ghost", className: "h-11 rounded-full border border-[#d8d1c2] bg-white px-7" }), children: "Log in" })
      ] })
    ] }) })
  ] });
}
const route18 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Index,
  meta: meta$3
}, Symbol.toStringTag, { value: "Module" }));
const TAPLINK_EDITOR_PATH = /^\/app\/pages\/[^/]+\/edit\/?$/;
function AppShell(props) {
  const location = useLocation();
  const taplinkEditorLayout = props.mode === "owner" && TAPLINK_EDITOR_PATH.test(location.pathname);
  if (taplinkEditorLayout) {
    return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-[#090b10] text-zinc-100", children: [
      /* @__PURE__ */ jsx("header", { className: "sticky top-0 z-40 border-b border-zinc-800/95 bg-[#0c0f16]/92 backdrop-blur-md", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex min-w-0 flex-1 items-center gap-4 sm:gap-8", children: [
          /* @__PURE__ */ jsx(Link, { to: "/app/pages", className: "min-w-0 shrink-0", children: /* @__PURE__ */ jsx(Logo, { tone: "dark" }) }),
          /* @__PURE__ */ jsx(
            Link,
            {
              to: "/app/pages",
              className: "truncate text-sm font-medium text-zinc-400 transition hover:text-white",
              children: "← Pages"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex shrink-0 items-center gap-3", children: [
          props.userEmail ? /* @__PURE__ */ jsx("span", { className: "hidden max-w-[160px] truncate text-xs text-zinc-500 sm:inline", children: props.userEmail }) : null,
          /* @__PURE__ */ jsx("form", { action: "/logout", method: "post", children: /* @__PURE__ */ jsx(
            "button",
            {
              type: "submit",
              className: "rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800 hover:text-white",
              children: "Log out"
            }
          ) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx("main", { className: "mx-auto max-w-7xl px-4 pb-36 pt-5 sm:px-6 lg:pb-12", children: /* @__PURE__ */ jsx(Outlet, {}) })
    ] });
  }
  const nav = props.mode === "super_admin" ? [
    { to: "/admin", label: "Overview" },
    { to: "/admin/tenants", label: "Tenants" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/pages", label: "Pages" },
    { to: "/admin/settings", label: "Platform settings" }
  ] : [
    { to: "/app", label: "Dashboard" },
    { to: "/app/pages", label: "Pages" },
    { to: "/app/analytics", label: "Analytics" },
    { to: "/app/leads", label: "Leads" },
    { to: "/app/settings", label: "Settings" }
  ];
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen", children: [
    /* @__PURE__ */ jsx("div", { className: "border-b border-slate-200 bg-white", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto flex max-w-6xl items-center justify-between px-6 py-4", children: [
      /* @__PURE__ */ jsx(Link, { to: props.mode === "super_admin" ? "/admin" : "/app", children: /* @__PURE__ */ jsx(Logo, {}) }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-sm text-slate-600", children: [
        props.mode === "super_admin" ? /* @__PURE__ */ jsx("span", { className: "rounded-full bg-slate-900 px-2 py-1 text-xs font-medium text-white", children: "Super Admin" }) : /* @__PURE__ */ jsx("span", { className: "rounded-full bg-brand-600 px-2 py-1 text-xs font-medium text-white", children: "Owner" }),
        props.userEmail ? /* @__PURE__ */ jsx("span", { children: props.userEmail }) : null,
        /* @__PURE__ */ jsx("form", { action: "/logout", method: "post", children: /* @__PURE__ */ jsx("button", { className: "rounded-md px-2 py-1 text-sm text-slate-900 hover:bg-slate-100", children: "Logout" }) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "mx-auto grid max-w-6xl grid-cols-12 gap-6 px-6 py-6", children: [
      /* @__PURE__ */ jsx("aside", { className: "col-span-12 md:col-span-3", children: /* @__PURE__ */ jsx("nav", { className: "space-y-1 rounded-xl border border-slate-200 bg-white p-2", children: nav.map((item) => /* @__PURE__ */ jsx(
        NavLink,
        {
          to: item.to,
          end: item.to === "/app" || item.to === "/admin",
          className: ({ isActive }) => cn(
            "block rounded-lg px-3 py-2 text-sm font-medium",
            isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
          ),
          children: item.label
        },
        item.to
      )) }) }),
      /* @__PURE__ */ jsx("main", { className: "col-span-12 md:col-span-9", children: /* @__PURE__ */ jsx(Outlet, {}) })
    ] })
  ] });
}
const meta$2 = () => [{ name: "robots", content: "noindex, nofollow" }];
async function loader$1({ request, context }) {
  await requireUserRole(request, context);
  return {};
}
function AdminLayout() {
  return /* @__PURE__ */ jsx(AppShell, { mode: "super_admin" });
}
const route19 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AdminLayout,
  loader: loader$1,
  meta: meta$2
}, Symbol.toStringTag, { value: "Module" }));
const meta$1 = () => [
  { title: "Login - Smart Page Platform" },
  { name: "robots", content: "noindex, nofollow" }
];
async function action({ request, context }) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!email || !password) {
    return { ok: false, error: "Enter your email and password.", fields: { email } };
  }
  const store = authStore(context);
  const user = await store.verifyLogin({ email, password });
  if (!user) {
    return { ok: false, error: "Invalid email or password.", fields: { email } };
  }
  const redirectTo = user.role === "super_admin" ? "/admin" : "/app";
  return createUserSession({
    request,
    context,
    userId: user.id,
    workspaceId: user.role === "super_admin" ? null : user.workspaceId,
    redirectTo
  });
}
function Login() {
  var _a;
  const data = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";
  return /* @__PURE__ */ jsx("div", { className: "min-h-screen px-6 py-10", children: /* @__PURE__ */ jsx("div", { className: "mx-auto max-w-md", children: /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsx(CardHeader, { title: "Log in", description: "Access your workspace dashboard." }),
    /* @__PURE__ */ jsxs(CardBody, { children: [
      /* @__PURE__ */ jsxs(Form, { method: "post", className: "space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-slate-700", children: "Email" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              name: "email",
              type: "email",
              required: true,
              placeholder: "you@company.com",
              defaultValue: (data == null ? void 0 : data.ok) === false ? (_a = data.fields) == null ? void 0 : _a.email : ""
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("label", { className: "text-sm font-medium text-slate-700", children: "Password" }),
          /* @__PURE__ */ jsx(Input, { name: "password", type: "password", required: true })
        ] }),
        (data == null ? void 0 : data.ok) === false ? /* @__PURE__ */ jsx("div", { className: "rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700", children: data.error }) : null,
        /* @__PURE__ */ jsx(Button, { type: "submit", className: "w-full", disabled: isSubmitting, children: isSubmitting ? "Logging in..." : "Log in" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-4 text-sm text-slate-600", children: [
        "No account?",
        " ",
        /* @__PURE__ */ jsx(Link, { to: "/signup", className: "text-brand-700 hover:underline", children: "Sign up" })
      ] })
    ] })
  ] }) }) });
}
const route20 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action,
  default: Login,
  meta: meta$1
}, Symbol.toStringTag, { value: "Module" }));
const meta = () => [{ name: "robots", content: "noindex, nofollow" }];
async function loader({ request, context }) {
  await requireUserId(request, context);
  return {};
}
function AppLayout() {
  return /* @__PURE__ */ jsx(AppShell, { mode: "owner" });
}
const route21 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: AppLayout,
  loader,
  meta
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-I0k47a5u.js", "imports": ["/assets/jsx-runtime-56DGgGmo.js", "/assets/components-BMLruC94.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/root-uAWnuaXf.js", "imports": ["/assets/jsx-runtime-56DGgGmo.js", "/assets/components-BMLruC94.js"], "css": [] }, "routes/app.pages_.$pageId.edit": { "id": "routes/app.pages_.$pageId.edit", "parentId": "routes/app", "path": "pages/:pageId/edit", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.pages_._pageId.edit-UE96z4aP.js", "imports": ["/assets/jsx-runtime-56DGgGmo.js", "/assets/Input-W0j2-8O_.js", "/assets/cn-DOIGBiOF.js", "/assets/render-BQPwR-g_.js", "/assets/components-BMLruC94.js", "/assets/Card-BksuJrdv.js", "/assets/Button-CDRzngdo.js"], "css": [] }, "routes/admin.settings": { "id": "routes/admin.settings", "parentId": "routes/admin", "path": "settings", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/admin.settings-B-mU-xVD.js", "imports": ["/assets/jsx-runtime-56DGgGmo.js", "/assets/Card-BksuJrdv.js", "/assets/cn-DOIGBiOF.js"], "css": [] }, "routes/admin.tenants": { "id": "routes/admin.tenants", "parentId": "routes/admin", "path": "tenants", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/admin.tenants-T9c_HT_i.js", "imports": ["/assets/jsx-runtime-56DGgGmo.js", "/assets/Card-BksuJrdv.js", "/assets/Input-W0j2-8O_.js", "/assets/components-BMLruC94.js", "/assets/cn-DOIGBiOF.js"], "css": [] }, "routes/app.analytics": { "id": "routes/app.analytics", "parentId": "routes/app", "path": "analytics", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.analytics-D4xj6uX0.js", "imports": ["/assets/jsx-runtime-56DGgGmo.js", "/assets/Card-BksuJrdv.js", "/assets/components-BMLruC94.js", "/assets/cn-DOIGBiOF.js"], "css": [] }, "routes/sitemap[.]xml": { "id": "routes/sitemap[.]xml", "parentId": "root", "path": "sitemap.xml", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/sitemap_._xml-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/admin._index": { "id": "routes/admin._index", "parentId": "routes/admin", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/admin._index-DSvD_NC0.js", "imports": ["/assets/jsx-runtime-56DGgGmo.js", "/assets/Card-BksuJrdv.js", "/assets/components-BMLruC94.js", "/assets/cn-DOIGBiOF.js"], "css": [] }, "routes/app.settings": { "id": "routes/app.settings", "parentId": "routes/app", "path": "settings", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.settings-BO61jI7X.js", "imports": ["/assets/jsx-runtime-56DGgGmo.js", "/assets/Button-CDRzngdo.js", "/assets/Card-BksuJrdv.js", "/assets/Input-W0j2-8O_.js", "/assets/components-BMLruC94.js", "/assets/cn-DOIGBiOF.js"], "css": [] }, "routes/robots[.]txt": { "id": "routes/robots[.]txt", "parentId": "root", "path": "robots.txt", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/robots_._txt-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/admin.pages": { "id": "routes/admin.pages", "parentId": "routes/admin", "path": "pages", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/admin.pages-9F9cOUW-.js", "imports": ["/assets/jsx-runtime-56DGgGmo.js", "/assets/Button-CDRzngdo.js", "/assets/Card-BksuJrdv.js", "/assets/Input-W0j2-8O_.js", "/assets/components-BMLruC94.js", "/assets/cn-DOIGBiOF.js"], "css": [] }, "routes/admin.users": { "id": "routes/admin.users", "parentId": "routes/admin", "path": "users", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/admin.users-C4Ert00r.js", "imports": ["/assets/jsx-runtime-56DGgGmo.js", "/assets/Card-BksuJrdv.js", "/assets/Input-W0j2-8O_.js", "/assets/components-BMLruC94.js", "/assets/cn-DOIGBiOF.js"], "css": [] }, "routes/app._index": { "id": "routes/app._index", "parentId": "routes/app", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app._index-nC9ZRUjt.js", "imports": ["/assets/jsx-runtime-56DGgGmo.js", "/assets/Card-BksuJrdv.js", "/assets/Button-CDRzngdo.js", "/assets/components-BMLruC94.js", "/assets/cn-DOIGBiOF.js"], "css": [] }, "routes/app.leads": { "id": "routes/app.leads", "parentId": "routes/app", "path": "leads", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.leads-BVsXnVmC.js", "imports": ["/assets/jsx-runtime-56DGgGmo.js", "/assets/Card-BksuJrdv.js", "/assets/components-BMLruC94.js", "/assets/cn-DOIGBiOF.js"], "css": [] }, "routes/app.pages": { "id": "routes/app.pages", "parentId": "routes/app", "path": "pages", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app.pages-DP96vXwr.js", "imports": ["/assets/jsx-runtime-56DGgGmo.js", "/assets/Button-CDRzngdo.js", "/assets/Card-BksuJrdv.js", "/assets/Input-W0j2-8O_.js", "/assets/cn-DOIGBiOF.js", "/assets/components-BMLruC94.js"], "css": [] }, "routes/healthz": { "id": "routes/healthz", "parentId": "root", "path": "healthz", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/healthz-l0sNRNKZ.js", "imports": [], "css": [] }, "routes/p.$code": { "id": "routes/p.$code", "parentId": "root", "path": "p/:code", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/p._code-WBUfaavX.js", "imports": ["/assets/jsx-runtime-56DGgGmo.js", "/assets/render-BQPwR-g_.js", "/assets/components-BMLruC94.js"], "css": [] }, "routes/logout": { "id": "routes/logout", "parentId": "root", "path": "logout", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/logout-CSxRPO1x.js", "imports": [], "css": [] }, "routes/signup": { "id": "routes/signup", "parentId": "root", "path": "signup", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/signup-CX8JDCRC.js", "imports": ["/assets/jsx-runtime-56DGgGmo.js", "/assets/Button-CDRzngdo.js", "/assets/Card-BksuJrdv.js", "/assets/Input-W0j2-8O_.js", "/assets/components-BMLruC94.js", "/assets/cn-DOIGBiOF.js"], "css": [] }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/_index-B1WJn1G7.js", "imports": ["/assets/jsx-runtime-56DGgGmo.js", "/assets/Logo-BCozcDfA.js", "/assets/Button-CDRzngdo.js", "/assets/components-BMLruC94.js", "/assets/cn-DOIGBiOF.js"], "css": [] }, "routes/admin": { "id": "routes/admin", "parentId": "root", "path": "admin", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/admin-DcnVZuGq.js", "imports": ["/assets/jsx-runtime-56DGgGmo.js", "/assets/AppShell-Cppzia-3.js", "/assets/Logo-BCozcDfA.js", "/assets/cn-DOIGBiOF.js", "/assets/components-BMLruC94.js"], "css": [] }, "routes/login": { "id": "routes/login", "parentId": "root", "path": "login", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/login-mzcD0VXl.js", "imports": ["/assets/jsx-runtime-56DGgGmo.js", "/assets/Button-CDRzngdo.js", "/assets/Card-BksuJrdv.js", "/assets/Input-W0j2-8O_.js", "/assets/components-BMLruC94.js", "/assets/cn-DOIGBiOF.js"], "css": [] }, "routes/app": { "id": "routes/app", "parentId": "root", "path": "app", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/app-C8s-37-Z.js", "imports": ["/assets/jsx-runtime-56DGgGmo.js", "/assets/AppShell-Cppzia-3.js", "/assets/Logo-BCozcDfA.js", "/assets/cn-DOIGBiOF.js", "/assets/components-BMLruC94.js"], "css": [] } }, "url": "/assets/manifest-b4093e46.js", "version": "b4093e46" };
const mode = "production";
const assetsBuildDirectory = "build\\client";
const basename = "/";
const future = { "v3_fetcherPersist": true, "v3_relativeSplatPath": true, "v3_throwAbortReason": true, "v3_routeConfig": false, "v3_singleFetch": false, "v3_lazyRouteDiscovery": false, "unstable_optimizeDeps": false };
const isSpaMode = false;
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/app.pages_.$pageId.edit": {
    id: "routes/app.pages_.$pageId.edit",
    parentId: "routes/app",
    path: "pages/:pageId/edit",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/admin.settings": {
    id: "routes/admin.settings",
    parentId: "routes/admin",
    path: "settings",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/admin.tenants": {
    id: "routes/admin.tenants",
    parentId: "routes/admin",
    path: "tenants",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/app.analytics": {
    id: "routes/app.analytics",
    parentId: "routes/app",
    path: "analytics",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/sitemap[.]xml": {
    id: "routes/sitemap[.]xml",
    parentId: "root",
    path: "sitemap.xml",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/admin._index": {
    id: "routes/admin._index",
    parentId: "routes/admin",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route6
  },
  "routes/app.settings": {
    id: "routes/app.settings",
    parentId: "routes/app",
    path: "settings",
    index: void 0,
    caseSensitive: void 0,
    module: route7
  },
  "routes/robots[.]txt": {
    id: "routes/robots[.]txt",
    parentId: "root",
    path: "robots.txt",
    index: void 0,
    caseSensitive: void 0,
    module: route8
  },
  "routes/admin.pages": {
    id: "routes/admin.pages",
    parentId: "routes/admin",
    path: "pages",
    index: void 0,
    caseSensitive: void 0,
    module: route9
  },
  "routes/admin.users": {
    id: "routes/admin.users",
    parentId: "routes/admin",
    path: "users",
    index: void 0,
    caseSensitive: void 0,
    module: route10
  },
  "routes/app._index": {
    id: "routes/app._index",
    parentId: "routes/app",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route11
  },
  "routes/app.leads": {
    id: "routes/app.leads",
    parentId: "routes/app",
    path: "leads",
    index: void 0,
    caseSensitive: void 0,
    module: route12
  },
  "routes/app.pages": {
    id: "routes/app.pages",
    parentId: "routes/app",
    path: "pages",
    index: void 0,
    caseSensitive: void 0,
    module: route13
  },
  "routes/healthz": {
    id: "routes/healthz",
    parentId: "root",
    path: "healthz",
    index: void 0,
    caseSensitive: void 0,
    module: route14
  },
  "routes/p.$code": {
    id: "routes/p.$code",
    parentId: "root",
    path: "p/:code",
    index: void 0,
    caseSensitive: void 0,
    module: route15
  },
  "routes/logout": {
    id: "routes/logout",
    parentId: "root",
    path: "logout",
    index: void 0,
    caseSensitive: void 0,
    module: route16
  },
  "routes/signup": {
    id: "routes/signup",
    parentId: "root",
    path: "signup",
    index: void 0,
    caseSensitive: void 0,
    module: route17
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route18
  },
  "routes/admin": {
    id: "routes/admin",
    parentId: "root",
    path: "admin",
    index: void 0,
    caseSensitive: void 0,
    module: route19
  },
  "routes/login": {
    id: "routes/login",
    parentId: "root",
    path: "login",
    index: void 0,
    caseSensitive: void 0,
    module: route20
  },
  "routes/app": {
    id: "routes/app",
    parentId: "root",
    path: "app",
    index: void 0,
    caseSensitive: void 0,
    module: route21
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  mode,
  publicPath,
  routes
};
