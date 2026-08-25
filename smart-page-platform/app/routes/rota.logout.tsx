import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { destroyRotaSession } from "~/modules/rota/session.server";

export async function action({ request, context }: ActionFunctionArgs) {
  return destroyRotaSession(request, context);
}

export default function RotaLogout() {
  return null;
}
