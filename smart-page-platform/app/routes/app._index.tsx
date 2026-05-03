import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Link, useLoaderData } from "@remix-run/react";
import { Card, CardBody, CardHeader } from "~/components/ui/Card";
import { Button } from "~/components/ui/Button";
import { requireUser } from "~/modules/auth/session.server";
import { analyticsRepository } from "~/modules/analytics/analytics.server";
import { requireD1Database } from "~/modules/db/db.server";
import { pageRepository } from "~/modules/page-builder/page-repository.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await requireUser(request, context);
  const db = requireD1Database(context);
  const [analytics, pageStats] = await Promise.all([
    analyticsRepository(db).ownerSummary(user.workspaceId),
    pageRepository(db).workspacePageStats(user.workspaceId)
  ]);

  return {
    totalPages: pageStats.totalPages,
    publishedPages: pageStats.publishedPages,
    draftPages: pageStats.draftPages,
    visitsCount: analytics.totalPageViews,
    clicksCount: analytics.totalClicks,
    latestPages: pageStats.latestPages
  };
}

export default function OwnerDashboard() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Owner dashboard"
          description="Your workspace at a glance."
          right={
            <Link to="/app/pages">
              <Button size="sm">Manage pages</Button>
            </Link>
          }
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600">Total pages</div>
              <div className="mt-1 text-2xl font-semibold">{data.totalPages}</div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600">Published</div>
              <div className="mt-1 text-2xl font-semibold">{data.publishedPages}</div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600">Drafts</div>
              <div className="mt-1 text-2xl font-semibold">{data.draftPages}</div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600">Views</div>
              <div className="mt-1 text-2xl font-semibold">{data.visitsCount}</div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600">Clicks</div>
              <div className="mt-1 text-2xl font-semibold">{data.clicksCount}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Latest page activity" description="Recently updated workspace pages." />
        <CardBody>
          {data.latestPages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
              No page activity yet. Create a page to get started.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
              {data.latestPages.map((page) => (
                <div key={page.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium text-slate-900">{page.title}</div>
                    <div className="text-sm text-slate-600">
                      {page.status} - updated {page.updated_at}
                    </div>
                  </div>
                  <Link to={`/app/pages/${page.id}/edit`}>
                    <Button size="sm" variant="ghost">Open</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
