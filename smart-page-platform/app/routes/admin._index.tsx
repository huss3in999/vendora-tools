import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { Card, CardBody, CardHeader } from "~/components/ui/Card";
import { requireUserRole } from "~/modules/auth/session.server";
import { requireD1Database } from "~/modules/db/db.server";
import { adminRepository } from "~/modules/admin/admin-repository.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  await requireUserRole(request, context, "super_admin");
  const db = requireD1Database(context);
  const summary = await adminRepository(db).platformSummary();
  return { summary };
}

export default function SuperAdminDashboard() {
  const { summary } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Super admin dashboard"
          description="Read-only Phase 1 platform overview."
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600">Users</div>
              <div className="mt-1 text-2xl font-semibold">{summary.totalUsers}</div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600">Workspaces</div>
              <div className="mt-1 text-2xl font-semibold">{summary.totalWorkspaces}</div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600">Pages</div>
              <div className="mt-1 text-2xl font-semibold">{summary.totalPages}</div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600">Published pages</div>
              <div className="mt-1 text-2xl font-semibold">{summary.totalPublishedPages}</div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600">Views</div>
              <div className="mt-1 text-2xl font-semibold">{summary.totalPageViews}</div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600">Clicks</div>
              <div className="mt-1 text-2xl font-semibold">{summary.totalClicks}</div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600">Lead submissions</div>
              <div className="mt-1 text-2xl font-semibold">{summary.totalLeads ?? 0}</div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
