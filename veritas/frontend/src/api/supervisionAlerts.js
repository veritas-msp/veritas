import API_BASE_URL, { withApiQuery } from "../config";
import { getEquipmentDbId } from "../utils/equipmentIdentity";

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Error ${response.status}`);
  }
  return data;
}

function authFetch(url, options = {}) {
  return fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
}

export async function fetchSupervisionAlertsActive() {
  const response = await authFetch(`${API_BASE_URL}/supervision/alerts/active`);
  const data = await handleResponse(response);
  return data?.alerts || [];
}

export async function fetchSupervisionAlertStates(queueItemIds = []) {
  const ids = [...new Set((Array.isArray(queueItemIds) ? queueItemIds : []).map(id => String(id || "").trim()).filter(Boolean))];
  if (!ids.length) return [];
  const response = await authFetch(withApiQuery(`${API_BASE_URL}/supervision/alerts/states`, {
    ids: ids.join(",")
  }));
  const data = await handleResponse(response);
  return data?.alerts || [];
}

export async function ensureSupervisionAlertsSeen(items = []) {
  const payload = (Array.isArray(items) ? items : []).map(item => itemPayload(item)).filter(item => item.queueItemId && item.domain);
  if (!payload.length) return [];
  const response = await authFetch(`${API_BASE_URL}/supervision/alerts/seen`, {
    method: "POST",
    body: JSON.stringify({ items: payload })
  });
  const data = await handleResponse(response);
  return data?.alerts || [];
}

export async function fetchSupervisionAlertsHistory(params = {}) {
  const response = await authFetch(withApiQuery(`${API_BASE_URL}/supervision/alerts/history`, params));
  const data = await handleResponse(response);
  return data?.alerts || [];
}

export async function fetchEquipmentRecentAlerts(equipmentId, params = {}) {
  const id = String(equipmentId || "").trim();
  if (!id) return [];
  const response = await authFetch(withApiQuery(`${API_BASE_URL}/supervision/alerts/equipment/${encodeURIComponent(id)}`, params));
  const data = await handleResponse(response);
  return data?.alerts || [];
}

export async function fetchSupervisionAlertEvents(alertId) {
  const response = await authFetch(`${API_BASE_URL}/supervision/alerts/${encodeURIComponent(alertId)}/events`);
  const data = await handleResponse(response);
  return data?.events || [];
}

function itemPayload(item, extra = {}) {
  return {
    queueItemId: item.queueItemId || item.id,
    domain: item.domain,
    severity: item.severity,
    clientId: item.clientId,
    equipmentId: getEquipmentDbId(item.equipment) || getEquipmentDbId(item.agent?.equipment) || item.equipmentId || null,
    refKey: item.job?.id || item.contract?.id || item.agent?.id || item.equipment?.id || item.refKey || null,
    title: item.title,
    subtitle: item.subtitle,
    label: item.label,
    meta: {
      tone: item.tone,
      ticketSubject: item.ticketSubject
    },
    ...extra
  };
}

async function postAction(queueItemId, action, payload) {
  const response = await authFetch(`${API_BASE_URL}/supervision/alerts/${encodeURIComponent(queueItemId)}/${action}`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return handleResponse(response);
}

export async function ackSupervisionAlert(item, note) {
  const qid = item.queueItemId || item.id;
  return postAction(qid, "ack", itemPayload(item, { note }));
}

export async function unackSupervisionAlert(item) {
  const qid = item.queueItemId || item.id;
  return postAction(qid, "unack", itemPayload(item));
}

export async function linkSupervisionAlert(item, link = {}) {
  const qid = item.queueItemId || item.id;
  return postAction(qid, "link", itemPayload(item, link));
}

export async function resolveSupervisionAlert(item, note) {
  const qid = item.queueItemId || item.id;
  return postAction(qid, "resolve", itemPayload(item, { note, closedReason: "resolved" }));
}

export async function dismissSupervisionAlert(item, note) {
  const qid = item.queueItemId || item.id;
  return postAction(qid, "dismiss", itemPayload(item, { note, closedReason: "dismissed" }));
}

export async function reopenSupervisionAlert(item) {
  const qid = item.queueItemId || item.id;
  return postAction(qid, "reopen", itemPayload(item));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Live multi-user sync for supervision alert actions (SSE).
 * Reconnects automatically until unsubscribe() is called.
 */
export function subscribeSupervisionAlertStream({
  onEvent,
  onError
} = {}) {
  let cancelled = false;
  let controller = null;

  const run = async () => {
    let delayMs = 1000;
    while (!cancelled) {
      controller = new AbortController();
      try {
        const res = await fetch(`${API_BASE_URL}/supervision/alerts/stream`, {
          credentials: "include",
          headers: {
            Accept: "text/event-stream"
          },
          signal: controller.signal
        });
        if (!res.ok) {
          throw new Error("Supervision alerts stream unavailable");
        }
        delayMs = 1000;
        const reader = res.body?.getReader();
        if (!reader) throw new Error("Stream not supported");
        const decoder = new TextDecoder();
        let buffer = "";
        while (!cancelled) {
          const {
            done,
            value
          } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, {
            stream: true
          });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() || "";
          for (const chunk of chunks) {
            const line = chunk.split("\n").find(l => l.startsWith("data: "));
            if (!line) continue;
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.type === "heartbeat" || payload.type === "connected") continue;
              onEvent?.(payload);
            } catch {
              /* ignore malformed chunk */
            }
          }
        }
      } catch (err) {
        if (cancelled || err?.name === "AbortError") break;
        onError?.(err);
        await sleep(delayMs);
        delayMs = Math.min(delayMs * 2, 15000);
      }
    }
  };

  run();

  return () => {
    cancelled = true;
    controller?.abort();
  };
}
