import express from 'express';
import fetch from 'node-fetch';
import verifyJWT from '../../../middleware/auth.js';
import {
  getCheckMKSettings,
  authenticateCheckMK,
  computeCheckMKLogtimeFromDays,
  filterCheckMKEventsByPeriod,
  parseCheckMKEventTime
} from './utils.js';

const router = express.Router();

function normalizeNotificationRow(event, index) {
  if (Array.isArray(event)) {
    const rawState = event[5];
    let stateNum = 0;
    if (typeof rawState === 'number') stateNum = rawState;
    else if (typeof rawState === 'string') {
      const m = rawState.match(/\((OK|WARNING|CRITICAL|UNKNOWN)\)/i) || rawState.match(/(OK|WARNING|CRITICAL|UNKNOWN)/i);
      if (m) {
        const t = m[1].toUpperCase();
        stateNum = t === 'OK' ? 0 : t === 'WARNING' ? 1 : t === 'CRITICAL' ? 2 : 3;
      }
    }
    const serviceVal = event[4] ?? event[3] ?? null;
    const messageVal = event[6] ?? event[5] ?? event[7] ?? null;
    const timeRaw = event[1];
    let timeVal = null;
    if (typeof timeRaw === 'number') {
      timeVal = timeRaw < 10000000000 ? timeRaw : Math.floor(timeRaw / 1000);
    } else if (typeof timeRaw === 'string' && timeRaw.trim()) {
      const parsed = Date.parse(timeRaw.trim());
      if (!Number.isNaN(parsed)) timeVal = Math.floor(parsed / 1000);
    }
    const timestamp = timeVal != null
      ? new Date(timeVal * 1000).toISOString()
      : parseCheckMKEventTime({ time: timeRaw })?.toISOString() ?? null;
    return {
      id: index,
      icon: event[0] || null,
      time: timeVal ?? timeRaw,
      timestamp,
      type: event[2] || null,
      host: event[3] || null,
      service: serviceVal || null,
      state: stateNum,
      state_info: rawState,
      message: messageVal || '-',
      plugin_output: messageVal || null,
      raw: event
    };
  }

  let timeVal = event.time || event.log_time || event.timestamp || null;
  if (typeof timeVal === 'string' && timeVal.trim()) {
    const parsed = Date.parse(timeVal);
    if (!Number.isNaN(parsed)) timeVal = Math.floor(parsed / 1000);
  } else if (typeof timeVal === 'number' && timeVal > 10000000000) {
    timeVal = Math.floor(timeVal / 1000);
  }
  const timestamp = timeVal != null
    ? typeof timeVal === 'number'
      ? new Date(timeVal * 1000).toISOString()
      : String(timeVal)
    : parseCheckMKEventTime(event)?.toISOString() ?? null;

  return {
    id: index,
    icon: event.icon || event.log_icon || null,
    time: timeVal,
    timestamp,
    type: event.type || event.log_type || event.notification_type || null,
    host: event.host || event.log_host || event.hostname || null,
    service: event.service || event.service_description || event.log_service_description || event.service_name || null,
    state: event.state ?? 0,
    state_info: event.state ?? event.log_state_info,
    message: event.message || event.event_text || event.plugin_output || event.log_plugin_output || event.long_plugin_output || '-',
    plugin_output: event.plugin_output || event.log_plugin_output || null,
    contact: event.contact || event.log_contact_name || event.contact_name || null
  };
}

function extractArrayPayload(data) {
  if (Array.isArray(data)) {
    return data.length > 0 && Array.isArray(data[0]) ? data.slice(1) : data;
  }
  if (data?.value && Array.isArray(data.value)) return data.value;
  if (data?.events && Array.isArray(data.events)) return data.events;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (typeof data === 'object' && data) {
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) return data[key];
    }
  }
  return [];
}

router.get('/notifications/:hostName', verifyJWT, async (req, res) => {
  try {
    const { hostName } = req.params;
    const { start_time, end_time, site } = req.query;
    const settings = await getCheckMKSettings();
    if (!settings || !settings.apiUrl || !settings.username || !settings.password) {
      return res.status(500).json({
        error: 'Check MK configuration incomplete. Please configure settings in Settings.'
      });
    }

    let baseUrl = settings.apiUrl;
    baseUrl = baseUrl.replace(/\/check_mk\/api\/1\.0\/?$/, '');
    baseUrl = baseUrl.replace(/\/check_mk\/api\/?$/, '');
    baseUrl = baseUrl.replace(/\/api\/?$/, '');
    baseUrl = baseUrl.replace(/\/+$/, '');

    const checkmkSite = site || settings.site || '';
    const authData = await authenticateCheckMK(settings.apiUrl, settings.username, settings.password);

    const endIso = end_time || new Date().toISOString();
    const startIso = start_time || (() => {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      return d.toISOString();
    })();
    const logtimeFromDays = computeCheckMKLogtimeFromDays(startIso, endIso);

    const viewUrl = `${baseUrl}/check_mk/view.py`;
    const eventParams = new URLSearchParams({
      host: hostName,
      logtime_from: String(logtimeFromDays),
      logtime_from_range: '86400',
      output_format: 'json_export',
      view_name: 'hostnotifications'
    });
    if (checkmkSite) eventParams.append('site', checkmkSite);

    const eventRes = await fetch(`${viewUrl}?${eventParams.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: authData.auth_header
      }
    });

    if (!eventRes.ok) {
      return res.json({
        host_name: hostName,
        notifications_count: 0,
        events_count: 0,
        last_notification: null,
        last_notification_timestamp: null,
        notifications: [],
        events: [],
        period: { start_time: startIso, end_time: endIso },
        warning: `Unable to retrieve notifications: ${eventRes.status}`
      });
    }

    const contentType = eventRes.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await eventRes.json();
    } else {
      try {
        data = JSON.parse(await eventRes.text());
      } catch {
        data = [];
      }
    }

    const allRows = extractArrayPayload(data);
    const normalized = allRows.map((row, index) => normalizeNotificationRow(row, index));
    const periodNotifications = filterCheckMKEventsByPeriod(normalized, startIso, endIso);
    const sorted = [...periodNotifications].sort((a, b) => {
      const ta = typeof a.time === 'number' ? a.time : 0;
      const tb = typeof b.time === 'number' ? b.time : 0;
      return tb - ta;
    });
    const last = sorted[0] || null;

    return res.json({
      host_name: hostName,
      notifications_count: sorted.length,
      events_count: sorted.length,
      last_notification: last,
      last_notification_timestamp: last?.timestamp || null,
      notifications: sorted,
      events: sorted,
      period: { start_time: startIso, end_time: endIso }
    });
  } catch (error) {
    return res.json({
      host_name: req.params.hostName,
      notifications_count: 0,
      events_count: 0,
      last_notification: null,
      last_notification_timestamp: null,
      notifications: [],
      events: [],
      error: error.message
    });
  }
});

export default router;
