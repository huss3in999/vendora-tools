import { all, createId } from "~/modules/db/db.server";
import { hashPassword, verifyPassword } from "~/modules/auth/password.server";
import { normalizeAnnualLeaveRange, normalizeRequestTarget, type RotaSettings } from "./week";

export type RotaStaff = {
  id: string;
  employeeId: string;
  name: string;
  role: "staff" | "manager";
  active: boolean;
  hasPin: boolean;
};

export type RotaRequest = {
  id: string;
  staffId: string;
  staffName: string;
  employeeId: string;
  requestType: string;
  originalTargetDate: string;
  targetDate: string;
  originalEndDate: string | null;
  endDate: string | null;
  rotaWeekStart: string;
  shiftDetail: string | null;
  reason: string;
  status: string;
  managerNote: string | null;
  lateSubmission: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RotaRequestEvent = {
  id: string;
  requestId: string;
  actorKind: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  comment: string | null;
  createdAt: string;
};

type StaffRow = {
  id: string;
  employee_id: string;
  name: string;
  role: "staff" | "manager";
  pin_hash: string | null;
  active: number;
};

type SettingsRow = {
  timezone: string;
  timezone_offset_minutes: number;
  week_start_day: number;
  cutoff_day: number;
  cutoff_time: string;
  total_staff: number;
  minimum_morning: number;
  minimum_closing: number;
  max_absent_per_day: number;
  allow_emergency_override: number;
  shift_templates_json: string;
};

type RequestRow = {
  id: string;
  staff_id: string;
  staff_name: string;
  employee_id: string;
  request_type: string;
  original_target_date: string;
  target_date: string;
  original_end_date: string | null;
  end_date: string | null;
  rota_week_start: string;
  shift_detail: string | null;
  reason: string;
  status: string;
  manager_note: string | null;
  late_submission: number;
  created_at: string;
  updated_at: string;
};

const REQUEST_SELECT = `SELECT
  r.id, r.staff_id, s.name AS staff_name, s.employee_id,
  r.request_type, r.original_target_date, r.target_date, r.original_end_date, r.end_date, r.rota_week_start,
  r.shift_detail, r.reason, r.status, r.manager_note, r.late_submission,
  r.created_at, r.updated_at
FROM rota_requests r
JOIN rota_staff s ON s.id = r.staff_id`;

function toStaff(row: StaffRow): RotaStaff {
  return {
    id: row.id,
    employeeId: row.employee_id,
    name: row.name,
    role: row.role,
    active: row.active === 1,
    hasPin: Boolean(row.pin_hash)
  };
}

function toRequest(row: RequestRow): RotaRequest {
  return {
    id: row.id,
    staffId: row.staff_id,
    staffName: row.staff_name,
    employeeId: row.employee_id,
    requestType: row.request_type,
    originalTargetDate: row.original_target_date,
    targetDate: row.target_date,
    originalEndDate: row.original_end_date,
    endDate: row.end_date,
    rotaWeekStart: row.rota_week_start,
    shiftDetail: row.shift_detail,
    reason: row.reason,
    status: row.status,
    managerNote: row.manager_note,
    lateSubmission: row.late_submission === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function cleanText(value: string, max: number) {
  return value.trim().slice(0, max);
}

const REQUEST_TYPES = new Set([
  "day_off",
  "morning",
  "mid",
  "closing",
  "shift_swap",
  "annual_leave",
  "emergency_leave",
  "other"
]);

export function rotaRepository(db: D1Database) {
  async function getSettings(): Promise<RotaSettings> {
    const row = await db.prepare("SELECT * FROM rota_settings WHERE id = 1").first<SettingsRow>();
    if (!row) throw new Error("Rota settings are not initialized.");
    return {
      timezone: row.timezone,
      timezoneOffsetMinutes: row.timezone_offset_minutes,
      weekStartDay: row.week_start_day,
      cutoffDay: row.cutoff_day,
      cutoffTime: row.cutoff_time,
      totalStaff: row.total_staff,
      minimumMorning: row.minimum_morning,
      minimumClosing: row.minimum_closing,
      maxAbsentPerDay: row.max_absent_per_day,
      allowEmergencyOverride: row.allow_emergency_override === 1,
      shiftTemplatesJson: row.shift_templates_json
    };
  }

  async function getStaffById(id: string) {
    const row = await db.prepare("SELECT * FROM rota_staff WHERE id = ? AND active = 1").bind(id).first<StaffRow>();
    return row ? toStaff(row) : null;
  }

  async function verifyStaffLogin(employeeId: string, pin: string) {
    const normalizedId = employeeId.trim();
    const row = await db
      .prepare("SELECT * FROM rota_staff WHERE employee_id = ? AND active = 1")
      .bind(normalizedId)
      .first<StaffRow>();
    if (!row || !(await verifyPassword(pin, row.pin_hash))) return null;
    return toStaff(row);
  }

  async function setupStaffPin(employeeId: string, pin: string) {
    if (!/^\d{4,8}$/.test(pin)) throw new Error("PIN must contain 4 to 8 numbers.");
    const row = await db.prepare("SELECT * FROM rota_staff WHERE employee_id = ? AND active = 1").bind(employeeId.trim()).first<StaffRow>();
    if (!row) throw new Error("Employee ID was not found.");
    if (row.pin_hash) throw new Error("A PIN already exists. Sign in or ask a manager to reset it.");
    const pinHash = await hashPassword(pin);
    const result = await db.prepare("UPDATE rota_staff SET pin_hash = ?, force_pin_reset = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND pin_hash IS NULL")
      .bind(pinHash, row.id).run();
    if (!result.meta.changes) throw new Error("A PIN was already created. Please sign in.");
    return toStaff({ ...row, pin_hash: pinHash });
  }

  async function changeOwnPin(staffId: string, currentPin: string, newPin: string) {
    if (!/^\d{4,8}$/.test(newPin)) throw new Error("New PIN must contain 4 to 8 numbers.");
    const row = await db.prepare("SELECT pin_hash FROM rota_staff WHERE id = ? AND active = 1").bind(staffId).first<{ pin_hash: string | null }>();
    if (!row || !(await verifyPassword(currentPin, row.pin_hash))) throw new Error("Current PIN is incorrect.");
    await db.prepare("UPDATE rota_staff SET pin_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(await hashPassword(newPin), staffId).run();
  }

  async function loginAllowed(attemptKey: string) {
    const row = await db.prepare("SELECT CASE WHEN locked_until IS NOT NULL AND locked_until > CURRENT_TIMESTAMP THEN 1 ELSE 0 END AS locked FROM rota_login_attempts WHERE attempt_key = ?").bind(attemptKey).first<{ locked: number }>();
    return row?.locked !== 1;
  }

  async function recordFailedLogin(attemptKey: string) {
    await db.prepare(`INSERT INTO rota_login_attempts (attempt_key, attempts, window_started_at, locked_until)
      VALUES (?, 1, CURRENT_TIMESTAMP, NULL)
      ON CONFLICT(attempt_key) DO UPDATE SET
        attempts = CASE WHEN window_started_at < datetime('now', '-15 minutes') THEN 1 ELSE attempts + 1 END,
        window_started_at = CASE WHEN window_started_at < datetime('now', '-15 minutes') THEN CURRENT_TIMESTAMP ELSE window_started_at END,
        locked_until = CASE WHEN (CASE WHEN window_started_at < datetime('now', '-15 minutes') THEN 1 ELSE attempts + 1 END) >= 5 THEN datetime('now', '+15 minutes') ELSE locked_until END`)
      .bind(attemptKey).run();
  }

  async function clearLoginAttempts(attemptKey: string) {
    await db.prepare("DELETE FROM rota_login_attempts WHERE attempt_key = ?").bind(attemptKey).run();
  }

  async function listStaff() {
    const rows = await all<StaffRow>(db.prepare("SELECT * FROM rota_staff ORDER BY role DESC, name ASC"));
    return rows.map(toStaff);
  }

  async function setStaffPin(staffId: string, pin: string) {
    if (!/^\d{4,8}$/.test(pin)) throw new Error("PIN must contain 4 to 8 numbers.");
    const pinHash = await hashPassword(pin);
    const result = await db
      .prepare("UPDATE rota_staff SET pin_hash = ?, force_pin_reset = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(pinHash, staffId)
      .run();
    if (!result.meta.changes) throw new Error("Staff member not found.");
  }

  async function resetStaffPin(staffId: string) {
    const result = await db.prepare("UPDATE rota_staff SET pin_hash = NULL, force_pin_reset = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(staffId).run();
    if (!result.meta.changes) throw new Error("Staff member not found.");
  }

  async function addStaff(input: { employeeId: string; name: string; role: "staff" | "manager" }) {
    const employeeId = cleanText(input.employeeId, 30);
    const name = cleanText(input.name, 120);
    if (!/^\d{2,30}$/.test(employeeId)) throw new Error("Employee ID must contain numbers only.");
    if (name.length < 2) throw new Error("Enter the staff member's full name.");
    if (!new Set(["staff", "manager"]).has(input.role)) throw new Error("Choose a valid role.");
    try {
      await db.prepare("INSERT INTO rota_staff (id, employee_id, name, role) VALUES (?, ?, ?, ?)")
        .bind(createId("rst"), employeeId, name, input.role).run();
    } catch (error) {
      if (String(error).toLowerCase().includes("unique")) throw new Error("That Employee ID already exists.");
      throw error;
    }
  }

  async function updateStaff(input: { staffId: string; employeeId: string; name: string; role: "staff" | "manager"; active: boolean }) {
    const employeeId = cleanText(input.employeeId, 30);
    const name = cleanText(input.name, 120);
    if (!/^\d{2,30}$/.test(employeeId) || name.length < 2) throw new Error("Enter a valid name and Employee ID.");
    if (!new Set(["staff", "manager"]).has(input.role)) throw new Error("Choose a valid role.");
    const current = await db.prepare("SELECT role, active FROM rota_staff WHERE id = ?").bind(input.staffId).first<{ role: string; active: number }>();
    if (!current) throw new Error("Staff member not found.");
    if (current.role === "manager" && current.active === 1 && (input.role !== "manager" || !input.active)) {
      const managers = await db.prepare("SELECT COUNT(*) AS count FROM rota_staff WHERE role = 'manager' AND active = 1 AND id != ?")
        .bind(input.staffId).first<{ count: number }>();
      if ((managers?.count ?? 0) < 1) throw new Error("Assign another active manager before removing the last manager.");
    }
    await db.prepare("UPDATE rota_staff SET employee_id = ?, name = ?, role = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(employeeId, name, input.role, input.active ? 1 : 0, input.staffId).run();
  }

  async function listRequestsForStaff(staffId: string) {
    const rows = await all<RequestRow>(
      db.prepare(`${REQUEST_SELECT} WHERE r.staff_id = ? ORDER BY r.created_at DESC`).bind(staffId)
    );
    return rows.map(toRequest);
  }

  async function listAllRequests() {
    const rows = await all<RequestRow>(
      db.prepare(`${REQUEST_SELECT} ORDER BY r.rota_week_start DESC, r.created_at DESC`)
    );
    return rows.map(toRequest);
  }

  async function listEvents(staffId?: string) {
    const where = staffId ? "WHERE r.staff_id = ?" : "";
    const statement = db.prepare(`SELECT e.id, e.request_id, e.actor_kind, e.event_type, e.from_status, e.to_status, e.comment, e.created_at
      FROM rota_request_events e JOIN rota_requests r ON r.id = e.request_id
      ${where} ORDER BY e.created_at DESC`);
    const rows = await all<{ id: string; request_id: string; actor_kind: string; event_type: string; from_status: string | null; to_status: string | null; comment: string | null; created_at: string }>(staffId ? statement.bind(staffId) : statement);
    return rows.map((row): RotaRequestEvent => ({
      id: row.id,
      requestId: row.request_id,
      actorKind: row.actor_kind,
      eventType: row.event_type,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      comment: row.comment,
      createdAt: row.created_at
    }));
  }

  async function createRequest(input: {
    staffId: string;
    requestType: string;
    targetDate: string;
    endDate?: string;
    shiftDetail?: string;
    reason: string;
  }) {
    if (!REQUEST_TYPES.has(input.requestType)) throw new Error("Choose a valid request type.");
    const reason = cleanText(input.reason, 1000);
    if (reason.length < 3) throw new Error("Please add a short reason.");
    const settings = await getSettings();
    const timing = input.requestType === "annual_leave"
      ? normalizeAnnualLeaveRange(input.targetDate, input.endDate ?? "", settings)
      : normalizeRequestTarget(input.targetDate, settings);
    const originalEndDate = "originalEndDate" in timing ? timing.originalEndDate : null;
    const endDate = "endDate" in timing ? timing.endDate : null;
    const requestId = createId("rrq");
    const eventId = createId("rev");
    const shiftDetail = cleanText(input.shiftDetail ?? "", 240) || null;

    await db.batch([
      db.prepare(`INSERT INTO rota_requests
        (id, staff_id, request_type, original_target_date, target_date, original_end_date, end_date, rota_week_start, shift_detail, reason, late_submission)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(requestId, input.staffId, input.requestType, timing.originalTargetDate, timing.targetDate, originalEndDate, endDate, timing.weekStart, shiftDetail, reason, timing.isLate ? 1 : 0),
      db.prepare(`INSERT INTO rota_request_events
        (id, request_id, actor_kind, actor_id, event_type, to_status, comment)
        VALUES (?, ?, 'staff', ?, 'submitted', 'pending', ?)`)
        .bind(eventId, requestId, input.staffId, timing.isLate ? `Automatically moved ${timing.movedWeeks} week(s) after the cutoff.` : null)
    ]);

    const managerIds = await all<{ id: string }>(db.prepare("SELECT id FROM rota_staff WHERE role = 'manager' AND active = 1"));
    const staff = await getStaffById(input.staffId);
    if (managerIds.length) {
      await db.batch(managerIds.map((manager) => db.prepare(`INSERT INTO rota_notifications
        (id, staff_id, request_id, type, title, body)
        VALUES (?, ?, ?, 'new_request', 'New rota request', ?)`)
        .bind(createId("rnt"), manager.id, requestId, `${staff?.name ?? "A staff member"}: ${input.requestType.replaceAll("_", " ")} for ${timing.targetDate}${endDate ? ` to ${endDate}` : ""}.`)));
    }
    return { requestId, timing, managerStaffIds: managerIds.map((item) => item.id) };
  }

  async function cancelRequest(staffId: string, requestId: string) {
    const row = await db
      .prepare("SELECT status FROM rota_requests WHERE id = ? AND staff_id = ?")
      .bind(requestId, staffId)
      .first<{ status: string }>();
    if (!row) throw new Error("Request not found.");
    if (!new Set(["pending", "approved"]).has(row.status)) throw new Error("This request can no longer be cancelled.");
    const nextStatus = row.status === "pending" ? "cancelled" : "cancel_requested";
    await db.batch([
      db.prepare(`UPDATE rota_requests SET status = ?, cancelled_at = CASE WHEN ? = 'cancelled' THEN CURRENT_TIMESTAMP ELSE cancelled_at END,
        updated_at = CURRENT_TIMESTAMP WHERE id = ? AND staff_id = ?`)
        .bind(nextStatus, nextStatus, requestId, staffId),
      db.prepare(`INSERT INTO rota_request_events
        (id, request_id, actor_kind, actor_id, event_type, from_status, to_status)
        VALUES (?, ?, 'staff', ?, 'cancellation_requested', ?, ?)`)
        .bind(createId("rev"), requestId, staffId, row.status, nextStatus)
    ]);
    const managerIds = nextStatus === "cancel_requested"
      ? await all<{ id: string }>(db.prepare("SELECT id FROM rota_staff WHERE role = 'manager' AND active = 1"))
      : [];
    if (managerIds.length) {
      await db.batch(managerIds.map((manager) => db.prepare(`INSERT INTO rota_notifications
        (id, staff_id, request_id, type, title, body)
        VALUES (?, ?, ?, 'cancellation_request', 'Cancellation requested', 'An approved rota request needs cancellation review.')`)
        .bind(createId("rnt"), manager.id, requestId)));
    }
    return { status: nextStatus, managerStaffIds: managerIds.map((item) => item.id) };
  }

  async function updateRequest(input: {
    requestId: string;
    managerStaffId: string;
    status: "approved" | "rejected" | "cancelled";
    note?: string;
    overrideCoverage?: boolean;
  }) {
    const current = await db.prepare("SELECT status, staff_id, request_type, target_date, end_date FROM rota_requests WHERE id = ?").bind(input.requestId).first<{ status: string; staff_id: string; request_type: string; target_date: string; end_date: string | null }>();
    if (!current) throw new Error("Request not found.");
    const allowed = current.status === "cancel_requested" ? input.status === "cancelled" || input.status === "approved" : input.status === "approved" || input.status === "rejected";
    if (!allowed) throw new Error("That status change is not allowed.");
    const isAbsence = new Set(["day_off", "annual_leave", "emergency_leave"]).has(current.request_type);
    if (input.status === "approved" && isAbsence && !input.overrideCoverage) {
      const [settings, capacity] = await Promise.all([
        getSettings(),
        db.prepare(`WITH RECURSIVE
          candidate(day, final_day) AS (
            SELECT ?, COALESCE(?, ?)
            UNION ALL SELECT date(day, '+1 day'), final_day FROM candidate WHERE day < final_day
          ),
          approved_days(request_id, day, final_day) AS (
            SELECT id, target_date, COALESCE(end_date, target_date)
            FROM rota_requests
            WHERE status = 'approved' AND request_type IN ('day_off', 'annual_leave', 'emergency_leave') AND id != ?
            UNION ALL SELECT request_id, date(day, '+1 day'), final_day FROM approved_days WHERE day < final_day
          )
          SELECT candidate.day, COUNT(approved_days.request_id) AS approved_absent
          FROM candidate LEFT JOIN approved_days ON approved_days.day = candidate.day
          GROUP BY candidate.day ORDER BY approved_absent DESC LIMIT 1`)
          .bind(current.target_date, current.end_date, current.target_date, input.requestId)
          .first<{ day: string; approved_absent: number }>()
      ]);
      if ((capacity?.approved_absent ?? 0) >= settings.maxAbsentPerDay) {
        throw new Error(`The absence limit is already reached on ${capacity?.day}. Tick coverage override to approve anyway.`);
      }
    }
    const note = cleanText(input.note ?? "", 500) || null;
    await db.batch([
      db.prepare(`UPDATE rota_requests SET status = ?, manager_note = ?, decided_by_staff_id = ?, decided_at = CURRENT_TIMESTAMP,
        cancelled_at = CASE WHEN ? = 'cancelled' THEN CURRENT_TIMESTAMP ELSE cancelled_at END, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .bind(input.status, note, input.managerStaffId, input.status, input.requestId),
      db.prepare(`INSERT INTO rota_request_events
        (id, request_id, actor_kind, actor_id, event_type, from_status, to_status, comment)
        VALUES (?, ?, 'manager', ?, 'manager_decision', ?, ?, ?)`)
        .bind(createId("rev"), input.requestId, input.managerStaffId, current.status, input.status, input.overrideCoverage ? `${note ? `${note} ` : ""}[Coverage override]` : note),
      db.prepare(`INSERT INTO rota_notifications
        (id, staff_id, request_id, type, title, body)
        VALUES (?, ?, ?, 'request_update', 'Request updated', ?)`)
        .bind(createId("rnt"), current.staff_id, input.requestId, `Your ${current.request_type.replaceAll("_", " ")} request for ${current.target_date}${current.end_date ? ` to ${current.end_date}` : ""} is ${input.status.replaceAll("_", " ")}.${note ? ` Manager: ${note}` : ""}`)
    ]);
    return { staffId: current.staff_id, requestType: current.request_type, targetDate: current.target_date, endDate: current.end_date, note };
  }

  async function saveSettings(input: Partial<RotaSettings>, managerStaffId: string) {
    const weekStartDay = Number(input.weekStartDay);
    const cutoffDay = Number(input.cutoffDay);
    const cutoffTime = String(input.cutoffTime ?? "23:59");
    const totalStaff = Number(input.totalStaff);
    const minimumMorning = Number(input.minimumMorning);
    const minimumClosing = Number(input.minimumClosing);
    const maxAbsentPerDay = Number(input.maxAbsentPerDay);
    if (![weekStartDay, cutoffDay].every((n) => Number.isInteger(n) && n >= 0 && n <= 6)) throw new Error("Choose valid week days.");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(cutoffTime)) throw new Error("Choose a valid cutoff time.");
    if (![totalStaff, minimumMorning, minimumClosing, maxAbsentPerDay].every((n) => Number.isInteger(n) && n >= 0 && n <= 50)) throw new Error("Staffing values must be whole numbers.");
    await db.prepare(`UPDATE rota_settings SET week_start_day = ?, cutoff_day = ?, cutoff_time = ?, total_staff = ?,
      minimum_morning = ?, minimum_closing = ?, max_absent_per_day = ?, allow_emergency_override = ?,
      updated_by_staff_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`)
      .bind(weekStartDay, cutoffDay, cutoffTime, totalStaff, minimumMorning, minimumClosing, maxAbsentPerDay, input.allowEmergencyOverride ? 1 : 0, managerStaffId)
      .run();
  }

  async function analytics() {
    const topRequesters = await all<{ staff_id: string; staff_name: string; request_count: number; approved_count: number; pending_count: number; rejected_count: number }>(
      db.prepare(`SELECT s.name AS staff_name, COUNT(*) AS request_count,
        s.id AS staff_id,
        SUM(CASE WHEN r.status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
        SUM(CASE WHEN r.status IN ('pending', 'cancel_requested') THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN r.status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count
        FROM rota_requests r JOIN rota_staff s ON s.id = r.staff_id
        GROUP BY r.staff_id, s.name ORDER BY request_count DESC, s.name ASC LIMIT 10`)
    );
    const counts = await db.prepare(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
      FROM rota_requests`).first<{ total: number; pending: number; approved: number; rejected: number }>();
    return { topRequesters, counts: counts ?? { total: 0, pending: 0, approved: 0, rejected: 0 } };
  }

  async function coverage() {
    return all<{ target_date: string; approved_absent: number; pending_absent: number }>(
      db.prepare(`WITH RECURSIVE request_days(request_id, target_date, final_date, status) AS (
        SELECT id, target_date, COALESCE(end_date, target_date), status
        FROM rota_requests
        WHERE request_type IN ('day_off', 'annual_leave', 'emergency_leave')
          AND status NOT IN ('rejected', 'cancelled')
        UNION ALL
        SELECT request_id, date(target_date, '+1 day'), final_date, status
        FROM request_days WHERE target_date < final_date
      )
      SELECT target_date,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_absent,
        SUM(CASE WHEN status IN ('pending', 'cancel_requested') THEN 1 ELSE 0 END) AS pending_absent
        FROM request_days
        GROUP BY target_date ORDER BY target_date ASC`)
    );
  }

  async function listNotificationsForStaff(staffId: string) {
    return all<{ id: string; title: string; body: string; read_at: string | null; created_at: string }>(
      db.prepare("SELECT id, title, body, read_at, created_at FROM rota_notifications WHERE staff_id = ? ORDER BY created_at DESC LIMIT 30").bind(staffId)
    );
  }

  async function markStaffNotificationsRead(staffId: string) {
    await db.prepare("UPDATE rota_notifications SET read_at = CURRENT_TIMESTAMP WHERE staff_id = ? AND read_at IS NULL").bind(staffId).run();
  }

  async function savePushSubscription(input: { staffId?: string; managerUserId?: string; endpoint: string; p256dh: string; auth: string; userAgent?: string }) {
    if (!input.endpoint.startsWith("https://") || !input.p256dh || !input.auth) throw new Error("Invalid push subscription.");
    await db.prepare(`INSERT INTO rota_push_subscriptions
      (id, staff_id, manager_user_id, endpoint, p256dh, auth, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET staff_id = excluded.staff_id, manager_user_id = excluded.manager_user_id,
        p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent,
        failure_count = 0, updated_at = CURRENT_TIMESTAMP`)
      .bind(createId("rps"), input.staffId ?? null, input.managerUserId ?? null, input.endpoint, input.p256dh, input.auth, input.userAgent ?? null)
      .run();
  }

  async function pushSubscriptionsForStaff(staffId: string) {
    return all<{ id: string; endpoint: string; p256dh: string; auth: string }>(
      db.prepare("SELECT id, endpoint, p256dh, auth FROM rota_push_subscriptions WHERE staff_id = ? AND failure_count < 3").bind(staffId)
    );
  }

  async function pushSubscriptionsForManagers(managerUserIds: string[]) {
    if (!managerUserIds.length) return [];
    const placeholders = managerUserIds.map(() => "?").join(",");
    return all<{ id: string; endpoint: string; p256dh: string; auth: string }>(
      db.prepare(`SELECT id, endpoint, p256dh, auth FROM rota_push_subscriptions WHERE manager_user_id IN (${placeholders}) AND failure_count < 3`).bind(...managerUserIds)
    );
  }

  async function recordPushResult(id: string, ok: boolean, gone = false) {
    if (gone) {
      await db.prepare("DELETE FROM rota_push_subscriptions WHERE id = ?").bind(id).run();
      return;
    }
    await db.prepare(ok
      ? "UPDATE rota_push_subscriptions SET failure_count = 0, last_success_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      : "UPDATE rota_push_subscriptions SET failure_count = failure_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(id).run();
  }

  return {
    getSettings,
    getStaffById,
    verifyStaffLogin,
    setupStaffPin,
    changeOwnPin,
    loginAllowed,
    recordFailedLogin,
    clearLoginAttempts,
    listStaff,
    setStaffPin,
    resetStaffPin,
    addStaff,
    updateStaff,
    listRequestsForStaff,
    listAllRequests,
    listEvents,
    createRequest,
    cancelRequest,
    updateRequest,
    saveSettings,
    analytics,
    coverage,
    listNotificationsForStaff,
    markStaffNotificationsRead,
    savePushSubscription,
    pushSubscriptionsForStaff,
    pushSubscriptionsForManagers,
    recordPushResult
  };
}
