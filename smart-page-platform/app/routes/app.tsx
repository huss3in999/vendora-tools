import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { AppShell } from "~/components/layout/AppShell";
import { requireUserId } from "~/modules/auth/session.server";

export const meta: MetaFunction = () => [{ name: "robots", content: "noindex, nofollow" }];

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireUserId(request, context);
  return {};
}

export default function AppLayout() {
  return <AppShell mode="owner" />;
}
