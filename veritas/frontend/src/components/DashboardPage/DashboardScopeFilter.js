import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { fetchActiveUsers } from "../../api/users";
import { fetchClientsList, fetchContactsList } from "../../api/clients";
import { DEFAULT_SCOPE_FILTER, normalizeScopeFilter, parseScopeFilter } from "./dashboardScopeUtils";
import styles from "./DashboardScopeFilter.module.css";
function getUserLabel(user) {
  return user?.ticket_helpdesk_display_name || user?.username || user?.name || user?.nom || user?.email || "-";
}
function getClientLabel(client) {
  return client?.name || client?.nom || client?.contrat?.nom || `#${client?.id}` || "-";
}
function getContactLabel(contact) {
  const fullName = [contact?.prenom, contact?.nom].filter(Boolean).join(" ").trim();
  const company = contact?.client_name || contact?.entreprise || "";
  if (fullName && company) return `${fullName} · ${company}`;
  return fullName || contact?.email || `#${contact?.id}` || "-";
}
export default function DashboardScopeFilter({
  copy,
  value,
  onChange,
  disabled = false
}) {
  const [agents, setAgents] = useState([]);
  const [clients, setClients] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const parsed = useMemo(() => parseScopeFilter(value), [value]);
  const scopeType = parsed.type;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([fetchActiveUsers().catch(() => []), fetchClientsList({
      signal: controller.signal
    }).catch(() => []), fetchContactsList(null, {
      signal: controller.signal
    }).catch(() => [])]).then(([usersRows, clientRows, contactRows]) => {
      if (controller.signal.aborted) return;
      setAgents((Array.isArray(usersRows) ? usersRows : []).filter(user => String(user?.role || "").toLowerCase() !== "client"));
      setClients(Array.isArray(clientRows) ? clientRows : []);
      setContacts(Array.isArray(contactRows) ? contactRows : []);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);
  const entityOptions = useMemo(() => {
    if (scopeType === "agent") {
      return agents.map(user => ({
        value: String(user.id),
        label: getUserLabel(user)
      })).sort((a, b) => a.label.localeCompare(b.label, undefined, {
        sensitivity: "base"
      }));
    }
    if (scopeType === "client") {
      return clients.map(client => ({
        value: String(client.id),
        label: getClientLabel(client)
      })).sort((a, b) => a.label.localeCompare(b.label, undefined, {
        sensitivity: "base"
      }));
    }
    if (scopeType === "contact") {
      return contacts.map(contact => ({
        value: String(contact.id),
        label: getContactLabel(contact)
      })).sort((a, b) => a.label.localeCompare(b.label, undefined, {
        sensitivity: "base"
      }));
    }
    return [];
  }, [agents, clients, contacts, scopeType]);
  const selectedEntityId = scopeType === "agent" ? parsed.agentId || "" : scopeType === "client" ? parsed.clientId || "" : scopeType === "contact" ? parsed.contactId || "" : "";
  const handleTypeChange = event => {
    const nextType = event.target.value;
    if (nextType === "all") {
      onChange?.({
        ...DEFAULT_SCOPE_FILTER
      });
      return;
    }
    onChange?.({
      type: nextType,
      agentId: null,
      clientId: null,
      contactId: null
    });
  };
  const handleEntityChange = event => {
    const entityId = event.target.value;
    if (!entityId) {
      onChange?.({
        ...DEFAULT_SCOPE_FILTER
      });
      return;
    }
    if (scopeType === "agent") {
      onChange?.({
        type: "agent",
        agentId: entityId,
        clientId: null,
        contactId: null
      });
      return;
    }
    if (scopeType === "client") {
      onChange?.({
        type: "client",
        agentId: null,
        clientId: entityId,
        contactId: null
      });
      return;
    }
    onChange?.({
      type: "contact",
      agentId: null,
      clientId: null,
      contactId: entityId
    });
  };
  const handleClear = () => {
    onChange?.({
      ...DEFAULT_SCOPE_FILTER
    });
  };
  return <div className={styles.bar} aria-label={copy.barAria}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>{copy.typeLabel}</span>
        <select className={styles.select} value={scopeType} onChange={handleTypeChange} disabled={disabled || loading} aria-label={copy.typeAria}>
          <option value="all">{copy.all}</option>
          <option value="agent">{copy.agent}</option>
          <option value="client">{copy.client}</option>
          <option value="contact">{copy.contact}</option>
        </select>
      </label>

      {scopeType !== "all" ? <label className={`${styles.field} ${styles.fieldEntity}`}>
          <span className={styles.fieldLabel}>{copy.entityLabel}</span>
          <select className={styles.select} value={selectedEntityId} onChange={handleEntityChange} disabled={disabled || loading || entityOptions.length === 0} aria-label={copy.entityAria}>
            <option value="">{copy.chooseEntity}</option>
            {entityOptions.map(option => <option key={option.value} value={option.value}>
                {option.label}
              </option>)}
          </select>
        </label> : null}

      {scopeType !== "all" && selectedEntityId ? <button type="button" className={styles.clearBtn} onClick={handleClear} disabled={disabled} aria-label={copy.clearAria}>
          <Icon icon="mdi:close-circle-outline" aria-hidden />
          <span>{copy.clear}</span>
        </button> : null}
    </div>;
}
export function getScopeFilterSummary(scopeFilter, copy, {
  agents = [],
  clients = [],
  contacts = []
} = {}) {
  const normalized = normalizeScopeFilter(scopeFilter);
  if (normalized.type === "all") return null;
  if (normalized.type === "agent") {
    const match = agents.find(row => String(row.id) === String(normalized.agentId));
    const label = match ? getUserLabel(match) : normalized.agentId;
    return copy.activeAgent.replace("{name}", label);
  }
  if (normalized.type === "client") {
    const match = clients.find(row => String(row.id) === String(normalized.clientId));
    const label = match ? getClientLabel(match) : normalized.clientId;
    return copy.activeClient.replace("{name}", label);
  }
  const match = contacts.find(row => String(row.id) === String(normalized.contactId));
  const label = match ? getContactLabel(match) : normalized.contactId;
  return copy.activeContact.replace("{name}", label);
}
