import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { AppShell } from "~/components/layout/AppShell";
import { requireUserRole } from "~/modules/auth/session.server";

export const meta: MetaFunction = () => [{ name: "robots", content: "noindex, nofollow" }];

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireUserRole(request, context, "super_admin");
  return {};
}

export default function AdminLayout() {
  return <AppShell mode="super_admin" />;
}
