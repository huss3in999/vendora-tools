import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { Card, CardBody, CardHeader } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { requireUserRole } from "~/modules/auth/session.server";
import { requireD1Database } from "~/modules/db/db.server";
import { adminRepository } from "~/modules/admin/admin-repository.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireUserRole(request, context, "super_admin");
  const db = requireD1Database(context);
  const workspaces = await adminRepository(db).listWorkspaces();
  return { workspaces };
}

export default function AdminTenants() {
  const data = useLoaderData<typeof loader>();

  return (
    <Card>
      <CardHeader
        title="Tenants"
        description="Read-only workspace overview for Phase 1."
        right={<Input placeholder="Filter tenants (coming later)" className="w-56 bg-slate-50" readOnly />}
      />
      <CardBody>
        {data.workspaces.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            No workspaces yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Workspace</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Owners</th>
                  <th className="px-4 py-3 font-medium">Pages</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.workspaces.map((workspace) => (
                  <tr key={workspace.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{workspace.name}</div>
                      <div className="text-slate-600">{workspace.slug}</div>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-700">{workspace.status}</td>
                    <td className="px-4 py-3 text-slate-600">{workspace.owner_count}</td>
                    <td className="px-4 py-3 text-slate-600">{workspace.page_count}</td>
                    <td className="px-4 py-3 text-slate-600">{workspace.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
