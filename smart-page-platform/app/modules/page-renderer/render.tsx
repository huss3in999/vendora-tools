import { Fragment, type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import type { Block } from "~/modules/page-builder/blocks";
import { HTML_EMBED_MAX_LENGTH, buildSandboxedHtmlDocument } from "~/modules/page-builder/html-sanitize";
import { pickStickyContact } from "~/modules/page-builder/public-seo";
import { DEFAULT_PAGE_THEME, type PageTheme } from "~/modules/page-builder/theme";

function trackClick(trackingCode: string | undefined, block: Block) {
  if (!trackingCode || (block.type !== "link_button" && block.type !== "whatsapp_button")) {
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
    // Analytics should never block navigation.
  });
}

function pageStyle(theme: PageTheme): CSSProperties {
  const base: CSSProperties = {
    color: theme.textColor,
    backgroundColor: theme.backgroundColor
  };

  if (theme.backgroundType === "gradient") {
    base.backgroundImage = `linear-gradient(145deg, ${theme.gradientFrom}, ${theme.gradientTo})`;
  }

  if (theme.backgroundType === "image" && theme.backgroundImageUrl) {
    base.backgroundImage = `linear-gradient(rgba(255,255,255,0.72), rgba(255,255,255,0.9)), url(${theme.backgroundImageUrl})`;
    base.backgroundSize = "cover";
    base.backgroundPosition = "center";
    base.backgroundAttachment = "fixed";
  }

  return base;
}

function fontClassName(theme: PageTheme) {
  if (theme.fontStyle === "elegant") return "font-serif";
  if (theme.fontStyle === "bold") return "font-sans font-semibold";
  if (theme.fontStyle === "minimal") return "font-mono";
  return "font-sans";
}

function layoutClassName(theme: PageTheme, stickyPad: boolean) {
  const pad = stickyPad ? "pb-28 md:pb-20" : "pb-16 md:pb-20";
  if (theme.layoutStyle === "full_width_mobile") return `mx-auto w-full max-w-2xl px-4 pt-10 ${pad} sm:px-7 sm:pt-14`;
  if (theme.layoutStyle === "card_based") return `mx-auto w-full max-w-xl px-5 ${pad} pt-10 sm:px-8 sm:pt-14`;
  return `mx-auto w-full max-w-xl px-5 ${pad} pt-10 sm:px-8 sm:pt-14`;
}

function buttonRadius(theme: PageTheme) {
  if (theme.buttonStyle === "pill") return "999px";
  if (theme.buttonStyle === "square") return "6px";
  return "18px";
}

function buttonStyle(theme: PageTheme, variant: "primary" | "whatsapp" = "primary"): CSSProperties {
  const color = variant === "whatsapp" ? "#10b981" : theme.buttonColor;
  return {
    color: theme.buttonStyle === "outline" ? color : "#ffffff",
    background: theme.buttonStyle === "outline" ? "transparent" : color,
    border: `1px solid ${color}`,
    borderRadius: buttonRadius(theme),
    boxShadow: theme.buttonStyle === "shadow" ? "0 18px 35px rgba(15, 23, 42, 0.18)" : "none"
  };
}

function cardStyle(theme: PageTheme): CSSProperties {
  return {
    backgroundColor: theme.cardColor,
    color: theme.textColor,
    borderColor: "rgba(148, 163, 184, 0.28)"
  };
}

function cardClassName(extra = "") {
  return `rounded-[1.35rem] border border-black/[0.06] p-5 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.35)] backdrop-blur-sm ${extra}`;
}

function htmlEmbedSandbox(allowScripts?: boolean) {
  const base = "allow-forms allow-popups allow-popups-to-escape-sandbox";
  if (!allowScripts) return base;
  return `${base} allow-scripts allow-same-origin allow-modals allow-downloads`;
}

export function isStandaloneHtmlPage(blocks: Block[]) {
  return blocks.length === 1 && blocks[0]?.type === "html_embed";
}

