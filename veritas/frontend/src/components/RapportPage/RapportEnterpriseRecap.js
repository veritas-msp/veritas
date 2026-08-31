import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { MODULE_LABELS } from "./monitoring/MonitoringSteps";
import { getEquipmentCountValue, getEquipmentFamilyLabel } from "../../i18n/equipmentFamilyLabels";
import { HARDWARE_TYPE_ORDER } from "../EnterprisesPage/infraHoneycombLayout";
import { INFRA_TYPE_ICONS } from "../EnterprisesPage/infraMapUtils";
import { buildSiteAddress, getSiteDisplayName, getSiteId, normalizeClientSites } from "../../utils/clientSites";
import styles from "./RapportEnterpriseRecap.module.css";
const CONTRACT_OPTION_KEYS = ["Support", "Curatif", "Preventif", "Monitoring", "Hebergement", "MagicInfo", "Videosurveillance"];
const EQUIPMENT_KEYS = [...HARDWARE_TYPE_ORDER, "Backup"];
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
function formatTicketCount(count, loading, recap) {
  if (loading) return recap.openTicketsLoading || "…";
  if (count == null) return "—";
  if (count >= 200) return "200+";
  return String(count);
}

export default function ReportEnterpriseRecap({
  client,
  copy,
  openTicketCount = null,
  openTicketLoading = false,
  sites = null,
  sitesLoading = false,
  embedded = false,
  onChangeClient,
  changeLabel
}) {
  const recap = copy.recap;
  const localeCode = copy.localeCode || "fr";
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
      label: getEquipmentFamilyLabel(key, localeCode, MODULE_LABELS[key] || key),
      count: getEquipmentCountValue(counts, key),
      icon: INFRA_TYPE_ICONS[key] || "mdi:devices"
    })).filter(item => item.count > 0);
  }, [client, localeCode]);
  const siteItems = useMemo(() => normalizeClientSites(sites ?? client?.sites), [sites, client]);
  const totalEquipment = equipmentItems.reduce((sum, item) => sum + item.count, 0);
  const contractBadge = getContractBadge(client?.contrat?.expiration, client?.contrat?.suspendu, recap);
  const clientName = client?.name || client?.nom || "-";
  const clientNumber = client?.client_number || client?.clientNumber;
  return <article className={`${styles.recapCard} ${embedded ? styles.recapCardEmbedded : ""}`.trim()}>
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
        <div className={styles.recapHeaderActions}>
          <span className={`${styles.contractBadge} ${styles[`contractBadge_${contractBadge.tone}`]}`}>
            {contractBadge.label}
          </span>
          {onChangeClient ? <button type="button" className={styles.changeBtn} onClick={onChangeClient}>
              {changeLabel}
            </button> : null}
        </div>
      </header>

      <div className={styles.statStrip}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{formatTicketCount(openTicketCount, openTicketLoading, recap)}</span>
          <span className={styles.statLabel}>{recap.openTickets}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{totalEquipment}</span>
          <span className={styles.statLabel}>{recap.equipmentTotal || recap.equipment}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{sitesLoading ? recap.openTicketsLoading || "…" : siteItems.length}</span>
          <span className={styles.statLabel}>{recap.sites}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{formatDate(client?.contrat?.expiration)}</span>
          <span className={styles.statLabel}>{recap.contractExpires}</span>
        </div>
      </div>

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

        <section className={`${styles.recapSection} ${styles.recapSectionWide}`}>
          <h4 className={styles.recapSectionTitle}>
            <Icon icon="mdi:map-marker-outline" aria-hidden />
            {recap.sites}
          </h4>
          {sitesLoading ? <p className={styles.emptyHint}>{recap.openTicketsLoading || "…"}</p> : siteItems.length > 0 ? <ul className={styles.siteList}>
              {siteItems.map(site => {
            const address = buildSiteAddress(site);
            return <li key={getSiteId(site)} className={styles.siteItem}>
                    <Icon icon="mdi:map-marker-outline" aria-hidden />
                    <span className={styles.siteCopy}>
                      <span className={styles.siteName}>
                        {getSiteDisplayName(site)}
                        {site.isPrimary ? <span className={`${styles.chip} ${styles.chipAccent}`}>{recap.sitePrimary}</span> : null}
                      </span>
                      {address ? <span className={styles.siteAddress}>{address}</span> : null}
                    </span>
                  </li>;
          })}
            </ul> : <p className={styles.emptyHint}>{recap.noSites}</p>}
        </section>
      </div>
    </article>;
}
