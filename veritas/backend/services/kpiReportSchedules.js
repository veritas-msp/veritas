import { pool } from "../database/db.js";
import { fetchAnalyticsDashboard } from "./dashboardAnalyticsService.js";
import { generateKpiReportPdf, buildKpiPdfFilename } from "./kpiReportPdf.js";
import { getKpiReportLabels, KPI_CATEGORIES, KPI_FREQUENCIES, KPI_PERIOD_PRESETS, normalizeCategories, parseRecipientList, isValidEmail } from "./kpiReportLabels.js";
import { ensureKpiReportSchedulesSchema } from "./ensureKpiReportSchedulesSchema.js";
import { sendMail } from "../utils/sendMail.js";
import { getSettingsMap } from "../utils/settingsHelper.js";

function isoWeekday(date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

export function computeNextRun({
  frequency,
  weekday = 1,
  monthday = 1,
  sendHour = 8,
  from = new Date()
} = {}) {
  const hour = Math.min(23, Math.max(0, Number(sendHour) || 8));
  const next = new Date(from);
  next.setSeconds(0, 0);
  next.setMinutes(0);
  next.setHours(hour);
  if (frequency === "daily") {
    if (next <= from) next.setDate(next.getDate() + 1);
    return next;
  }
  if (frequency === "monthly") {
    const day = Math.min(28, Math.max(1, Number(monthday) || 1));
    next.setDate(day);
    if (next <= from) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(day);
    }
    return next;
  }
  const target = Math.min(7, Math.max(1, Number(weekday) || 1));
  for (let i = 0; i < 8; i += 1) {
    if (isoWeekday(next) === target && next > from) return next;
    next.setDate(next.getDate() + 1);
    next.setHours(hour, 0, 0, 0);
  }
  return next;
}

async function getOrganizationName() {
  const settings = await getSettingsMap(["app_organization_name"]);
  return String(settings.app_organization_name || "").trim() || "Veritas";
}

function periodLabel(preset, labels, since, until) {
  const map = {
    "7d": "7 jours",
    "30d": "30 jours",
    "90d": "90 jours",
    "365d": "12 mois",
    ytd: "Année en cours",
    all: "Tout"
  };
  if (preset && map[preset]) return map[preset];
  if (since && until) return `${new Date(since).toLocaleDateString("fr-FR")} → ${new Date(until).toLocaleDateString("fr-FR")}`;
  return labels.title;
}

export async function buildKpiReportBundle({
  period,
  startAt,
  endAt,
  agentId,
  clientId,
  contactId,
  categories,
  locale = "fr"
} = {}) {
  const selected = normalizeCategories(categories);
  const data = await fetchAnalyticsDashboard({
    period,
    startAt,
    endAt,
    agentId,
    clientId,
    contactId
  });
  const labels = getKpiReportLabels(locale);
  const organizationName = await getOrganizationName();
  const label = periodLabel(data.period, labels, data.since, data.until);
  const pdf = await generateKpiReportPdf({
    data,
    labels,
    organizationName,
    periodLabel: label,
    categories: selected
  });
  return {
    data,
    labels,
    organizationName,
    periodLabel: label,
    categories: selected,
    pdf,
    filename: buildKpiPdfFilename(selected)
  };
}

export async function sendKpiReportEmail({
  recipients,
  period,
  startAt,
  endAt,
  agentId,
  clientId,
  contactId,
  categories,
  locale = "fr"
} = {}) {
  const emails = parseRecipientList(recipients).filter(isValidEmail);
  if (!emails.length) {
    const err = new Error("No valid recipient.");
    err.code = "INVALID_RECIPIENTS";
    throw err;
  }
  const bundle = await buildKpiReportBundle({
    period,
    startAt,
    endAt,
    agentId,
    clientId,
    contactId,
    categories,
    locale
  });
  const subject = String(bundle.labels.mailSubject || "KPI").replace("{period}", bundle.periodLabel);
  await sendMail({
    to: emails.join(", "),
    subject,
    title: bundle.labels.mailTitle,
    htmlContent: `<p style="margin:0 0 12px;font-size:14px;">${bundle.labels.mailIntro}</p>
      <p style="margin:0;font-size:13px;color:#5c6b82;">${bundle.organizationName} · ${bundle.periodLabel}</p>`,
    attachments: [{
      filename: bundle.filename,
      content: bundle.pdf,
      contentType: "application/pdf"
    }]
  });
  return {
    sent: emails.length,
    filename: bundle.filename,
    periodLabel: bundle.periodLabel
  };
}

