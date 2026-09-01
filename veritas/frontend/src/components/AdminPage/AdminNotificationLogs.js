import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { Card, Pagination } from "./AdminUi";
import { useTablePagination } from "./useTablePagination";
import { fetchClientsList } from "../../api/clients";
import API_BASE_URL from "../../config";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { fetchTicketAutomationConfig, getTicketAutomationConfig } from "../../utils/ticketAutomationStorage";
import { getAdminNotificationCenterCopy } from "./adminNotificationCenterI18n";
import { getElementOption, getSourceOption } from "./notificationEventConstants";

export default function AdminNotificationLogs() {
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminNotificationCenterCopy(locale), [locale]);
  const [settings, setSettings] = useState(() => getTicketAutomationConfig()?.notificationSettings);
  const [clients, setClients] = useState([]);
  const [retryingId, setRetryingId] = useState("");
  useEffect(() => {
    fetchTicketAutomationConfig().then(config => setSettings(config?.notificationSettings));
    fetchClientsList().then(rows => setClients(Array.isArray(rows) ? rows : [])).catch(() => setClients([]));
  }, []);
  const logs = Array.isArray(settings?.logs) ? settings.logs : [];
  const pagination = useTablePagination(logs, {
    initialPageSize: 25
  });
  const companyName = id => {
    if (!id) return copy.logs.allCompanies;
    return clients.find(client => String(client?.id) === String(id))?.name || id;
  };
  const retry = async logItem => {
    const logId = String(logItem?.id || "");
    if (!logId) return;
    setRetryingId(logId);
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/notifications/logs/${encodeURIComponent(logId)}/retry`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        }
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || copy.logs.toast.retryError);
      }
      const refreshed = await fetchTicketAutomationConfig();
      setSettings(refreshed?.notificationSettings);
      toast.success(copy.logs.toast.retryOk);
    } catch (error) {
      toast.error(error?.message || copy.logs.toast.retryError);
    } finally {
      setRetryingId("");
    }
  };
  return <Card title={copy.logs.title} description={copy.logs.description} fill>
      <div style={{
      overflowX: "auto"
    }}>
        <table style={{
        width: "100%",
        borderCollapse: "collapse"
      }}>
          <thead>
            <tr>
              {["date", "source", "element", "company", "channel", "status", "message", "actions"].map(key => <th key={key} style={{
              textAlign: key === "actions" ? "right" : "left",
              padding: "8px 6px",
              fontSize: "0.72rem",
              color: "var(--msp-muted)"
            }}>{copy.logs.columns[key]}</th>)}
            </tr>
          </thead>
          <tbody>
            {pagination.paginatedItems.length === 0 ? <tr>
                <td colSpan={8} style={{
              padding: "1.25rem",
              textAlign: "center",
              color: "var(--msp-muted)"
            }}>{copy.logs.empty}</td>
              </tr> : pagination.paginatedItems.map(logItem => <tr key={logItem.id}>
                <td style={{
              padding: "10px 6px",
              whiteSpace: "nowrap"
            }}>{logItem.createdAt ? new Date(logItem.createdAt).toLocaleString(locale || "fr-FR") : "—"}</td>
                <td style={{
              padding: "10px 6px"
            }}>{getSourceOption(logItem.source || "tickets").label}</td>
                <td style={{
              padding: "10px 6px"
            }}>{getElementOption(logItem.source || "tickets", logItem.element || "updated").label}</td>
                <td style={{
              padding: "10px 6px"
            }}>{companyName(logItem.enterpriseId)}</td>
                <td style={{
              padding: "10px 6px"
            }}>{logItem.channel || "—"}</td>
                <td style={{
              padding: "10px 6px"
            }}>{logItem.status || "—"}</td>
                <td style={{
              padding: "10px 6px",
              maxWidth: 280,
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}>{logItem.message || "—"}</td>
                <td style={{
              padding: "10px 6px",
              textAlign: "right"
            }}>
                  <button type="button" title={copy.logs.retry} onClick={() => retry(logItem)} disabled={retryingId === String(logItem.id || "")} style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--msp-text)"
              }}>
                    <Icon icon={retryingId === String(logItem.id || "") ? "mdi:loading" : "mdi:send-outline"} />
                  </button>
                </td>
              </tr>)}
          </tbody>
        </table>
      </div>
      {logs.length > 0 ? <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={pagination.setPage} pageSize={pagination.pageSize} onPageSizeChange={pagination.setPageSize} rangeLabel={pagination.rangeLabel} /> : null}
    </Card>;
}
