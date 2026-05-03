import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useSearchParams
} from "@remix-run/react";
import { useMemo, useState } from "react";
import { labelForBlockType } from "~/components/page-editor/block-catalog";
import { AddBlockModal } from "~/components/page-editor/AddBlockModal";
import { DraftLinesField } from "~/components/page-editor/DraftLinesField";
import { DividerBlockEditor } from "~/components/page-editor/DividerBlockEditor";
import { EditorPhonePreview } from "~/components/page-editor/EditorPhonePreview";
import { EditorSection } from "~/components/page-editor/EditorSection";
import { SeoFields } from "~/components/page-editor/SeoFields";
import { TemplatePicker } from "~/components/page-editor/TemplatePicker";
import { Button, buttonClassName } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { type Block, type BlockType } from "~/modules/page-builder/blocks";
import {
  faqItemsToLines,
  galleryImagesToLines,
  linesToFaqItemsLenient,
  linesToGalleryImagesLenient,
  linesToPriceItemsLenient,
  linesToSocialLinksLenient,
  normalizeFaqLinesText,
  normalizeGalleryLinesText,
  normalizePriceLinesText,
  normalizeSocialLinesText,
  priceItemsToLines,
  socialLinksToLines
} from "~/modules/page-builder/line-parsers";
import {
  pageRepository,
  parseBlocksJson
} from "~/modules/page-builder/page-repository.server";
import { HTML_EMBED_MAX_LENGTH, buildSandboxedHtmlDocument } from "~/modules/page-builder/html-sanitize";
import { sanitizePageTheme, type PageTheme } from "~/modules/page-builder/theme";
import { instantiateTemplateBlocks, type PageTemplate } from "~/modules/page-builder/templates";
import { requireUser } from "~/modules/auth/session.server";
import { requireD1Database } from "~/modules/db/db.server";

export const meta: MetaFunction = () => [{ title: "Page editor - Smart Page Platform" }];

function editorErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "page_not_found") return "That page could not be found in your workspace.";
    if (error.message === "invalid_blocks_json") return "Block data was not valid JSON. Please reload and try again.";
    if (error.message === "invalid_blocks") return "One or more blocks is missing required fields or has invalid values.";
    if (error.message === "too_many_blocks") return "Pages can contain up to 50 blocks in Phase 1.";
    if (error.message === "page_title_too_long") return "Page title must be 120 characters or less.";
  }
  return "Page save failed. Please check the fields and try again.";
}

function noticeMessage(notice: string) {
  if (notice === "save") return "Page saved successfully.";
  if (notice === "publish") return "Page published successfully.";
  if (notice === "unpublish") return "Page unpublished successfully.";
  if (notice === "created") return "Page created successfully.";
  return "Page updated successfully.";
}

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const user = await requireUser(request, context);
  const db = requireD1Database(context);
  const repo = pageRepository(db);
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

