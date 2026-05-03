import type { ActionFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { Button } from "~/components/ui/Button";
import { Card, CardBody, CardHeader } from "~/components/ui/Card";
import { Input } from "~/components/ui/Input";
import { authStore } from "~/modules/auth/store.server";
import { createUserSession } from "~/modules/auth/session.server";

export const meta: MetaFunction = () => [
  { title: "Login - Smart Page Platform" },
  { name: "robots", content: "noindex, nofollow" }
];

export async function action({ request, context }: ActionFunctionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, error: "Enter your email and password.", fields: { email } };
  }

  const store = authStore(context);
  const user = await store.verifyLogin({ email, password });

  if (!user) {
    return { ok: false, error: "Invalid email or password.", fields: { email } };
  }

  const redirectTo = user.role === "super_admin" ? "/admin" : "/app";
  return createUserSession({
    request,
    context,
    userId: user.id,
    workspaceId: user.role === "super_admin" ? null : user.workspaceId,
    redirectTo
  });
}

export default function Login() {
  const data = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader title="Log in" description="Access your workspace dashboard." />
          <CardBody>
            <Form method="post" className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <Input
                  name="email"
                  type="email"
                  required
                  placeholder="you@company.com"
                  defaultValue={data?.ok === false ? data.fields?.email : ""}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <Input name="password" type="password" required />
              </div>

              {data?.ok === false ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {data.error}
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Logging in..." : "Log in"}
              </Button>
            </Form>

            <div className="mt-4 text-sm text-slate-600">
              No account?{" "}
              <Link to="/signup" className="text-brand-700 hover:underline">
                Sign up
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
