import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Form, Link, redirect, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { Button, buttonClassName } from "~/components/ui/Button";
import { Card, CardBody, CardHeader } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { pageRepository } from "~/modules/page-builder/page-repository.server";
import { requireD1Database } from "~/modules/db/db.server";
import { requireUser } from "~/modules/auth/session.server";
import { cn } from "~/utils/cn";

function StatusBadge(props: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-1 text-xs font-medium capitalize",
        props.status === "published" && "bg-emerald-50 text-emerald-700",
        props.status === "draft" && "bg-amber-50 text-amber-700",
        props.status === "archived" && "bg-slate-100 text-slate-600"
      )}
    >
      {props.status}
    </span>
  );
}

function pageActionError(error: unknown) {
  if (error instanceof Error && error.message === "page_not_found") {
    return "That page could not be found in your workspace.";
  }
  if (error instanceof Error && error.message === "page_title_too_long") {
    return "Page title must be 120 characters or less.";
  }
  return "Page action failed. Please try again.";
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = await requireUser(request, context);
  const db = requireD1Database(context);
  const pages = await pageRepository(db).listPages(user.workspaceId);
  return { pages };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const user = await requireUser(request, context);
  const db = requireD1Database(context);
  const repo = pageRepository(db);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "create");

  try {
    if (intent === "publish" || intent === "unpublish") {
      const pageId = String(form.get("pageId") ?? "");
      if (!pageId) {
        return json({ ok: false, error: "Choose a page before changing publish status." }, { status: 400 });
      }

      await repo.setPublishStatus({
        workspaceId: user.workspaceId,
        userId: user.id,
        pageId,
        status: intent === "publish" ? "published" : "draft"
      });
      return redirect(`/app/pages?notice=${intent === "publish" ? "published" : "unpublished"}`);
    }

    const title = String(form.get("title") ?? "").trim();
    if (!title) {
      return json({ ok: false, error: "Enter a page title before creating a page." }, { status: 400 });
    }

    const page = await repo.createPage({
      workspaceId: user.workspaceId,
      userId: user.id,
      title,
      slug: title
    });

    if (!page) {
      return json({ ok: false, error: "Unable to create page. Please try again." }, { status: 500 });
    }

    return redirect(`/app/pages/${page.page.id}/edit?notice=created`);
  } catch (error) {
    return json({ ok: false, error: pageActionError(error) }, { status: 400 });
  }
}

export default function OwnerPages() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const notice = searchParams.get("notice");
  const isSubmitting = navigation.state !== "idle";

  return (
    <Card>
      <CardHeader
        title="Pages"
        description="Create pages, manage publish status, and open public short links."
        right={
          <Form method="post" className="flex items-center gap-2">
            <input type="hidden" name="intent" value="create" />
            <Input name="title" placeholder="New page title" className="w-44" />
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Working..." : "Create page"}
            </Button>
          </Form>
        }
      />
      <CardBody>
        {actionData?.ok === false ? (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {actionData.error}
          </div>
        ) : null}
        {notice ? (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Page {notice} successfully.
          </div>
        ) : null}

        {data.pages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-700">
            <div className="font-medium text-slate-900">No pages yet</div>
            <div className="mt-1">Create your first smart page to start publishing.</div>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {data.pages.map((p) => {
              const publicCode = p.status === "published" && p.short_link_status === "active" ? p.short_code : null;
              return (
                <div key={p.id} className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium text-slate-900">{p.title}</div>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {publicCode ? <span>Short link: /p/{publicCode}</span> : <span>No public short link until published.</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {publicCode ? (
                      <>
                        <Link
                          to={`/p/${publicCode}`}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonClassName({ size: "sm", variant: "ghost" })}
                        >
                          View public
                        </Link>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}/p/${publicCode}`)}
                        >
                          Copy link
                        </Button>
                      </>
                    ) : null}
                    <Form method="post">
                      <input type="hidden" name="pageId" value={p.id} />
                      {p.status === "published" ? (
                        <Button type="submit" name="intent" value="unpublish" size="sm" variant="secondary" disabled={isSubmitting}>
                          Unpublish
                        </Button>
                      ) : (
                        <Button type="submit" name="intent" value="publish" size="sm" variant="secondary" disabled={isSubmitting}>
                          Publish
                        </Button>
                      )}
                    </Form>
                    <Link
                      to={`/app/pages/${p.id}/edit`}
                      className={buttonClassName({ size: "sm" })}
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
