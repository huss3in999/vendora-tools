import { useState } from "react";
import type { DividerBlockProps, DividerSpacingStep, DividerVariant } from "~/modules/page-builder/blocks";
import { Input } from "~/components/ui/Input";
import { cn } from "~/utils/cn";

const STEP_LABELS = ["0x", "1x", "2x", "3x", "4x"] as const;

const VARIANTS: { value: DividerVariant; title: string; hint: string }[] = [
  { value: "empty", title: "Empty", hint: "Spacer only" },
  { value: "simple", title: "Simple line", hint: "Single rule" },
  { value: "decorative", title: "Decorative", hint: "Line · ★ · line" },
  { value: "classic", title: "Split + label", hint: "Original look" }
];

function StepSlider(props: {
  label: string;
  value: DividerSpacingStep;
  onChange: (v: DividerSpacingStep) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-zinc-300">{props.label}</span>
        <span className="text-xs font-semibold text-brand-400">{STEP_LABELS[props.value]}</span>
      </div>
      <input
        type="range"
        min={0}
        max={4}
        step={1}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value) as DividerSpacingStep)}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-800 accent-brand-500"
      />
    </div>
  );
}

function ToggleRow(props: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-zinc-700/80 bg-zinc-950/50 px-4 py-3",
        props.disabled && "cursor-not-allowed opacity-45"
      )}
    >
      <span>
        <span className="block text-sm font-medium text-zinc-200">{props.label}</span>
        {props.description ? <span className="mt-0.5 block text-xs text-zinc-500">{props.description}</span> : null}
      </span>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-600 bg-zinc-900 text-brand-600 focus:ring-brand-500/50"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.checked)}
      />
    </label>
  );
}

export function DividerBlockEditor(props: {
  props: DividerBlockProps;
  onPatch: (next: Partial<DividerBlockProps>) => void;
}) {
  const [tab, setTab] = useState<"content" | "settings" | "section">("content");
  const p = props.props;
  const variant = p.variant ?? "classic";
  const indent = p.indent ?? 2;
  const paddingTop = p.paddingTop ?? 0;
  const paddingBottom = p.paddingBottom ?? 0;

  const tabs = (
    <div className="mb-4 flex gap-8 border-b border-zinc-700">
      {(
        [
          ["content", "Content"],
          ["settings", "Settings"],
          ["section", "Section"]
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          className={cn(
            "relative pb-3 text-[11px] font-semibold uppercase tracking-[0.14em] transition",
            tab === id ? "text-white" : "text-zinc-500 hover:text-zinc-300"
          )}
          onClick={() => setTab(id)}
        >
          {label}
          {tab === id ? <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-500" /> : null}
        </button>
      ))}
    </div>
  );

  return (
    <div className="md:col-span-2">
      {tabs}

      {tab === "content" ? (
        <div className="space-y-5">
          <StepSlider
            label="Indent size"
            value={indent}
            onChange={(v) => props.onPatch({ indent: v })}
          />

          <div>
            <div className="mb-2 text-sm font-medium text-zinc-300">Divider type</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {VARIANTS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => props.onPatch({ variant: opt.value })}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition",
                    variant === opt.value
                      ? "border-brand-500/80 bg-brand-500/10 ring-1 ring-brand-500/30"
                      : "border-zinc-700 bg-zinc-950/60 hover:border-zinc-600"
                  )}
                >
                  <span className="text-xs font-semibold text-zinc-100">{opt.title}</span>
                  <span className="text-[10px] leading-tight text-zinc-500">{opt.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {variant !== "empty" ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-zinc-300">Line settings</div>
              <ToggleRow
                label="Full width line"
                description="Bleed closer to screen edges on narrow layouts."
                checked={Boolean(p.fullWidth)}
                onChange={(v) => props.onPatch({ fullWidth: v })}
              />
              <ToggleRow
                label="Translucent edges"
                description="Soft fade at the ends of the rule."
                checked={Boolean(p.softEdges)}
                onChange={(v) => props.onPatch({ softEdges: v })}
              />
            </div>
          ) : null}

          {variant !== "empty" ? (
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-300">
                {variant === "decorative" ? "Optional caption (under star)" : "Center label (optional)"}
              </label>
              <Input
                variant="dark"
                value={p.label ?? ""}
                onChange={(e) => props.onPatch({ label: e.target.value || undefined })}
                placeholder={variant === "simple" ? "Usually left blank for a plain line" : "e.g. Section title"}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "settings" ? (
        <div className="space-y-3">
          <ToggleRow
            label="Hide block on public page"
            description="Keeps the block in the editor; visitors won’t see it."
            checked={Boolean(p.hidden)}
            onChange={(v) => props.onPatch({ hidden: v })}
          />
          <ToggleRow
            label="Extra vertical spacing"
            description="Adds space above this divider."
            checked={Boolean(p.extraVerticalSpacing)}
            onChange={(v) => props.onPatch({ extraVerticalSpacing: v })}
          />
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-300">Block name (editor only)</label>
            <Input
              variant="dark"
              value={p.editorLabel ?? ""}
              onChange={(e) => props.onPatch({ editorLabel: e.target.value || undefined })}
              placeholder="e.g. Hero → links divider"
            />
          </div>
          <div className="flex items-start justify-between gap-4 rounded-xl border border-zinc-800/80 bg-zinc-950/30 px-4 py-3 opacity-70">
            <span>
              <span className="block text-sm font-medium text-zinc-400">Show according to schedule</span>
              <span className="mt-0.5 block text-xs text-zinc-600">Time-based visibility.</span>
            </span>
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-zinc-500">Soon</span>
          </div>
          <div className="flex items-start justify-between gap-4 rounded-xl border border-zinc-800/80 bg-zinc-950/30 px-4 py-3 opacity-70">
            <span>
              <span className="block text-sm font-medium text-zinc-400">Show by days of the week</span>
              <span className="mt-0.5 block text-xs text-zinc-600">Limit visibility to selected weekdays.</span>
            </span>
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-zinc-500">Soon</span>
          </div>
          <p className="text-xs text-zinc-600">Schedule rules are planned for a later release.</p>
        </div>
      ) : null}

      {tab === "section" ? (
        <div className="space-y-5">
          <StepSlider
            label="Top padding"
            value={paddingTop}
            onChange={(v) => props.onPatch({ paddingTop: v })}
          />
          <StepSlider
            label="Bottom padding"
            value={paddingBottom}
            onChange={(v) => props.onPatch({ paddingBottom: v })}
          />
          <ToggleRow
            label="Edge indent"
            description="Narrow the divider within the page column."
            checked={Boolean(p.edgeIndent)}
            onChange={(v) => props.onPatch({ edgeIndent: v })}
          />
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-300">Section background</label>
            <Input
              variant="dark"
              value={p.sectionBackground ?? ""}
              onChange={(e) => props.onPatch({ sectionBackground: e.target.value.trim() || undefined })}
              placeholder="#0f172a or #fff"
            />
            <p className="text-xs text-zinc-500">Hex color only. Leave empty for no band behind this block.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
