import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import API_BASE_URL from "../../config";
import { formatMicrosoftTenantSummary } from "./microsoftTenantSolutionUtils";
import { buildTenantReport } from "../ServicePage/tenantReportUtils";
import {
  getMfaUserForUser,
  pickMfaDetailsFromSnapshot,
  userHasMfa,
  userIsAdmin
} from "../ServicePage/mfaDetailsUtils";
import {
  KpiCard,
  StatsDashboardBody,
  statsDashboardStyles as dashStyles
} from "./StatsDashboardWidgets";
import CyberBrickItemsTable from "./CyberBrickItemsTable";
import formStyles from "./EnterpriseFormModal.module.css";
import styles from "./AntivirusOverviewModal.module.css";
import mapStyles from "./InfrastructureMap.module.css";
import equipStyles from "../EquipementPage/EquipmentPage.module.css";

function formatDate(value) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("fr-FR");
  } catch {
    return String(value);
  }
}

function pickTenantRecord(records, tenantItem) {
  const list = Array.isArray(records) ? records : [];
  if (!list.length) return null;
  const targetTenantId = tenantItem?.tenantId || null;
  if (targetTenantId) {
    const match = list.find(
      item => item?.data?.tenantId === targetTenantId || item?.item_key === targetTenantId
    );
    if (match) return match;
  }
  return list[0];
}

function ratePct(withMfa, total) {
  if (!total) return null;
  return Math.round((withMfa / total) * 100);
}

