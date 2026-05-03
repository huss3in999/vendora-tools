import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { Button } from "~/components/ui/Button";
import { Card, CardBody, CardHeader } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { requireUserRole } from "~/modules/auth/session.server";
import { requireD1Database } from "~/modules/db/db.server";
import { adminRepository } from "~/modules/admin/admin-repository.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireUserRole(request, context, "super_admin");
  const db = requireD1Database(context);
  const pages = await adminRepository(db).listPages();
  return { pages };
}

export default function AdminPages() {
  const data = useLoaderData<typeof loader>();

  return (
    <Card>
      <CardHeader
        title="Pages"
        description="Read-only platform page inventory."
        right={<Input placeholder="Filter pages (coming later)" className="w-56 bg-slate-50" readOnly />}
      />
      <CardBody>
        {data.pages.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            No pages yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Page</th>
                  <th className="px-4 py-3 font-medium">Workspace</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Short link</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.pages.map((page) => (
                  <tr key={page.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{page.title}</div>
                      <div className="text-slate-600">Created {page.created_at}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-900">{page.workspace_name}</div>
                      <div className="text-slate-600">{page.workspace_slug}</div>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-700">{page.status}</td>
                    <td className="px-4 py-3">
                      {page.short_code ? (
                        <Link to={`/p/${page.short_code}`} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="ghost">/p/{page.short_code}</Button>
                        </Link>
                      ) : (
                        <span className="text-slate-500">Not published</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{page.updated_at}</td>
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