export function StandaloneHtmlPageFrame(props: { block: Extract<Block, { type: "html_embed" }> }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    function syncHashToFrame() {
      const hash = window.location.hash;
      if (!hash || !iframeRef.current?.contentWindow) return;
      try {
        if (iframeRef.current.contentWindow.location.hash !== hash) {
          iframeRef.current.contentWindow.location.hash = hash;
        }
      } catch {
        // Some sandbox/browser combinations may block hash forwarding.
      }
    }

    function syncHashFromFrame(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as { type?: string; hash?: unknown };
      if (data?.type !== "spp-hosted-html-hash" || typeof data.hash !== "string" || !data.hash.startsWith("#")) return;
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

  return (
    <iframe
      ref={iframeRef}
      title="Hosted HTML page"
      sandbox={htmlEmbedSandbox(props.block.props.allowScripts)}
      referrerPolicy="no-referrer"
      srcDoc={buildSandboxedHtmlDocument(props.block.props.html, HTML_EMBED_MAX_LENGTH, {
        allowScripts: props.block.props.allowScripts
      })}
      className="fixed inset-0 h-screen w-screen border-0 bg-white"
      style={{ height: "100dvh", width: "100vw" }}
    />
  );
}

function DividerView(props: { block: Extract<Block, { type: "divider" }>; theme: PageTheme }) {
  const { block: b, theme } = props;
  if (b.props.hidden) return null;

  const lineColor = theme.textColor;
  const indent = b.props.indent ?? 2;
  const pyPx = [6, 10, 14, 20, 28][indent];
  const variant = b.props.variant ?? "classic";
  const ptPx = [0, 8, 14, 20, 28][b.props.paddingTop ?? 0];
  const pbPx = [0, 8, 14, 20, 28][b.props.paddingBottom ?? 0];
  const hasSectionChrome =
    ptPx > 0 || pbPx > 0 || Boolean(b.props.sectionBackground && b.props.sectionBackground.trim());

  const lineSegmentStyle = (flex: boolean): CSSProperties =>
    b.props.softEdges
      ? {
          height: 1,
          flex: flex ? 1 : undefined,
          width: flex ? undefined : "100%",
          backgroundImage: `linear-gradient(90deg, transparent, ${lineColor} 22%, ${lineColor} 78%, transparent)`
        }
      : {
          height: 1,
          flex: flex ? 1 : undefined,
          width: flex ? undefined : "100%",
          backgroundColor: lineColor
        };

  const innerMx = b.props.edgeIndent ? "mx-auto max-w-[88%]" : "";
  const fullW = b.props.fullWidth
    ? "relative -mx-5 w-[calc(100%+2.5rem)] sm:-mx-8 sm:w-[calc(100%+4rem)]"
    : "";

  function inner() {
    if (variant === "empty") {
      const heights = [12, 20, 28, 38, 48];
      return (
        <div
          className={`w-full ${innerMx} ${fullW}`}
          style={{ height: heights[indent] }}
          aria-hidden
        />
      );
    }

    const wrapStyle: CSSProperties = { paddingTop: pyPx, paddingBottom: pyPx };

    if (variant === "simple") {
      return (
        <div className={`flex items-center ${innerMx} ${fullW}`} style={wrapStyle}>
          <div style={lineSegmentStyle(false)} />
        </div>
      );
    }

    if (variant === "decorative") {
      return (
        <div className={`flex flex-col items-center gap-2 ${innerMx} ${fullW}`} style={wrapStyle}>
          <div className="flex w-full items-center gap-3">
            <div style={lineSegmentStyle(true)} />
            <span className="shrink-0 text-sm opacity-70" aria-hidden>
              ?
            </span>
            <div style={lineSegmentStyle(true)} />
          </div>
          {b.props.label ? (
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-55">{b.props.label}</span>
          ) : null}
        </div>
      );
    }

    return (
      <div
        className={`flex items-center gap-3 text-center text-xs font-semibold uppercase tracking-[0.2em] opacity-55 ${innerMx} ${fullW}`}
        style={wrapStyle}
      >
        <div style={lineSegmentStyle(true)} />
        {b.props.label ? <span>{b.props.label}</span> : null}
        <div style={lineSegmentStyle(true)} />
      </div>
    );
  }

  const padStyle: CSSProperties = {
    paddingTop: hasSectionChrome ? ptPx : undefined,
    paddingBottom: hasSectionChrome ? pbPx : undefined,
    backgroundColor: b.props.sectionBackground || undefined
  };

  const outerClass = `rounded-2xl${b.props.edgeIndent && hasSectionChrome ? " mx-1" : ""}`;

  const body = (
    <>
      {b.props.extraVerticalSpacing ? <div className="h-4" aria-hidden /> : null}
      {inner()}
    </>
  );

  if (hasSectionChrome) {
    return <section className={outerClass} style={padStyle}>{body}</section>;
  }

  return <div>{body}</div>;
}

function profileRadius(theme: PageTheme, circular?: boolean) {
  if (theme.profileStyle === "square") return "10px";
  if (theme.profileStyle === "rounded_square") return "28px";
  return circular === false ? "28px" : "999px";
}

function SocialIcon(props: { label: string; color: string }) {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold uppercase text-white" style={{ backgroundColor: props.color }}>
      {props.label.slice(0, 2)}
    </span>
  );
}

