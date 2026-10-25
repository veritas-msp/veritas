import React, { useEffect, useMemo, useRef, useState } from "react";
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
import EquipmentHoverIcon, { CYBER_BRICK_ANIMATED } from "../EquipementPage/EquipmentHoverIcon";
import equipStyles from "../EquipementPage/EquipmentPage.module.css";
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
  onConfigure,
  onDelete,
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
  const hasItems = items.length > 0;
  const selectedTitle = selectedItem ? getBrickItemTitle(brick.type, selectedItem, selectedIndex) : "";
  const selectedSubtitle = selectedItem ? getBrickItemSubtitle(brick.type, selectedItem) : "";

  const handleAdd = () => onConfigure?.(brick, null);
  const handleEditCurrent = () => onConfigure?.(brick, selectedItem || null);
  const handleDeleteCurrent = () => {
    if (!selectedItem) return;
    onDelete?.(brick, selectedItem);
  };

  const solutionPicker = items.length > 1 ? (
    <label className={styles.detailSolutionPicker}>
      <span className={styles.detailSolutionPickerLabel}>
        {preview.solutionSelectPrompt || preview.solutionSelect || "Quelle solution afficher ?"}
      </span>
      <select
        className={styles.detailSolutionSelectControl}
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
  ) : null;

  const actionButtons = hasItems && !isComingSoon && !isProLocked ? (
    <>
      <button
        type="button"
        className={styles.detailSecondaryBtn}
        onClick={handleEditCurrent}
        title={preview.editCurrent || preview.configure || "Éditer"}
        aria-label={preview.editCurrent || preview.configure || "Éditer"}
      >
        <Icon icon="mdi:pencil-outline" aria-hidden />
      </button>
      <button
        type="button"
        className={`${styles.detailSecondaryBtn} ${styles.detailDangerBtn}`}
        onClick={handleDeleteCurrent}
        title={preview.deleteCurrent || "Supprimer"}
        aria-label={preview.deleteCurrent || "Supprimer"}
      >
        <Icon icon="mdi:trash-can-outline" aria-hidden />
      </button>
    </>
  ) : !isComingSoon && !isProLocked ? (
    <button
      type="button"
      className={styles.detailPrimaryBtn}
      onClick={handleAdd}
      title={preview.add || "Ajouter"}
      aria-label={preview.add || "Ajouter"}
    >
      <Icon icon="mdi:plus" aria-hidden />
    </button>
  ) : null;

  const titleAnimRef = useRef(null);
  const TitleAnimated = CYBER_BRICK_ANIMATED[brick?.type] || null;

  const emptyCard = !isComingSoon && !isProLocked ? (
    <div className={styles.detailEmptyCard}>
      <Icon icon={icon} className={styles.detailEmptyCardIcon} aria-hidden />
      <p className={styles.detailEmptyCardText}>
        {preview.emptyBody || "Ajoutez une solution pour ce client afin de commencer le suivi."}
      </p>
      <button type="button" className={styles.detailEmptyCardBtn} onClick={handleAdd}>
        <Icon icon="mdi:plus" aria-hidden />
        {preview.emptyAddCta || preview.add || "Ajouter la première solution"}
      </button>
    </div>
  ) : isComingSoon || isProLocked ? (
    <div className={`${styles.detailEmptyCard} ${styles.detailPromoCard}`}>
      <Icon
        icon={isProLocked ? "mdi:crown-outline" : "mdi:rocket-launch-outline"}
        className={styles.detailEmptyCardIcon}
        aria-hidden
      />
      <p className={styles.detailPromoTitle}>
        {isProLocked
          ? (preview.proRequired || copy.brick?.proTooltip || "Veritas Pro")
          : (preview.comingSoon || copy.brick?.comingSoon || "Bientôt")}
      </p>
      <p className={styles.detailEmptyCardText}>
        {isProLocked
          ? (preview.proHint || copy.brick?.proTooltip || "Disponible avec Veritas Pro")
          : (preview.comingSoonBody || preview.comingSoonHint || copy.brick?.comingSoonTooltip || "Bientôt disponible")}
      </p>
    </div>
  ) : null;

  const selectedCard = selectedItem ? (
    <div className={styles.detailSelectedCard}>
      <span className={styles.detailListIcon} aria-hidden>
        <Icon icon={icon} />
      </span>
      <span className={styles.detailListText}>
        <span className={styles.detailListTitle}>{selectedTitle}</span>
        {selectedSubtitle ? <span className={styles.detailListMeta}>{selectedSubtitle}</span> : null}
      </span>
    </div>
  ) : null;

  return (
    <div className={`${styles.detailPanel} ${styles.detailPanelMetrics} ${styles.detailPanelMetricsBare}`.trim()}>
      <header className={styles.detailHeader}>
        <div
          className={styles.detailHeaderTitleRow}
          onMouseEnter={() => titleAnimRef.current?.startAnimation?.()}
          onMouseLeave={() => titleAnimRef.current?.stopAnimation?.()}
        >
          <span className={styles.detailTitleIcon} aria-hidden>
            <EquipmentHoverIcon
              Animated={TitleAnimated}
              iconify={icon}
              size={20}
              animRef={titleAnimRef}
            />
          </span>
          <h3 className={styles.detailTitle}>{brick.label}</h3>
        </div>
        <div className={styles.detailHeaderActions}>{actionButtons}</div>
      </header>

      {hasItems && !isComingSoon && !isProLocked && solutionPicker ? (
        <div className={styles.detailSolutionPickerRow}>{solutionPicker}</div>
      ) : null}

      {!hasItems || isComingSoon || isProLocked ? (
        emptyCard
      ) : hasLiveIntegration && active ? (
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
              toolbar={null}
            />
          )}
        </div>
      ) : !isComingSoon && !isProLocked ? (
        selectedCard
      ) : null}
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
  onDelete,
  onSynced,
  onNavigate
}) {
  const preview = copy.preview || {};
  const [tableSearch, setTableSearch] = useState("");

  useEffect(() => {
    setTableSearch("");
  }, [brick?.type]);

  if (!brick) {
    return (
      <div className={styles.detailEmpty}>
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
        onConfigure={onConfigure}
        onDelete={onDelete}
        onSynced={onSynced}
        onNavigate={onNavigate}
      />
    );
  }

  const items = Array.isArray(brick.items) ? brick.items : [];
  const hasItems = items.length > 0 || Number(brick.count) > 0;
  const isComingSoon = Boolean(brick.comingSoon);
  const isProLocked = Boolean(isCommunity && brick.proOnly);
  const isBackup = brick.type === "Backup";
  const isServiceTable = isCyberBrickTableType(brick.type) && !isBackup;

  const handleConfigure = () => onConfigure?.(brick);
  const handleAdd = () => onConfigure?.(brick, null);

  if (isBackup && !isComingSoon && !isProLocked) {
    return (
      <div className={`${styles.detailPanel} ${styles.detailPanelTable} ${styles.detailPanelMetricsBare}`.trim()}>
        <BackupOverviewPanel
          instances={items}
          jobs={backupJobs}
          searchPlaceholder={preview.searchPlaceholder || "Rechercher…"}
          onAddInstance={() => onConfigure?.(brick, { backupAction: "add-instance" })}
          onAddJob={() => onConfigure?.(brick, { backupAction: "add-job" })}
          onEditInstance={instance => onConfigure?.(brick, { backupAction: "edit-instance", item: instance })}
          onEditJob={job => onConfigure?.(brick, { backupAction: "edit-job", item: job })}
          canAddJob={items.length > 0}
          addInstanceLabel={preview.addInstance || "Ajouter une instance"}
          addJobLabel={preview.addJob || "Ajouter un job"}
          addJobDisabledHint={preview.addJobDisabledHint || "Ajoutez d’abord une instance"}
          editLabel={preview.editCurrent || preview.configure || "Éditer"}
        />
      </div>
    );
  }

  if (isServiceTable && !isComingSoon && !isProLocked) {
    const searchPlaceholder = preview.searchPlaceholder || "Rechercher…";
    const emptyLabel = preview.emptyBody || "Ajoutez une solution pour ce client afin de commencer le suivi.";
    const showTable = items.length > 0 || Boolean(tableSearch.trim());
    return (
      <div className={`${styles.detailPanel} ${styles.detailPanelTable} ${styles.detailPanelMetricsBare}`.trim()}>
        <div className={styles.serviceTableToolbar}>
          <div className={equipStyles.embeddedSearchBox}>
            <Icon icon="mdi:magnify" className={equipStyles.embeddedSearchIcon} aria-hidden />
            <input
              type="search"
              className={equipStyles.embeddedSearchInput}
              value={tableSearch}
              onChange={event => setTableSearch(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
            />
            {tableSearch ? (
              <button
                type="button"
                className={equipStyles.embeddedSearchClear}
                onClick={() => setTableSearch("")}
                aria-label="Effacer la recherche"
              >
                <Icon icon="mdi:close" aria-hidden />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            className={styles.detailPrimaryBtn}
            onClick={handleAdd}
            title={preview.add || "Ajouter"}
            aria-label={preview.add || "Ajouter"}
          >
            <Icon icon="mdi:plus" aria-hidden />
          </button>
        </div>
        <div className={styles.detailTableHost}>
          {showTable ? (
            <CyberBrickItemsTable
              brickType={brick.type}
              items={items}
              emptyLabel={tableSearch.trim() ? "Aucun résultat pour cette recherche" : emptyLabel}
              hideSearchBar
              search={tableSearch}
              onSearchChange={setTableSearch}
              sortable
            />
          ) : (
            <div className={styles.serviceTableEmpty}>
              <p className={styles.serviceTableEmptyText}>{emptyLabel}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const icon = getInfraTypeIcon(brick.type, brick.icon);
  const titleAnimRef = useRef(null);
  const TitleAnimated = CYBER_BRICK_ANIMATED[brick?.type] || null;

  const actionButtons = !isComingSoon && !isProLocked ? (
    hasItems ? (
      <button
        type="button"
        className={styles.detailSecondaryBtn}
        onClick={handleConfigure}
        title={preview.editCurrent || preview.configure || "Éditer"}
        aria-label={preview.editCurrent || preview.configure || "Éditer"}
      >
        <Icon icon="mdi:pencil-outline" aria-hidden />
      </button>
    ) : (
      <button
        type="button"
        className={styles.detailPrimaryBtn}
        onClick={handleAdd}
        title={preview.add || "Ajouter"}
        aria-label={preview.add || "Ajouter"}
      >
        <Icon icon="mdi:plus" aria-hidden />
      </button>
    )
  ) : null;

  return (
    <div className={`${styles.detailPanel} ${styles.detailPanelMetrics} ${styles.detailPanelMetricsBare}`.trim()}>
      <header className={styles.detailHeader}>
        <div
          className={styles.detailHeaderTitleRow}
          onMouseEnter={() => titleAnimRef.current?.startAnimation?.()}
          onMouseLeave={() => titleAnimRef.current?.stopAnimation?.()}
        >
          <span className={styles.detailTitleIcon} aria-hidden>
            <EquipmentHoverIcon
              Animated={TitleAnimated}
              iconify={icon}
              size={20}
              animRef={titleAnimRef}
            />
          </span>
          <h3 className={styles.detailTitle}>{brick.label}</h3>
        </div>
        <div className={styles.detailHeaderActions}>{actionButtons}</div>
      </header>

      {isComingSoon || isProLocked ? (
        <div className={`${styles.detailEmptyCard} ${styles.detailPromoCard}`}>
          <Icon
            icon={isProLocked ? "mdi:crown-outline" : "mdi:rocket-launch-outline"}
            className={styles.detailEmptyCardIcon}
            aria-hidden
          />
          <p className={styles.detailPromoTitle}>
            {isProLocked
              ? (preview.proRequired || copy.brick?.proTooltip || "Veritas Pro")
              : (preview.comingSoon || copy.brick?.comingSoon || "Bientôt")}
          </p>
          <p className={styles.detailEmptyCardText}>
            {isProLocked
              ? (preview.proHint || copy.brick?.proTooltip || "Disponible avec Veritas Pro")
              : (preview.comingSoonBody || preview.comingSoonHint || copy.brick?.comingSoonTooltip || "Bientôt disponible")}
          </p>
        </div>
      ) : hasItems ? (
        <ul className={styles.detailList}>
          {items.map((item, index) => {
            const title = getBrickItemTitle(brick.type, item, index);
            const subtitle = getBrickItemSubtitle(brick.type, item);
            return (
              <li key={item?.id || item?.companyId || item?.customerId || `${brick.type}-${index}`} className={styles.detailListItem}>
                <span className={styles.detailListText}>
                  <span className={styles.detailListTitle}>{title}</span>
                  {subtitle ? <span className={styles.detailListMeta}>{subtitle}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className={styles.detailEmptyCard}>
          <Icon icon={icon} className={styles.detailEmptyCardIcon} aria-hidden />
          <p className={styles.detailEmptyCardText}>
            {preview.emptyBody || "Ajoutez une solution pour ce client afin de commencer le suivi."}
          </p>
          <button type="button" className={styles.detailEmptyCardBtn} onClick={handleAdd}>
            <Icon icon="mdi:plus" aria-hidden />
            {preview.emptyAddCta || preview.add || "Ajouter la première solution"}
          </button>
        </div>
      )}
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
  onBrickDelete,
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
            onDelete={onBrickDelete}
            onSynced={onSynced}
            onNavigate={onNavigate}
          />
        </section>
      </div>
    </div>
  );
}
