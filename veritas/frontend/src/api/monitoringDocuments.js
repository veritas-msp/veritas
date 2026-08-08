import API_BASE_URL from "../config";
import { safeJsonStringify } from "../utils/safeJson";
const MONITORING_DOCS_BASE = `${API_BASE_URL}/monitoring-documents`;
export async function saveMonitoringDocument({
  name,
  client_name,
  report_period,
  config,
  data,
  overwrite = false
}) {
  try {
    const payload = {
      name,
      client_name,
      report_period: report_period || null,
      config,
      data,
      overwrite
    };
    const res = await fetch(`${MONITORING_DOCS_BASE}`, {
      method: "POST",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json"
      },
      body: safeJsonStringify(payload)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error: ${res.status}`);
    }
    const result = await res.json();
    return result;
  } catch (err) {
    console.error("❌ saveMonitoringDocument:", err);
    return {
      success: false,
      error: err.message || "Error saving",
      details: err.toString()
    };
  }
}
export async function fetchMonitoringDocuments(options = {}) {
  const {
    signal
  } = options;
  try {
    const res = await fetch(`${MONITORING_DOCS_BASE}`, {
      method: "GET",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json"
      },
      signal
    });
    if (!res.ok) {
      throw new Error(`HTTP error: ${res.status}`);
    }
    const documents = await res.json();
    return documents;
  } catch (err) {
    console.error("❌ fetchMonitoringDocuments:", err);
    throw err;
  }
}
export async function fetchMonitoringDocument(documentId) {
  try {
    const res = await fetch(`${MONITORING_DOCS_BASE}/${documentId}`, {
      method: "GET",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (!res.ok) {
      if (res.status === 404) {
        throw new Error("Document not found");
      }
      throw new Error(`HTTP error: ${res.status}`);
    }
    const document = await res.json();
    return document;
  } catch (err) {
    console.error("❌ fetchMonitoringDocument:", err);
    throw err;
  }
}
export async function updateMonitoringDocument(documentId, {
  name,
  client_name,
  report_period,
  config,
  data
}) {
  try {
    const payload = {
      name,
      client_name,
      report_period: report_period || null,
      config,
      data
    };
    const res = await fetch(`${MONITORING_DOCS_BASE}/${documentId}`, {
      method: "PUT",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json"
      },
      body: safeJsonStringify(payload)
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error: ${res.status}`);
    }
    const result = await res.json();
    return result;
  } catch (err) {
    console.error("❌ updateMonitoringDocument:", err);
    return {
      success: false,
      error: err.message || "Error during update",
      details: err.toString()
    };
  }
}
export async function deleteMonitoringDocument(documentId) {
  try {
    const res = await fetch(`${MONITORING_DOCS_BASE}/${documentId}`, {
      method: "DELETE",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error: ${res.status}`);
    }
    const result = await res.json();
    return result;
  } catch (err) {
    console.error("❌ deleteMonitoringDocument:", err);
    return {
      success: false,
      error: err.message || "Error during deletion",
      details: err.toString()
    };
  }
}
export async function updateMonitoringDocumentName(documentId, name) {
  try {
    const res = await fetch(`${MONITORING_DOCS_BASE}/${documentId}`, {
      method: "PATCH",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name
      })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error: ${res.status}`);
    }
    const result = await res.json();
    return result.success === true;
  } catch (err) {
    console.error("❌ updateMonitoringDocumentName:", err);
    return false;
  }
}
export async function restoreMonitoringDocument(documentId) {
  try {
    const res = await fetch(`${MONITORING_DOCS_BASE}/${documentId}/restore`, {
      method: "POST",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error: ${res.status}`);
    }
    const result = await res.json();
    return result.success === true;
  } catch (err) {
    console.error("❌ restoreMonitoringDocument:", err);
    return false;
  }
}
export async function purgeMonitoringDocument(documentId) {
  try {
    const res = await fetch(`${MONITORING_DOCS_BASE}/${documentId}/purge`, {
      method: "DELETE",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error: ${res.status}`);
    }
    const result = await res.json();
    return result.success === true;
  } catch (err) {
    console.error("❌ purgeMonitoringDocument:", err);
    return false;
  }
}
export function isMonitoringDocumentNameTaken(name, {
  excludeId,
  documents
} = {}) {
  const normalized = String(name || "").trim().toLowerCase();
  if (!normalized || !Array.isArray(documents)) return false;
  return documents.some(doc => {
    if (excludeId != null && String(doc.id) === String(excludeId)) return false;
    return String(doc.name || "").trim().toLowerCase() === normalized;
  });
}
export async function fetchRecentMonitoringDocuments(limit = 10) {
  try {
    const documents = await fetchMonitoringDocuments();
    return documents.slice(0, limit);
  } catch (err) {
    console.error("❌ fetchRecentMonitoringDocuments:", err);
    return [];
  }
}
