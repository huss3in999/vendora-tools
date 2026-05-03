import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { logout } from "~/modules/auth/session.server";

export async function action({ request, context }: ActionFunctionArgs) {
  return logout(request, context);
}

export default function Logout() {
  return null;
}

