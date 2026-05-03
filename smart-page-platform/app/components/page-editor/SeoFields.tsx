import { EditorSection } from "~/components/page-editor/EditorSection";
import { Card, CardBody, CardHeader } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";

type SeoFieldsInnerProps = {
  seoTitle: string;
  seoDescription: string;
  allowIndexing: boolean;
  onSeoTitle: (value: string) => void;
  onSeoDescription: (value: string) => void;
  onAllowIndexing: (value: boolean) => void;
  editor: boolean;
};

export function SeoFields(props: {
  seoTitle: string;
  seoDescription: string;
  allowIndexing: boolean;
  onSeoTitle: (value: string) => void;
  onSeoDescription: (value: string) => void;
  onAllowIndexing: (value: boolean) => void;
  appearance?: "default" | "editor";
}) {
  const editor = props.appearance === "editor";
  const innerProps: SeoFieldsInnerProps = {
    seoTitle: props.seoTitle,
    seoDescription: props.seoDescription,
    allowIndexing: props.allowIndexing,
    onSeoTitle: props.onSeoTitle,
    onSeoDescription: props.onSeoDescription,
    onAllowIndexing: props.onAllowIndexing,
    editor
  };

  if (editor) {
    return (
      <EditorSection
        title="Search visibility"
        description="Controls how /p links appear in Google when published. Leave SEO fields blank to derive title and snippet from your page content."
      >
        <SeoFieldsInner {...innerProps} />
      </EditorSection>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Search visibility"
        description="Controls how /p links appear in Google when published. Leave SEO fields blank to derive title and snippet from your page content."
      />
      <CardBody className="space-y-4">
        <SeoFieldsInner {...innerProps} />
      </CardBody>
    </Card>
  );
}

function SeoFieldsInner(props: SeoFieldsInnerProps) {
  const editor = props.editor;
  const labelCls = editor ? "text-sm font-medium text-zinc-300" : "text-sm font-medium text-slate-700";
  const textareaCls = editor
    ? "w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/55"
    : "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <div className="space-y-4">
      <input type="hidden" name="allowIndexing" value={props.allowIndexing ? "1" : "0"} />
      <label
        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${
          editor
            ? "border-zinc-600 bg-zinc-950/80"
            : "border-slate-200 bg-slate-50"
        }`}
      >
        <input
          type="checkbox"
          className="mt-1"
          checked={props.allowIndexing}
          onChange={(event) => props.onAllowIndexing(event.target.checked)}
        />
        <span>
          <span className={`block text-sm font-semibold ${editor ? "text-white" : "text-slate-900"}`}>
            Allow search engines to index this page
          </span>
          <span className={`mt-1 block text-xs ${editor ? "text-zinc-400" : "text-slate-600"}`}>
            Turn off for private pages—your public URL still works by link, but won&apos;t appear in Google or the
            platform sitemap.
          </span>
        </span>
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1 md:col-span-2">
          <label className={labelCls}>SEO title (optional)</label>
          <Input
            name="seoTitle"
            variant={editor ? "dark" : "default"}
            value={props.seoTitle}
            onChange={(event) => props.onSeoTitle(event.target.value)}
            placeholder="Overrides browser tab title when set"
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className={labelCls}>SEO description (optional)</label>
          <textarea
            name="seoDescription"
            value={props.seoDescription}
            onChange={(event) => props.onSeoDescription(event.target.value)}
            placeholder="Short summary for Google & social previews—defaults from profile subtitle or first text block."
            rows={3}
            className={textareaCls}
          />
        </div>
      </div>
    </div>
  );
}
