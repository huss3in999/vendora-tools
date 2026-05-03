import type { ActionFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { Button } from "~/components/ui/Button";
import { Card, CardBody, CardHeader } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { authStore } from "~/modules/auth/store.server";
import { createUserSession } from "~/modules/auth/session.server";

export const meta: MetaFunction = () => [
  { title: "Sign up - Smart Page Platform" },
  { name: "robots", content: "noindex, nofollow" }
];

export async function action({ request, context }: ActionFunctionArgs) {
  const form = await request.formData();
  const name = String(form.get("name") ?? "");
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const workspaceName = String(form.get("workspaceName") ?? "");
  const workspaceSlug = String(form.get("workspaceSlug") ?? "");
  const fields = { name, email, workspaceName, workspaceSlug };

  if (!name || !email || !password || !workspaceName || !workspaceSlug) {
    return { ok: false, error: "Please fill all fields.", fields };
  }

  if (password.length < 10) {
    return { ok: false, error: "Use a password with at least 10 characters.", fields };
  }

  const store = authStore(context);
  try {
    const { user, workspace } = await store.createOwnerSignup({
      email,
      name,
      password,
      workspaceName,
      workspaceSlug
    });
    return createUserSession({
      request,
      context,
      userId: user.id,
      workspaceId: workspace.id,
      redirectTo: "/app"
    });
  } catch (e) {
    if (e instanceof Error && e.message === "email_taken") {
      return { ok: false, error: "That email is already in use.", fields };
    }
    if (e instanceof Error && e.message === "workspace_slug_taken") {
      return { ok: false, error: "That workspace slug is already in use.", fields };
    }
    return { ok: false, error: "Signup failed. Please try again.", fields };
  }
}

export default function Signup() {
  const data = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader
            title="Create your account"
            description="Phase 1 creates an owner user and a workspace (tenant)."
          />
          <CardBody>
            <Form method="post" className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Name</label>
                <Input
                  name="name"
                  required
                  placeholder="Hussain"
                  defaultValue={data?.ok === false ? data.fields.name : ""}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <Input
                  name="email"
                  type="email"
                  required
                  placeholder="you@company.com"
                  defaultValue={data?.ok === false ? data.fields.email : ""}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <Input name="password" type="password" required />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Workspace name</label>
                  <Input
                    name="workspaceName"
                    required
                    placeholder="My Salon"
                    defaultValue={data?.ok === false ? data.fields.workspaceName : ""}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Workspace slug</label>
                  <Input
                    name="workspaceSlug"
                    required
                    placeholder="mysalon"
                    defaultValue={data?.ok === false ? data.fields.workspaceSlug : ""}
                  />
                </div>
              </div>

              {data?.ok === false ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {data.error}
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Sign up"}
              </Button>
            </Form>

            <div className="mt-4 text-sm text-slate-600">
              Already have an account?{" "}
              <Link to="/login" className="text-brand-700 hover:underline">
                Log in
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
