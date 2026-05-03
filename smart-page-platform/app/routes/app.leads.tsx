import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { Card, CardBody, CardHeader } from "~/components/ui/Card";
import { requireUser } from "~/modules/auth/session.server";
import { requireD1Database } from "~/modules/db/db.server";
import { leadRepository } from "~/modules/leads/lead-repository.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await requireUser(request, context);
  const db = requireD1Database(context);
  const leads = await leadRepository(db).recentForWorkspace(user.workspaceId, 300);
  return { leads };
}

export default function OwnerLeads() {
  const { leads } = useLoaderData<typeof loader>();

  return (
    <Card>
      <CardHeader
        title="Leads"
        description="Private lead submissions from your published form blocks."
      />
      <CardBody>
        {leads.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            No leads yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Page</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Message</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{lead.page_title}</td>
                    <td className="px-4 py-3 text-slate-700">{lead.name || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{lead.phone || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{lead.email || "—"}</td>
                    <td className="max-w-sm whitespace-pre-wrap px-4 py-3 text-slate-700">
                      {lead.message || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{lead.created_at}</td>
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
