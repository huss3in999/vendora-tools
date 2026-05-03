import { cn } from "~/utils/cn";

export function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { variant?: "default" | "dark" }
) {
  const { className, variant = "default", ...rest } = props;
  return (
    <input
      className={cn(
        variant === "dark"
          ? [
              "h-10 w-full rounded-lg border border-zinc-600 bg-zinc-950 px-3 text-sm text-zinc-100",
              "placeholder:text-zinc-500",
              "focus:outline-none focus:ring-2 focus:ring-brand-500/55 focus:border-brand-500"
            ]
          : [
              "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900",
              "placeholder:text-slate-400",
              "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            ],
        className
      )}
      {...rest}
    />
  );
}

