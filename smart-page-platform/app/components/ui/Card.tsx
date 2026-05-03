import { cn } from "~/utils/cn";

export function Card(props: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-sm",
        props.className
      )}
    >
      {props.children}
    </div>
  );
}

export function CardHeader(props: {
  className?: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-slate-200 p-5",
        props.className
      )}
    >
      <div>
        <div className="text-base font-semibold text-slate-900">
          {props.title}
        </div>
        {props.description ? (
          <div className="mt-1 text-sm text-slate-600">{props.description}</div>
        ) : null}
      </div>
      {props.right ? <div>{props.right}</div> : null}
    </div>
  );
}

export function CardBody(props: { className?: string; children: React.ReactNode }) {
  return <div className={cn("p-5", props.className)}>{props.children}</div>;
}

