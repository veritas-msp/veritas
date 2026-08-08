import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import dashStyles from "./AntivirusMspDashboard.module.css";
import panelStyles from "../EquipementPage/SupervisionCenterPage.module.css";
import MspOverviewHexPanel, { getHealthHexTone } from "../Misc/MspOverviewHexPanel/MspOverviewHexPanel";
import MspPriorityPanel from "../Misc/MspPriorityPanel/MspPriorityPanel";
import { buildAntivirusFleetStats } from "./antivirusMspUtils";
import { buildAntispamFleetStats } from "./antispamMspUtils";
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
  const toneKey = tone === "red" ? "bad" : tone === "amber" || tone === "orange" ? "warn" : tone === "violet" ? "neutral" : tone === "blue" ? "good" : tone;
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
function buildSecurityActions({
  antivirusData,
  antispamData,
  campaigns,
  isCommunity,
  actionsCopy
}) {
  const actions = [];
  (antivirusData || []).forEach(row => {
    if (row.status === "inactif") {
      actions.push({
        id: `av-${row.clientId}-${row.id || row.licenseKey || row.productName}`,
        tone: "bad",
        label: actionsCopy.avExpired,
        title: row.companyName || row.productName || row.clientName,
        meta: row.clientName,
        tab: "antivirus",
        row
      });
    } else if (row.status === "expire_bientot") {
      actions.push({
        id: `av-warn-${row.clientId}-${row.id || row.licenseKey || row.productName}`,
        tone: "warn",
        label: actionsCopy.avLicenseSoon,
        title: row.companyName || row.productName || row.clientName,
        meta: row.clientName,
        tab: "antivirus",
        row
      });
    }
  });
  (antispamData || []).forEach(row => {
    if (row.status === "inactif") {
      actions.push({
        id: `as-${row.clientId}-${row.id}`,
        tone: "bad",
        label: actionsCopy.asExpired,
        title: row.productName || row.clientName,
        meta: row.clientName,
        tab: "antispam",
        row
      });
    } else if (row.status === "expire_bientot") {
      actions.push({
        id: `as-warn-${row.clientId}-${row.id}`,
        tone: "warn",
        label: actionsCopy.asSoon,
        title: row.productName || row.clientName,
        meta: row.clientName,
        tab: "antispam",
        row
      });
    }
  });
  if (!isCommunity) {
    (campaigns || []).forEach(campaign => {
      if (campaign.status === "suspendue") {
        actions.push({
          id: `camp-${campaign.id}`,
          tone: "warn",
          label: actionsCopy.campaignSuspended,
          title: campaign.name || actionsCopy.campaignFallback,
          meta: campaign.client_name || campaign.clientName || "",
          tab: "campaigns",
          row: campaign
        });
      }
    });
  }
  const toneOrder = {
    bad: 0,
    warn: 1,
    good: 2
  };
  return actions.sort((a, b) => (toneOrder[a.tone] ?? 9) - (toneOrder[b.tone] ?? 9));
}
export default function SecurityOverviewPanel({
  copy,
  antivirusData = [],
  antispamData = [],
  campaigns = [],
  loading = false,
  isCommunity = false,
  onGoTab,
  onOpenAntivirus,
  onOpenAntispam,
  onOpenClient
}) {
  const overview = copy?.overview;
  const stats = useMemo(() => {
    const avIssues = antivirusData.filter(r => r.status === "inactif" || r.status === "expire_bientot").length;
    const antispamIssues = antispamData.filter(r => r.status === "inactif" || r.status === "expire_bientot").length;
    const campaignIssues = isCommunity ? 0 : campaigns.filter(c => c.status === "suspendue").length;
    const total = avIssues + antispamIssues + campaignIssues;
    const monitored = antivirusData.length + antispamData.length;
    const healthy = Math.max(0, monitored - avIssues - antispamIssues);
    const healthScore = monitored > 0 ? Math.round(healthy / monitored * 100) : total === 0 ? 100 : 40;
    return {
      avIssues,
      antispamIssues,
      campaignIssues,
      total,
      healthScore
    };
  }, [antivirusData, antispamData, campaigns, isCommunity]);
  const actions = useMemo(() => buildSecurityActions({
    antivirusData,
    antispamData,
    campaigns,
    isCommunity,
    actionsCopy: overview?.actions || {}
  }), [antivirusData, antispamData, campaigns, isCommunity, overview?.actions]);
  const avStats = useMemo(() => buildAntivirusFleetStats(antivirusData), [antivirusData]);
  const asStats = useMemo(() => buildAntispamFleetStats(antispamData), [antispamData]);
  const hexItems = useMemo(() => {
    const hexKpi = overview?.hexKpi || {};
    const items = [{
      id: "alerts",
      icon: "mdi:alert-circle-outline",
      label: hexKpi.alerts,
      value: stats.total,
      tone: stats.total > 0 ? "bad" : "good"
    }, {
      id: "avIssues",
      icon: "mdi:shield-bug-outline",
      label: hexKpi.avIssues,
      value: stats.avIssues,
      tone: stats.avIssues > 0 ? "bad" : "good",
      disabled: stats.avIssues === 0,
      onClick: () => onGoTab?.("antivirus")
    }, {
      id: "asIssues",
      icon: "mdi:email-secure-outline",
      label: hexKpi.asIssues,
      value: stats.antispamIssues,
      tone: stats.antispamIssues > 0 ? "warn" : "good",
      disabled: stats.antispamIssues === 0,
      onClick: () => onGoTab?.("antispam")
    }];
    if (!isCommunity) {
      items.push({
        id: "campaigns",
        icon: "mdi:shield-lock-outline",
        label: hexKpi.campaigns,
        value: stats.campaignIssues,
        tone: stats.campaignIssues > 0 ? "warn" : "good",
        disabled: stats.campaignIssues === 0,
        onClick: () => onGoTab?.("campaigns")
      });
    }
    items.push({
      id: "avSolutions",
      icon: "mdi:shield-search",
      label: hexKpi.avSolutions,
      value: avStats.total,
      tone: "neutral",
      onClick: () => onGoTab?.("antivirus")
    }, {
      id: "asSolutions",
      icon: "mdi:email-secure-outline",
      label: hexKpi.asSolutions,
      value: asStats.total,
      tone: "cyan",
      onClick: () => onGoTab?.("antispam")
    }, {
      id: "health",
      icon: "mdi:heart-pulse",
      label: hexKpi.health,
      value: stats.healthScore ?? "-",
      tone: getHealthHexTone(stats.healthScore),
      zeroMuted: false
    });
    return items;
  }, [overview?.hexKpi, stats, isCommunity, avStats.total, asStats.total, onGoTab]);
  const priorityActions = actions;
  const securityPriorityItems = useMemo(() => priorityActions.map(action => ({
    id: action.id,
    name: action.title,
    meta: [action.meta, action.label].filter(Boolean).join(" · "),
    tone: action.tone,
    verb: overview?.treat,
    action
  })), [priorityActions, overview?.treat]);
  const handleOpenAction = action => {
    if (action.tab === "antivirus" && action.row) {
      onOpenAntivirus?.(action.row);
      return;
    }
    if (action.tab === "antispam" && action.row?.clientId) {
      onOpenAntispam?.(action.row);
      return;
    }
    if (action.tab === "campaigns") {
      onGoTab?.("campaigns");
      return;
    }
    onGoTab?.(action.tab);
  };
  if (loading) {
    return <div className={panelStyles.skeletonPanelWrap}>
        <div className={`${panelStyles.skeleton} ${panelStyles.skeletonPanel}`} />
      </div>;
  }
  if (!overview) return null;
  return <div className={`${dashStyles.dashboard} ${panelStyles.dashboard} ${panelStyles.overviewStack}`}>
      <MspOverviewHexPanel title={overview.hexTitle} hint={stats.total > 0 ? copy.formatPortfolioAlerts(stats.total) : undefined} items={hexItems} />

      <MspPriorityPanel title={overview.priorityTitle} countLabel={priorityActions.length > 0 ? copy.formatPortfolioAlerts(stats.total) : undefined} items={securityPriorityItems} onItemClick={item => handleOpenAction(item.action)} emptyIcon="mdi:shield-check-outline" emptyTitle={overview.emptyTitle} emptyText={overview.emptyText} limit={15} />

      <SolutionStatsBand eyebrow={overview.av.eyebrow} title={overview.av.title} description={copy.formatAvFleetDescription(avStats)} icon="mdi:shield-search" viewFleetLabel={overview.viewFleet} onOpen={() => onGoTab?.("antivirus")}>
        <KpiCard icon="mdi:shield-bug-outline" label={overview.kpi.solutions} value={avStats.total} tone="blue" onClick={() => onGoTab?.("antivirus")} />
        <KpiCard icon="mdi:office-building-outline" label={overview.kpi.enterprises} value={avStats.clients} tone="neutral" onClick={() => onGoTab?.("antivirus")} />
        <KpiCard icon="mdi:desktop-classic" label={overview.kpi.endpoints} value={avStats.endpoints} tone="neutral" disabled={avStats.endpoints === 0} onClick={() => onGoTab?.("antivirus")} />
        <KpiCard icon="mdi:license" label={overview.kpi.licenses} value={avStats.licenses} tone="neutral" disabled={avStats.licenses === 0} onClick={() => onGoTab?.("antivirus")} />
        <KpiCard icon="mdi:alert-circle-outline" label={overview.kpi.todo} value={avStats.issues} tone={avStats.issues > 0 ? "red" : "good"} disabled={avStats.issues === 0} onClick={() => onGoTab?.("antivirus")} />
        <KpiCard icon="mdi:heart-pulse" label={overview.kpi.health} value={avStats.healthScore ?? "-"} tone={avStats.healthScore == null ? "neutral" : avStats.healthScore >= 80 ? "good" : avStats.healthScore >= 50 ? "warn" : "bad"} onClick={() => onGoTab?.("antivirus")} />
      </SolutionStatsBand>

      <SolutionStatsBand eyebrow={overview.as.eyebrow} title={overview.as.title} description={copy.formatAsFleetDescription(asStats)} icon="mdi:email-secure-outline" viewFleetLabel={overview.viewFleet} onOpen={() => onGoTab?.("antispam")}>
        <KpiCard icon="mdi:email-secure-outline" label={overview.kpi.solutions} value={asStats.total} tone="blue" onClick={() => onGoTab?.("antispam")} />
        <KpiCard icon="mdi:office-building-outline" label={overview.kpi.enterprises} value={asStats.clients} tone="neutral" onClick={() => onGoTab?.("antispam")} />
        <KpiCard icon="mdi:account-group-outline" label={overview.kpi.users} value={asStats.users} tone="neutral" disabled={asStats.users === 0} onClick={() => onGoTab?.("antispam")} />
        <KpiCard icon="mdi:web" label={overview.kpi.domains} value={asStats.domains} tone="neutral" disabled={asStats.domains === 0} onClick={() => onGoTab?.("antispam")} />
        <KpiCard icon="mdi:alert-circle-outline" label={overview.kpi.todo} value={asStats.issues} tone={asStats.issues > 0 ? "amber" : "good"} disabled={asStats.issues === 0} onClick={() => onGoTab?.("antispam")} />
        <KpiCard icon="mdi:heart-pulse" label={overview.kpi.health} value={asStats.healthScore ?? "-"} tone={asStats.healthScore == null ? "neutral" : asStats.healthScore >= 80 ? "good" : asStats.healthScore >= 50 ? "warn" : "bad"} onClick={() => onGoTab?.("antispam")} />
      </SolutionStatsBand>
    </div>;
}
export function computeSecurityOverviewStats(antivirusData, antispamData, campaigns, isCommunity) {
  const avIssues = (antivirusData || []).filter(r => r.status === "inactif" || r.status === "expire_bientot").length;
  const antispamIssues = (antispamData || []).filter(r => r.status === "inactif" || r.status === "expire_bientot").length;
  const campaignIssues = isCommunity ? 0 : (campaigns || []).filter(c => c.status === "suspendue").length;
  return {
    total: avIssues + antispamIssues + campaignIssues,
    avIssues,
    antispamIssues,
    campaignIssues
  };
}