function AdvancedTimerCard(props: { block: Extract<Block, { type: "advanced_timer" }>; theme: PageTheme }) {
  const { block, theme } = props;
  const target = useMemo(() => Date.parse(block.props.targetIso), [block.props.targetIso]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [target]);

  const ended = Number.isFinite(target) ? now >= target : false;
  const remainingMs = Number.isFinite(target) ? Math.max(target - now, 0) : 0;
  const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remainingMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((remainingMs / (1000 * 60)) % 60);
  const seconds = Math.floor((remainingMs / 1000) % 60);

  return (
    <section className={cardClassName("text-center")} style={cardStyle(theme)}>
      <div className="text-sm font-bold uppercase tracking-[0.18em] opacity-60">Advanced timer</div>
      <h2 className="mt-2 text-2xl font-black">{block.props.title}</h2>
      <p className="mt-2 text-sm opacity-70">{block.props.dateTimeText}</p>
      {Number.isFinite(target) ? (
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[
            [days, "Days"],
            [hours, "Hours"],
            [minutes, "Minutes"],
            [seconds, "Seconds"]
          ].map(([value, label]) => (
            <div key={String(label)} className="rounded-xl px-2 py-3" style={{ backgroundColor: `${theme.primaryColor}18` }}>
              <div className="text-lg font-black">{String(value).padStart(2, "0")}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.15em] opacity-70">{label}</div>
            </div>
          ))}
        </div>
      ) : null}
      <p className="mt-4 text-sm font-semibold" style={{ color: ended ? "#ef4444" : theme.primaryColor }}>
        {ended ? block.props.afterMessage : block.props.beforeMessage}
      </p>
    </section>
  );
}

