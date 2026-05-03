import {
  catalogLiveBlockGroups,
  type CatalogBlockEntry
} from "~/components/page-editor/block-catalog";
import type { BlockType } from "~/modules/page-builder/blocks";

export function AddBlockModal(props: {
  open: boolean;
  onClose: () => void;
  onPickLive: (type: BlockType) => void;
}) {
  if (!props.open) return null;

  const liveGroups = catalogLiveBlockGroups();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="add-block-title">
      <button type="button" className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={props.onClose} aria-label="Close add block dialog" />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col rounded-t-[1.25rem] border border-zinc-700 bg-zinc-900 shadow-2xl sm:max-h-[88vh] sm:rounded-[1.25rem]">
        <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id="add-block-title" className="text-xl font-semibold tracking-tight text-white">
              New block
            </h2>
            <p className="mt-2 text-sm text-zinc-400">All available blocks are ready to use.</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
            onClick={props.onClose}
            aria-label="Close"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2 sm:px-6">
          <div className="space-y-6">
            {liveGroups.map((group) => (
              <section key={group.title}>
                <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{group.title}</h3>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {group.blocks.map((entry) => (
                    <TileButton
                      key={entry.type}
                      entry={entry}
                      onPick={() => props.onPickLive(entry.type)}
                      onClose={props.onClose}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="flex justify-end border-t border-zinc-800 px-5 py-3 sm:px-6">
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
            onClick={props.onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function TileButton(props: {
  entry: Extract<CatalogBlockEntry, { kind: "live" }>;
  onPick: () => void;
  onClose: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        props.onPick();
        props.onClose();
      }}
      className="flex flex-col items-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-800/60 p-3 text-center transition hover:border-brand-500/60 hover:bg-zinc-700/80 active:scale-[0.98]"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-2xl text-zinc-100 shadow-inner ring-1 ring-white/5">
        {props.entry.icon}
      </span>
      <span className="text-[11px] font-medium leading-tight text-zinc-100">{props.entry.label}</span>
    </button>
  );
}
