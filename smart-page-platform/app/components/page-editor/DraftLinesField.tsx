import { useEffect, useState } from "react";

/**
 * Multi-line “one row per record” fields were controlled directly from parsed props.
 * Strict parsers dropped incomplete rows, so the textarea kept resetting while typing.
 * This component keeps local text and only resyncs when the saved canonical value
 * diverges from what the current draft would produce (e.g. template apply).
 */
export function DraftLinesField(props: {
  /** e.g. block.id — reset draft when switching blocks */
  resetKey: string;
  /** Serialized value from parent props */
  canonical: string;
  /** Round-trip normalize for the current draft text */
  normalize: (raw: string) => string;
  onDraftChange: (raw: string) => void;
  placeholder: string;
  help: string;
}) {
  const [text, setText] = useState(() => props.canonical);

  useEffect(() => {
    setText(props.canonical);
  }, [props.resetKey]);

  useEffect(() => {
    if (props.normalize(text) !== props.canonical) {
      setText(props.canonical);
    }
  }, [props.canonical, props.normalize, text]);

  return (
    <div className="space-y-1 md:col-span-2">
      <textarea
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          props.onDraftChange(next);
        }}
        placeholder={props.placeholder}
        spellCheck={false}
        className="min-h-28 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/55"
      />
      <div className="text-xs text-zinc-500">{props.help}</div>
    </div>
  );
}
