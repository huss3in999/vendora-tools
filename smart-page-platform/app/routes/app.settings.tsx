import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useSearchParams
} from "@remix-run/react";
import { Button } from "~/components/ui/Button";
import { Card, CardBody, CardHeader } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { requireUser } from "~/modules/auth/session.server";
import { requireD1Database } from "~/modules/db/db.server";
import { workspaceRepository } from "~/modules/workspace/workspace-repository.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await requireUser(request, context);
  const db = requireD1Database(context);
  const repo = workspaceRepository(db);
  const [workspace, account] = await Promise.all([
    repo.getWorkspace(user.workspaceId),
    repo.getCurrentAccount(user.id, user.workspaceId)
  ]);

  if (!workspace || !account) {
    throw new Response("Workspace not found", { status: 404 });
  }

  return { workspace, account };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const user = await requireUser(request, context);
  const db = requireD1Database(context);
  const form = await request.formData();
  const name = String(form.get("workspaceName") ?? "");

  try {
    await workspaceRepository(db).updateWorkspaceName({
      workspaceId: user.workspaceId,
      name
    });
  } catch {
    return json({ ok: false, error: "Workspace name is required." }, { status: 400 });
  }

  return redirect("/app/settings?notice=settings-updated");
}

export default function OwnerSettings() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const isSubmitting = navigation.state !== "idle";
  const notice = searchParams.get("notice");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Workspace settings"
          description="Basic workspace identity for Phase 1."
        />
        <CardBody>
          {actionData?.ok === false ? (
            <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {actionData.error}
            </div>
          ) : null}
          {notice === "settings-updated" ? (
            <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Workspace settings updated.
            </div>
          ) : null}
          <Form method="post" className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Workspace name</label>
                <Input name="workspaceName" defaultValue={data.workspace.name} required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Workspace slug</label>
                <Input value={data.workspace.slug} readOnly className="bg-slate-50" />
              </div>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save workspace"}
            </Button>
          </Form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Account" description="Current signed-in user." />
        <CardBody>
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-slate-500">Name</div>
              <div className="mt-1 font-medium text-slate-900">{data.account.name}</div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-slate-500">Email</div>
              <div className="mt-1 font-medium text-slate-900">{data.account.email}</div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-slate-500">Role</div>
              <div className="mt-1 font-medium capitalize text-slate-900">{data.account.role}</div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
