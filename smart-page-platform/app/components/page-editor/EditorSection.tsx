export function EditorSection(props: {
  title: string;
  description?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900/55 shadow-xl shadow-black/35 ring-1 ring-white/[0.04]">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-700/70 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white">{props.title}</h2>
          {props.description ? (
            <p className="mt-1 text-sm text-zinc-400">{props.description}</p>
          ) : null}
        </div>
        {props.right ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{props.right}</div>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">{props.children}</div>
    </section>
  );
}
