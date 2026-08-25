import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, Link, useActionData, useLoaderData, useNavigation, useSearchParams } from "@remix-run/react";
import { useState } from "react";
import { getAppEnv, requireD1Database } from "~/modules/db/db.server";
import { pushStaffUpdate } from "~/modules/rota/push.server";
import { rotaRepository } from "~/modules/rota/rota.server";
import { getRotaStaffId } from "~/modules/rota/session.server";
import { formatWeekRange, requestTypeLabel, statusLabel } from "~/modules/rota/week";

export const meta: MetaFunction = () => [
  { title: "COS Rota Manager" },
  { name: "robots", content: "noindex, nofollow" },
  { name: "theme-color", content: "#0f172a" }
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const repo = rotaRepository(requireD1Database(context));
  const staffId = await getRotaStaffId(request, context);
  const manager = staffId ? await repo.getStaffById(staffId) : null;
  if (!manager || manager.role !== "manager") throw redirect("/rota");
  const [requests, staff, settings, analytics, coverage, events] = await Promise.all([
    repo.listAllRequests(),
    repo.listStaff(),
    repo.getSettings(),
    repo.analytics(),
    repo.coverage(),
    repo.listEvents()
  ]);
  return json({ requests, staff, settings, analytics, coverage, events, vapidPublicKey: getAppEnv(context)?.VAPID_PUBLIC_KEY ?? null, managerName: manager.name });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false, error: "Request rejected." }, { status: 403 });
  const db = requireD1Database(context);
  const repo = rotaRepository(db);
  const managerId = await getRotaStaffId(request, context);
  const manager = managerId ? await repo.getStaffById(managerId) : null;
  if (!manager || manager.role !== "manager") throw redirect("/rota");
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  try {
    if (intent === "test_push") {
      await pushStaffUpdate(db, getAppEnv(context), manager.id, { title: "COS Rota test alert", body: "Manager notifications are connected on this device.", url: "/rota/manager" });
      return redirect("/rota/manager?notice=test-sent");
    }
    if (intent === "add_staff") {
      await repo.addStaff({ employeeId: String(form.get("employeeId") ?? ""), name: String(form.get("name") ?? ""), role: form.get("role") === "manager" ? "manager" : "staff" });
      return redirect("/rota/manager?notice=staff-added");
    }
    if (intent === "update_staff") {
      await repo.updateStaff({ staffId: String(form.get("staffId") ?? ""), employeeId: String(form.get("employeeId") ?? ""), name: String(form.get("name") ?? ""), role: form.get("role") === "manager" ? "manager" : "staff", active: form.get("active") === "on" });
      return redirect("/rota/manager?notice=staff-updated");
    }
    if (intent === "reset_pin") {
      await repo.resetStaffPin(String(form.get("staffId") ?? ""));
      return redirect("/rota/manager?notice=pin-reset");
    }
    if (intent === "update_request") {
      const status = String(form.get("status") ?? "") as "approved" | "rejected" | "cancelled";
      if (!new Set(["approved", "rejected", "cancelled"]).has(status)) throw new Error("Choose a valid decision.");
      const decision = await repo.updateRequest({
        requestId: String(form.get("requestId") ?? ""),
        managerStaffId: manager.id,
        status,
        note: String(form.get("note") ?? ""),
        overrideCoverage: form.get("overrideCoverage") === "on"
      });
      await pushStaffUpdate(db, getAppEnv(context), decision.staffId, { title: `Request ${status}`, body: `${requestTypeLabel(decision.requestType)} · ${decision.targetDate}${decision.endDate ? ` – ${decision.endDate}` : ""}${decision.note ? ` · ${decision.note}` : ""}` });
      return redirect(`/rota/manager?notice=${status}`);
    }
    if (intent === "save_settings") {
      await repo.saveSettings({
        weekStartDay: Number(form.get("weekStartDay")),
        cutoffDay: Number(form.get("cutoffDay")),
        cutoffTime: String(form.get("cutoffTime") ?? ""),
        totalStaff: Number(form.get("totalStaff")),
        minimumMorning: Number(form.get("minimumMorning")),
        minimumClosing: Number(form.get("minimumClosing")),
        maxAbsentPerDay: Number(form.get("maxAbsentPerDay")),
        allowEmergencyOverride: form.get("allowEmergencyOverride") === "on"
      }, manager.id);
      return redirect("/rota/manager?notice=settings-saved");
    }
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "Unable to save that change." }, { status: 400 });
  }
  return json({ ok: false, error: "Unknown action." }, { status: 400 });
}

