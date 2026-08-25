import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import { getAppEnv, requireD1Database } from "~/modules/db/db.server";
import { pushManagerUpdate } from "~/modules/rota/push.server";
import { rotaRepository } from "~/modules/rota/rota.server";
import { createRotaSession, getRotaStaffId } from "~/modules/rota/session.server";
import { formatWeekRange, normalizeAnnualLeaveRange, normalizeRequestTarget, requestTypeLabel, statusLabel } from "~/modules/rota/week";

export const meta: MetaFunction = () => [
  { title: "COS Rota Requests" },
  { name: "description", content: "Private shift and leave request portal for the COS team." },
  { name: "theme-color", content: "#0f172a" },
  { name: "robots", content: "noindex, nofollow" }
];

function sameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}

async function loginAttemptKey(request: Request, employeeId: string) {
  const ip = request.headers.get("CF-Connecting-IP") ?? request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ?? "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}:${employeeId.trim()}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const db = requireD1Database(context);
  const repo = rotaRepository(db);
  const staffId = await getRotaStaffId(request, context);
  if (!staffId) return json({ authenticated: false as const });
  const staff = await repo.getStaffById(staffId);
  if (!staff) return json({ authenticated: false as const });
  const [settings, requests, notifications, events] = await Promise.all([
    repo.getSettings(),
    repo.listRequestsForStaff(staff.id),
    repo.listNotificationsForStaff(staff.id),
    repo.listEvents(staff.id)
  ]);
  return json({
    authenticated: true as const,
    staff,
    settings,
    requests,
    notifications,
    events,
    vapidPublicKey: getAppEnv(context)?.VAPID_PUBLIC_KEY ?? null
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  if (!sameOrigin(request)) return json({ ok: false, error: "Request rejected." }, { status: 403 });
  const db = requireD1Database(context);
  const repo = rotaRepository(db);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "login");

  if (intent === "login") {
    const employeeId = String(form.get("employeeId") ?? "");
    const pin = String(form.get("pin") ?? "");
    const attemptKey = await loginAttemptKey(request, employeeId);
    if (!(await repo.loginAllowed(attemptKey))) {
      return json({ ok: false, error: "Too many attempts. Try again in 15 minutes or ask your manager to check your PIN." }, { status: 429 });
    }
    const staff = await repo.verifyStaffLogin(employeeId, pin);
    if (!staff) {
      await repo.recordFailedLogin(attemptKey);
      return json({ ok: false, error: "Employee ID or PIN is incorrect. Ask your manager if your PIN has not been set." }, { status: 400 });
    }
    await repo.clearLoginAttempts(attemptKey);
    return createRotaSession(request, context, staff.id);
  }

  if (intent === "setup_pin") {
    const employeeId = String(form.get("employeeId") ?? "");
    const pin = String(form.get("pin") ?? "");
    const confirmPin = String(form.get("confirmPin") ?? "");
    if (pin !== confirmPin) return json({ ok: false, error: "PIN confirmation does not match." }, { status: 400 });
    const attemptKey = await loginAttemptKey(request, employeeId);
    if (!(await repo.loginAllowed(attemptKey))) return json({ ok: false, error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
    try {
      const staff = await repo.setupStaffPin(employeeId, pin);
      await repo.clearLoginAttempts(attemptKey);
      return createRotaSession(request, context, staff.id);
    } catch (error) {
      await repo.recordFailedLogin(attemptKey);
      return json({ ok: false, error: error instanceof Error ? error.message : "Unable to create PIN." }, { status: 400 });
    }
  }

  const staffId = await getRotaStaffId(request, context);
  const staff = staffId ? await repo.getStaffById(staffId) : null;
  if (!staff) return json({ ok: false, error: "Please sign in again." }, { status: 401 });

  try {
    if (intent === "submit_request") {
      const result = await repo.createRequest({
        staffId: staff.id,
        requestType: String(form.get("requestType") ?? ""),
        targetDate: String(form.get("targetDate") ?? ""),
        endDate: String(form.get("endDate") ?? ""),
        shiftDetail: String(form.get("shiftDetail") ?? ""),
        reason: String(form.get("reason") ?? "")
      });
      await pushManagerUpdate(db, getAppEnv(context), result.managerStaffIds, {
        title: "New rota request",
        body: `${staff.name} · ${requestTypeLabel(String(form.get("requestType") ?? ""))} · ${result.timing.targetDate}${"endDate" in result.timing ? ` – ${result.timing.endDate}` : ""}`
      });
      return redirect(`/rota?notice=submitted${result.timing.isLate ? "&moved=1" : ""}`);
    }

    if (intent === "cancel_request") {
      const result = await repo.cancelRequest(staff.id, String(form.get("requestId") ?? ""));
      if (result.managerStaffIds.length) {
        await pushManagerUpdate(db, getAppEnv(context), result.managerStaffIds, {
          title: "Cancellation requested",
          body: `${staff.name} asked to cancel an approved request.`
        });
      }
      return redirect(`/rota?notice=${result.status === "cancelled" ? "cancelled" : "cancel-requested"}`);
    }

    if (intent === "mark_notifications_read") {
      await repo.markStaffNotificationsRead(staff.id);
      return redirect("/rota?notice=notifications-read");
    }
    if (intent === "change_pin") {
      const newPin = String(form.get("newPin") ?? "");
      if (newPin !== String(form.get("confirmPin") ?? "")) throw new Error("New PIN confirmation does not match.");
      await repo.changeOwnPin(staff.id, String(form.get("currentPin") ?? ""), newPin);
      return redirect("/rota?notice=pin-changed");
    }
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "Unable to complete that request." }, { status: 400 });
  }

  return json({ ok: false, error: "Unknown action." }, { status: 400 });
}

function statusStyle(status: string) {
  if (status === "approved") return "bg-emerald-100 text-emerald-700";
  if (status === "rejected" || status === "cancelled") return "bg-rose-100 text-rose-700";
  if (status === "cancel_requested") return "bg-violet-100 text-violet-700";
  return "bg-amber-100 text-amber-700";
}

function PushButton({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<"idle" | "working" | "enabled" | "error">("idle");

  async function enable() {
    if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("error");
      return;
    }
    setState("working");
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Permission not granted");
      const key = publicKey.replace(/-/g, "+").replace(/_/g, "/");
      const padded = key.padEnd(Math.ceil(key.length / 4) * 4, "=");
      const applicationServerKey = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      const response = await fetch("/api/rota/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON())
      });
      if (!response.ok) throw new Error("Unable to save subscription");
      setState("enabled");
    } catch {
      setState("error");
    }
  }

  return (
    <button type="button" onClick={enable} disabled={state === "working" || state === "enabled"}
      className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15 disabled:opacity-70">
      {state === "working" ? "Enabling…" : state === "enabled" ? "Alerts enabled ✓" : state === "error" ? "Alerts unavailable" : "Enable alerts"}
    </button>
  );
}

