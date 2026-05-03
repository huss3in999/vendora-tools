import { Link } from "@remix-run/react";
import type { Block } from "~/modules/page-builder/blocks";
import type { PageTheme } from "~/modules/page-builder/theme";
import { PublicPageFrame } from "~/modules/page-renderer/render";

export function EditorPhonePreview(props: {
  blocks: Block[];
  theme: PageTheme;
  label: string;
  onAddBlock: () => void;
  /** When set, eye button opens public page in a new tab */
  previewHref?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 shadow-2xl ring-1 ring-white/5">
      <div className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Live preview</div>
      <div className="mx-auto aspect-[9/17] w-full max-w-[340px] max-h-[min(620px,68vh)] overflow-hidden rounded-[2rem] border-[10px] border-zinc-950 bg-zinc-950 shadow-inner">
        <div className="h-full overflow-y-auto rounded-[1.6rem] bg-white" style={{ WebkitOverflowScrolling: "touch" }}>
          <PublicPageFrame code="preview" blocks={props.blocks} theme={props.theme} />
        </div>
      </div>

      <div className="mx-auto mt-4 flex max-w-[340px] items-center gap-2">
        {props.previewHref ? (
          <Link
            to={props.previewHref}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-zinc-200 transition hover:bg-zinc-700"
            aria-label="Open public page in new tab"
            title="Public view"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </Link>
        ) : (
          <span className="h-11 w-11 shrink-0" aria-hidden />
        )}

        <button
          type="button"
          onClick={props.onAddBlock}
          className="min-h-[46px] flex-1 rounded-full bg-brand-600 px-4 text-center text-sm font-bold uppercase tracking-[0.12em] text-white shadow-lg shadow-brand-900/40 transition hover:bg-brand-500 active:scale-[0.98]"
        >
          Add block
        </button>

        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-800/50 text-lg text-zinc-600"
          title="More block tools coming soon"
          aria-hidden
        >
          ≡
        </span>
      </div>

      <p className="mt-3 text-center text-xs text-zinc-500">{props.label}</p>
    </div>
  );
}
