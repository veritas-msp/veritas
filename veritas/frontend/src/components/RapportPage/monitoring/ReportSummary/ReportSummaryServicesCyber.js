import React, { useEffect, useMemo, useState } from "react";
import { Icon as IconifyIcon } from "@iconify/react";
import { getLicenseDisplayName, isFreeLicense } from "../../../ServicePage/TenantDetailTabs/utils";
import { getClientMfaDetails } from "../../../../api/clientOffice365";
import { filterExchangeDataByPeriod, filterTeamsDataByPeriod } from "../../../ServicePage/TenantDetailTabs/office365Period";
import {
  buildAntivirusEndpointRowsForClient,
  getAntivirusSolutionName
} from "./reportCyberTableUtils";
import { formatAntivirusEndpointType } from "../../../EnterprisesPage/antivirusSolutionUtils";
import { ReportTableBlock } from "./ReportSummaryBlocks";
import ReportSynthesisEditor from "./ReportSynthesisEditor";
import execStyles from "./ReportSummarySupervision.module.css";
import styles from "./ReportSummaryServicesCyber.module.css";

function listSolutions(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.solutions)) return raw.solutions;
  return [];
}

function formatInt(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString("fr-FR");
}

function getAntispamDisplayName(sol) {
  if (!sol) return "Antispam";
  // Prefer product/solution label over stored customer placeholder names.
  const raw =
    sol.logiciel ||
    sol.solution ||
    sol.nom ||
    sol.name ||
    sol.customerName ||
    "";
  let name = String(raw)
    .replace(/\s+customer$/i, "")
    .trim();
  if (/^(client|cliente)\s+mailinblack$/i.test(name) || /^mailinblack[- ]kunde$/i.test(name)) {
    name = "Mailinblack";
  }
  return name || "Antispam";
}

function formatDateFr(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("fr-FR");
}

function parsePeriodDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function pct(part, total) {
  if (!total) return null;
  return Math.round((Number(part) / Number(total)) * 1000) / 10;
}