export async function action({ request, context, params }: ActionFunctionArgs) {
  const user = await requireUser(request, context);
  const db = requireD1Database(context);
  const repo = pageRepository(db);
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
    const theme = sanitizePageTheme(JSON.parse(themeJson));
    await repo.savePage({
      workspaceId: user.workspaceId,
      userId: user.id,
      pageId,
      title,
      slug,
      blocks,
      theme,
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

  return redirect(`/app/pages/${pageId}/edit?notice=${intent}`);
}

function updateBlock(blocks: Block[], index: number, nextBlock: Block) {
  return blocks.map((block, blockIndex) => (blockIndex === index ? nextBlock : block));
}

function reorderBlocks(blocks: Block[], from: number, to: number): Block[] {
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

function defaultBlock(type: BlockType): Block {
  const id = createClientBlockId();
  switch (type) {
    case "header":
      return { id, type, props: { title: "New section", subtitle: "Optional subtitle" } };
    case "text":
      return { id, type, props: { text: "Write something useful here." } };
    case "link_button":
      return { id, type, props: { label: "Open link", href: "/" } };
    case "image":
      return { id, type, props: { src: "", alt: "" } };
    case "video":
      return { id, type, props: { src: "" } };
    case "whatsapp_button":
      return { id, type, props: { label: "Chat on WhatsApp", phoneE164: "+15551234567" } };
    case "divider":
      return { id, type, props: { variant: "classic", indent: 2, label: "" } };
    case "profile":
      return {
        id,
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
        id,
        type,
        props: {
          links: [
            { platform: "instagram", label: "Instagram", href: "https://instagram.com/" },
            { platform: "website", label: "Website", href: "https://example.com" }
          ]
        }
      };
    case "faq":
      return { id, type, props: { items: [{ question: "What do you offer?", answer: "A short answer for visitors." }] } };
    case "map_location":
      return { id, type, props: { title: "Visit us", mapsUrl: "https://maps.google.com", buttonText: "Open in Google Maps" } };
    case "price_list":
      return {
        id,
        type,
        props: { title: "Services", items: [{ name: "Consultation", description: "Intro session", price: "$50" }] }
      };
    case "gallery":
      return {
        id,
        type,
        props: { images: [{ src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee", alt: "Gallery image" }] }
      };
    case "contact_card":
      return { id, type, props: { phone: "+1 555 123 4567", whatsapp: "+15551234567", email: "hello@example.com", address: "City, Country" } };
    case "countdown":
      return { id, type, props: { title: "Coming soon", dateTimeText: "June 1, 2026 at 7:00 PM" } };
    case "announcement":
      return { id, type, props: { title: "New announcement", message: "Share an update with your visitors.", style: "soft" } };
    case "html_embed":
      return {
        id,
        type,
        props: {
          html: "<p>Add your <strong>HTML</strong> here.</p><style>body { padding: 24px; }</style>",
          allowScripts: false
        }
      };
    case "form":
      return {
        id,
        type,
        props: {
          title: "Contact form",
          enabledFields: ["name", "phone", "email", "message"],
          submitText: "Send"
        }
      };
    case "digital_products":
      return {
        id,
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
        id,
        type,
        props: {
          title: "Limited offer",
          targetIso: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          dateTimeText: "Ends tomorrow",
          beforeMessage: "Offer ending soon",
          afterMessage: "Offer has ended"
        }
      };
  }
}

function FieldTextarea(props: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  help: string;
}) {
  return (
    <div className="space-y-1 md:col-span-2">
      <textarea
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        className="min-h-28 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/55"
      />
      <div className="text-xs text-zinc-500">{props.help}</div>
    </div>
  );
}

function ThemeSelect<T extends string>(props: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium text-zinc-300">{props.label}</span>
      <select
        value={props.value}
        onChange={(event) => props.onChange(event.target.value as T)}
        className="w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/55"
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ThemeColorInput(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium text-zinc-300">{props.label}</span>
      <input
        type="color"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-2 py-1"
      />
    </label>
  );
}

function AppearanceFields(props: {
  theme: PageTheme;
  onChange: (theme: PageTheme) => void;
}) {
  function patch(next: Partial<PageTheme>) {
    props.onChange(sanitizePageTheme({ ...props.theme, ...next }));
  }

  return (
    <EditorSection title="Appearance / Theme" description="Style this public page without changing its blocks.">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ThemeSelect
            label="Page background"
            value={props.theme.backgroundType}
            onChange={(value) => patch({ backgroundType: value })}
            options={[
              { value: "solid", label: "Solid color" },
              { value: "gradient", label: "Simple gradient" },
              { value: "image", label: "Background image URL" }
            ]}
          />
          <Input
            variant="dark"
            value={props.theme.backgroundImageUrl ?? ""}
            onChange={(event) => patch({ backgroundImageUrl: event.target.value })}
            placeholder="Background image URL"
          />
          <ThemeColorInput label="Background color" value={props.theme.backgroundColor} onChange={(value) => patch({ backgroundColor: value })} />
          <ThemeColorInput label="Gradient from" value={props.theme.gradientFrom} onChange={(value) => patch({ gradientFrom: value })} />
          <ThemeColorInput label="Gradient to" value={props.theme.gradientTo} onChange={(value) => patch({ gradientTo: value })} />
          <ThemeColorInput label="Primary color" value={props.theme.primaryColor} onChange={(value) => patch({ primaryColor: value })} />
          <ThemeColorInput label="Text color" value={props.theme.textColor} onChange={(value) => patch({ textColor: value })} />
          <ThemeColorInput label="Card color" value={props.theme.cardColor} onChange={(value) => patch({ cardColor: value })} />
          <ThemeColorInput label="Button color" value={props.theme.buttonColor} onChange={(value) => patch({ buttonColor: value })} />
          <ThemeSelect
            label="Button style"
            value={props.theme.buttonStyle}
            onChange={(value) => patch({ buttonStyle: value })}
            options={[
              { value: "rounded", label: "Rounded" },
              { value: "pill", label: "Pill" },
              { value: "square", label: "Square" },
              { value: "shadow", label: "Shadow" },
              { value: "outline", label: "Outline" }
            ]}
          />
          <ThemeSelect
            label="Font style"
            value={props.theme.fontStyle}
            onChange={(value) => patch({ fontStyle: value })}
            options={[
              { value: "clean", label: "Clean default" },
              { value: "elegant", label: "Elegant" },
              { value: "bold", label: "Bold" },
              { value: "minimal", label: "Minimal" }
            ]}
          />
          <ThemeSelect
            label="Layout style"
            value={props.theme.layoutStyle}
            onChange={(value) => patch({ layoutStyle: value })}
            options={[
              { value: "centered", label: "Centered compact" },
              { value: "full_width_mobile", label: "Full-width mobile" },
              { value: "card_based", label: "Card-based" }
            ]}
          />
          <ThemeSelect
            label="Profile/avatar style"
            value={props.theme.profileStyle}
            onChange={(value) => patch({ profileStyle: value })}
            options={[
              { value: "circle", label: "Circle" },
              { value: "rounded_square", label: "Rounded square" },
              { value: "square", label: "Square" }
            ]}
          />
          <Input
            variant="dark"
            value={props.theme.footerText ?? ""}
            onChange={(event) => patch({ footerText: event.target.value })}
            placeholder="Footer text"
          />
          <label className="flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={props.theme.showPlatformBadge}
              onChange={(event) => patch({ showPlatformBadge: event.target.checked })}
            />
            Show Smart Page badge
          </label>
        </div>
        <div
          className="mt-4 rounded-xl border border-zinc-600 p-4 text-sm shadow-inner shadow-black/20"
          style={{ background: props.theme.cardColor, color: props.theme.textColor }}
        >
          <div className="font-semibold">Live style preview</div>
          <div className="mt-2 inline-flex px-4 py-2 text-sm font-bold text-white" style={{ background: props.theme.buttonColor, borderRadius: props.theme.buttonStyle === "pill" ? "999px" : props.theme.buttonStyle === "square" ? "4px" : "16px" }}>
            Sample button
          </div>
        </div>
    </EditorSection>
  );
}

function BlockFields(props: {
  block: Block;
  index: number;
  totalBlocks: number;
  onChange: (block: Block) => void;
  onReorder: (from: number, to: number) => void;
  onDelete: () => void;
}) {
  const { block, index, totalBlocks, onChange, onReorder, onDelete } = props;

  function patch(nextProps: Record<string, unknown>) {
    onChange({ ...block, props: { ...block.props, ...nextProps } } as Block);
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-zinc-600 bg-zinc-950/90 shadow-lg shadow-black/40 ring-1 ring-white/[0.04]"
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        const raw = event.dataTransfer.getData("application/x-sp-block-index");
        const from = Number(raw);
        if (!Number.isFinite(from)) return;
        onReorder(from, index);
      }}
    >
      <div className="flex gap-2 border-b border-zinc-700 bg-zinc-900/80 px-3 py-3">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <div
            draggable
            role="button"
            tabIndex={0}
            onDragStart={(event) => {
              event.dataTransfer.setData("application/x-sp-block-index", String(index));
              event.dataTransfer.effectAllowed = "move";
              (event.currentTarget as HTMLElement).style.opacity = "0.6";
            }}
            onDragEnd={(event) => {
              (event.currentTarget as HTMLElement).style.opacity = "1";
            }}
            className="flex h-10 w-10 cursor-grab touch-none select-none items-center justify-center rounded-lg border border-zinc-600 bg-zinc-950 text-zinc-400 shadow-sm hover:bg-zinc-800 active:cursor-grabbing"
            aria-label="Drag to reorder"
            title="Drag to reorder"
          >
            <span className="text-base leading-none tracking-tighter">⋮⋮</span>
          </div>
          <div className="flex gap-0.5">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onReorder(index, index - 1)}
              className="rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 text-[10px] font-bold leading-none text-zinc-300 shadow-sm hover:bg-zinc-800 disabled:opacity-25"
              aria-label="Move block up"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={index >= totalBlocks - 1}
              onClick={() => onReorder(index, index + 1)}
              className="rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 text-[10px] font-bold leading-none text-zinc-300 shadow-sm hover:bg-zinc-800 disabled:opacity-25"
              aria-label="Move block down"
            >
              ↓
            </button>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-white">
                {index + 1}. {labelForBlockType(block.type)}
              </div>
              <div className="text-xs text-zinc-500">
                {block.type === "divider" && block.props.editorLabel ? (
                  <span className="text-brand-400/90">{block.props.editorLabel}</span>
                ) : (
                  "Reorder by dragging — add unlimited blocks of any type."
                )}
              </div>
            </div>
            <Button type="button" size="sm" variant="danger" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 md:p-5">
        {block.type === "header" ? (
          <>
            <Input
              variant="dark"
              value={block.props.title}
              onChange={(event) => patch({ title: event.target.value })}
              placeholder="Title"
            />
            <Input
              variant="dark"
              value={block.props.subtitle ?? ""}
              onChange={(event) => patch({ subtitle: event.target.value })}
              placeholder="Subtitle"
            />
          </>
        ) : null}

        {block.type === "text" ? (
          <textarea
            value={block.props.text}
            onChange={(event) => patch({ text: event.target.value })}
            placeholder="Text"
            className="min-h-24 rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/55 md:col-span-2"
          />
        ) : null}

        {block.type === "link_button" ? (
          <>
            <Input
              variant="dark"
              value={block.props.label}
              onChange={(event) => patch({ label: event.target.value })}
              placeholder="Button label"
            />
            <Input
              variant="dark"
              value={block.props.href}
              onChange={(event) => patch({ href: event.target.value })}
              placeholder="https://..."
            />
          </>
        ) : null}

        {block.type === "image" ? (
          <>
            <Input
              variant="dark"
              value={block.props.src}
              onChange={(event) => patch({ src: event.target.value })}
              placeholder="Image URL"
            />
            <Input
              variant="dark"
              value={block.props.alt ?? ""}
              onChange={(event) => patch({ alt: event.target.value })}
              placeholder="Alt text"
            />
          </>
        ) : null}

        {block.type === "video" ? (
          <Input
            variant="dark"
            value={block.props.src}
            onChange={(event) => patch({ src: event.target.value })}
            placeholder="Video URL"
            className="md:col-span-2"
          />
        ) : null}

        {block.type === "whatsapp_button" ? (
          <>
            <Input
              variant="dark"
              value={block.props.label}
              onChange={(event) => patch({ label: event.target.value })}
              placeholder="Button label"
            />
            <Input
              variant="dark"
              value={block.props.phoneE164}
              onChange={(event) => patch({ phoneE164: event.target.value })}
              placeholder="+15551234567"
            />
            <Input
              variant="dark"
              value={block.props.message ?? ""}
              onChange={(event) => patch({ message: event.target.value })}
              placeholder="Optional message"
              className="md:col-span-2"
            />
          </>
        ) : null}

        {block.type === "divider" ? (
          <DividerBlockEditor props={block.props} onPatch={(next) => patch(next)} />
        ) : null}

        {block.type === "html_embed" ? (
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-zinc-300">HTML</label>
            <textarea
              value={block.props.html}
              onChange={(event) => patch({ html: event.target.value })}
              spellCheck={false}
              className="min-h-48 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/55"
              placeholder="<p>...</p>"
            />
            <label className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-100">
              <input
                type="checkbox"
                checked={Boolean(block.props.allowScripts)}
                onChange={(event) => patch({ allowScripts: event.target.checked })}
                className="mt-0.5"
              />
              <span>
                Allow sandboxed JavaScript for this HTML block. Use this only for HTML templates you trust; it remains
                isolated from Smart Page, but the template code can run inside its own frame.
              </span>
            </label>
            <p className="text-xs text-zinc-500">
              Paste a complete HTML document or a smaller snippet. CSS inside style tags is supported inside a sandboxed
              preview.
            </p>
            <p className="text-xs text-zinc-500">
              Iframes, embeds, and unsafe URLs are blocked for visitor safety. JavaScript is blocked unless the checkbox
              above is enabled.
            </p>
            <iframe
              title="Custom HTML preview"
              sandbox={`allow-forms allow-popups allow-popups-to-escape-sandbox${block.props.allowScripts ? " allow-scripts" : ""}`}
              referrerPolicy="no-referrer"
              srcDoc={buildSandboxedHtmlDocument(block.props.html, HTML_EMBED_MAX_LENGTH, {
                allowScripts: block.props.allowScripts
              })}
              className="h-[420px] w-full rounded-xl border border-zinc-700 bg-white"
            />
          </div>
        ) : null}

        {block.type === "form" ? (
          <div className="space-y-3 md:col-span-2">
            <Input
              variant="dark"
              value={block.props.title}
              onChange={(event) => patch({ title: event.target.value })}
              placeholder="Form title"
            />
            <div className="rounded-xl border border-zinc-700 bg-zinc-950/40 p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">Enabled fields</div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(["name", "phone", "email", "message"] as const).map((fieldKey) => {
                  const enabled = block.props.enabledFields.includes(fieldKey);
                  return (
                    <label key={fieldKey} className="flex items-center gap-2 rounded-lg border border-zinc-700 px-2 py-2 text-xs text-zinc-300">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(event) =>
                          patch({
                            enabledFields: event.target.checked
                              ? Array.from(new Set([...block.props.enabledFields, fieldKey]))
                              : block.props.enabledFields.filter((v) => v !== fieldKey)
                          })
                        }
                      />
                      {fieldKey}
                    </label>
                  );
                })}
              </div>
            </div>
            <Input
              variant="dark"
              value={block.props.submitText}
              onChange={(event) => patch({ submitText: event.target.value })}
              placeholder="Submit button text"
            />
          </div>
        ) : null}

        {block.type === "digital_products" ? (
          <div className="space-y-3 md:col-span-2">
            <Input
              variant="dark"
              value={block.props.title ?? ""}
              onChange={(event) => patch({ title: event.target.value })}
              placeholder="Block title"
            />
            <Input
              variant="dark"
              value={block.props.note ?? ""}
              onChange={(event) => patch({ note: event.target.value })}
              placeholder="Payment integration planned later."
            />
            <DraftLinesField
              resetKey={block.id}
              canonical={block.props.items
                .map((item) =>
                  [
                    item.title,
                    item.description ?? "",
                    item.priceText ?? "",
                    item.imageUrl ?? "",
                    item.buttonText,
                    item.buttonUrl
                  ].join("|")
                )
                .join("\n")}
              normalize={(raw) =>
                raw
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .join("\n")
              }
              onDraftChange={(raw) =>
                patch({
                  items: raw
                    .split("\n")
                    .map((line) => {
                      const [title = "", description = "", priceText = "", imageUrl = "", buttonText = "", buttonUrl = ""] =
                        line.split("|").map((part) => part.trim());
                      return { title, description, priceText, imageUrl, buttonText, buttonUrl };
                    })
                    .filter((item) => item.title || item.buttonUrl)
                })
              }
              placeholder="Title|Description|$19|https://image|Button text|https://checkout-or-wa"
              help="One product per line: title|description|price text|image URL|button text|button URL."
            />
          </div>
        ) : null}

        {block.type === "advanced_timer" ? (
          <div className="space-y-3 md:col-span-2">
            <Input
              variant="dark"
              value={block.props.title}
              onChange={(event) => patch({ title: event.target.value })}
              placeholder="Timer title"
            />
            <Input
              variant="dark"
              value={block.props.targetIso}
              onChange={(event) => patch({ targetIso: event.target.value })}
              placeholder="2026-12-31T23:59:00Z"
            />
            <Input
              variant="dark"
              value={block.props.dateTimeText}
              onChange={(event) => patch({ dateTimeText: event.target.value })}
              placeholder="Ends Dec 31, 2026 at 11:59 PM"
            />
            <Input
              variant="dark"
              value={block.props.beforeMessage}
              onChange={(event) => patch({ beforeMessage: event.target.value })}
              placeholder="Message before ending"
            />
            <Input
              variant="dark"
              value={block.props.afterMessage}
              onChange={(event) => patch({ afterMessage: event.target.value })}
              placeholder="Message after ending"
            />
          </div>
        ) : null}

        {block.type === "profile" ? (
          <>
            <Input
              variant="dark"
              value={block.props.imageUrl}
              onChange={(event) => patch({ imageUrl: event.target.value })}
              placeholder="Profile image URL"
            />
            <Input
              variant="dark"
              value={block.props.name}
              onChange={(event) => patch({ name: event.target.value })}
              placeholder="Name"
            />
            <Input
              variant="dark"
              value={block.props.subtitle ?? ""}
              onChange={(event) => patch({ subtitle: event.target.value })}
              placeholder="Subtitle"
            />
            <label className="flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={Boolean(block.props.circular)}
                onChange={(event) => patch({ circular: event.target.checked })}
              />
              Circular image
            </label>
          </>
        ) : null}

        {block.type === "social_links" ? (
          <DraftLinesField
            resetKey={block.id}
            canonical={socialLinksToLines(block.props.links)}
            normalize={normalizeSocialLinesText}
            onDraftChange={(raw) => patch({ links: linesToSocialLinksLenient(raw) })}
            placeholder="instagram|Instagram|https://instagram.com/yourname"
            help="One link per line: platform|label|url. Platforms: instagram, tiktok, whatsapp, youtube, website, email."
          />
        ) : null}

        {block.type === "faq" ? (
          <DraftLinesField
            resetKey={block.id}
            canonical={faqItemsToLines(block.props.items)}
            normalize={normalizeFaqLinesText}
            onDraftChange={(raw) => patch({ items: linesToFaqItemsLenient(raw) })}
            placeholder="Question?|Answer text"
            help="One FAQ per line: question|answer."
          />
        ) : null}

        {block.type === "map_location" ? (
          <>
            <Input
              variant="dark"
              value={block.props.title}
              onChange={(event) => patch({ title: event.target.value })}
              placeholder="Location title"
            />
            <Input
              variant="dark"
              value={block.props.buttonText}
              onChange={(event) => patch({ buttonText: event.target.value })}
              placeholder="Button text"
            />
            <Input
              variant="dark"
              value={block.props.mapsUrl}
              onChange={(event) => patch({ mapsUrl: event.target.value })}
              placeholder="Google Maps URL"
              className="md:col-span-2"
            />
          </>
        ) : null}

        {block.type === "price_list" ? (
          <>
            <Input
              variant="dark"
              value={block.props.title ?? ""}
              onChange={(event) => patch({ title: event.target.value })}
              placeholder="Optional list title"
              className="md:col-span-2"
            />
            <DraftLinesField
              resetKey={block.id}
              canonical={priceItemsToLines(block.props.items)}
              normalize={normalizePriceLinesText}
              onDraftChange={(raw) => patch({ items: linesToPriceItemsLenient(raw) })}
              placeholder="Service name|Description|$50"
              help="One item per line: name|description|price. You can type the name first, then add price—nothing will jump away while you edit."
            />
          </>
        ) : null}

        {block.type === "gallery" ? (
          <DraftLinesField
            resetKey={block.id}
            canonical={galleryImagesToLines(block.props.images)}
            normalize={normalizeGalleryLinesText}
            onDraftChange={(raw) => patch({ images: linesToGalleryImagesLenient(raw) })}
            placeholder="https://example.com/image.jpg|Alt text"
            help="One image per line: image URL|alt text. External image URLs only for Phase 1."
          />
        ) : null}

        {block.type === "contact_card" ? (
          <>
            <Input
              variant="dark"
              value={block.props.phone ?? ""}
              onChange={(event) => patch({ phone: event.target.value })}
              placeholder="Phone"
            />
            <Input
              variant="dark"
              value={block.props.whatsapp ?? ""}
              onChange={(event) => patch({ whatsapp: event.target.value })}
              placeholder="WhatsApp +15551234567"
            />
            <Input
              variant="dark"
              value={block.props.email ?? ""}
              onChange={(event) => patch({ email: event.target.value })}
              placeholder="Email"
            />
            <Input
              variant="dark"
              value={block.props.address ?? ""}
              onChange={(event) => patch({ address: event.target.value })}
              placeholder="Address"
            />
          </>
        ) : null}

        {block.type === "countdown" ? (
          <>
            <Input
              variant="dark"
              value={block.props.title}
              onChange={(event) => patch({ title: event.target.value })}
              placeholder="Title"
            />
            <Input
              variant="dark"
              value={block.props.dateTimeText}
              onChange={(event) => patch({ dateTimeText: event.target.value })}
              placeholder="Date/time text"
            />
          </>
        ) : null}

        {block.type === "announcement" ? (
          <>
            <Input
              variant="dark"
              value={block.props.title}
              onChange={(event) => patch({ title: event.target.value })}
              placeholder="Title"
            />
            <select
              value={block.props.style ?? "soft"}
              onChange={(event) => patch({ style: event.target.value })}
              className="rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/55"
            >
              <option value="soft">Soft highlight</option>
              <option value="strong">Strong highlight</option>
            </select>
            <FieldTextarea
              value={block.props.message}
              onChange={(value) => patch({ message: value })}
              placeholder="Announcement message"
              help="Short update or note for visitors."
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function PageEditor() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const [title, setTitle] = useState(data.page.title);
  const [slug, setSlug] = useState(data.page.slug);
  const [blocks, setBlocks] = useState<Block[]>(data.blocks);
  const [theme, setTheme] = useState<PageTheme>(data.theme);
  const [seoTitle, setSeoTitle] = useState(data.page.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(data.page.seo_description ?? "");
  const [allowIndexing, setAllowIndexing] = useState(
    data.page.allow_indexing === undefined ? true : data.page.allow_indexing !== 0
  );
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const blocksJson = useMemo(() => JSON.stringify(blocks), [blocks]);
  const themeJson = useMemo(() => JSON.stringify(theme), [theme]);
  const isSubmitting = navigation.state !== "idle";
  const notice = searchParams.get("notice");
  const publicCode =
    data.page.status === "published" && data.shortLink?.status === "active"
      ? data.shortLink.code
      : null;
  const previewCode = publicCode ?? data.page.slug;

  function addBlock(type: BlockType) {
    setBlocks((current) => [...current, defaultBlock(type)]);
  }

  function applyTemplate(template: PageTemplate) {
    setTheme(sanitizePageTheme(template.theme));
    setBlocks(instantiateTemplateBlocks(template, createClientBlockId));
  }

  const publishControls = (
    <>
      <Button form="page-editor-form" type="submit" size="sm" name="intent" value="save" disabled={isSubmitting}>
        Save
      </Button>
      {data.page.status === "published" ? (
        <Button
          form="page-editor-form"
          type="submit"
          size="sm"
          name="intent"
          value="unpublish"
          variant="ghost"
          disabled={isSubmitting}
        >
          Draft
        </Button>
      ) : (
        <Button form="page-editor-form" type="submit" size="sm" name="intent" value="publish" disabled={isSubmitting}>
          Publish
        </Button>
      )}
    </>
  );

  const shareControls =
    publicCode ? (
      <>
        <Link
          to={`/p/${previewCode}`}
          target="_blank"
          rel="noreferrer"
          className={buttonClassName({ size: "sm", variant: "secondary" })}
        >
          View
        </Link>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}/p/${publicCode}`)}
        >
          Copy
        </Button>
      </>
    ) : null;

  return (
    <div className="relative pb-28 lg:pb-10">
      <Form id="page-editor-form" method="post" className="space-y-6">
        <input type="hidden" name="blocksJson" value={blocksJson} />
        <input type="hidden" name="themeJson" value={themeJson} />

        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_min(380px,42%)] xl:items-start xl:gap-8">
          <div className="min-w-0 space-y-6">
            <EditorSection
              title="Page"
              description={`${data.page.status} · ${data.page.id}`}
              right={<div className="hidden flex-wrap items-center justify-end gap-2 lg:flex">{shareControls}{publishControls}</div>}
            >
                {actionData?.ok === false ? (
                  <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
                    {actionData.error}
                  </div>
                ) : null}
                {notice ? (
                  <div className="mb-4 rounded-lg border border-emerald-500/35 bg-emerald-950/35 px-3 py-2 text-sm text-emerald-200">
                    {noticeMessage(notice)}
                  </div>
                ) : null}
                <div className="mb-6 rounded-xl border border-zinc-600 bg-zinc-950/60 p-4 text-sm text-zinc-300">
                  <div className="font-medium text-white">Public short link</div>
                  <div className="mt-1 font-mono text-xs text-zinc-400">
                    {publicCode ? `/p/${publicCode}` : "Publish to activate /p/… link"}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-300">Page title</label>
                    <Input name="title" variant="dark" value={title} onChange={(event) => setTitle(event.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-300">Slug</label>
                    <Input name="slug" variant="dark" value={slug} onChange={(event) => setSlug(event.target.value)} />
                  </div>
                </div>
            </EditorSection>

            <div className="xl:hidden">
              <EditorPhonePreview
                blocks={blocks}
                theme={theme}
                label="Scroll the preview — matches your public page."
                onAddBlock={() => setAddBlockOpen(true)}
                previewHref={publicCode ? `/p/${previewCode}` : undefined}
              />
            </div>

            <EditorSection
              title="Blocks"
              description="Reorder blocks below or tap Add block."
              right={
                <Button type="button" size="sm" onClick={() => setAddBlockOpen(true)}>
                  Add block
                </Button>
              }
            >
                <div className="space-y-3">
                  {blocks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-zinc-600 bg-zinc-950/50 p-6 text-center text-sm text-zinc-400">
                      <p>No blocks yet.</p>
                      <Button type="button" size="sm" className="mt-4" onClick={() => setAddBlockOpen(true)}>
                        Add block
                      </Button>
                      <p className="mt-3 text-xs text-zinc-500">Or apply a template below for starter content.</p>
                    </div>
                  ) : (
                    blocks.map((block, index) => (
                      <BlockFields
                        key={block.id}
                        block={block}
                        index={index}
                        totalBlocks={blocks.length}
                        onChange={(nextBlock) => setBlocks((current) => updateBlock(current, index, nextBlock))}
                        onReorder={(from, to) => setBlocks((current) => reorderBlocks(current, from, to))}
                        onDelete={() =>
                          setBlocks((current) => current.filter((_, blockIndex) => blockIndex !== index))
                        }
                      />
                    ))
                  )}
                </div>
            </EditorSection>

            <TemplatePicker
              appearance="editor"
              currentBlocksCount={blocks.length}
              createBlockId={createClientBlockId}
              onApply={applyTemplate}
            />

            <AppearanceFields theme={theme} onChange={setTheme} />

            <SeoFields
              appearance="editor"
              seoTitle={seoTitle}
              seoDescription={seoDescription}
              allowIndexing={allowIndexing}
              onSeoTitle={setSeoTitle}
              onSeoDescription={setSeoDescription}
              onAllowIndexing={setAllowIndexing}
            />
          </div>

          <aside className="sticky top-6 mt-6 hidden min-w-0 max-w-none xl:mt-0 xl:block">
            <EditorPhonePreview
              blocks={blocks}
              theme={theme}
              label="Updates as you edit blocks and theme."
              onAddBlock={() => setAddBlockOpen(true)}
              previewHref={publicCode ? `/p/${previewCode}` : undefined}
            />
          </aside>
        </div>
      </Form>

      <AddBlockModal open={addBlockOpen} onClose={() => setAddBlockOpen(false)} onPickLive={(type) => addBlock(type)} />

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800 bg-zinc-950/96 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_40px_rgba(0,0,0,0.45)] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-3">
          <Button
            type="button"
            size="sm"
            className="shrink-0 rounded-full bg-brand-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-md shadow-brand-900/25 hover:bg-brand-500"
            onClick={() => setAddBlockOpen(true)}
          >
            Add block
          </Button>
          {shareControls ? <div className="flex shrink-0 gap-1">{shareControls}</div> : null}
          <div className="flex flex-1 justify-end gap-2">{publishControls}</div>
        </div>
      </div>
    </div>
  );
}