function LoginScreen({ error }: { error?: string }) {
  const navigation = useNavigation();
  const [firstTime, setFirstTime] = useState(false);
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-xl font-black shadow-xl shadow-blue-950/40">COS</div>
          <h1 className="mt-5 text-3xl font-black tracking-tight">Rota requests, made clear.</h1>
          <p className="mt-2 text-sm text-slate-400">Private access for the seven-person COS team.</p>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-2xl">
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-bold"><button type="button" onClick={() => setFirstTime(false)} className={`rounded-lg px-3 py-2 ${!firstTime ? "bg-white shadow-sm" : "text-slate-500"}`}>Sign in</button><button type="button" onClick={() => setFirstTime(true)} className={`rounded-lg px-3 py-2 ${firstTime ? "bg-white shadow-sm" : "text-slate-500"}`}>First time</button></div>
          <h2 className="mt-5 text-xl font-bold">{firstTime ? "Create your private PIN" : "Staff sign-in"}</h2>
          <p className="mt-1 text-sm text-slate-500">{firstTime ? "Your manager cannot see your PIN. Use 4–8 numbers you will remember." : "Use your Employee ID and private PIN."}</p>
          <Form method="post" className="mt-6 space-y-4">
            <input type="hidden" name="intent" value={firstTime ? "setup_pin" : "login"} />
            <label className="block text-sm font-semibold text-slate-700">Employee ID
              <input name="employeeId" inputMode="numeric" autoComplete="username" required className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">PIN
              <input name="pin" type="password" inputMode="numeric" autoComplete="current-password" minLength={4} maxLength={8} required className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label>
            {firstTime ? <label className="block text-sm font-semibold text-slate-700">Confirm PIN
              <input name="confirmPin" type="password" inputMode="numeric" minLength={4} maxLength={8} required className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </label> : null}
            {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
            <button disabled={navigation.state !== "idle"} className="w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-60">
              {navigation.state !== "idle" ? "Please wait…" : firstTime ? "Create PIN and continue" : "Sign in"}
            </button>
          </Form>
        </div>
      </div>
    </main>
  );
}

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

