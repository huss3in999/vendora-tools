import { cn } from "~/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function buttonClassName(props: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  const { variant = "primary", size = "md", className } = props;

  return cn(
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition",
    "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-white",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    size === "sm" ? "h-9 px-3" : "h-10 px-4",
    variant === "primary" && "bg-brand-600 text-white hover:bg-brand-700",
    variant === "secondary" && "bg-slate-900 text-white hover:bg-slate-800",
    variant === "ghost" && "bg-transparent text-slate-900 hover:bg-slate-100",
    variant === "danger" && "bg-rose-600 text-white hover:bg-rose-700",
    className
  );
}

export function Button(props: ButtonProps) {
  const {
    children,
    type = "button",
    variant = "primary",
    size = "md",
    className,
    ...rest
  } = props;

  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, className })}
      {...rest}
    >
      {children}
    </button>
  );
}