export function RenderBlocks(props: {
  code: string;
  blocks: Block[];
  trackingCode?: string;
  theme?: PageTheme;
  stickyPad?: boolean;
}) {
  const theme = props.theme ?? DEFAULT_PAGE_THEME;
  const stickyPad = props.stickyPad ?? false;

  return (
    <main className={`${layoutClassName(theme, stickyPad)} ${fontClassName(theme)}`} style={{ color: theme.textColor }}>
      <div className={theme.layoutStyle === "card_based" ? "space-y-5 rounded-[2rem] bg-white/35 p-3 backdrop-blur-md sm:p-4" : "space-y-5"}>
        {props.blocks.map((b) => {
          switch (b.type) {
            case "header":
              return (
                <section key={b.id} className="px-2 text-center">
                  <h1 className="text-4xl font-black tracking-tight sm:text-5xl" style={{ color: theme.textColor }}>
                    {b.props.title}
                  </h1>
                  {b.props.subtitle ? (
                    <p className="mx-auto mt-3 max-w-md text-base leading-7 opacity-75">
                      {b.props.subtitle}
                    </p>
                  ) : null}
                </section>
              );
            case "text":
              return (
                <section key={b.id} className={cardClassName("text-center")} style={cardStyle(theme)}>
                  <p className="whitespace-pre-wrap text-base leading-7 opacity-85">{b.props.text}</p>
                </section>
              );
            case "link_button":
              return (
                <a
                  key={b.id}
                  href={b.props.href}
                  onClick={() => trackClick(props.trackingCode, b)}
                  className="flex min-h-14 w-full items-center justify-center px-5 py-4 text-center text-sm font-bold transition hover:-translate-y-0.5"
                  style={buttonStyle(theme)}
                >
                  {b.props.label}
                </a>
              );
            case "image":
              return (
                <figure key={b.id} className="overflow-hidden rounded-3xl border shadow-sm shadow-slate-200/70" style={cardStyle(theme)}>
                  <img src={b.props.src} alt={b.props.alt ?? ""} className="h-auto w-full object-cover" loading="lazy" />
                </figure>
              );
            case "video":
              return (
                <div key={b.id} className="overflow-hidden rounded-3xl border bg-black shadow-sm shadow-slate-200/70">
                  <video src={b.props.src} controls className="h-auto w-full" />
                </div>
              );
            case "whatsapp_button": {
              const message = b.props.message ? `?text=${encodeURIComponent(b.props.message)}` : "";
              const href = `https://wa.me/${b.props.phoneE164.replace("+", "")}${message}`;
              return (
                <a
                  key={b.id}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackClick(props.trackingCode, b)}
                  className="flex min-h-14 w-full items-center justify-center px-5 py-4 text-center text-sm font-bold transition hover:-translate-y-0.5"
                  style={buttonStyle(theme, "whatsapp")}
                >
                  {b.props.label}
                </a>
              );
            }
            case "divider":
              return (
                <Fragment key={b.id}>
                  <DividerView block={b} theme={theme} />
                </Fragment>
              );
            case "profile":
              return (
                <section key={b.id} className="px-2 text-center">
                  <img
                    src={b.props.imageUrl}
                    alt={b.props.name}
                    className="mx-auto h-28 w-28 border-4 border-white object-cover shadow-xl shadow-slate-300/70"
                    style={{ borderRadius: profileRadius(theme, b.props.circular) }}
                    loading="lazy"
                  />
                  <h1 className="mt-4 text-3xl font-black tracking-tight">{b.props.name}</h1>
                  {b.props.subtitle ? <p className="mt-1 text-base opacity-70">{b.props.subtitle}</p> : null}
                </section>
              );
            case "social_links":
              return (
                <section key={b.id} className="flex flex-wrap justify-center gap-2">
                  {b.props.links.map((link) => (
                    <a
                      key={`${link.platform}-${link.href}`}
                      href={link.href}
                      target={link.href.startsWith("mailto:") ? undefined : "_blank"}
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5"
                      style={cardStyle(theme)}
                    >
                      <SocialIcon label={link.platform} color={theme.primaryColor} />
                      {link.label}
                    </a>
                  ))}
                </section>
              );
            case "faq":
              return (
                <section key={b.id} className={cardClassName("space-y-3")} style={cardStyle(theme)}>
                  <h2 className="text-sm font-bold uppercase tracking-[0.18em] opacity-60">FAQ</h2>
                  {b.props.items.map((item) => (
                    <details key={item.question} className="group rounded-2xl p-4" style={{ backgroundColor: `${theme.primaryColor}12` }}>
                      <summary className="cursor-pointer text-sm font-bold">{item.question}</summary>
                      <p className="mt-2 text-sm leading-6 opacity-75">{item.answer}</p>
                    </details>
                  ))}
                </section>
              );
            case "map_location":
              return (
                <section key={b.id} className={cardClassName("space-y-4 text-center")} style={cardStyle(theme)}>
                  <div>
                    <h2 className="text-xl font-black">{b.props.title}</h2>
                    <p className="mt-1 text-sm opacity-60">Location and directions</p>
                  </div>
                  <a href={b.props.mapsUrl} target="_blank" rel="noreferrer" className="flex min-h-11 w-full items-center justify-center px-4 py-3 text-sm font-bold" style={buttonStyle(theme)}>
                    {b.props.buttonText}
                  </a>
                </section>
              );
            case "price_list":
              return (
                <section key={b.id} className={cardClassName("space-y-3")} style={cardStyle(theme)}>
                  {b.props.title ? <h2 className="text-xl font-black">{b.props.title}</h2> : null}
                  {b.props.items
                    .filter((item) => item.name || item.description || item.price)
                    .map((item) => (
                      <div
                        key={`${item.name}-${item.price}-${item.description ?? ""}`}
                        className="flex items-start justify-between gap-4 rounded-2xl p-4"
                        style={{ backgroundColor: `${theme.primaryColor}10` }}
                      >
                        <div>
                          <div className="font-bold">{item.name || "�"}</div>
                          {item.description ? <div className="mt-1 text-sm opacity-70">{item.description}</div> : null}
                        </div>
                        <div className="shrink-0 font-black">{item.price || "�"}</div>
                      </div>
                    ))}
                </section>
              );
            case "html_embed":
              return (
                <section
                  key={b.id}
                  className={cardClassName("html-embed-root overflow-hidden p-2")}
                  style={cardStyle(theme)}
                >
                  <iframe
                    title="Custom HTML block"
                    sandbox={htmlEmbedSandbox(b.props.allowScripts)}
                    referrerPolicy="no-referrer"
                    srcDoc={buildSandboxedHtmlDocument(b.props.html, HTML_EMBED_MAX_LENGTH, {
                      allowScripts: b.props.allowScripts
                    })}
                    className="h-[640px] w-full rounded-[1rem] border border-black/10 bg-white"
                  />
                </section>
              );
            case "form":
              return (
                <section key={b.id} className={cardClassName("space-y-4")} style={cardStyle(theme)}>
                  <h2 className="text-xl font-black">{b.props.title}</h2>
                  <form method="post" action={`/p/${encodeURIComponent(props.code)}`} className="space-y-3">
                    <input type="hidden" name="intent" value="submit_lead" />
                    <input type="hidden" name="blockId" value={b.id} />
                    {b.props.enabledFields.includes("name") ? (
                      <input name="name" placeholder="Name" className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-slate-900" />
                    ) : null}
                    {b.props.enabledFields.includes("phone") ? (
                      <input name="phone" placeholder="Phone" className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-slate-900" />
                    ) : null}
                    {b.props.enabledFields.includes("email") ? (
                      <input name="email" type="email" placeholder="Email" className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-slate-900" />
                    ) : null}
                    {b.props.enabledFields.includes("message") ? (
                      <textarea name="message" placeholder="Message" rows={4} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-900" />
                    ) : null}
                    <button type="submit" className="flex min-h-11 w-full items-center justify-center px-4 py-3 text-sm font-bold" style={buttonStyle(theme)}>
                      {b.props.submitText}
                    </button>
                  </form>
                </section>
              );
            case "digital_products":
              return (
                <section key={b.id} className={cardClassName("space-y-4")} style={cardStyle(theme)}>
                  {b.props.title ? <h2 className="text-xl font-black">{b.props.title}</h2> : null}
                  <p className="text-xs opacity-70">
                    {b.props.note || "Payment integration planned later."}
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {b.props.items.map((item) => (
                      <article key={`${item.title}-${item.buttonUrl}`} className="rounded-2xl border border-black/10 bg-white/55 p-3">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.title} className="mb-3 h-40 w-full rounded-xl object-cover" loading="lazy" />
                        ) : null}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold">{item.title}</h3>
                            {item.description ? <p className="mt-1 text-sm opacity-75">{item.description}</p> : null}
                          </div>
                          {item.priceText ? <div className="shrink-0 font-black">{item.priceText}</div> : null}
                        </div>
                        <a href={item.buttonUrl} target="_blank" rel="noreferrer" className="mt-3 flex min-h-10 w-full items-center justify-center px-4 py-2 text-sm font-bold" style={buttonStyle(theme)}>
                          {item.buttonText}
                        </a>
                      </article>
                    ))}
                  </div>
                </section>
              );
            case "advanced_timer":
              return <AdvancedTimerCard key={b.id} block={b} theme={theme} />;
            case "gallery":
              return (
                <section key={b.id} className="grid grid-cols-2 gap-2">
                  {b.props.images.map((image) => (
                    <img
                      key={image.src}
                      src={image.src}
                      alt={image.alt ?? ""}
                      loading="lazy"
                      className="aspect-square w-full rounded-2xl object-cover shadow-sm shadow-slate-200/70"
                    />
                  ))}
                </section>
              );
            case "contact_card":
              return (
                <section key={b.id} className={cardClassName("space-y-3")} style={cardStyle(theme)}>
                  <h2 className="text-xl font-black">Contact</h2>
                  <div className="grid gap-2 text-sm">
                    {b.props.phone ? <a href={`tel:${b.props.phone}`} className="rounded-2xl p-3 font-semibold" style={{ backgroundColor: `${theme.primaryColor}10` }}>Phone: {b.props.phone}</a> : null}
                    {b.props.whatsapp ? <a href={`https://wa.me/${b.props.whatsapp.replace("+", "")}`} target="_blank" rel="noreferrer" className="rounded-2xl bg-emerald-50 p-3 font-semibold text-emerald-800">WhatsApp: {b.props.whatsapp}</a> : null}
                    {b.props.email ? <a href={`mailto:${b.props.email}`} className="rounded-2xl p-3 font-semibold" style={{ backgroundColor: `${theme.primaryColor}10` }}>Email: {b.props.email}</a> : null}
                    {b.props.address ? <div className="rounded-2xl p-3 font-semibold" style={{ backgroundColor: `${theme.primaryColor}10` }}>Address: {b.props.address}</div> : null}
                  </div>
                </section>
              );
            case "countdown":
              return (
                <section key={b.id} className={cardClassName("text-center")} style={cardStyle(theme)}>
                  <div className="text-sm font-bold uppercase tracking-[0.18em] opacity-60">Save the date</div>
                  <h2 className="mt-2 text-2xl font-black">{b.props.title}</h2>
                  <p className="mt-2 px-4 py-3 text-sm font-bold text-white" style={buttonStyle(theme)}>{b.props.dateTimeText}</p>
                </section>
              );
            case "announcement":
              return (
                <section
                  key={b.id}
                  className="rounded-3xl p-5 shadow-sm"
                  style={b.props.style === "strong" ? { backgroundColor: theme.primaryColor, color: "#ffffff" } : cardStyle(theme)}
                >
                  <h2 className="text-xl font-black">{b.props.title}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 opacity-85">{b.props.message}</p>
                </section>
              );
            default:
              return null;
          }
        })}
      </div>
    </main>
  );
}

