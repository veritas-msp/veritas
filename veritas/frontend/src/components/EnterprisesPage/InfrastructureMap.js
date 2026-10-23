import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getInfraMapCopy } from "./infraMapI18n";
import { filterBySite, matchesSiteFilter } from "../../utils/siteFilterUtils";
import { buildInfraBrickGroups } from "./infraHoneycombLayout";
import { getInfraTypeIcon } from "./infraMapUtils";
import { AntivirusOverviewPanel } from "./AntivirusOverviewModal";
import { AntispamOverviewPanel } from "./AntispamOverviewModal";
import { MicrosoftTenantOverviewPanel } from "./MicrosoftTenantOverviewPanel";
import CyberBrickItemsTable, { isCyberBrickTableType } from "./CyberBrickItemsTable";
import BackupOverviewPanel from "./BackupOverviewPanel";
import styles from "./InfrastructureMap.module.css";

function getBrickItemTitle(brickType, item, index) {
  if (!item || typeof item !== "object") return `#${index + 1}`;
  const candidates = [
    item.name,
    item.nom,
    item.label,
    item.solution,
    item.editeur,
    item.vendor,
    item.logiciel,
    item.domain,
    item.domaine,
    item.fqdn,
    item.host,
    item.commonName,
    item.cn,
    item.tenantName,
    item.displayName,
    item.email,
    item.title,
    item.product,
    item.sku
  ];
  const found = candidates.find(value => typeof value === "string" && value.trim());
  return found ? found.trim() : `#${index + 1}`;
}

function getBrickItemSubtitle(brickType, item) {
  if (!item || typeof item !== "object") return "";
  const candidates = [
    item.subtitle,
    item.status,
    item.etat,
    item.version,
    item.expiration,
    item.validTo,
    item.site,
    item.siteName,
    item.tenantId,
    item.customerId,
    item.companyId
  ];
  const found = candidates.find(value => value != null && String(value).trim());
  return found != null ? String(found).trim() : "";
}

function solutionKey(item, index) {
  return String(item?.id || item?.companyId || item?.customerId || item?.tenantId || index);
}