function badge(status: string) {
  if (status === "approved") return "bg-emerald-100 text-emerald-700";
  if (status === "rejected" || status === "cancelled") return "bg-rose-100 text-rose-700";
  if (status === "cancel_requested") return "bg-violet-100 text-violet-700";
  return "bg-amber-100 text-amber-700";
}

function ManagerPushButton({ publicKey }: { publicKey: string | null }) {
  const [label, setLabel] = useState("Enable manager alerts");
  async function enable() {
    if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) { setLabel("Alerts unavailable"); return; }
    setLabel("Enabling…");
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      if ((await Notification.requestPermission()) !== "granted") throw new Error();
      const padded = publicKey.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(publicKey.length / 4) * 4, "=");
      const key = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      const response = await fetch("/api/rota/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription.toJSON()) });
      if (!response.ok) throw new Error();
      setLabel("Manager alerts enabled ✓");
    } catch { setLabel("Could not enable alerts"); }
  }
  return <button type="button" onClick={enable} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">{label}</button>;
}

export default function RotaManager() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("all");
  const notice = searchParams.get("notice");
  const requests = data.requests.filter((item) => (statusFilter === "all" || item.status === statusFilter) && (staffFilter === "all" || item.staffId === staffFilter));
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return <main className="min-h-screen bg-slate-100 px-3 py-4 text-slate-900 sm:px-6"><div className="mx-auto max-w-6xl space-y-6">
    <section className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-400">COS Rota</p><h1 className="mt-2 text-2xl font-black">Manager control centre</h1><p className="mt-1 text-sm text-slate-400">Signed in as {data.managerName}. Requests, staff access, rules, and trends.</p></div><div className="flex flex-wrap gap-2"><Link to="/rota" className="rounded-xl border border-white/20 px-3 py-2 text-xs font-bold">My profile</Link><ManagerPushButton publicKey={data.vapidPublicKey} /><Form method="post"><input type="hidden" name="intent" value="test_push" /><button className="rounded-xl border border-white/20 px-3 py-2 text-xs font-bold">Send test alert</button></Form></div></div>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Total",data.analytics.counts.total],["Pending",data.analytics.counts.pending],["Approved",data.analytics.counts.approved],["Rejected",data.analytics.counts.rejected]].map(([label,value]) => <div key={String(label)} className="rounded-2xl bg-white/5 p-4"><div className="text-2xl font-black">{value ?? 0}</div><div className="text-xs text-slate-400">{label}</div></div>)}
      </div>
    </section>

    {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Change saved successfully.</div> : null}
    {actionData?.ok === false ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{actionData.error}</div> : null}

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">Staff requests</h2><p className="text-sm text-slate-500">Filter by person to review their complete request history.</p></div><div className="flex flex-wrap gap-2"><select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="all">All staff</option>{data.staff.map((staff)=><option key={staff.id} value={staff.id}>{staff.name}</option>)}</select><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="cancel_requested">Cancellation requested</option><option value="cancelled">Cancelled</option></select></div></div>
      <div className="mt-5 space-y-3">{requests.length ? requests.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-black">{item.staffName}</div><div className="mt-0.5 text-sm text-slate-600">{requestTypeLabel(item.requestType)} · {item.targetDate}{item.endDate ? ` – ${item.endDate}` : ""}</div><div className="mt-1 text-xs text-slate-400">{formatWeekRange(item.rotaWeekStart)}{item.lateSubmission ? " · moved after cutoff" : ""}</div></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${badge(item.status)}`}>{statusLabel(item.status)}</span></div>
        <p className="mt-3 text-sm text-slate-700">{item.reason}</p>
        <details className="mt-3 text-xs text-slate-500"><summary className="cursor-pointer font-bold text-slate-600">Full history</summary><div className="mt-2 space-y-2 border-l-2 border-slate-200 pl-3">{data.events.filter((event) => event.requestId === item.id).map((event) => <div key={event.id}><div className="font-semibold text-slate-700">{event.eventType.replaceAll('_',' ')}{event.toStatus ? ` · ${statusLabel(event.toStatus)}` : ''}</div><div>{event.createdAt}{event.comment ? ` · ${event.comment}` : ''}</div></div>)}</div></details>
        {item.status === "pending" || item.status === "cancel_requested" ? <Form method="post" className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input type="hidden" name="intent" value="update_request" /><input type="hidden" name="requestId" value={item.id} />
          <input name="note" defaultValue={item.managerNote ?? ""} placeholder="Manager comment (optional)" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          {item.status === "pending" ? <><label className="md:col-span-3 flex items-center gap-2 text-xs font-semibold text-slate-500"><input type="checkbox" name="overrideCoverage" />Coverage override if the daily absence limit is reached</label><button name="status" value="approved" className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white hover:bg-emerald-700">Approve</button><button name="status" value="rejected" className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700">Reject</button></> : <><button name="status" value="cancelled" className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white">Approve cancellation</button><button name="status" value="approved" className="rounded-xl bg-slate-700 px-4 py-2 text-xs font-black text-white">Keep approved</button></>}
        </Form> : item.managerNote ? <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="font-bold">Manager note:</span> {item.managerNote}</p> : null}
      </article>) : <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No requests match this filter.</div>}</div>
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Daily coverage</h2><p className="mt-1 text-sm text-slate-500">Approved and pending absence requests against the configured daily limit.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.coverage.length ? data.coverage.map((day) => { const remaining = Math.max(0, data.settings.maxAbsentPerDay - day.approved_absent); return <div key={day.target_date} className={`rounded-2xl border p-4 ${remaining === 0 ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}><div className="font-black">{day.target_date}</div><div className="mt-2 text-sm text-slate-600">Approved absent: <b>{day.approved_absent}</b></div><div className="text-sm text-slate-600">Pending absent: <b>{day.pending_absent}</b></div><div className={`mt-2 text-xs font-black ${remaining === 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{remaining === 0 ? 'Absence limit reached' : `${remaining} absence slot(s) left`}</div></div>; }) : <p className="text-sm text-slate-500">No absence requests yet.</p>}</div></section>

    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Team access</h2><p className="mt-1 text-sm text-slate-500">Staff create their own PIN. You can assign managers, deactivate leavers, or reset access without seeing anyone's PIN.</p><Form method="post" className="mt-5 grid gap-2 rounded-2xl border border-dashed border-blue-300 bg-blue-50 p-3 sm:grid-cols-[1fr_140px_110px_auto]"><input type="hidden" name="intent" value="add_staff" /><input name="name" required placeholder="Full staff name" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" /><input name="employeeId" required inputMode="numeric" placeholder="Employee ID" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" /><select name="role" className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="staff">Staff</option><option value="manager">Manager</option></select><button className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white">Add person</button></Form><div className="mt-4 space-y-3">{data.staff.map((staff) => <div key={staff.id} className={`rounded-2xl border p-3 ${staff.active ? "border-slate-200 bg-slate-50" : "border-rose-200 bg-rose-50"}`}><Form method="post" className="grid gap-2 sm:grid-cols-[1fr_120px_105px_auto]"><input type="hidden" name="intent" value="update_staff" /><input type="hidden" name="staffId" value={staff.id} /><input name="name" defaultValue={staff.name} required className="rounded-lg border border-slate-300 px-2 py-2 text-sm font-bold" /><input name="employeeId" defaultValue={staff.employeeId} required inputMode="numeric" className="rounded-lg border border-slate-300 px-2 py-2 text-sm" /><select name="role" defaultValue={staff.role} className="rounded-lg border border-slate-300 px-2 py-2 text-sm"><option value="staff">Staff</option><option value="manager">Manager</option></select><button className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Save</button><label className="flex items-center gap-2 text-xs font-bold text-slate-600 sm:col-span-2"><input name="active" type="checkbox" defaultChecked={staff.active} />Active account</label><div className="text-xs text-slate-500">{staff.hasPin ? "Private PIN active" : "Waiting for first-time PIN"}</div></Form>{staff.hasPin ? <Form method="post" className="mt-2"><input type="hidden" name="intent" value="reset_pin" /><input type="hidden" name="staffId" value={staff.id} /><button className="text-xs font-bold text-rose-600">Reset forgotten PIN</button></Form> : null}</div>)}</div></section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Rota rules</h2><p className="mt-1 text-sm text-slate-500">Dates are calculated in Bahrain time.</p><Form method="post" className="mt-5 grid gap-4 sm:grid-cols-2"><input type="hidden" name="intent" value="save_settings" />
        <label className="text-sm font-bold">Week starts<select name="weekStartDay" defaultValue={data.settings.weekStartDay} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5">{dayNames.map((day,index)=><option value={index} key={day}>{day}</option>)}</select></label>
        <label className="text-sm font-bold">Request cutoff<select name="cutoffDay" defaultValue={data.settings.cutoffDay} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5">{dayNames.map((day,index)=><option value={index} key={day}>{day}</option>)}</select></label>
        <label className="text-sm font-bold">Cutoff time<input name="cutoffTime" type="time" defaultValue={data.settings.cutoffTime} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
        <label className="text-sm font-bold">Team size<input name="totalStaff" type="number" min="1" max="50" defaultValue={data.settings.totalStaff} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
        <label className="text-sm font-bold">Minimum morning<input name="minimumMorning" type="number" min="0" max="20" defaultValue={data.settings.minimumMorning} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
        <label className="text-sm font-bold">Minimum closing<input name="minimumClosing" type="number" min="0" max="20" defaultValue={data.settings.minimumClosing} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
        <label className="text-sm font-bold">Max absent per day<input name="maxAbsentPerDay" type="number" min="0" max="20" defaultValue={data.settings.maxAbsentPerDay} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
        <label className="flex items-center gap-2 self-end rounded-xl bg-slate-50 px-3 py-3 text-sm font-bold"><input name="allowEmergencyOverride" type="checkbox" defaultChecked={data.settings.allowEmergencyOverride} />Allow emergency override</label>
        <button disabled={navigation.state !== "idle"} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white sm:col-span-2">{navigation.state !== "idle" ? "Saving…" : "Save rota rules"}</button>
      </Form></section>
    </div>

    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-black">Request patterns</h2><p className="mt-1 text-sm text-slate-500">Use this for fair planning context. Select a name to inspect their full history above.</p><div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="pb-3">Staff member</th><th className="pb-3">Total</th><th className="pb-3">Approved</th><th className="pb-3">Pending</th><th className="pb-3">Rejected</th></tr></thead><tbody className="divide-y divide-slate-100">{data.analytics.topRequesters.map((item)=><tr key={item.staff_id}><td className="py-3"><button type="button" onClick={() => { setStaffFilter(item.staff_id); window.scrollTo({ top: 300, behavior: "smooth" }); }} className="font-bold text-blue-700 hover:underline">{item.staff_name}</button></td><td>{item.request_count}</td><td>{item.approved_count}</td><td>{item.pending_count}</td><td>{item.rejected_count}</td></tr>)}</tbody></table>{data.analytics.topRequesters.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">Analytics will appear after requests are submitted.</p> : null}</div></section>
  </div></main>;
}