export function PublicPageFrame(props: {
  code: string;
  blocks: Block[];
  trackingCode?: string;
  theme?: PageTheme;
}) {
  const theme = props.theme ?? DEFAULT_PAGE_THEME;
  const sticky = pickStickyContact(props.blocks);

  return (
    <div className={`min-h-screen ${fontClassName(theme)}`} style={pageStyle(theme)}>
      {theme.showPlatformBadge ? (
        <div className="mx-auto flex max-w-5xl justify-end px-4 pt-4">
          <div className="rounded-full bg-white/75 px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur" style={{ color: theme.textColor }}>
            Smart Page /p/{props.code}
          </div>
        </div>
      ) : null}
      <RenderBlocks code={props.code} blocks={props.blocks} trackingCode={props.trackingCode} theme={theme} stickyPad={Boolean(sticky)} />
      {theme.footerText ? (
        <footer className={`mx-auto max-w-xl px-6 text-center text-sm opacity-70 ${sticky ? "pb-24 md:pb-10" : "pb-10"}`} style={{ color: theme.textColor }}>
          {theme.footerText}
        </footer>
      ) : sticky ? (
        <div className="h-14 md:h-0" aria-hidden />
      ) : null}
      {sticky ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/25 bg-white/90 px-4 py-3 shadow-[0_-12px_40px_-24px_rgba(15,23,42,0.55)] backdrop-blur-md md:hidden">
          <a
            href={sticky.href}
            target={sticky.href.startsWith("tel:") ? undefined : "_blank"}
            rel="noreferrer"
            className="flex min-h-12 w-full max-w-xl mx-auto items-center justify-center rounded-2xl px-5 text-center text-sm font-bold text-white shadow-lg shadow-emerald-900/25 transition active:scale-[0.99]"
            style={{
              background: sticky.href.includes("wa.me") ? "#10b981" : theme.buttonColor
            }}
          >
            {sticky.label}
          </a>
        </div>
      ) : null}
    </div>
  );
}
