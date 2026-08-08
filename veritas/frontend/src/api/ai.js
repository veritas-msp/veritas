import API_BASE_URL from "../config";
async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.error || `Error ${response.status}`);
    err.code = data.code;
    err.payload = data;
    throw err;
  }
  return data;
}
export async function fetchAiStatus() {
  const response = await fetch(`${API_BASE_URL}/ai/status`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleResponse(response);
}
export async function suggestTicketReplyAi({
  ticketId,
  internal = false,
  locale = "fr"
}) {
  const response = await fetch(`${API_BASE_URL}/ai/suggest-reply`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ticketId,
      internal,
      locale
    })
  });
  return handleResponse(response);
}
export async function suggestTicketResolveAi({
  ticketId,
  interventionType = null,
  actionType = null,
  locale = "fr"
}) {
  const response = await fetch(`${API_BASE_URL}/ai/suggest-resolve`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ticketId,
      interventionType,
      actionType,
      locale
    })
  });
  return handleResponse(response);
}
export async function generateRunbookAi({
  criterionKey,
  title = null,
  checklist = [],
  locale = "fr"
}) {
  const response = await fetch(`${API_BASE_URL}/ai/generate-runbook`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      criterionKey,
      title,
      checklist,
      locale
    })
  });
  return handleResponse(response);
}
export async function fetchAiUsage({
  limit = 50,
  offset = 0
} = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset)
  });
  const response = await fetch(`${API_BASE_URL}/ai/usage?${params}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  return handleResponse(response);
}
export async function updateAiPolicy(payload) {
  const response = await fetch(`${API_BASE_URL}/ai/policy`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload || {})
  });
  return handleResponse(response);
}
export async function testAiConnection({
  provider,
  apiKey,
  model
} = {}) {
  const response = await fetch(`${API_BASE_URL}/ai/test`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      provider,
      apiKey,
      model
    })
  });
  return handleResponse(response);
}
export async function helpMeDiagnoseAi({
  ticketId,
  locale = "fr"
}) {
  const response = await fetch(`${API_BASE_URL}/ai/help-me`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ticketId,
      locale
    })
  });
  return handleResponse(response);
}
export async function generateTicketRunbookAi({
  ticketId,
  locale = "fr"
}) {
  const response = await fetch(`${API_BASE_URL}/ai/generate-ticket-runbook`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ticketId,
      locale
    })
  });
  return handleResponse(response);
}
export async function generateDashboardBriefingAi({
  stats,
  source = "home",
  locale = "fr"
}) {
  const response = await fetch(`${API_BASE_URL}/ai/dashboard-briefing`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      stats,
      source,
      locale
    })
  });
  return handleResponse(response);
}
export async function generateSupervisionBriefingAi({
  stats,
  locale = "fr"
}) {
  const response = await fetch(`${API_BASE_URL}/ai/supervision-briefing`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      stats,
      locale
    })
  });
  return handleResponse(response);
}
export async function generateEnterpriseSummaryAi({
  profile,
  locale = "fr"
}) {
  const response = await fetch(`${API_BASE_URL}/ai/enterprise-summary`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      profile,
      locale
    })
  });
  return handleResponse(response);
}