function InstallAppCard() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPromptEvent); };
    const done = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", done); };
  }, []);
  async function install() { if (!prompt) return; await prompt.prompt(); if ((await prompt.userChoice).outcome === "accepted") setInstalled(true); setPrompt(null); }
  return <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm"><div className="flex items-center gap-3"><img src="/icons/cos-rota-192.png" alt="COS Rota" className="h-14 w-14 rounded-2xl" /><div><h2 className="font-black">Install COS Rota</h2><p className="text-sm text-slate-400">Open requests quickly and receive approval alerts.</p></div></div>{installed ? <p className="mt-4 rounded-xl bg-emerald-500/15 px-3 py-2 text-sm font-bold text-emerald-300">App installed on this device ✓</p> : prompt ? <button type="button" onClick={install} className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black">Install app</button> : <div className="mt-4 rounded-xl bg-white/10 px-3 py-3 text-sm text-slate-200"><b>iPhone:</b> tap Share, then Add to Home Screen.<br /><b>Android:</b> open the browser menu, then Install app or Add to Home screen.</div>}</div>;
}

export default function RotaPortal() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<"request" | "history" | "updates" | "profile">("request");
  const [requestType, setRequestType] = useState("day_off");
  const [targetDate, setTargetDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const navigation = useNavigation();
  const notice = searchParams.get("notice");
  const preview = useMemo(() => {
    if (!targetDate || !data.authenticated || (requestType === "annual_leave" && !endDate)) return null;
    try {
      return requestType === "annual_leave"
        ? normalizeAnnualLeaveRange(targetDate, endDate, data.settings, new Date())
        : normalizeRequestTarget(targetDate, data.settings, new Date());
    } catch { return null; }
  }, [requestType, targetDate, endDate, data]);

  if (!data.authenticated) return <LoginScreen error={actionData?.ok === false ? actionData.error : undefined} />;
  const unread = data.notifications.filter((item) => !item.read_at).length;
  const error = actionData?.ok === false ? actionData.error : null;

  return (
    <div className="min-h-screen bg-slate-100 pb-28 text-slate-900">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl px-4 pb-7 pt-5 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 font-black">COS</div>
              <div className="min-w-0"><div className="truncate font-bold">{data.staff.name}</div><div className="text-xs text-slate-400">Rota Request Portal</div></div>
            </div>
            <div className="flex items-center gap-2">{data.staff.role === "manager" ? <Link to="/rota/manager" className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold">Manager</Link> : null}<PushButton publicKey={data.vapidPublicKey} /><Form action="/rota/logout" method="post"><button className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10">Sign out</button></Form></div>
          </div>
          <div className="mt-7 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-white/5 p-3"><div className="text-2xl font-black">{data.requests.filter((r) => r.status === "pending").length}</div><div className="text-[11px] text-slate-400">Pending</div></div>
            <div className="rounded-2xl bg-white/5 p-3"><div className="text-2xl font-black">{data.requests.filter((r) => r.status === "approved").length}</div><div className="text-[11px] text-slate-400">Approved</div></div>
            <div className="rounded-2xl bg-white/5 p-3"><div className="text-2xl font-black">{unread}</div><div className="text-[11px] text-slate-400">New updates</div></div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
        {notice ? <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          {notice === "submitted" ? (searchParams.get("moved") ? "Request saved and moved to the next eligible rota week because the cutoff passed." : "Request submitted successfully.") : notice === "cancelled" ? "Pending request cancelled." : notice === "cancel-requested" ? "Cancellation sent to the manager for approval." : notice === "pin-changed" ? "Your private PIN was changed." : "Updates marked as read."}
        </div> : null}
        {error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

        <div className="mb-5 grid grid-cols-4 gap-1 rounded-2xl bg-white p-1.5 shadow-sm">
          {([['request','Request'],['history','History'],['updates',`Updates${unread ? ` (${unread})` : ''}`],['profile','Profile']] as const).map(([key,label]) => <button key={key} onClick={() => setTab(key)} className={`rounded-xl px-1 py-2.5 text-[11px] font-bold transition sm:text-xs ${tab === key ? 'bg-slate-950 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{label}</button>)}
        </div>

        {tab === "request" ? <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><h1 className="text-xl font-black">What do you need?</h1><p className="mt-1 text-sm text-slate-500">Choose one request and the system will confirm its rota week.</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Fri–Thu</span></div>
          <Form method="post" className="mt-6 space-y-5">
            <input type="hidden" name="intent" value="submit_request" />
            <label className="block text-sm font-bold">Request type
              <select name="requestType" value={requestType} onChange={(event) => setRequestType(event.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-base">
                <option value="day_off">Day off</option><option value="morning">Morning shift</option><option value="mid">Mid shift</option><option value="closing">Closing shift</option><option value="shift_swap">Shift swap</option><option value="annual_leave">Annual leave</option><option value="emergency_leave">Emergency leave</option><option value="other">Other</option>
              </select>
            </label>
            {requestType === "annual_leave" ? <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold">From date
                <input name="targetDate" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-base" />
              </label>
              <label className="block text-sm font-bold">To date
                <input name="endDate" type="date" min={targetDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-base" />
              </label>
            </div> : <label className="block text-sm font-bold">Requested date
              <input name="targetDate" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} required className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-base" />
            </label>}
            {preview ? <div className={`rounded-2xl border p-4 ${preview.isLate ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <div className={`text-sm font-black ${preview.isLate ? 'text-amber-800' : 'text-emerald-800'}`}>{preview.isLate ? "Cutoff passed — date will move" : "On time for this rota week"}</div>
              <div className="mt-1 text-sm text-slate-700">{preview.isLate ? `${preview.originalTargetDate}${"originalEndDate" in preview ? ` – ${preview.originalEndDate}` : ""} will become ${preview.targetDate}${"endDate" in preview ? ` – ${preview.endDate}` : ""}. ` : ""}{"durationDays" in preview ? `${preview.durationDays} day${preview.durationDays === 1 ? "" : "s"}. ` : ""}Rota week: {formatWeekRange(preview.weekStart)}</div>
            </div> : null}
            <label className="block text-sm font-bold">Shift details <span className="font-normal text-slate-400">(optional)</span>
              <input name="shiftDetail" placeholder="Example: 9–6, or swap with Jonathan" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-base" />
            </label>
            <label className="block text-sm font-bold">Reason
              <textarea name="reason" rows={3} minLength={3} maxLength={1000} required placeholder="Add a clear, short reason" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-3 text-base" />
            </label>
            <button disabled={navigation.state !== "idle"} className="w-full rounded-xl bg-blue-600 px-5 py-3.5 font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-60">{navigation.state !== "idle" ? "Saving…" : "Submit request"}</button>
          </Form>
        </section> : null}

        {tab === "history" ? <section className="space-y-3">
          {data.requests.length === 0 ? <div className="rounded-3xl bg-white p-8 text-center text-sm text-slate-500">No requests yet.</div> : data.requests.map((item) => <article key={item.id} className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><div className="font-black">{requestTypeLabel(item.requestType)}</div><div className="mt-1 text-sm text-slate-500">{item.targetDate}{item.endDate ? ` – ${item.endDate}` : ""} · {formatWeekRange(item.rotaWeekStart)}</div></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${statusStyle(item.status)}`}>{statusLabel(item.status)}</span></div>
            {item.lateSubmission ? <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">Original date{item.originalEndDate ? "s" : ""} {item.originalTargetDate}{item.originalEndDate ? ` – ${item.originalEndDate}` : ""}; moved after the cutoff.</p> : null}
            <p className="mt-3 text-sm text-slate-700">{item.reason}</p>
            {item.managerNote ? <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm"><span className="font-bold">Manager:</span> {item.managerNote}</p> : null}
            <details className="mt-3 text-xs text-slate-500"><summary className="cursor-pointer font-bold text-slate-600">Request history</summary><div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-3">{data.events.filter((event) => event.requestId === item.id).map((event) => <div key={event.id}><div className="font-semibold text-slate-700">{event.eventType.replaceAll('_',' ')}{event.toStatus ? ` · ${statusLabel(event.toStatus)}` : ''}</div><div>{event.createdAt}{event.comment ? ` · ${event.comment}` : ''}</div></div>)}</div></details>
            {item.status === "pending" || item.status === "approved" ? <Form method="post" className="mt-4"><input type="hidden" name="intent" value="cancel_request" /><input type="hidden" name="requestId" value={item.id} /><button className="text-xs font-bold text-rose-600 hover:underline">{item.status === "pending" ? "Cancel request" : "Request cancellation"}</button></Form> : null}
          </article>)}
        </section> : null}

        {tab === "updates" ? <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><div><h2 className="text-lg font-black">Updates</h2><p className="text-sm text-slate-500">Approvals, rejections, and cancellations.</p></div>{unread ? <Form method="post"><input type="hidden" name="intent" value="mark_notifications_read" /><button className="text-xs font-bold text-blue-700">Mark all read</button></Form> : null}</div>
          <div className="mt-5 divide-y divide-slate-100">{data.notifications.length ? data.notifications.map((item) => <div key={item.id} className="py-4"><div className="flex items-center gap-2"><div className="font-bold">{item.title}</div>{!item.read_at ? <span className="h-2 w-2 rounded-full bg-blue-600" /> : null}</div><div className="mt-1 text-sm text-slate-600">{item.body}</div><div className="mt-1 text-xs text-slate-400">{item.created_at}</div></div>) : <div className="py-8 text-center text-sm text-slate-500">No updates yet.</div>}</div>
        </section> : null}

        {tab === "profile" ? <section className="space-y-4"><InstallAppCard /><div className="rounded-3xl bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Private access</h2><p className="mt-1 text-sm text-slate-500">Employee ID {data.staff.employeeId}. Your manager can reset access but cannot see your PIN.</p><Form method="post" className="mt-5 grid gap-3 sm:grid-cols-3"><input type="hidden" name="intent" value="change_pin" /><input name="currentPin" type="password" inputMode="numeric" minLength={4} maxLength={8} required placeholder="Current PIN" className="rounded-xl border border-slate-300 px-3 py-3" /><input name="newPin" type="password" inputMode="numeric" minLength={4} maxLength={8} required placeholder="New PIN" className="rounded-xl border border-slate-300 px-3 py-3" /><input name="confirmPin" type="password" inputMode="numeric" minLength={4} maxLength={8} required placeholder="Confirm new PIN" className="rounded-xl border border-slate-300 px-3 py-3" /><button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white sm:col-span-3">Change my PIN</button></Form></div></section> : null}
      </main>
    </div>
  );
}