export function MicrosoftTenantOverviewPanel({
  active = true,
  client,
  tenantItem,
  embed = false,
  onSynced,
  toolbar = null
}) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [licenseSearch, setLicenseSearch] = useState("");
  const abortRef = useRef(null);
  const requestIdRef = useRef(0);
  const clientId = client?.id;
  const tenantId = tenantItem?.tenantId || null;
  const credentialId = tenantItem?.id || null;

  const loadDashboard = useCallback(async () => {
    if (!clientId) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/clients/${clientId}/o365`, {
        credentials: "include",
        signal: controller.signal
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Impossible de charger les données Microsoft 365");
      }
      const result = await response.json();
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      const record = pickTenantRecord(result?.data, { tenantId, id: credentialId });
      const data = record?.data || null;
      setSnapshot(data);
      setLastUpdate(data?.lastUpdate || record?.updated_at || null);
    } catch (err) {
      if (err?.name === "AbortError" || controller.signal.aborted || requestId !== requestIdRef.current) return;
      setLoadError(err.message || "Erreur de chargement");
      setSnapshot(null);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [clientId, tenantId, credentialId]);

  useEffect(() => {
    if (!active || !clientId) return undefined;
    loadDashboard();
    return () => {
      abortRef.current?.abort();
    };
  }, [active, clientId, tenantId, credentialId, loadDashboard]);

  const summary = useMemo(
    () => formatMicrosoftTenantSummary(tenantItem, client),
    [tenantItem, client]
  );

  const mfaDetails = useMemo(
    () => (snapshot ? pickMfaDetailsFromSnapshot(snapshot) : []),
    [snapshot]
  );

  const report = useMemo(() => {
    if (!snapshot) return null;
    const users = snapshot.users || [];
    const licences = snapshot.licences || snapshot.licenses || [];
    const securityData = snapshot.securityData || snapshot.security || null;
    return buildTenantReport({
      users,
      licences,
      securityData,
      mfaDetails,
      exchangeData: snapshot.exchangeData || snapshot.exchange || null,
      sharepointData: snapshot.sharepointData || snapshot.sharepoint || null,
      onedriveData: snapshot.onedriveData || snapshot.onedrive || null,
      teamsData: snapshot.teamsData || snapshot.teams || null,
      adoptionScore: snapshot.adoptionScore || null
    });
  }, [snapshot, mfaDetails]);

  const securityStats = useMemo(() => {
    const securityData = snapshot?.securityData || snapshot?.security || null;
    const scoreCurrent = securityData?.secureScore?.currentScore ?? null;
    const scoreMax = securityData?.secureScore?.maxScore ?? null;
    const users = Array.isArray(snapshot?.users) ? snapshot.users : [];
    let adminsTotal = 0;
    let adminsWithMfa = 0;
    let nonAdminTotal = 0;
    let nonAdminWithMfa = 0;

    if (Array.isArray(mfaDetails) && mfaDetails.length) {
      users.forEach(user => {
        const mfaUser = getMfaUserForUser(user, mfaDetails);
        if (!mfaUser) return;
        const hasMfa = userHasMfa(mfaUser);
        if (userIsAdmin(mfaUser)) {
          adminsTotal += 1;
          if (hasMfa) adminsWithMfa += 1;
        } else {
          nonAdminTotal += 1;
          if (hasMfa) nonAdminWithMfa += 1;
        }
      });
    }

    return {
      scoreCurrent: scoreCurrent != null ? Math.round(Number(scoreCurrent)) : null,
      scoreMax: scoreMax != null ? Math.round(Number(scoreMax)) : null,
      mfaAdminPct: ratePct(adminsWithMfa, adminsTotal),
      mfaNonAdminPct: ratePct(nonAdminWithMfa, nonAdminTotal),
      adminsWithMfa,
      adminsTotal,
      nonAdminWithMfa,
      nonAdminTotal
    };
  }, [snapshot, mfaDetails]);

  const licenseRows = useMemo(() => {
    const licences = snapshot?.licences || snapshot?.licenses || [];
    if (!Array.isArray(licences)) return [];
    return licences
      .filter(lic => {
        const total = Number(lic?.total) || 0;
        return total > 0 && total < 10000;
      })
      .slice()
      .sort((a, b) => {
        const usedA = Number(a?.utilisees ?? a?.used) || 0;
        const usedB = Number(b?.utilisees ?? b?.used) || 0;
        return usedB - usedA;
      });
  }, [snapshot]);

  if (!active || !clientId) return null;

  if (loading && !snapshot) {
    return (
      <div className={styles.loadingBlock}>
        <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
        Chargement des données Microsoft 365…
      </div>
    );
  }

  if (loadError && !snapshot) {
    return <div className={styles.errorBox}>{loadError}</div>;
  }

  if (!snapshot || !report) {
    return (
      <div className={styles.emptyState}>
        Aucune donnée synchronisée pour ce tenant. Ouvrez le détail pour lancer une sync.
      </div>
    );
  }

  const kpis = report.kpis || {};
  const licenseLabel = kpis.licensesUsed != null && kpis.licensesTotal != null
    ? `${kpis.licensesUsed}/${kpis.licensesTotal}`
    : "-";
  const licensePct = kpis.licensesUsed != null && kpis.licensesTotal
    ? Math.round((kpis.licensesUsed / kpis.licensesTotal) * 100)
    : null;
  const scoreLabel = securityStats.scoreCurrent != null
    ? `${securityStats.scoreCurrent} / ${securityStats.scoreMax ?? "—"}`
    : "-";
  const scorePct = securityStats.scoreCurrent != null && securityStats.scoreMax
    ? Math.round((securityStats.scoreCurrent / securityStats.scoreMax) * 100)
    : null;

  const tenantIdLabel = summary.shortTenantId && summary.shortTenantId !== "-"
    ? summary.shortTenantId
    : (tenantId ? `${String(tenantId).slice(0, 8)}…${String(tenantId).slice(-4)}` : "—");

  return (
    <StatsDashboardBody>
      <div className={mapStyles.metricsTopBar}>
        <div className={mapStyles.metricsTopBarLeft}>
          <div className={equipStyles.embeddedSearchBox}>
            <Icon icon="mdi:magnify" className={equipStyles.embeddedSearchIcon} aria-hidden />
            <input
              type="search"
              className={equipStyles.embeddedSearchInput}
              value={licenseSearch}
              onChange={event => setLicenseSearch(event.target.value)}
              placeholder="Rechercher"
              aria-label="Rechercher"
            />
            {licenseSearch ? (
              <button
                type="button"
                className={equipStyles.embeddedSearchClear}
                onClick={() => setLicenseSearch("")}
                aria-label="Effacer la recherche"
              >
                <Icon icon="mdi:close" aria-hidden />
              </button>
            ) : null}
          </div>
          <div className={mapStyles.metricsTopBarMeta} title={`Tenant ${tenantId || "—"} · Sync ${formatDate(lastUpdate)}`}>
            <span>
              <Icon icon="mdi:identifier" aria-hidden />
              {tenantIdLabel}
            </span>
            <span>
              <Icon icon="mdi:clock-outline" aria-hidden />
              {formatDate(lastUpdate)}
            </span>
          </div>
        </div>
        {toolbar ? <div className={mapStyles.metricsTopBarActions}>{toolbar}</div> : null}
      </div>

      <section className={`${dashStyles.kpiGrid} ${dashStyles.kpiGrid5}`}>
        <KpiCard
          icon="mdi:account-group-outline"
          label="Utilisateurs totaux"
          value={kpis.users ?? "-"}
          sub="Comptes Entra ID"
        />
        <KpiCard
          icon="mdi:license"
          label="Licences"
          value={licenseLabel}
          sub={licensePct != null ? `${licensePct} % utilisées` : "Consommation"}
          tone={licensePct == null ? "neutral" : licensePct >= 95 ? "bad" : licensePct >= 80 ? "warn" : "good"}
        />
        <KpiCard
          icon="mdi:shield-check-outline"
          label="Secure Score"
          value={scoreLabel}
          sub={scorePct != null ? `${scorePct} % obtenus` : "Microsoft Secure Score"}
          tone={scorePct == null ? "neutral" : scorePct < 40 ? "bad" : scorePct < 60 ? "warn" : "good"}
        />
        <KpiCard
          icon="mdi:shield-account"
          label="MFA admin"
          value={securityStats.mfaAdminPct != null ? `${securityStats.mfaAdminPct} %` : "-"}
          sub={
            securityStats.adminsTotal
              ? `${securityStats.adminsWithMfa} / ${securityStats.adminsTotal} admins`
              : "Utilisateurs admin"
          }
          tone={
            securityStats.mfaAdminPct == null
              ? "neutral"
              : securityStats.mfaAdminPct < 50
                ? "bad"
                : securityStats.mfaAdminPct < 80
                  ? "warn"
                  : "good"
          }
        />
        <KpiCard
          icon="mdi:account-key-outline"
          label="MFA non admin"
          value={securityStats.mfaNonAdminPct != null ? `${securityStats.mfaNonAdminPct} %` : "-"}
          sub={
            securityStats.nonAdminTotal
              ? `${securityStats.nonAdminWithMfa} / ${securityStats.nonAdminTotal} utilisateurs`
              : "Utilisateurs non admin"
          }
          tone={
            securityStats.mfaNonAdminPct == null
              ? "neutral"
              : securityStats.mfaNonAdminPct < 50
                ? "bad"
                : securityStats.mfaNonAdminPct < 80
                  ? "warn"
                  : "good"
          }
        />
      </section>

      <div className={mapStyles.metricsTableHost}>
        <CyberBrickItemsTable
          brickType="Office365Licenses"
          items={licenseRows}
          emptyLabel="Aucune licence synchronisée"
          hideSearchBar
          search={licenseSearch}
          onSearchChange={setLicenseSearch}
        />
      </div>
    </StatsDashboardBody>
  );
}

export default MicrosoftTenantOverviewPanel;
