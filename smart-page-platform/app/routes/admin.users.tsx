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
  const users = await adminRepository(db).listUsers();
  return { users };
}

export default function AdminUsers() {
  const data = useLoaderData<typeof loader>();

  return (
    <Card>
      <CardHeader
        title="Users"
        description="Read-only platform users. Destructive actions are intentionally disabled in Phase 1."
        right={<Input placeholder="Search users (coming later)" className="w-56 bg-slate-50" readOnly />}
      />
      <CardBody>
        {data.users.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            No users yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Last login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{user.name}</div>
                      <div className="text-slate-600">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-700">{user.role}</td>
                    <td className="px-4 py-3 text-slate-600">{user.created_at}</td>
                    <td className="px-4 py-3 text-slate-600">{user.last_login_at ?? "Never"}</td>
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
