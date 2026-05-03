import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { Card, CardBody, CardHeader } from "~/components/ui/Card";
import { requireUser } from "~/modules/auth/session.server";
import { analyticsRepository } from "~/modules/analytics/analytics.server";
import { requireD1Database } from "~/modules/db/db.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await requireUser(request, context);
  const db = requireD1Database(context);
  const summary = await analyticsRepository(db).ownerSummary(user.workspaceId);
  return { summary };
}

export default function OwnerAnalytics() {
  const { summary } = useLoaderData<typeof loader>();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Analytics"
          description="Privacy-conscious Phase 1 summary for published page views and clicks."
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600">Total page views</div>
              <div className="mt-1 text-2xl font-semibold">{summary.totalPageViews}</div>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm text-slate-600">Total clicks</div>
              <div className="mt-1 text-2xl font-semibold">{summary.totalClicks}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Top pages" description="Total views by page." />
        <CardBody>
          {summary.topPages.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No page views yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
              {summary.topPages.map((page) => (
                <div key={page.page_id} className="flex items-center justify-between p-4">
                  <div className="font-medium text-slate-900">{page.title}</div>
                  <div className="text-sm text-slate-600">{page.views} views</div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Top clicked blocks" description="Most-clicked link/contact blocks." />
        <CardBody>
          {summary.topClickedBlocks.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No clicks yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
              {summary.topClickedBlocks.map((block) => (
                <div
                  key={`${block.page_id}-${block.block_id}-${block.block_type}`}
                  className="flex items-center justify-between p-4"
                >
                  <div>
                    <div className="font-medium text-slate-900">{block.page_title}</div>
                    <div className="text-sm text-slate-600">
                      {block.block_type} - {block.block_id}
                    </div>
                  </div>
                  <div className="text-sm text-slate-600">{block.clicks} clicks</div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
