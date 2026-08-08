import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import dashStyles from "../CybersecuritePage/AntivirusMspDashboard.module.css";
import panelStyles from "../EquipementPage/SupervisionCenterPage.module.css";
import MspOverviewHexPanel, { getHealthHexTone } from "../Misc/MspOverviewHexPanel/MspOverviewHexPanel";
import MspPriorityPanel from "../Misc/MspPriorityPanel/MspPriorityPanel";
import { buildMicrosoftTenantFleetStats } from "./microsoftTenantMspUtils";
import { buildDomainFleetFromList, buildDomainFleetStats } from "./domainMspUtils";
import { buildSslFleetFromList, buildSslFleetStats, buildSslStatusLabels, isSslFleetIssue } from "./sslMspUtils";
import { getSslCertStatus, getSslHostLabel } from "../EnterprisesPage/sslCertificateUtils";
function formatNumber(value) {
  if (value === "-") return "-";
  if (value == null || Number.isNaN(Number(value))) return "0";
  return String(Math.round(Number(value)));
}
function KpiCard({
  icon,
  label,
  value,
  tone = "neutral",
  active,
  disabled,
  onClick
}) {
  const toneKey = tone === "red" ? "bad" : tone === "amber" || tone === "orange" ? "warn" : tone === "blue" ? "good" : tone;
  return <button type="button" className={`${dashStyles.kpiCard} ${active ? dashStyles.kpiCardActive : ""}`} onClick={onClick} disabled={disabled} style={disabled ? {
    opacity: 0.45,
    cursor: "default",
    pointerEvents: "none"
  } : undefined}>
      <span className={`${dashStyles.kpiIcon} ${dashStyles[`kpiIcon_${toneKey}`]}`}>
        <Icon icon={icon} />
      </span>
      <span className={dashStyles.kpiBody}>
        <span className={dashStyles.kpiValue}>{formatNumber(value)}</span>
        <span className={dashStyles.kpiLabel}>{label}</span>
      </span>
    </button>;
}
function SolutionStatsBand({
  eyebrow,
  title,
  description,
  icon,
  onOpen,
  viewFleetLabel,
  children
}) {
  return <section className={panelStyles.solutionKpiBand}>
      <header className={panelStyles.solutionKpiHeader}>
        <div className={panelStyles.solutionKpiHeaderMain}>
          <span className={panelStyles.solutionKpiIconWrap} aria-hidden>
            <Icon icon={icon} />
          </span>
          <div>
            <span className={panelStyles.solutionKpiEyebrow}>{eyebrow}</span>
            <h3 className={panelStyles.solutionKpiTitle}>{title}</h3>
            {description ? <p className={panelStyles.solutionKpiDesc}>{description}</p> : null}
          </div>
        </div>
        <button type="button" className={panelStyles.solutionKpiLink} onClick={onOpen}>
          {viewFleetLabel}
          <Icon icon="mdi:chevron-right" aria-hidden />
        </button>
      </header>
      <div className={panelStyles.solutionKpiRow}>{children}</div>
    </section>;
}
function getDomainStatus(domain, copy) {
  if (!domain?.expiration) {
    return {
      status: "actif",
      text: copy?.getDomainStatusLabel?.("actif") || "Active"
    };
  }
  const exp = new Date(domain.expiration);
  if (Number.isNaN(exp.getTime())) {
    return {
      status: "actif",
      text: copy?.getDomainStatusLabel?.("actif") || "Active"
    };
  }
  const now = new Date();
  const days = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  if (days <= 0) {
    return {
      status: "expiré",
      text: copy?.getDomainStatusLabel?.("expiré") || "Expired"
    };
  }
  if (days <= 30) {
    return {
      status: "expire_bientot",
      text: copy?.getDomainStatusLabel?.("expire_bientot") || "Expiring soon"
    };
  }
  return {
    status: "actif",
    text: copy?.getDomainStatusLabel?.("actif") || "Active"
  };
}
function buildServiceActions({
  microsoftData,
  allDomains,
  allSslCerts,
  copy
}) {
  const actions = [];
  const sslStatusLabels = buildSslStatusLabels(copy.sslStatus);
  (microsoftData || []).forEach(tenant => {
    if (tenant.status === "inactif") {
      actions.push({
        id: `ms-inactive-${tenant.clientId}`,
        tone: "bad",
        label: copy.actions.inactiveTenant,
        title: tenant.clientName,
        meta: tenant.tenantId || "-",
        tab: "microsoft"
      });
    }
    if (tenant.mfaAdminPct != null && tenant.mfaAdminPct < 80) {
      actions.push({
        id: `ms-mfa-admin-${tenant.clientId}`,
        tone: "warn",
        label: copy.formatMfaAdmins(Math.round(tenant.mfaAdminPct)),
        title: tenant.clientName,
        meta: copy.metaMicrosoftTenant,
        tab: "microsoft"
      });
    }
    if (tenant.secureScoreCurrent != null && tenant.secureScoreMax > 0) {
      const pct = Math.round(tenant.secureScoreCurrent / tenant.secureScoreMax * 100);
      if (pct < 60) {
        actions.push({
          id: `ms-score-${tenant.clientId}`,
          tone: "warn",
          label: copy.formatSecureScore(pct),
          title: tenant.clientName,
          meta: copy.metaMicrosoftTenant,
          tab: "microsoft"
        });
      }
    }
  });
  (allDomains || []).forEach(domain => {
    const domainStatus = getDomainStatus(domain, copy);
    if (domainStatus.status === "expiré") {
      actions.push({
        id: `dom-exp-${domain.client_id || domain.clientId}-${domain.nom}`,
        tone: "bad",
        label: copy.actions.expiredDomain,
        title: domain.nom || domain.name,
        meta: domain.client_name || domain.clientName || "",
        tab: "domain"
      });
    } else if (domainStatus.status === "expire_bientot") {
      actions.push({
        id: `dom-warn-${domain.client_id || domain.clientId}-${domain.nom}`,
        tone: "warn",
        label: copy.actions.expiringSoon,
        title: domain.nom || domain.name,
        meta: domain.client_name || domain.clientName || "",
        tab: "domain"
      });
    }
  });
  (allSslCerts || []).forEach(cert => {
    const status = getSslCertStatus(cert, sslStatusLabels);
    if (status.key === "expired") {
      actions.push({
        id: `ssl-exp-${cert.client_id}-${cert.id}`,
        tone: "bad",
        label: copy.actions.expiredSsl,
        title: getSslHostLabel(cert),
        meta: cert.client_name || "",
        tab: "ssl"
      });
    } else if (status.key === "warning") {
      actions.push({
        id: `ssl-warn-${cert.client_id}-${cert.id}`,
        tone: "warn",
        label: copy.actions.expiringSsl,
        title: getSslHostLabel(cert),
        meta: cert.client_name || "",
        tab: "ssl"
      });
    } else if (status.key === "error") {
      actions.push({
        id: `ssl-err-${cert.client_id}-${cert.id}`,
        tone: "bad",
        label: copy.actions.sslError,
        title: getSslHostLabel(cert),
        meta: cert.client_name || "",
        tab: "ssl"
      });
    }
  });
  const toneOrder = {
    bad: 0,
    warn: 1
  };
  return actions.sort((a, b) => (toneOrder[a.tone] ?? 9) - (toneOrder[b.tone] ?? 9));
}
export default function ServiceOverviewPanel({
  microsoftData = [],
  allDomains = [],
  allSslCerts = [],
  loading = false,
  onGoTab,
  onOpenClient,
  copy
}) {
  const sslStatusLabels = useMemo(() => buildSslStatusLabels(copy.sslStatus), [copy.sslStatus]);
  const stats = useMemo(() => {
    const inactiveTenants = microsoftData.filter(t => t.status === "inactif").length;
    const domainIssues = allDomains.filter(d => {
      const s = getDomainStatus(d, copy).status;
      return s === "expiré" || s === "expire_bientot";
    }).length;
    const sslIssues = (allSslCerts || []).filter(cert => {
      const status = getSslCertStatus(cert, sslStatusLabels);
      return isSslFleetIssue(status.key);
    }).length;
    const mfaIssues = microsoftData.filter(t => t.mfaAdminPct != null && t.mfaAdminPct < 80).length;
    const total = inactiveTenants + domainIssues + mfaIssues + sslIssues;
    const monitored = microsoftData.length + allDomains.length + allSslCerts.length;
    const healthScore = monitored > 0 ? Math.max(0, Math.round((monitored - total) / monitored * 100)) : total === 0 ? 100 : 45;
    return {
      inactiveTenants,
      domainIssues,
      mfaIssues,
      sslIssues,
      total,
      healthScore
    };
  }, [microsoftData, allDomains, allSslCerts, copy, sslStatusLabels]);
  const actions = useMemo(() => buildServiceActions({
    microsoftData,
    allDomains,
    allSslCerts,
    copy
  }), [microsoftData, allDomains, allSslCerts, copy]);
  const servicePriorityItems = useMemo(() => actions.map(action => ({
    id: action.id,
    name: action.title,
    meta: [action.meta, action.label].filter(Boolean).join(" · "),
    tone: action.tone,
    verb: copy.actionVerb,
    action
  })), [actions, copy.actionVerb]);
  const msStats = useMemo(() => buildMicrosoftTenantFleetStats(microsoftData), [microsoftData]);
  const domainFleetRows = useMemo(() => buildDomainFleetFromList(allDomains), [allDomains]);
  const domainStats = useMemo(() => buildDomainFleetStats(domainFleetRows), [domainFleetRows]);
  const sslFleetRows = useMemo(() => buildSslFleetFromList(allSslCerts, sslStatusLabels), [allSslCerts, sslStatusLabels]);
  const sslStats = useMemo(() => buildSslFleetStats(sslFleetRows), [sslFleetRows]);
  const hexItems = useMemo(() => {
    const hexKpi = copy?.hexKpi || {};
    return [{
      id: "alerts",
      icon: "mdi:alert-circle-outline",
      label: hexKpi.alerts,
      value: stats.total,
      tone: stats.total > 0 ? "bad" : "good"
    }, {
      id: "inactiveTenants",
      icon: "mdi:microsoft-azure",
      label: hexKpi.inactiveTenants,
      value: stats.inactiveTenants,
      tone: stats.inactiveTenants > 0 ? "bad" : "good",
      disabled: stats.inactiveTenants === 0,
      onClick: () => onGoTab?.("microsoft")
    }, {
      id: "domainIssues",
      icon: "mdi:web",
      label: hexKpi.domains,
      value: stats.domainIssues,
      tone: stats.domainIssues > 0 ? "warn" : "good",
      disabled: stats.domainIssues === 0,
      onClick: () => onGoTab?.("domain")
    }, {
      id: "mfaIssues",
      icon: "mdi:shield-key-outline",
      label: hexKpi.weakMfa,
      value: stats.mfaIssues,
      tone: stats.mfaIssues > 0 ? "violet" : "good",
      disabled: stats.mfaIssues === 0,
      onClick: () => onGoTab?.("microsoft")
    }, {
      id: "tenants",
      icon: "mdi:cloud-check-outline",
      label: hexKpi.tenants,
      value: microsoftData.length,
      tone: "neutral",
      onClick: () => onGoTab?.("microsoft")
    }, {
      id: "domainTotal",
      icon: "mdi:domain",
      label: hexKpi.domainTotal,
      value: allDomains.length,
      tone: "cyan",
      onClick: () => onGoTab?.("domain")
    }, {
      id: "sslIssues",
      icon: "mdi:certificate-outline",
      label: hexKpi.sslIssues,
      value: stats.sslIssues,
      tone: stats.sslIssues > 0 ? "warn" : "good",
      disabled: stats.sslIssues === 0,
      onClick: () => onGoTab?.("ssl")
    }, {
      id: "sslTotal",
      icon: "mdi:shield-lock-outline",
      label: hexKpi.sslTotal,
      value: allSslCerts.length,
      tone: "violet",
      onClick: () => onGoTab?.("ssl")
    }, {
      id: "health",
      icon: "mdi:heart-pulse",
      label: hexKpi.health,
      value: stats.healthScore ?? "-",
      tone: getHealthHexTone(stats.healthScore),
      zeroMuted: false
    }];
  }, [copy?.hexKpi, stats, microsoftData.length, allDomains.length, allSslCerts.length, onGoTab]);
  if (loading) {
    return <div className={panelStyles.skeletonPanelWrap}>
        <div className={`${panelStyles.skeleton} ${panelStyles.skeletonPanel}`} />
      </div>;
  }
  const kpi = copy.kpi || {};
  const hexKpi = copy?.hexKpi || {};
  return <div className={`${dashStyles.dashboard} ${panelStyles.dashboard} ${panelStyles.overviewStack}`}>
      <MspOverviewHexPanel title={copy.hexTitle} hint={stats.total > 0 ? copy.formatHeroDesc(stats.total) : undefined} items={hexItems} />

      <MspPriorityPanel title={copy.priorityTitle} countLabel={actions.length > 0 ? copy.formatHeroDesc(stats.total) : undefined} items={servicePriorityItems} onItemClick={item => onGoTab?.(item.action.tab)} emptyIcon="mdi:cloud-check-outline" emptyTitle={copy.emptyTitle} emptyText={copy.emptyText} limit={15} />

      <SolutionStatsBand eyebrow={copy.microsoft.eyebrow} title={copy.microsoft.title} description={copy.formatMicrosoftFleetDescription(msStats)} icon="mdi:microsoft-azure" viewFleetLabel={copy.viewFleet} onOpen={() => onGoTab?.("microsoft")}>
        <KpiCard icon="mdi:microsoft-azure" label={kpi.tenants} value={msStats.total} tone="blue" onClick={() => onGoTab?.("microsoft")} />
        <KpiCard icon="mdi:office-building-outline" label={kpi.clients} value={msStats.clients} tone="neutral" onClick={() => onGoTab?.("microsoft")} />
        <KpiCard icon="mdi:shield-check" label={kpi.active} value={msStats.active} tone="good" disabled={msStats.active === 0} onClick={() => onGoTab?.("microsoft")} />
        <KpiCard icon="mdi:shield-off" label={kpi.inactive} value={msStats.inactive} tone="bad" disabled={msStats.inactive === 0} onClick={() => onGoTab?.("microsoft")} />
        <KpiCard icon="mdi:alert-circle-outline" label={kpi.toReview} value={msStats.issues} tone={msStats.issues > 0 ? "red" : "good"} disabled={msStats.issues === 0} onClick={() => onGoTab?.("microsoft")} />
        <KpiCard icon="mdi:heart-pulse" label={kpi.health} value={msStats.healthScore ?? "-"} tone={msStats.healthScore == null ? "neutral" : msStats.healthScore >= 80 ? "good" : msStats.healthScore >= 50 ? "warn" : "bad"} onClick={() => onGoTab?.("microsoft")} />
      </SolutionStatsBand>

      <SolutionStatsBand eyebrow={copy.domain.eyebrow} title={copy.domain.title} description={copy.formatDomainFleetDescription(domainStats)} icon="mdi:web" viewFleetLabel={copy.viewFleet} onOpen={() => onGoTab?.("domain")}>
        <KpiCard icon="mdi:web" label={kpi.domainTotal} value={domainStats.total} tone="blue" onClick={() => onGoTab?.("domain")} />
        <KpiCard icon="mdi:office-building-outline" label={kpi.clients} value={domainStats.clients} tone="neutral" onClick={() => onGoTab?.("domain")} />
        <KpiCard icon="mdi:store-outline" label={kpi.providers} value={domainStats.providers} tone="neutral" disabled={domainStats.providers === 0} onClick={() => onGoTab?.("domain")} />
        <KpiCard icon="mdi:check-circle-outline" label={kpi.active} value={domainStats.statusCounts?.actif ?? 0} tone="good" disabled={(domainStats.statusCounts?.actif ?? 0) === 0} onClick={() => onGoTab?.("domain")} />
        <KpiCard icon="mdi:alert-circle-outline" label={kpi.toReview} value={domainStats.issues} tone={domainStats.issues > 0 ? "amber" : "good"} disabled={domainStats.issues === 0} onClick={() => onGoTab?.("domain")} />
        <KpiCard icon="mdi:heart-pulse" label={kpi.health} value={domainStats.healthScore ?? "-"} tone={domainStats.healthScore == null ? "neutral" : domainStats.healthScore >= 80 ? "good" : domainStats.healthScore >= 50 ? "warn" : "bad"} onClick={() => onGoTab?.("domain")} />
      </SolutionStatsBand>

      <SolutionStatsBand eyebrow={copy.ssl.eyebrow} title={copy.ssl.title} description={copy.formatSslFleetDescription(sslStats)} icon="mdi:certificate-outline" viewFleetLabel={copy.viewFleet} onOpen={() => onGoTab?.("ssl")}>
        <KpiCard icon="mdi:certificate-outline" label={hexKpi.sslTotal || "Certificats"} value={sslStats.total} tone="blue" onClick={() => onGoTab?.("ssl")} />
        <KpiCard icon="mdi:office-building-outline" label={kpi.clients} value={sslStats.clients} tone="neutral" onClick={() => onGoTab?.("ssl")} />
        <KpiCard icon="mdi:check-circle-outline" label={kpi.active} value={sslStats.statusCounts?.active ?? 0} tone="good" disabled={(sslStats.statusCounts?.active ?? 0) === 0} onClick={() => onGoTab?.("ssl")} />
        <KpiCard icon="mdi:clock-alert-outline" label={kpi.toReview} value={sslStats.issues} tone={sslStats.issues > 0 ? "red" : "good"} disabled={sslStats.issues === 0} onClick={() => onGoTab?.("ssl")} />
        <KpiCard icon="mdi:alert-octagon-outline" label={hexKpi.sslIssues} value={sslStats.statusCounts?.expired ?? 0} tone="bad" disabled={(sslStats.statusCounts?.expired ?? 0) === 0} onClick={() => onGoTab?.("ssl")} />
        <KpiCard icon="mdi:heart-pulse" label={kpi.health} value={sslStats.healthScore ?? "-"} tone={sslStats.healthScore == null ? "neutral" : sslStats.healthScore >= 80 ? "good" : sslStats.healthScore >= 50 ? "warn" : "bad"} onClick={() => onGoTab?.("ssl")} />
      </SolutionStatsBand>
    </div>;
}
export function computeServiceOverviewStats(microsoftData, allDomains, allSslCerts = []) {
  const inactiveTenants = (microsoftData || []).filter(t => t.status === "inactif").length;
  const domainIssues = (allDomains || []).filter(d => {
    const exp = d?.expiration ? new Date(d.expiration) : null;
    if (!exp || Number.isNaN(exp.getTime())) return false;
    const days = Math.ceil((exp - new Date()) / (1000 * 60 * 60 * 24));
    return days <= 30;
  }).length;
  const mfaIssues = (microsoftData || []).filter(t => t.mfaAdminPct != null && t.mfaAdminPct < 80).length;
  const sslIssues = (allSslCerts || []).filter(cert => {
    const status = getSslCertStatus(cert);
    return isSslFleetIssue(status.key);
  }).length;
  return {
    total: inactiveTenants + domainIssues + mfaIssues + sslIssues
  };
}
