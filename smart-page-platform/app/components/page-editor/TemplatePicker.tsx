import { useMemo, useState } from "react";
import { EditorSection } from "~/components/page-editor/EditorSection";
import { Button } from "~/components/ui/Button";
import { Card, CardBody, CardHeader } from "~/components/ui/Card";
import type { PageTemplate } from "~/modules/page-builder/templates";
import { PAGE_TEMPLATES, instantiateTemplateBlocks } from "~/modules/page-builder/templates";
import { sanitizePageTheme } from "~/modules/page-builder/theme";
import { PublicPageFrame } from "~/modules/page-renderer/render";

export function TemplatePicker(props: {
  currentBlocksCount: number;
  createBlockId: () => string;
  onApply: (template: PageTemplate) => void;
  appearance?: "default" | "editor";
}) {
  const [preview, setPreview] = useState<PageTemplate | null>(null);

  const previewBlocks = useMemo(
    () => (preview ? instantiateTemplateBlocks(preview, props.createBlockId) : []),
    [preview, props.createBlockId]
  );

  const editor = props.appearance === "editor";

  function requestApply(template: PageTemplate) {
    if (
      props.currentBlocksCount > 0 &&
      !window.confirm(
        "Replace your current blocks and theme with this template? This updates the editor only — click Save or Publish afterward to store your changes."
      )
    ) {
      return;
    }
    props.onApply(template);
    setPreview(null);
  }

  const pickerBody = (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {PAGE_TEMPLATES.map((template) => (
          <div
            key={template.id}
            className={`flex flex-col rounded-xl border p-4 shadow-sm ${
              editor
                ? "border-zinc-600 bg-gradient-to-br from-zinc-900 to-zinc-950 ring-1 ring-white/[0.05]"
                : "border-slate-200 bg-gradient-to-br from-white to-slate-50"
            }`}
          >
            <div className={`text-xs font-semibold uppercase tracking-wide ${editor ? "text-brand-400" : "text-brand-700"}`}>
              {template.category}
            </div>
            <div className={`mt-1 font-semibold ${editor ? "text-white" : "text-slate-950"}`}>{template.name}</div>
            <p className={`mt-2 min-h-12 flex-1 text-sm leading-6 ${editor ? "text-zinc-400" : "text-slate-600"}`}>
              {template.description}
            </p>
            <p className={`mt-3 text-xs italic ${editor ? "text-zinc-500" : "text-slate-500"}`}>Footer: {template.footerText}</p>
            <div className={`mt-3 flex flex-wrap gap-2 text-xs ${editor ? "text-zinc-400" : "text-slate-600"}`}>
              <span className={`rounded-full px-2 py-1 font-medium ${editor ? "bg-zinc-800 text-zinc-200" : "bg-slate-100"}`}>
                Button: {template.recommendedButtonStyle}
              </span>
              <span className={`rounded-full px-2 py-1 font-medium ${editor ? "bg-zinc-800 text-zinc-200" : "bg-slate-100"}`}>
                Layout: {template.layoutStyle}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button type="button" size="sm" variant="secondary" className="w-full" onClick={() => setPreview(template)}>
                Preview
              </Button>
              <Button type="button" size="sm" className="w-full" onClick={() => requestApply(template)}>
                Apply
              </Button>
            </div>
          </div>
        ))}
      </div>
      <p className={`mt-4 text-xs ${editor ? "text-zinc-500" : "text-slate-500"}`}>
        Applying updates theme and blocks in the editor only. Use Save or Publish to persist.
      </p>
    </>
  );

  return (
    <>
      {editor ? (
        <EditorSection
          title="Templates"
          description="Preview a preset, then apply to load theme and starter blocks. Same look as Taplink-style bios."
        >
          {pickerBody}
        </EditorSection>
      ) : (
        <Card>
          <CardHeader
            title="Templates"
            description="Preview a preset, then apply to load theme and starter blocks. Same look as Taplink-style bios."
          />
          <CardBody>{pickerBody}</CardBody>
        </Card>
      )}

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPreview(null)} aria-label="Close preview" />
          <div
            className={`relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl shadow-2xl sm:max-h-[90vh] sm:rounded-2xl ${
              editor ? "border border-zinc-700 bg-zinc-950 text-zinc-100" : "bg-white"
            }`}
          >
            <div className={`flex items-start justify-between gap-3 border-b px-5 py-4 ${editor ? "border-zinc-700" : "border-slate-200"}`}>
              <div>
                <div className={`text-xs font-semibold uppercase ${editor ? "text-brand-400" : "text-brand-700"}`}>
                  {preview.category}
                </div>
                <div className={`text-lg font-semibold ${editor ? "text-white" : "text-slate-950"}`}>{preview.name}</div>
                <p className={`mt-1 text-sm ${editor ? "text-zinc-400" : "text-slate-600"}`}>{preview.description}</p>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setPreview(null)}>
                Close
              </Button>
            </div>
            <div className="overflow-y-auto px-4 py-4">
              <div className={`rounded-xl p-3 ${editor ? "bg-zinc-900" : "bg-slate-100"}`}>
                <div className="mx-auto aspect-[9/17] max-h-[55vh] w-full max-w-[320px] overflow-hidden rounded-[2rem] border-[8px] border-zinc-950 bg-zinc-950 shadow-lg">
                  <div className="h-full overflow-y-auto rounded-[1.5rem] bg-white">
                    <PublicPageFrame code="preview" blocks={previewBlocks} theme={sanitizePageTheme(preview.theme)} />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button type="button" className="flex-1" variant="secondary" onClick={() => setPreview(null)}>
                  Cancel
                </Button>
                <Button type="button" className="flex-1" onClick={() => requestApply(preview)}>
                  Apply template
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
