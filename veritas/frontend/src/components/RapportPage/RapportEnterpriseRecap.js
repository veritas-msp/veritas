import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { MODULE_LABELS } from "./monitoring/MonitoringSteps";
import styles from "./RapportEnterpriseRecap.module.css";
const CONTRACT_OPTION_KEYS = ["Support", "Curatif", "Preventif", "Monitoring", "Hebergement", "MagicInfo", "Videosurveillance"];
const EQUIPMENT_KEYS = ["Ordinateurs", "Internet", "Firewalls", "Servers", "Storage", "Switch", "BorneWifi", "TOIP", "Backup"];
const EQUIPMENT_ICONS = {
  Ordinateurs: "mdi:monitor",
  Internet: "mdi:web",
  Firewalls: "mdi:shield-lock-outline",
  Servers: "mdi:server",
  Storage: "mdi:database",
  Switch: "mdi:lan",
  BorneWifi: "mdi:wifi",
  TOIP: "mdi:phone-voip",
  Backup: "mdi:backup-restore"
};
function parseClientOptions(client) {
  const defaults = Object.fromEntries(CONTRACT_OPTION_KEYS.map(key => [key, false]));
  if (!client) return defaults;
  if (client.options && typeof client.options === "object") {
    return {
      ...defaults,
      ...client.options
    };
  }
  if (client.contrat?.modules && typeof client.contrat.modules === "object") {
    return {
      ...defaults,
      ...client.contrat.modules
    };
  }
  return defaults;
}
function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}
function getContractBadge(expiration, suspended, copy) {
  if (suspended) {
    return {
      label: copy.contractSuspended,
      tone: "warn"
    };
  }
  if (!expiration) {
    return {
      label: copy.contractUnknown,
      tone: "muted"
    };
  }
  const exp = new Date(expiration);
  if (Number.isNaN(exp.getTime())) {
    return {
      label: copy.contractUnknown,
      tone: "muted"
    };
  }
  const now = new Date();
  if (exp < now) {
    return {
      label: copy.contractExpired,
      tone: "danger"
    };
  }
  const days = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  if (days <= 30) {
    return {
      label: copy.contractExpiringSoon,
      tone: "warn"
    };
  }
  return {
    label: copy.contractActive,
    tone: "ok"
  };
}
export default function ReportEnterpriseRecap({
  client,
  copy
}) {
  const recap = copy.recap;
  const contractOptions = useMemo(() => parseClientOptions(client), [client]);
  const activeOptions = CONTRACT_OPTION_KEYS.filter(key => contractOptions[key]);
  const monitoringModules = useMemo(() => {
    const modules = client?.modules_monitoring || {};
    return Object.entries(modules).filter(([, enabled]) => Boolean(enabled)).map(([key]) => ({
      key,
      label: MODULE_LABELS[key] || key
    }));
  }, [client]);
  const equipmentItems = useMemo(() => {
    const counts = client?.equipmentCounts || {};
    return EQUIPMENT_KEYS.map(key => ({
      key,
      label: MODULE_LABELS[key] || key,
      count: Number(counts[key]) || 0,
      icon: EQUIPMENT_ICONS[key] || "mdi:devices"
    })).filter(item => item.count > 0);
  }, [client]);
  const sitesCount = Array.isArray(client?.sites) ? client.sites.length : 0;
  const contractBadge = getContractBadge(client?.contrat?.expiration, client?.contrat?.suspendu, recap);
  const clientName = client?.name || client?.nom || "-";
  const clientNumber = client?.client_number || client?.clientNumber;
  return <article className={styles.recapCard}>
      <header className={styles.recapHeader}>
        <div className={styles.recapHeaderIcon}>
          <Icon icon="mdi:office-building-outline" aria-hidden />
        </div>
        <div className={styles.recapHeaderCopy}>
          <h3 className={styles.recapTitle}>{clientName}</h3>
          {clientNumber ? <span className={styles.recapMeta}>
              {recap.clientNumber} · {clientNumber}
            </span> : null}
        </div>
        <span className={`${styles.contractBadge} ${styles[`contractBadge_${contractBadge.tone}`]}`}>
          {contractBadge.label}
        </span>
      </header>

      <div className={styles.recapGrid}>
        <section className={styles.recapSection}>
          <h4 className={styles.recapSectionTitle}>
            <Icon icon="mdi:file-document-outline" aria-hidden />
            {recap.contract}
          </h4>
          <dl className={styles.recapFacts}>
            <div>
              <dt>{recap.contractExpires}</dt>
              <dd>{formatDate(client?.contrat?.expiration)}</dd>
            </div>
            {client?.commercial ? <div>
                <dt>{recap.commercial}</dt>
                <dd>{client.commercial}</dd>
              </div> : null}
            {client?.primaryContactName ? <div>
                <dt>{recap.contact}</dt>
                <dd>{client.primaryContactName}</dd>
              </div> : null}
            {sitesCount > 0 ? <div>
                <dt>{recap.sites}</dt>
                <dd>{sitesCount}</dd>
              </div> : null}
          </dl>
        </section>

        <section className={styles.recapSection}>
          <h4 className={styles.recapSectionTitle}>
            <Icon icon="mdi:tune-variant" aria-hidden />
            {recap.contractOptions}
          </h4>
          {activeOptions.length > 0 ? <ul className={styles.chipList}>
              {activeOptions.map(key => <li key={key} className={styles.chip}>
                  {key}
                </li>)}
            </ul> : <p className={styles.emptyHint}>{recap.noOptions}</p>}
        </section>

        <section className={styles.recapSection}>
          <h4 className={styles.recapSectionTitle}>
            <Icon icon="mdi:chart-timeline-variant" aria-hidden />
            {recap.services}
          </h4>
          {monitoringModules.length > 0 ? <ul className={styles.chipList}>
              {monitoringModules.map(module => <li key={module.key} className={`${styles.chip} ${styles.chipAccent}`}>
                  {module.label}
                </li>)}
            </ul> : <p className={styles.emptyHint}>{recap.noServices}</p>}
        </section>

        <section className={styles.recapSection}>
          <h4 className={styles.recapSectionTitle}>
            <Icon icon="mdi:devices" aria-hidden />
            {recap.equipment}
          </h4>
          {equipmentItems.length > 0 ? <ul className={styles.equipmentList}>
              {equipmentItems.map(item => <li key={item.key} className={styles.equipmentItem}>
                  <Icon icon={item.icon} aria-hidden />
                  <span className={styles.equipmentLabel}>{item.label}</span>
                  <span className={styles.equipmentCount}>{item.count}</span>
                </li>)}
            </ul> : <p className={styles.emptyHint}>{recap.noEquipment}</p>}
        </section>
      </div>
    </article>;
}