function formatPct(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

function isLikelyServiceAccountFromUser(user) {
  const name = (user.name || user.displayName || "").toString();
  const upn = (user.userPrincipalName || user.email || "").toString();
  const email = (user.email || "").toString();
  const combined = `${name} ${upn} ${email}`.toLowerCase();
  const patterns = [/aad_/, /msol_/, /sync_/, /svc_/, /service_/, /\$@/, /_srv/, /_service/, /_sync/, /compte de service|service account|compte service/, /bot\./, /bot@/, /connector/, /automation/, /azure ad sync|ad sync|dirsync|aadconnect|dir sync/, /directory synchronization|synchronization service|on-premises/, /healthmailbox|systemmailbox|federatedemail/];
  return patterns.some(p => p.test(combined));
}

function getMfaUserForUser(user, mfaDetails) {
  const upn = (user.userPrincipalName || user.email || "").toLowerCase().trim();
  const userId = user.id;
  return (
    (Array.isArray(mfaDetails) &&
      mfaDetails.find(m => {
        const mUpn = (m.userPrincipalName || m.user_principal_name || "").toLowerCase().trim();
        if (mUpn && upn && mUpn === upn) return true;
        if (userId && m.id && String(m.id) === String(userId)) return true;
        return false;
      })) ||
    null
  );
}

const IGNORED_MFA_METHODS = new Set([
  "passwordauthenticationmethod",
  "windowshelloforbusinessauthenticationmethod"
]);

function userHasMfaFromMfaUser(mfaUser) {
  if (!mfaUser) return false;
  if (mfaUser.has_mfa === true) return true;
  const methods = mfaUser.mfa_methods || mfaUser.mfaMethods || [];
  if (!Array.isArray(methods)) return false;
  return methods.some(m => !IGNORED_MFA_METHODS.has(m));
}

function daysUntil(dateValue) {
  const d = parsePeriodDate(dateValue);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function Metric({ label, value, hint }) {
  return (
    <div className={styles.metricItem}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>{value}</span>
      {hint ? <span className={styles.metricHint}>{hint}</span> : null}
    </div>
  );
}

export default function ReportSummaryServicesCyber({
  client,
  reportStartDate = null,
  reportEndDate = null,
  synthesisByService = null,
  onSynthesisChange = null
}) {
  const [showTechnicalDetail, setShowTechnicalDetail] = useState(false);
  const [mfaDetailsFromApi, setMfaDetailsFromApi] = useState([]);
  const clientId = client?.id ?? client?.uuid ?? null;
  const modules = client?.modules_monitoring || {};

  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await getClientMfaDetails(clientId);
        if (!cancelled && Array.isArray(res?.userMfaDetails)) setMfaDetailsFromApi(res.userMfaDetails);
      } catch {
        if (!cancelled) setMfaDetailsFromApi([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const antivirusSolutions = useMemo(() => listSolutions(client?.equipements?.Antivirus), [client]);
  const antispamSolutions = useMemo(() => listSolutions(client?.equipements?.Antispam), [client]);
  const domains = useMemo(() => (Array.isArray(client?.equipements?.NDD) ? client.equipements.NDD : []), [client]);

  const antivirusStats = useMemo(() => {
    let totalEndpoints = 0;
    let disconnected = 0;
    let managed = 0;
    let unmanaged = 0;
    let licenseTotal = 0;
    let licenseUsed = 0;
    antivirusSolutions.forEach(sol => {
      const list =
        sol.syncData?.endpoints?.list ??
        sol.endpoints ??
        (Array.isArray(sol.data?.endpoints) ? sol.data.endpoints : sol.data?.endpoints?.list ?? []);
      const arr = Array.isArray(list) ? list : [];
      totalEndpoints += arr.length;
      arr.forEach(ep => {
        const isManaged = ep.isManaged === true || ep.managed === true || ep.endpointState === 1;
        if (isManaged) managed += 1;
        else unmanaged += 1;
        const lastSeen = ep.lastSeen ?? ep.lastCheckIn ?? ep.lastConnectedAt;
        if (!lastSeen) {
          disconnected += 1;
          return;
        }
        const d = new Date(lastSeen);
        if (Number.isNaN(d.getTime()) || Date.now() - d.getTime() > 24 * 60 * 60 * 1000) disconnected += 1;
      });
      const license = sol.syncData?.license || {};
      const total = Number(license.total || license.totalSeats || license.seats || sol.licencesTotales || 0) || 0;
      const used = Number(license.used || license.usedSeats || sol.licencesUtilisees || 0) || 0;
      licenseTotal += total;
      licenseUsed += used;
    });
    const connected = Math.max(0, totalEndpoints - disconnected);
    return {
      totalEndpoints,
      managed,
      unmanaged,
      disconnected,
      connected,
      managementRate: pct(managed, totalEndpoints),
      licenseTotal,
      licenseUsed,
      solutionName: antivirusSolutions[0] ? getAntivirusSolutionName(antivirusSolutions[0], 0) : "Antivirus"
    };
  }, [antivirusSolutions]);

  const antispamStats = useMemo(() => {
    let protectedUsers = 0;
    let hasStats = false;
    let domainsOrLicenses = antispamSolutions.length;
    antispamSolutions.forEach(sol => {
      const data = sol && typeof sol.data === "object" && sol.data !== null ? sol.data : sol || {};
      const fromLicense = sol.utilisateursProteges ?? sol.utilisateurs ?? sol.nombre_utilisateurs;
      if (fromLicense != null && !Number.isNaN(Number(fromLicense))) protectedUsers += Number(fromLicense);
      else if (Array.isArray(data.usersData)) protectedUsers += data.usersData.length;
      if (Array.isArray(data.statsData) && data.statsData.length > 0) hasStats = true;
    });
    return {
      solutionName: getAntispamDisplayName(antispamSolutions[0]),
      protectedUsers,
      domainsOrLicenses,
      hasStats
    };
  }, [antispamSolutions]);

  const reportStart = useMemo(() => parsePeriodDate(reportStartDate || client?.reportStartDate), [reportStartDate, client]);
  const reportEnd = useMemo(() => {
    const end = parsePeriodDate(reportEndDate || client?.reportEndDate);
    if (end) end.setHours(23, 59, 59, 999);
    return end;
  }, [reportEndDate, client]);

  const o365Data = useMemo(() => {
    const raw = client?.equipements?.Office365;
    if (!raw) return null;
    const data = raw.data || raw;
    const licenses = Array.isArray(data.licences) ? data.licences : [];
    const users = Array.isArray(data.users) ? data.users : [];
    const mfaDetailsFromSnapshot = Array.isArray(data.mfaDetails)
      ? data.mfaDetails
      : Array.isArray(data.userMfaDetails)
        ? data.userMfaDetails
        : [];
    const mfaDetails =
      Array.isArray(mfaDetailsFromApi) && mfaDetailsFromApi.length > 0 ? mfaDetailsFromApi : mfaDetailsFromSnapshot;
    const exchangeData = filterExchangeDataByPeriod(data.exchangeData ?? data.exchange ?? null, {
      start: reportStart,
      end: reportEnd
    });
    const teamsData = filterTeamsDataByPeriod(data.teamsData ?? data.teams ?? null, {
      start: reportStart,
      end: reportEnd
    });
    const onedriveData = data.onedriveData ?? data.onedrive ?? null;
    const sharepointData = data.sharepointData ?? data.sharepoint ?? null;
    const securityData = data.securityData ?? data.security ?? null;
    const metrics = data.metrics || null;
    const effectiveUsers = users.filter(u => {
      const isService = u.isServiceAccount === true || (u.isServiceAccount !== false && isLikelyServiceAccountFromUser(u));
      return !isService;
    });
    let adminsTotal = 0;
    let adminsWithMFA = 0;
    let nonAdminWithMFA = 0;
    let nonAdminTotal = 0;
    let usersWithMFA = 0;
    effectiveUsers.forEach(user => {
      const mfaUser = getMfaUserForUser(user, mfaDetails);
      const hasMfa = userHasMfaFromMfaUser(mfaUser);
      if (hasMfa) usersWithMFA += 1;
      if (mfaUser?.is_admin === true) {
        adminsTotal += 1;
        if (hasMfa) adminsWithMFA += 1;
      } else {
        nonAdminTotal += 1;
        if (hasMfa) nonAdminWithMFA += 1;
      }
    });
    const paidLicenses = licenses.filter(lic => !isFreeLicense(lic));
    const secureScore = metrics?.secureScore || securityData?.secureScore || null;
    const microsoftDomains = new Set();
    effectiveUsers.forEach(u => {
      const upn = u?.userPrincipalName || u?.email || "";
      const at = String(upn).indexOf("@");
      if (at > -1) microsoftDomains.add(String(upn).slice(at + 1).toLowerCase());
    });
    return {
      licenses: paidLicenses,
      licenseTypes: paidLicenses.length,
      usersCount: effectiveUsers.length,
      exchangeData,
      teamsData,
      onedriveData,
      sharepointData,
      secureScore,
      securityRecommendations: Array.isArray(securityData?.secureScoreRecommendations)
        ? securityData.secureScoreRecommendations
        : [],
      microsoftDomains: Array.from(microsoftDomains).sort((a, b) => a.localeCompare(b)),
      mfa: {
        usersWithMFA,
        totalUsers: effectiveUsers.length,
        adminsTotal,
        adminsWithMFA,
        nonAdminTotal,
        nonAdminWithMFA,
        globalRate: pct(usersWithMFA, effectiveUsers.length),
        adminRate: pct(adminsWithMFA, adminsTotal),
        userRate: pct(nonAdminWithMFA, nonAdminTotal)
      }
    };
  }, [client, mfaDetailsFromApi, reportStart, reportEnd]);

  const endpointRows = useMemo(() => buildAntivirusEndpointRowsForClient(antivirusSolutions), [antivirusSolutions]);

  const hasAntivirus = !!modules.Antivirus || antivirusSolutions.length > 0;
  const hasAntispam = !!modules.Antispam || antispamSolutions.length > 0;
  const hasOffice = !!modules.Office365 || Boolean(client?.equipements?.Office365);
  const hasDomains = !!modules.NDD || domains.length > 0;

  const showAgentConsistencyNote =
    hasAntivirus &&
    antivirusStats.managed > 0 &&
    antivirusStats.disconnected >= antivirusStats.totalEndpoints &&
    antivirusStats.totalEndpoints > 0;

  const microsoftSynthesis = useMemo(() => {
    if (!hasOffice || !o365Data) return "";
    const parts = [];
    parts.push(
      `Le tenant Microsoft 365 compte ${formatInt(o365Data.usersCount)} utilisateur${o365Data.usersCount > 1 ? "s" : ""} et ${formatInt(o365Data.licenseTypes)} type${o365Data.licenseTypes > 1 ? "s" : ""} de licence.`
    );
    if (o365Data.mfa) {
      if ((o365Data.mfa.adminRate ?? 0) >= 100 && (o365Data.mfa.userRate ?? 100) < 50) {
        parts.push(
          `L'authentification multifacteur est activée sur les comptes administrateurs (${formatPct(o365Data.mfa.adminRate)}), mais reste peu déployée sur les comptes utilisateurs (${formatInt(o365Data.mfa.nonAdminWithMFA)}/${formatInt(o365Data.mfa.nonAdminTotal)}, soit ${formatPct(o365Data.mfa.userRate)}).`
        );
      } else if ((o365Data.mfa.globalRate ?? 0) >= 80) {
        parts.push(
          `L'authentification multifacteur est largement déployée (${formatPct(o365Data.mfa.globalRate)} des comptes).`
        );
      } else if (o365Data.mfa.nonAdminTotal > 0 && (o365Data.mfa.userRate ?? 100) < 50) {
        parts.push(
          `Le MFA utilisateurs est à surveiller : ${formatInt(o365Data.mfa.nonAdminWithMFA)} compte${o365Data.mfa.nonAdminWithMFA > 1 ? "s" : ""} sur ${formatInt(o365Data.mfa.nonAdminTotal)} (${formatPct(o365Data.mfa.userRate)}).`
        );
      }
    }
    return parts.join(" ");
  }, [hasOffice, o365Data]);

  const antispamSynthesis = useMemo(() => {
    if (!hasAntispam) return "";
    const parts = [];
    parts.push(
      `La solution ${antispamStats.solutionName} protège ${formatInt(antispamStats.protectedUsers)} utilisateur${antispamStats.protectedUsers > 1 ? "s" : ""} sur ${formatInt(antispamStats.domainsOrLicenses)} domaine${antispamStats.domainsOrLicenses > 1 ? "s" : ""} / licence${antispamStats.domainsOrLicenses > 1 ? "s" : ""}.`
    );
    if (!antispamStats.hasStats) {
      parts.push("Les statistiques de filtrage des e-mails ne sont pas disponibles sur la période.");
    } else {
      parts.push("Le suivi antispam est actif sur la période.");
    }
    return parts.join(" ");
  }, [hasAntispam, antispamStats]);

  const antivirusSynthesis = useMemo(() => {
    if (!hasAntivirus) return "";
    const parts = [];
    if (antivirusStats.unmanaged > 0) {
      parts.push(
        `La couverture antivirus présente ${antivirusStats.unmanaged} poste${antivirusStats.unmanaged > 1 ? "s" : ""} non géré${antivirusStats.unmanaged > 1 ? "s" : ""} sur ${formatInt(antivirusStats.totalEndpoints)} (${formatPct(antivirusStats.managementRate)} de couverture). Vérifier l'installation et la remontée de l'agent.`
      );
    } else {
      parts.push(
        `La couverture antivirus est complète sur les ${formatInt(antivirusStats.totalEndpoints)} poste${antivirusStats.totalEndpoints > 1 ? "s" : ""} inventorié${antivirusStats.totalEndpoints > 1 ? "s" : ""}.`
      );
    }
    if (antivirusStats.disconnected > 0) {
      parts.push(
        `${formatInt(antivirusStats.disconnected)} agent${antivirusStats.disconnected > 1 ? "s" : ""} sans remontée depuis plus de 24 h — vérifier la connectivité des agents.`
      );
    }
    if (showAgentConsistencyNote) {
      parts.push(
        `Attention : ${formatInt(antivirusStats.managed)} postes gérés sont indiqués, mais tous les agents apparaissent non vus depuis plus de 24 h ; cette combinaison peut signaler un problème de collecte.`
      );
    }
    return parts.join(" ");
  }, [hasAntivirus, antivirusStats, showAgentConsistencyNote]);

  const domainsSynthesis = useMemo(() => {
    if (!hasDomains || domains.length === 0) return "";
    const nearExpiry = [];
    domains.forEach(domain => {
      const name = domain.nom || domain.name || domain.domaine || "";
      const expiration = domain.expiration || domain.expiry || domain.dateExpiration;
      const remaining = daysUntil(expiration);
      if (!name || remaining == null || remaining > 90) return;
      nearExpiry.push(`${name} (expiration le ${formatDateFr(expiration)})`);
    });
    if (nearExpiry.length > 0) {
      return `Les domaines suivants arrivent à expiration sous 90 jours : ${nearExpiry.join(", ")}.`;
    }
    return `${formatInt(domains.length)} nom${domains.length > 1 ? "s" : ""} de domaine suivi${domains.length > 1 ? "s" : ""}, sans échéance proche.`;
  }, [hasDomains, domains]);

  function renderSynthesis(serviceKey, fallback, placeholder) {
    const html = synthesisByService?.[serviceKey];
    const onChange =
      typeof onSynthesisChange === "function"
        ? value => onSynthesisChange(serviceKey, value)
        : null;
    return (
      <section className={execStyles.sectionBlock}>
        <h4 className={execStyles.sectionHeading}>Synthèse</h4>
        <div
          className={
            typeof onChange === "function"
              ? execStyles.synthesisEditorHost
              : execStyles.synthesisPanel
          }
        >
          {typeof onChange === "function" ? (
            <ReportSynthesisEditor
              value={html != null ? html : fallback}
              onChange={onChange}
              placeholder={placeholder}
            />
          ) : (
            <p className={execStyles.synthesis}>{fallback}</p>
          )}
        </div>
      </section>
    );
  }

  const exchange = o365Data?.exchangeData || null;
  const teams = o365Data?.teamsData || null;
  const teamsActivity = teams?.activity || {};
  const teamsUsage = teamsActivity.usage && typeof teamsActivity.usage === "object" ? teamsActivity.usage : {};
  const teamsMeetings =
    teamsActivity.meetings && typeof teamsActivity.meetings === "object"
      ? teamsActivity.meetings
      : { total: typeof teamsActivity.meetings === "number" ? teamsActivity.meetings : 0 };
  const teamsMessages =
    teamsActivity.messages && typeof teamsActivity.messages === "object"
      ? teamsActivity.messages
      : { total: typeof teamsActivity.messages === "number" ? teamsActivity.messages : 0 };
  const teamsCalls =
    teamsActivity.calls && typeof teamsActivity.calls === "object"
      ? teamsActivity.calls
      : teams?.calls && typeof teams.calls === "object"
        ? teams.calls
        : {};
  const sharepointSites = Array.isArray(o365Data?.sharepointData?.sites) ? o365Data.sharepointData.sites : [];
  const secureScore = o365Data?.secureScore;
  const scoreCurrent = secureScore?.current ?? secureScore?.score ?? null;
  const scoreMax = secureScore?.max ?? secureScore?.maxScore ?? null;
  const scorePct =
    secureScore?.percentage != null
      ? Number(secureScore.percentage)
      : scoreCurrent != null && scoreMax
        ? pct(scoreCurrent, scoreMax)
        : null;

  const endpointDetailColumns = [
    { id: "name", label: "Nom du poste", render: row => row.displayName || row.name || "—" },
    {
      id: "type",
      label: "Type",
      render: row => formatAntivirusEndpointType(row.type ?? row.machineType)
    },
    { id: "os", label: "Système d'exploitation", render: row => row.operatingSystem || row.os || "—" },
    {
      id: "lastSeen",
      label: "Dernière connexion",
      render: row => formatDateFr(row.lastSeen || row.lastCheckIn || row.lastConnectedAt)
    },
    {
      id: "policy",
      label: "Politique appliquée",
      render: row => row.policy?.name || row.policyName || "—"
    },
    {
      id: "status",
      label: "Statut de l'agent",
      render: row => (row.endpointState === 1 || row.isManaged ? "Actif" : "Inactif")
    }
  ];

  return (
    <div className={execStyles.executiveRoot}>
      {hasOffice && o365Data ? (
        <>
          <section className={execStyles.sectionBlock}>
            <div className={`${execStyles.kpiStrip} ${execStyles.kpiStripTriple}`} role="list" aria-label="Indicateurs Microsoft 365">
              <div className={execStyles.kpiItem} role="listitem">
                <span className={execStyles.kpiLabel}>Utilisateurs</span>
                <span className={execStyles.kpiValue}>{formatInt(o365Data.usersCount)}</span>
                <span className={execStyles.kpiHint}>{formatInt(o365Data.licenseTypes)} types de licences</span>
              </div>
              <div className={execStyles.kpiItem} role="listitem">
                <span className={execStyles.kpiLabel}>MFA</span>
                <span
                  className={`${execStyles.kpiValue} ${(o365Data.mfa?.userRate ?? 100) < 50 ? execStyles.kpiValueWarn : execStyles.kpiValueOk}`}
                >
                  {formatPct(o365Data.mfa?.globalRate)}
                </span>
                <span className={execStyles.kpiHint}>
                  {formatInt(o365Data.mfa?.nonAdminWithMFA || 0)}/{formatInt(o365Data.mfa?.nonAdminTotal || 0)} hors admin
                </span>
              </div>
              <div className={execStyles.kpiItem} role="listitem">
                <span className={execStyles.kpiLabel}>Secure Score</span>
                <span className={execStyles.kpiValue}>
                  {scoreCurrent != null && scoreMax != null
                    ? `${formatInt(scoreCurrent)}/${formatInt(scoreMax)}`
                    : "—"}
                </span>
                <span className={execStyles.kpiHint}>
                  {scorePct != null ? `${formatPct(scorePct)} des points` : "score de sécurité"}
                </span>
              </div>
            </div>
          </section>

          {renderSynthesis("microsoft", microsoftSynthesis, "Rédigez la synthèse Microsoft 365…")}

          <section className={execStyles.sectionBlock}>
            <h4 className={execStyles.sectionHeading}>Microsoft 365</h4>
            <div className={styles.serviceCard}>
              <h5 className={execStyles.detailSectionTitle}>Licences</h5>
              <ReportTableBlock
                title={null}
                columns={[
                  {
                    id: "name",
                    label: "Licence",
                    render: row =>
                      getLicenseDisplayName(
                        row.nom || row.displayName || row.name || row.skuPartNumber || row.skuId || "-"
                      )
                  },
                  {
                    id: "used",
                    label: "Utilisées",
                    render: row => formatInt(Number(row.utilisees || row.used || 0) || 0)
                  },
                  {
                    id: "total",
                    label: "Total",
                    render: row => formatInt(Number(row.total || row.nombre || 0) || 0)
                  },
                  {
                    id: "available",
                    label: "Disponibles",
                    render: row => {
                      const total = Number(row.total || row.nombre || 0) || 0;
                      const used = Number(row.utilisees || row.used || 0) || 0;
                      return formatInt(Math.max(0, total - used));
                    }
                  }
                ]}
                rows={o365Data.licenses.map((lic, idx) => ({
                  ...lic,
                  _rowKey: lic.skuId || lic.id || `${lic.name || "lic"}-${idx}`
                }))}
                emptyMessage="Aucune licence payante remontée."
              />

              {o365Data.microsoftDomains.length > 0 ? (
                <>
                  <h5 className={execStyles.detailSectionTitle}>Domaines Microsoft 365</h5>
                  <ul className={styles.simpleList}>
                    {o365Data.microsoftDomains.map(domain => (
                      <li key={domain}>{domain}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>

            <div className={styles.serviceCard}>
              <h5 className={execStyles.detailSectionTitle}>Usage des services</h5>

              {exchange ? (
                <div className={styles.usageBlock}>
                  <p className={styles.usageTitle}>
                    <IconifyIcon icon="mdi:email-outline" width={18} height={18} />
                    Exchange
                  </p>
                  <div className={`${styles.metricGrid} ${styles.metricGrid4}`}>
                    <Metric
                      label="E-mails reçus"
                      value={formatInt(exchange.emailActivity?.received)}
                      hint="Sur la période"
                    />
                    <Metric label="Boîtes mail" value={formatInt(exchange.mailboxes?.total)} />
                    <Metric label="Espace utilisé" value={exchange.mailboxes?.totalSize || "—"} />
                    <Metric
                      label="Taux de lecture"
                      value={
                        typeof exchange.emailActivity?.readRate === "number"
                          ? formatPct(exchange.emailActivity.readRate)
                          : "—"
                      }
                    />
                  </div>
                  {typeof exchange.emailActivity?.sent === "number" ? (
                    <p className={execStyles.sectionFootnote}>
                      {formatInt(exchange.emailActivity.sent)} e-mails envoyés sur la période.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {teams ? (
                <div className={styles.usageBlock}>
                  <p className={styles.usageTitle}>
                    <IconifyIcon icon="mdi:microsoft-teams" width={18} height={18} />
                    Microsoft Teams
                  </p>
                  <div className={`${styles.metricGrid} ${styles.metricGrid4}`}>
                    <Metric
                      label="Utilisateurs"
                      value={formatInt(teamsUsage.licensedUsers || teams?.teams?.users || 0)}
                      hint={`${formatInt(teamsUsage.activeUsers ?? teams?.teams?.activeUsers ?? 0)} actifs sur la période`}
                    />
                    <Metric label="Réunions" value={formatInt(teamsMeetings.total || 0)} />
                    <Metric
                      label="Messages"
                      value={formatInt(teamsMessages.channel || teamsMessages.total || 0)}
                      hint="Messages de canal"
                    />
                    <Metric
                      label="Durée des appels"
                      value={teamsCalls.totalDuration || teamsCalls.duration || teamsCalls.totalTime || "—"}
                    />
                  </div>
                </div>
              ) : null}

              {o365Data.onedriveData && o365Data.onedriveData.success !== false ? (
                <div className={styles.usageBlock}>
                  <p className={styles.usageTitle}>
                    <IconifyIcon icon="mdi:microsoft-onedrive" width={18} height={18} />
                    OneDrive
                  </p>
                  <div className={styles.metricGrid}>
                    <Metric label="Espace utilisé" value={o365Data.onedriveData.storage?.totalUsed || "—"} />
                    <Metric
                      label="Nombre de fichiers"
                      value={formatInt(o365Data.onedriveData.storage?.totalFiles)}
                    />
                  </div>
                </div>
              ) : null}

              {o365Data.sharepointData && o365Data.sharepointData.success !== false ? (
                <div className={styles.usageBlock}>
                  <p className={styles.usageTitle}>
                    <IconifyIcon icon="mdi:microsoft-sharepoint" width={18} height={18} />
                    SharePoint
                  </p>
                  <div className={styles.metricGrid}>
                    <Metric label="Sites SharePoint référencés" value={formatInt(sharepointSites.length)} />
                  </div>
                </div>
              ) : null}
            </div>

            <div className={styles.serviceCard}>
              <h5 className={execStyles.detailSectionTitle}>Sécurité</h5>
              <div className={`${styles.metricGrid} ${styles.metricGrid4}`}>
                <Metric
                  label="Secure Score"
                  value={
                    scoreCurrent != null && scoreMax != null
                      ? `${formatInt(scoreCurrent)} / ${formatInt(scoreMax)}`
                      : "—"
                  }
                  hint={scorePct != null ? `${formatPct(scorePct)} des points obtenus` : null}
                />
                <Metric
                  label="MFA global"
                  value={formatPct(o365Data.mfa.globalRate)}
                  hint={`${formatInt(o365Data.mfa.usersWithMFA)} comptes sur ${formatInt(o365Data.mfa.totalUsers)}`}
                />
                <Metric
                  label="MFA administrateurs"
                  value={formatPct(o365Data.mfa.adminRate)}
                  hint={`${formatInt(o365Data.mfa.adminsWithMFA)} comptes sur ${formatInt(o365Data.mfa.adminsTotal)}`}
                />
                <Metric
                  label="MFA utilisateurs"
                  value={formatPct(o365Data.mfa.userRate)}
                  hint={`${formatInt(o365Data.mfa.nonAdminWithMFA)} comptes sur ${formatInt(o365Data.mfa.nonAdminTotal)}`}
                />
              </div>
              {o365Data.securityRecommendations.length > 0 ? (
                <p className={execStyles.sectionFootnote}>
                  {formatInt(o365Data.securityRecommendations.length)} recommandation(s) de sécurité remontée(s).
                </p>
              ) : null}
            </div>
          </section>
        </>
      ) : null}

      {hasAntispam ? (
        <>
          <section className={execStyles.sectionBlock}>
            <div className={`${execStyles.kpiStrip} ${execStyles.kpiStripTriple}`} role="list" aria-label="Indicateurs antispam">
              <div className={execStyles.kpiItem} role="listitem">
                <span className={execStyles.kpiLabel}>Solution</span>
                <span className={execStyles.kpiValue}>{antispamStats.solutionName}</span>
                <span className={execStyles.kpiHint}>protection messagerie</span>
              </div>
              <div className={execStyles.kpiItem} role="listitem">
                <span className={execStyles.kpiLabel}>Utilisateurs protégés</span>
                <span className={execStyles.kpiValue}>{formatInt(antispamStats.protectedUsers)}</span>
                <span className={execStyles.kpiHint}>comptes couverts</span>
              </div>
              <div className={execStyles.kpiItem} role="listitem">
                <span className={execStyles.kpiLabel}>Domaines / licences</span>
                <span className={execStyles.kpiValue}>{formatInt(antispamStats.domainsOrLicenses)}</span>
                <span className={execStyles.kpiHint}>
                  {antispamStats.hasStats ? "stats disponibles" : "stats non disponibles"}
                </span>
              </div>
            </div>
          </section>

          {renderSynthesis("antispam", antispamSynthesis, "Rédigez la synthèse antispam…")}

          <section className={execStyles.sectionBlock}>
            <h4 className={execStyles.sectionHeading}>Antispam</h4>
            <div className={styles.serviceCard}>
              <p className={styles.serviceSubtitle}>
                {antispamStats.solutionName} — protection des messageries
              </p>
              {!antispamStats.hasStats ? (
                <p className={execStyles.sectionFootnote}>
                  Les statistiques de filtrage des e-mails ne sont pas disponibles sur la période.
                </p>
              ) : (
                <p className={execStyles.sectionFootnote}>Suivi antispam actif sur la période.</p>
              )}
            </div>
          </section>
        </>
      ) : null}

      {hasAntivirus ? (
        <>
          <section className={execStyles.sectionBlock}>
            <div className={execStyles.kpiStrip} role="list" aria-label="Indicateurs antivirus">
              <div className={execStyles.kpiItem} role="listitem">
                <span className={execStyles.kpiLabel}>Postes</span>
                <span className={execStyles.kpiValue}>{formatInt(antivirusStats.totalEndpoints)}</span>
                <span className={execStyles.kpiHint}>{antivirusStats.solutionName}</span>
              </div>
              <div className={execStyles.kpiItem} role="listitem">
                <span className={execStyles.kpiLabel}>Gérés</span>
                <span className={execStyles.kpiValue}>{formatInt(antivirusStats.managed)}</span>
                <span className={execStyles.kpiHint}>
                  {formatInt(antivirusStats.unmanaged)} non géré{antivirusStats.unmanaged > 1 ? "s" : ""}
                </span>
              </div>
              <div className={execStyles.kpiItem} role="listitem">
                <span className={execStyles.kpiLabel}>Couverture</span>
                <span
                  className={`${execStyles.kpiValue} ${antivirusStats.unmanaged > 0 ? execStyles.kpiValueWarn : execStyles.kpiValueOk}`}
                >
                  {formatPct(antivirusStats.managementRate)}
                </span>
                <span className={execStyles.kpiHint}>postes gérés</span>
              </div>
              <div className={execStyles.kpiItem} role="listitem">
                <span className={execStyles.kpiLabel}>Agents 24 h</span>
                <span
                  className={`${execStyles.kpiValue} ${antivirusStats.disconnected > 0 ? execStyles.kpiValueWarn : execStyles.kpiValueOk}`}
                >
                  {formatInt(antivirusStats.connected)}
                </span>
                <span className={execStyles.kpiHint}>
                  {formatInt(antivirusStats.disconnected)} sans remontée
                </span>
              </div>
            </div>
          </section>

          {renderSynthesis("antivirus", antivirusSynthesis, "Rédigez la synthèse antivirus…")}

          <section className={execStyles.sectionBlock}>
            <h4 className={execStyles.sectionHeading}>Antivirus</h4>
            <div className={styles.serviceCard}>
              <h5 className={execStyles.detailSectionTitle}>État des agents</h5>
              <div className={styles.metricGrid}>
                <Metric label="Agents vus depuis moins de 24 h" value={formatInt(antivirusStats.connected)} />
                <Metric
                  label="Agents sans remontée depuis plus de 24 h"
                  value={formatInt(antivirusStats.disconnected)}
                />
              </div>
              {antivirusStats.licenseTotal > 0 ? (
                <>
                  <h5 className={execStyles.detailSectionTitle}>Licences</h5>
                  <div className={styles.metricGrid}>
                    <Metric
                      label={antivirusStats.solutionName}
                      value={`${formatInt(antivirusStats.licenseUsed)} / ${formatInt(antivirusStats.licenseTotal)}`}
                      hint={`${formatInt(antivirusStats.licenseUsed)} licences utilisées sur ${formatInt(antivirusStats.licenseTotal)} disponibles.`}
                    />
                  </div>
                </>
              ) : null}
            </div>
          </section>
        </>
      ) : null}

      {hasDomains ? (
        <>
          <section className={execStyles.sectionBlock}>
            <div className={`${execStyles.kpiStrip} ${execStyles.kpiStripTriple}`} role="list" aria-label="Indicateurs domaines">
              <div className={execStyles.kpiItem} role="listitem">
                <span className={execStyles.kpiLabel}>Domaines</span>
                <span className={execStyles.kpiValue}>{formatInt(domains.length)}</span>
                <span className={execStyles.kpiHint}>noms de domaine suivis</span>
              </div>
              <div className={execStyles.kpiItem} role="listitem">
                <span className={execStyles.kpiLabel}>Échéances &lt; 90 j</span>
                <span className={execStyles.kpiValue}>
                  {formatInt(
                    domains.filter(domain => {
                      const remaining = daysUntil(
                        domain.expiration || domain.expiry || domain.dateExpiration
                      );
                      return remaining != null && remaining <= 90;
                    }).length
                  )}
                </span>
                <span className={execStyles.kpiHint}>à renouveler</span>
              </div>
              <div className={execStyles.kpiItem} role="listitem">
                <span className={execStyles.kpiLabel}>État</span>
                <span className={execStyles.kpiValue}>
                  {domains.some(domain => {
                    const remaining = daysUntil(
                      domain.expiration || domain.expiry || domain.dateExpiration
                    );
                    return remaining != null && remaining < 0;
                  })
                    ? "Expiré"
                    : "Actif"}
                </span>
                <span className={execStyles.kpiHint}>suivi DNS / registrar</span>
              </div>
            </div>
          </section>

          {renderSynthesis("domains", domainsSynthesis, "Rédigez la synthèse des domaines…")}

          <section className={execStyles.sectionBlock}>
            <h4 className={execStyles.sectionHeading}>Noms de domaine</h4>
            {domains.length === 0 ? (
              <p className={execStyles.sectionFootnote}>Aucun nom de domaine enregistré.</p>
            ) : (
              domains.map((domain, idx) => {
                const name = domain.nom || domain.name || domain.domaine || `Domaine ${idx + 1}`;
                const expiration = domain.expiration || domain.expiry || domain.dateExpiration;
                const remaining = daysUntil(expiration);
                const registrar = domain.registrar || domain.registrarName || "—";
                const nearExpiry = remaining != null && remaining <= 90;
                return (
                  <div key={domain.id || `${name}-${idx}`} className={styles.domainRow}>
                    <div>
                      <div className={styles.domainName}>{name}</div>
                      <div className={styles.domainMeta}>
                        {registrar} · {remaining != null && remaining < 0 ? "Expiré" : "Domaine actif"}
                        {nearExpiry ? " · Expiration proche" : ""}
                      </div>
                    </div>
                    <div className={nearExpiry ? styles.domainExpiry : styles.domainMeta}>
                      {expiration ? `Expiration : ${formatDateFr(expiration)}` : "Expiration non renseignée"}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </>
      ) : null}

      <section className={execStyles.sectionBlock} data-export-hide="true">
        <button
          type="button"
          className={execStyles.detailToggle}
          onClick={() => setShowTechnicalDetail(prev => !prev)}
          aria-expanded={showTechnicalDetail}
        >
          <IconifyIcon icon={showTechnicalDetail ? "mdi:chevron-up" : "mdi:chevron-down"} width={18} height={18} />
          {showTechnicalDetail ? "Masquer le détail technique" : "Voir le détail technique"}
        </button>
        {showTechnicalDetail ? (
          <div className={execStyles.detailPanel}>
            {hasAntivirus ? (
              <div>
                <h5 className={execStyles.detailSectionTitle}>Endpoints antivirus</h5>
                <ReportTableBlock
                  title={null}
                  columns={endpointDetailColumns}
                  rows={endpointRows}
                  emptyMessage="Aucun endpoint antivirus à afficher."
                />
              </div>
            ) : null}
            {sharepointSites.length > 0 ? (
              <div>
                <h5 className={execStyles.detailSectionTitle}>Sites SharePoint</h5>
                <ReportTableBlock
                  title={null}
                  columns={[
                    { id: "name", label: "Site", render: row => row.displayName || row.name || "—" },
                    { id: "url", label: "URL", render: row => row.webUrl || row.url || "—" }
                  ]}
                  rows={sharepointSites.map((site, idx) => ({ ...site, _rowKey: site.id || site.webUrl || idx }))}
                  emptyMessage={null}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