function CyberIntegrationDashboard({
  brick,
  client,
  active = true,
  copy,
  isCommunity = false,
  onOpen,
  onConfigure,
  onSynced,
  onNavigate
}) {
  const preview = copy.preview || {};
  const items = Array.isArray(brick?.items) ? brick.items : [];
  const [selectedKey, setSelectedKey] = useState(() => (items[0] ? solutionKey(items[0], 0) : ""));

  useEffect(() => {
    if (!items.length) {
      setSelectedKey("");
      return;
    }
    const stillThere = items.some((item, index) => solutionKey(item, index) === selectedKey);
    if (!stillThere) setSelectedKey(solutionKey(items[0], 0));
  }, [items, selectedKey]);

  const selectedIndex = Math.max(0, items.findIndex((item, index) => solutionKey(item, index) === selectedKey));
  const selectedItem = items[selectedIndex] || items[0] || null;
  const isAntivirus = brick?.type === "Antivirus";
  const isAntispam = brick?.type === "Antispam";
  const isMicrosoftTenant = brick?.type === "TenantMicrosoft";
  const hasLiveIntegration = isAntivirus
    ? Boolean(selectedItem?.companyId)
    : isAntispam
      ? Boolean(selectedItem?.customerId)
      : isMicrosoftTenant
        ? Boolean(selectedItem && (selectedItem.tenantId || selectedItem.id || selectedItem.configured))
        : false;

  const icon = getInfraTypeIcon(brick.type, brick.icon);
  const isComingSoon = Boolean(brick.comingSoon);
  const isProLocked = Boolean(isCommunity && brick.proOnly);
  const hasItems = items.length > 0 || Number(brick.count) > 0;
  const countLabel = brick.countLabel
    || (hasItems ? copy.formatElementCount(brick.count || items.length) : null);

  const primaryLabel = isComingSoon
    ? (preview.comingSoon || copy.brick?.comingSoon || "Bientôt")
    : isProLocked
      ? (preview.proRequired || "Veritas Pro")
      : hasItems
        ? (preview.open || "Ouvrir")
        : (preview.add || "Ajouter");

  const handlePrimary = () => {
    if (isComingSoon || isProLocked) {
      onConfigure?.(brick);
      return;
    }
    if (hasItems) onOpen?.(brick);
    else onConfigure?.(brick);
  };

  const actionButtons = (
    <>
      {items.length > 1 ? (
        <label className={styles.detailSolutionSelect}>
          <span className={styles.srOnly}>{preview.solutionSelect || "Solution"}</span>
          <select
            value={selectedKey}
            onChange={event => setSelectedKey(event.target.value)}
          >
            {items.map((item, index) => (
              <option key={solutionKey(item, index)} value={solutionKey(item, index)}>
                {getBrickItemTitle(brick.type, item, index)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {hasItems && !isComingSoon && !isProLocked ? (
        <button
          type="button"
          className={styles.detailSecondaryBtn}
          onClick={() => onConfigure?.(brick)}
          title={preview.configure || "Configurer"}
          aria-label={preview.configure || "Configurer"}
        >
          <Icon icon="mdi:pencil-outline" aria-hidden />
        </button>
      ) : null}
      <button
        type="button"
        className={styles.detailPrimaryBtn}
        onClick={handlePrimary}
        disabled={isComingSoon}
        title={primaryLabel}
        aria-label={primaryLabel}
      >
        <Icon icon={hasItems && !isComingSoon && !isProLocked ? "mdi:open-in-new" : "mdi:plus"} aria-hidden />
      </button>
    </>
  );

  return (
    <div className={`${styles.detailPanel} ${styles.detailPanelMetrics} ${isMicrosoftTenant ? styles.detailPanelMetricsBare : ""}`.trim()}>
      {!isMicrosoftTenant ? (
        <header className={styles.detailHeader}>
          <span className={styles.detailGlyph} aria-hidden>
            <Icon icon={icon} className={styles.detailGlyphIcon} />
          </span>
          <div className={styles.detailHeaderText}>
            <h3 className={styles.detailTitle}>{brick.label}</h3>
            <p className={styles.detailSubtitle}>
              {isComingSoon
                ? (preview.comingSoonHint || copy.brick?.comingSoonTooltip || "Bientôt disponible")
                : isProLocked
                  ? (preview.proHint || copy.brick?.proTooltip || "Disponible avec Veritas Pro")
                  : hasItems
                    ? (countLabel || preview.configuredHint || "Solution configurée")
                    : (preview.emptyHint || "Aucune solution configurée")}
            </p>
          </div>
          <div className={styles.detailHeaderActions}>{actionButtons}</div>
        </header>
      ) : null}

      {hasLiveIntegration && active ? (
        <div className={styles.metricsBoard}>
          {isAntivirus ? (
            <AntivirusOverviewPanel
              active={active}
              embed
              client={client}
              antivirusItem={selectedItem}
              onSynced={onSynced}
              onNavigate={onNavigate}
            />
          ) : isAntispam ? (
            <AntispamOverviewPanel
              active={active}
              embed
              client={client}
              antispamItem={selectedItem}
              onSynced={onSynced}
              onNavigate={onNavigate}
            />
          ) : (
            <MicrosoftTenantOverviewPanel
              active={active}
              embed
              client={client}
              tenantItem={selectedItem}
              onSynced={onSynced}
              toolbar={actionButtons}
            />
          )}
        </div>
      ) : (
        <>
          {isMicrosoftTenant ? (
            <div className={styles.metricsToolbarCard}>
              <div className={styles.metricsToolbarMeta}>
                <strong className={styles.metricsToolbarTitle}>
                  {hasItems ? (countLabel || brick.label) : brick.label}
                </strong>
                <p className={styles.metricsToolbarDesc}>
                  {isComingSoon
                    ? (preview.comingSoonHint || copy.brick?.comingSoonTooltip || "Bientôt disponible")
                    : isProLocked
                      ? (preview.proHint || copy.brick?.proTooltip || "Disponible avec Veritas Pro")
                      : hasItems
                        ? (preview.configuredHint || "Solution configurée")
                        : (preview.emptyHint || "Aucune solution configurée")}
                </p>
              </div>
              <div className={styles.metricsToolbarActions}>{actionButtons}</div>
            </div>
          ) : null}
          {hasItems && !isComingSoon ? (
            <ul className={styles.detailList}>
              {items.map((item, index) => {
                const title = getBrickItemTitle(brick.type, item, index);
                const subtitle = getBrickItemSubtitle(brick.type, item);
                return (
                  <li key={solutionKey(item, index)} className={styles.detailListItem}>
                    <span className={styles.detailListIcon} aria-hidden>
                      <Icon icon={icon} />
                    </span>
                    <span className={styles.detailListText}>
                      <span className={styles.detailListTitle}>{title}</span>
                      {subtitle ? <span className={styles.detailListMeta}>{subtitle}</span> : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : !isComingSoon && !isProLocked ? (
            <div className={styles.detailEmptyCard}>
              <Icon icon="mdi:plus-circle-outline" className={styles.detailEmptyCardIcon} aria-hidden />
              <p className={styles.detailEmptyCardText}>
                {preview.emptyBody || "Ajoutez une solution pour ce client afin de commencer le suivi."}
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function CyberServiceDetailPanel({
  brick,
  client,
  active = true,
  copy,
  isCommunity = false,
  backupJobs = [],
  onOpen,
  onConfigure,
  onSynced,
  onNavigate
}) {
  const preview = copy.preview || {};
  if (!brick) {
    return (
      <div className={styles.detailEmpty}>
        <Icon icon="mdi:gesture-tap" className={styles.detailEmptyIcon} aria-hidden />
        <h3 className={styles.detailEmptyTitle}>{preview.selectTitle || "Sélectionnez un service"}</h3>
        <p className={styles.detailEmptyHint}>
          {preview.selectHint || "Choisissez un module à gauche pour visualiser sa configuration ou en ajouter une."}
        </p>
      </div>
    );
  }

  if (brick.type === "Antivirus" || brick.type === "Antispam" || brick.type === "TenantMicrosoft") {
    return (
      <CyberIntegrationDashboard
        brick={brick}
        client={client}
        active={active}
        copy={copy}
        isCommunity={isCommunity}
        onOpen={onOpen}
        onConfigure={onConfigure}
        onSynced={onSynced}
        onNavigate={onNavigate}
      />
    );
  }

  const items = Array.isArray(brick.items) ? brick.items : [];
  const hasItems = items.length > 0 || Number(brick.count) > 0;
  const isComingSoon = Boolean(brick.comingSoon);
  const isProLocked = Boolean(isCommunity && brick.proOnly);
  const icon = getInfraTypeIcon(brick.type, brick.icon);
  const countLabel = brick.countLabel
    || (hasItems ? copy.formatElementCount(brick.count || items.length) : null);
  const useItemsTable = isCyberBrickTableType(brick.type) && hasItems && !isComingSoon && !isProLocked;
  const isBackup = brick.type === "Backup";

  const primaryLabel = isComingSoon
    ? (preview.comingSoon || copy.brick?.comingSoon || "Bientôt")
    : isProLocked
      ? (preview.proRequired || "Veritas Pro")
      : hasItems
        ? (preview.open || "Ouvrir")
        : (preview.add || "Ajouter");

  const secondaryLabel = hasItems
    ? (preview.configure || "Configurer")
    : null;

  const handlePrimary = () => {
    if (isComingSoon || isProLocked) {
      onConfigure?.(brick);
      return;
    }
    if (hasItems) onOpen?.(brick);
    else onConfigure?.(brick);
  };

  const actionButtons = (
    <>
      {secondaryLabel && !isComingSoon && !isProLocked ? (
        <button
          type="button"
          className={styles.detailSecondaryBtn}
          onClick={() => onConfigure?.(brick)}
          title={secondaryLabel}
          aria-label={secondaryLabel}
        >
          <Icon icon="mdi:pencil-outline" aria-hidden />
        </button>
      ) : null}
      <button
        type="button"
        className={styles.detailPrimaryBtn}
        onClick={handlePrimary}
        disabled={isComingSoon}
        title={primaryLabel}
        aria-label={primaryLabel}
      >
        <Icon icon={hasItems && !isComingSoon && !isProLocked ? "mdi:open-in-new" : "mdi:plus"} aria-hidden />
      </button>
    </>
  );

  if (isBackup && hasItems && !isComingSoon && !isProLocked) {
    return (
      <div className={`${styles.detailPanel} ${styles.detailPanelTable} ${styles.detailPanelMetricsBare}`.trim()}>
        <BackupOverviewPanel
          instances={items}
          jobs={backupJobs}
          toolbar={actionButtons}
          searchPlaceholder={preview.searchPlaceholder || "Rechercher…"}
        />
      </div>
    );
  }

  return (
    <div className={`${styles.detailPanel} ${useItemsTable ? styles.detailPanelTable : ""}`.trim()}>
      <header className={styles.detailHeader}>
        <span className={styles.detailGlyph} aria-hidden>
          <Icon icon={icon} className={styles.detailGlyphIcon} />
        </span>
        <div className={styles.detailHeaderText}>
          <h3 className={styles.detailTitle}>{brick.label}</h3>
          <p className={styles.detailSubtitle}>
            {isComingSoon
              ? (preview.comingSoonHint || copy.brick?.comingSoonTooltip || "Bientôt disponible")
              : isProLocked
                ? (preview.proHint || copy.brick?.proTooltip || "Disponible avec Veritas Pro")
                : hasItems
                  ? (countLabel || preview.configuredHint || "Solution configurée")
                  : (preview.emptyHint || "Aucune solution configurée")}
          </p>
        </div>
        {useItemsTable ? (
          <div className={styles.detailHeaderActions}>{actionButtons}</div>
        ) : null}
      </header>

      {!useItemsTable ? (
        <div className={styles.detailActions}>{actionButtons}</div>
      ) : null}

      {useItemsTable ? (
        <div className={styles.detailTableHost}>
          <CyberBrickItemsTable
            brickType={brick.type}
            items={items}
            emptyLabel={preview.emptyBody || "Aucune entrée"}
            searchPlaceholder={preview.searchPlaceholder || "Rechercher…"}
          />
        </div>
      ) : hasItems && !isComingSoon ? (
        <ul className={styles.detailList}>
          {items.map((item, index) => {
            const title = getBrickItemTitle(brick.type, item, index);
            const subtitle = getBrickItemSubtitle(brick.type, item);
            return (
              <li key={item?.id || item?.companyId || item?.customerId || `${brick.type}-${index}`} className={styles.detailListItem}>
                <span className={styles.detailListIcon} aria-hidden>
                  <Icon icon={icon} />
                </span>
                <span className={styles.detailListText}>
                  <span className={styles.detailListTitle}>{title}</span>
                  {subtitle ? <span className={styles.detailListMeta}>{subtitle}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : !isComingSoon && !isProLocked ? (
        <div className={styles.detailEmptyCard}>
          <Icon icon="mdi:plus-circle-outline" className={styles.detailEmptyCardIcon} aria-hidden />
          <p className={styles.detailEmptyCardText}>
            {preview.emptyBody || "Ajoutez une solution pour ce client afin de commencer le suivi."}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function InfrastructureMap({
  clientId,
  client = null,
  active = true,
  backupInstances = [],
  backupJobs = [],
  antivirusItems = [],
  antispamItems = [],
  domainItems = [],
  domainIntegrationReady = false,
  sslItems = [],
  licenceItems = [],
  tenantInfo = {},
  googleWorkspaceInfo = {},
  campaignItems = [],
  siteFilter = null,
  equipmentRevision = 0,
  selectedType = null,
  onBrickOpen,
  onBrickConfigure,
  onSynced,
  onNavigate,
  isCommunity = false,
  onLoadingChange
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getInfraMapCopy(locale), [locale]);

  useEffect(() => {
    onLoadingChange?.(false);
  }, [clientId, equipmentRevision, onLoadingChange]);

  const filteredBackupInstances = useMemo(() => filterBySite(backupInstances, siteFilter), [backupInstances, siteFilter]);
  const filteredBackupJobs = useMemo(() => {
    if (!siteFilter) return Array.isArray(backupJobs) ? backupJobs : [];
    const allowedIds = new Set(
      filteredBackupInstances.map(instance => String(instance?.id)).filter(Boolean)
    );
    return (Array.isArray(backupJobs) ? backupJobs : []).filter(job => {
      if (job?.instanceId != null && allowedIds.has(String(job.instanceId))) return true;
      return matchesSiteFilter(job, siteFilter);
    });
  }, [backupJobs, filteredBackupInstances, siteFilter]);
  const filteredAntivirusItems = useMemo(() => filterBySite(antivirusItems, siteFilter), [antivirusItems, siteFilter]);
  const filteredAntispamItems = useMemo(() => filterBySite(antispamItems, siteFilter), [antispamItems, siteFilter]);
  const filteredDomainItems = useMemo(() => filterBySite(domainItems, siteFilter), [domainItems, siteFilter]);
  const filteredSslItems = useMemo(() => filterBySite(sslItems, siteFilter), [siteFilter, sslItems]);
  const filteredLicenseItems = useMemo(() => filterBySite(licenceItems, siteFilter), [licenceItems, siteFilter]);
  const filteredCampaignItems = useMemo(() => filterBySite(campaignItems, siteFilter), [campaignItems, siteFilter]);
  const filteredTenantInfo = useMemo(() => {
    if (!siteFilter) return tenantInfo;
    return matchesSiteFilter(tenantInfo, siteFilter) ? tenantInfo : {};
  }, [tenantInfo, siteFilter]);

  const groups = useMemo(() => buildInfraBrickGroups({
    antivirusItems: filteredAntivirusItems,
    antispamItems: filteredAntispamItems,
    domainItems: filteredDomainItems,
    domainIntegrationReady,
    sslItems: filteredSslItems,
    licenceItems: filteredLicenseItems,
    backupInstances: filteredBackupInstances,
    tenantInfo: filteredTenantInfo,
    googleWorkspaceInfo,
    campaignItems: filteredCampaignItems,
    getBrickGroupLabel: (groupId, fallback) => copy.getBrickGroupLabel(groupId) || fallback,
    getBrickTypeLabel: (type, fallback) => copy.getBrickTypeLabel(type) || fallback
  }), [
    copy,
    domainIntegrationReady,
    filteredAntivirusItems,
    filteredAntispamItems,
    filteredBackupInstances,
    filteredCampaignItems,
    filteredDomainItems,
    filteredLicenseItems,
    filteredSslItems,
    filteredTenantInfo,
    googleWorkspaceInfo
  ]);

  const selectedBrick = useMemo(() => {
    for (const group of groups) {
      const match = group.bricks.find(brick => brick.type === selectedType);
      if (match) return match;
    }
    return null;
  }, [groups, selectedType]);

  return (
    <div className={`${styles.map} ${styles.mapFill}`}>
      <div className={`${styles.mapShell} ${styles.cyberDetailShell}`}>
        <section className={styles.cyberDetail} aria-label={copy.preview?.panelAria || "Aperçu du service"}>
          <CyberServiceDetailPanel
            brick={selectedBrick}
            client={client}
            active={active}
            copy={copy}
            isCommunity={isCommunity}
            backupJobs={filteredBackupJobs}
            onOpen={onBrickOpen}
            onConfigure={onBrickConfigure}
            onSynced={onSynced}
            onNavigate={onNavigate}
          />
        </section>
      </div>
    </div>
  );
}
