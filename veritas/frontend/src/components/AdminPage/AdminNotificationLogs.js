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
import catalogStyles from "./AdminNotificationCatalog.module.css";

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
  return <div className={catalogStyles.layout}>
      <Card title={copy.logs.title} description={copy.logs.description} fill>
      <div className={catalogStyles.tableShell}>
        <table className={catalogStyles.table}>
          <thead>
            <tr>
              {["date", "source", "element", "company", "channel", "status", "message", "actions"].map(key => <th key={key} className={key === "actions" ? catalogStyles.tableActions : undefined}>{copy.logs.columns[key]}</th>)}
            </tr>
          </thead>
          <tbody>
            {pagination.paginatedItems.length === 0 ? <tr>
                <td colSpan={8} className={catalogStyles.empty}>{copy.logs.empty}</td>
              </tr> : pagination.paginatedItems.map(logItem => <tr key={logItem.id}>
                <td style={{
              whiteSpace: "nowrap"
            }}>{logItem.createdAt ? new Date(logItem.createdAt).toLocaleString(locale || "fr-FR") : "—"}</td>
                <td>{getSourceOption(logItem.source || "tickets").label}</td>
                <td>{getElementOption(logItem.source || "tickets", logItem.element || "updated").label}</td>
                <td>{companyName(logItem.enterpriseId)}</td>
                <td>{logItem.channel || "—"}</td>
                <td>{logItem.status || "—"}</td>
                <td className={catalogStyles.tableMuted} style={{
              maxWidth: 280,
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}>{logItem.message || "—"}</td>
                <td className={catalogStyles.tableActions}>
                  <button type="button" title={copy.logs.retry} onClick={() => retry(logItem)} disabled={retryingId === String(logItem.id || "")} style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "var(--msp-text)",
                display: "inline-flex",
                alignItems: "center"
              }}>
                    <Icon icon={retryingId === String(logItem.id || "") ? "mdi:loading" : "mdi:send-outline"} />
                  </button>
                </td>
              </tr>)}
          </tbody>
        </table>
      </div>
      {logs.length > 0 ? <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={pagination.setPage} pageSize={pagination.pageSize} onPageSizeChange={pagination.setPageSize} rangeLabel={pagination.rangeLabel} /> : null}
    </Card>
    </div>;
}