function mapScheduleRow(row) {
  return {
    id: row.id,
    name: row.name,
    recipients: row.recipients,
    categories: Array.isArray(row.categories) ? row.categories : KPI_CATEGORIES,
    periodPreset: row.period_preset,
    frequency: row.frequency,
    weekday: row.weekday,
    monthday: row.monthday,
    sendHour: row.send_hour,
    enabled: Boolean(row.enabled),
    lastSentAt: row.last_sent_at,
    nextRunAt: row.next_run_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeSchedulePayload(body = {}, existing = {}) {
  const name = String(body.name || existing.name || "").trim();
  if (!name) {
    const err = new Error("Name is required.");
    err.code = "INVALID_SCHEDULE";
    throw err;
  }
  const recipients = parseRecipientList(body.recipients ?? existing.recipients).filter(isValidEmail);
  if (!recipients.length) {
    const err = new Error("No valid recipient.");
    err.code = "INVALID_RECIPIENTS";
    throw err;
  }
  const frequency = KPI_FREQUENCIES.includes(body.frequency) ? body.frequency : existing.frequency || "weekly";
  const periodPreset = KPI_PERIOD_PRESETS.includes(body.periodPreset) ? body.periodPreset : existing.periodPreset || "30d";
  const categories = normalizeCategories(body.categories ?? existing.categories);
  const weekday = Math.min(7, Math.max(1, Number(body.weekday ?? existing.weekday) || 1));
  const monthday = Math.min(28, Math.max(1, Number(body.monthday ?? existing.monthday) || 1));
  const sendHour = Math.min(23, Math.max(0, Number(body.sendHour ?? existing.sendHour) || 8));
  const enabled = body.enabled == null ? existing.enabled !== false : Boolean(body.enabled);
  return {
    name,
    recipients: recipients.join(", "),
    categories,
    periodPreset,
    frequency,
    weekday,
    monthday,
    sendHour,
    enabled,
    nextRunAt: enabled ? computeNextRun({
      frequency,
      weekday,
      monthday,
      sendHour
    }) : null
  };
}

export async function listKpiReportSchedules() {
  await ensureKpiReportSchedulesSchema();
  const result = await pool.query(`SELECT * FROM v_b_kpi_report_schedules ORDER BY created_at DESC`);
  return result.rows.map(mapScheduleRow);
}

export async function createKpiReportSchedule(body, userId) {
  await ensureKpiReportSchedulesSchema();
  const payload = normalizeSchedulePayload(body);
  const result = await pool.query(`INSERT INTO v_b_kpi_report_schedules
      (created_by, name, recipients, categories, period_preset, frequency, weekday, monthday, send_hour, enabled, next_run_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`, [userId || null, payload.name, payload.recipients, payload.categories, payload.periodPreset, payload.frequency, payload.weekday, payload.monthday, payload.sendHour, payload.enabled, payload.nextRunAt]);
  return mapScheduleRow(result.rows[0]);
}

export async function updateKpiReportSchedule(id, body) {
  await ensureKpiReportSchedulesSchema();
  const current = await pool.query(`SELECT * FROM v_b_kpi_report_schedules WHERE id = $1`, [id]);
  if (!current.rows[0]) {
    const err = new Error("Schedule not found.");
    err.code = "NOT_FOUND";
    throw err;
  }
  const payload = normalizeSchedulePayload(body, mapScheduleRow(current.rows[0]));
  const result = await pool.query(`UPDATE v_b_kpi_report_schedules
     SET name = $2, recipients = $3, categories = $4, period_preset = $5, frequency = $6,
         weekday = $7, monthday = $8, send_hour = $9, enabled = $10, next_run_at = $11,
         last_error = NULL, updated_at = NOW()
     WHERE id = $1
     RETURNING *`, [id, payload.name, payload.recipients, payload.categories, payload.periodPreset, payload.frequency, payload.weekday, payload.monthday, payload.sendHour, payload.enabled, payload.nextRunAt]);
  return mapScheduleRow(result.rows[0]);
}

export async function deleteKpiReportSchedule(id) {
  await ensureKpiReportSchedulesSchema();
  const result = await pool.query(`DELETE FROM v_b_kpi_report_schedules WHERE id = $1 RETURNING id`, [id]);
  if (!result.rows[0]) {
    const err = new Error("Schedule not found.");
    err.code = "NOT_FOUND";
    throw err;
  }
  return {
    success: true
  };
}

export async function runDueKpiReportSchedules() {
  await ensureKpiReportSchedulesSchema();
  const due = await pool.query(`SELECT * FROM v_b_kpi_report_schedules
     WHERE enabled = TRUE AND next_run_at IS NOT NULL AND next_run_at <= NOW()
     ORDER BY next_run_at ASC
     LIMIT 10`);
  const results = [];
  for (const row of due.rows) {
    const schedule = mapScheduleRow(row);
    try {
      await sendKpiReportEmail({
        recipients: schedule.recipients,
        period: schedule.periodPreset,
        categories: schedule.categories
      });
      const nextRunAt = computeNextRun({
        frequency: schedule.frequency,
        weekday: schedule.weekday,
        monthday: schedule.monthday,
        sendHour: schedule.sendHour,
        from: new Date()
      });
      await pool.query(`UPDATE v_b_kpi_report_schedules
         SET last_sent_at = NOW(), last_error = NULL, next_run_at = $2, updated_at = NOW()
         WHERE id = $1`, [schedule.id, nextRunAt]);
      results.push({
        id: schedule.id,
        ok: true
      });
    } catch (err) {
      const nextRunAt = computeNextRun({
        frequency: schedule.frequency,
        weekday: schedule.weekday,
        monthday: schedule.monthday,
        sendHour: schedule.sendHour,
        from: new Date(Date.now() + 3600000)
      });
      await pool.query(`UPDATE v_b_kpi_report_schedules
         SET last_error = $2, next_run_at = $3, updated_at = NOW()
         WHERE id = $1`, [schedule.id, String(err.message || err).slice(0, 500), nextRunAt]);
      results.push({
        id: schedule.id,
        ok: false,
        error: err.message
      });
    }
  }
  return results;
}
