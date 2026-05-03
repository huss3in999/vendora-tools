import { Link, NavLink, Outlet, useLocation } from "@remix-run/react";
import { Logo } from "~/components/brand/Logo";
import { cn } from "~/utils/cn";

const TAPLINK_EDITOR_PATH = /^\/app\/pages\/[^/]+\/edit\/?$/;

export function AppShell(props: { mode: "owner" | "super_admin"; userEmail?: string }) {
  const location = useLocation();
  const taplinkEditorLayout =
    props.mode === "owner" && TAPLINK_EDITOR_PATH.test(location.pathname);

  if (taplinkEditorLayout) {
    return (
      <div className="min-h-screen bg-[#090b10] text-zinc-100">
        <header className="sticky top-0 z-40 border-b border-zinc-800/95 bg-[#0c0f16]/92 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-8">
              <Link to="/app/pages" className="min-w-0 shrink-0">
                <Logo tone="dark" />
              </Link>
              <Link
                to="/app/pages"
                className="truncate text-sm font-medium text-zinc-400 transition hover:text-white"
              >
                ← Pages
              </Link>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {props.userEmail ? (
                <span className="hidden max-w-[160px] truncate text-xs text-zinc-500 sm:inline">
                  {props.userEmail}
                </span>
              ) : null}
              <form action="/logout" method="post">
                <button
                  type="submit"
                  className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800 hover:text-white"
                >
                  Log out
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 pb-36 pt-5 sm:px-6 lg:pb-12">
          <Outlet />
        </main>
      </div>
    );
  }

  const nav =
    props.mode === "super_admin"
      ? [
          { to: "/admin", label: "Overview" },
          { to: "/admin/tenants", label: "Tenants" },
          { to: "/admin/users", label: "Users" },
          { to: "/admin/pages", label: "Pages" },
          { to: "/admin/settings", label: "Platform settings" }
        ]
      : [
          { to: "/app", label: "Dashboard" },
          { to: "/app/pages", label: "Pages" },
          { to: "/app/analytics", label: "Analytics" },
          { to: "/app/leads", label: "Leads" },
          { to: "/app/settings", label: "Settings" }
        ];

  return (
    <div className="min-h-screen">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to={props.mode === "super_admin" ? "/admin" : "/app"}>
            <Logo />
          </Link>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            {props.mode === "super_admin" ? (
              <span className="rounded-full bg-slate-900 px-2 py-1 text-xs font-medium text-white">
                Super Admin
              </span>
            ) : (
              <span className="rounded-full bg-brand-600 px-2 py-1 text-xs font-medium text-white">
                Owner
              </span>
            )}
            {props.userEmail ? <span>{props.userEmail}</span> : null}
            <form action="/logout" method="post">
              <button className="rounded-md px-2 py-1 text-sm text-slate-900 hover:bg-slate-100">
                Logout
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-12 gap-6 px-6 py-6">
        <aside className="col-span-12 md:col-span-3">
          <nav className="space-y-1 rounded-xl border border-slate-200 bg-white p-2">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/app" || item.to === "/admin"}
                className={({ isActive }) =>
                  cn(
                    "block rounded-lg px-3 py-2 text-sm font-medium",
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="col-span-12 md:col-span-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

