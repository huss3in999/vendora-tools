export function Logo(props: { className?: string; tone?: "light" | "dark" }) {
  const tone = props.tone ?? "light";
  return (
    <div className={props.className}>
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 shrink-0 rounded-lg bg-brand-600" />
        <div className="leading-tight">
          <div
            className={tone === "dark" ? "text-sm font-semibold text-white" : "text-sm font-semibold text-slate-900"}
          >
            Smart Page Platform
          </div>
          <div className={tone === "dark" ? "text-xs text-zinc-400" : "text-xs text-slate-500"}>Phase 1</div>
        </div>
      </div>
    </div>
  );
}

