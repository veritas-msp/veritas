import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import SiteMapPreview from "../EnterprisesPage/SiteMapPreview";
import { buildSiteAddress, findClientSiteByLocation, getSiteDisplayName } from "../../utils/clientSites";
import { buildEquipmentDetailSections } from "./equipmentDetailConfig";
import { buildBorneWifiSsidFormState } from "./wifiApSsidUtils";
import { getFirewallDisplayName, resolveFirewallHaPeer, getServerDisplayName, resolveHostServerPeer, resolveServerHaPeer, getStorageDisplayName, resolveStorageHaPeer, getStorageFormProfile } from "./equipmentFormConfig";
import { shouldShowStorageDiskBays } from "./storageDiskUtils";
import StorageDiskBayDisplay from "./StorageDiskBayDisplay";
import { getEquipmentFormOptionsCopy } from "./equipmentFormOptionsI18n";
import { isRmmManagedEquipment } from "./rmmMonitoringUtils";
import InternetDebitCounters from "./InternetDebitCounters";
import EquipmentRemoteAccessLaunchButton from "./EquipmentRemoteAccessLaunchButton";
import { shouldShowRemoteAccessFieldAction } from "./equipmentDetailRemoteAccess";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getEquipmentDetailCopy } from "./equipmentDetailPageI18n";
import ComputerTypePicker from "./ComputerTypePicker";
import styles from "./EquipmentDetailSpecsPanel.module.css";
const DEBIT_FIELD_KEYS = new Set(["debit", "debitDownload", "debitUpload"]);
function mergeInternetDisplaySections(sections) {
  const typeSection = sections.find(section => section.id === "internetType");
  const linkSection = sections.find(section => section.id === "internetLink");
  if (!typeSection || !linkSection) return sections;
  return sections.filter(section => section.id !== "internetType").map(section => section.id === "internetLink" ? {
    ...section,
    fields: [...typeSection.fields, ...section.fields]
  } : section);
}
function resolveSectionsGridClass(count) {
  if (count === 4 || count > 3 && count % 3 === 1) return styles.sectionsGrid2;
  return styles.sectionsGrid3;
}
function SourceBadge({
  source,
  copy
}) {
  const metaBySource = {
    manual: {
      label: copy.specs.sourceManual,
      icon: "mdi:pencil-outline"
    },
    rmm: {
      label: copy.specs.sourceRmm,
      icon: "mdi:remote-desktop"
    },
    checkmk: {
      label: copy.specs.sourceCheckmk,
      icon: "simple-icons:checkmk"
    }
  };
  const meta = metaBySource[source] || metaBySource.manual;
  return <span className={`${styles.sourceBadge} ${styles[`sourceBadge_${source}`] || ""}`} title={meta.label}>
      <Icon icon={meta.icon} width={11} aria-hidden />
      {meta.label}
    </span>;
}
function SpecField({
  field,
  remoteAccessAction,
  equipmentLink,
  layout = "grid",
  copy
}) {
  const showRemoteAction = shouldShowRemoteAccessFieldAction(field.key, remoteAccessAction);
  const renderValue = () => {
    if (equipmentLink) {
      if (field.key === "firewallHAName" || field.key === "serverHAName" || field.key === "storageHAName") {
        return <button type="button" className={styles.haPeerLink} onClick={equipmentLink.onClick} title={equipmentLink.title}>
            <Icon icon={field.key === "serverHAName" || field.key === "storageHAName" ? "mdi:server" : "mdi:shield-sync"} width={14} aria-hidden />
            <span className={styles.haPeerLinkLabel}>{field.value}</span>
            <Icon icon="mdi:arrow-right" width={14} className={styles.haPeerLinkArrow} aria-hidden />
          </button>;
      }
      if (field.key === "hostServerName") {
        return <button type="button" className={styles.haPeerLink} onClick={equipmentLink.onClick} title={equipmentLink.title}>
            <Icon icon="mdi:server" width={14} aria-hidden />
            <span className={styles.haPeerLinkLabel}>{field.value}</span>
            <Icon icon="mdi:arrow-right" width={14} className={styles.haPeerLinkArrow} aria-hidden />
          </button>;
      }
      return <button type="button" className={`${styles.fieldValue} ${styles.fieldLink} ${field.mono ? styles.fieldValueMono : ""}`} onClick={equipmentLink.onClick} title={equipmentLink.title}>
          {field.value}
        </button>;
    }
    return <span className={`${styles.fieldValue} ${field.mono ? styles.fieldValueMono : ""}`}>
        {field.value}
      </span>;
  };
  if (layout === "inline") {
    return <div className={styles.inlineField}>
        <span className={styles.inlineFieldLabel}>{field.label}</span>
        <div className={styles.fieldValueWrap}>
          {renderValue()}
          {field.source && field.source !== "manual" && field.source !== "rmm" ? <SourceBadge source={field.source} copy={copy} /> : null}
          {showRemoteAction ? <EquipmentRemoteAccessLaunchButton variant="inline" label={remoteAccessAction.label} icon={remoteAccessAction.icon} title={remoteAccessAction.tooltip} onClick={remoteAccessAction.launch} /> : null}
        </div>
      </div>;
  }
  return <div className={styles.field}>
      <span className={styles.fieldLabel}>{field.label}</span>
      <div className={styles.fieldValueWrap}>
        {renderValue()}
        {field.source && field.source !== "manual" && field.source !== "rmm" ? <SourceBadge source={field.source} copy={copy} /> : null}
        {showRemoteAction ? <EquipmentRemoteAccessLaunchButton variant="inline" label={remoteAccessAction.label} icon={remoteAccessAction.icon} title={remoteAccessAction.tooltip} onClick={remoteAccessAction.launch} /> : null}
      </div>
    </div>;
}
function SiteLocationVignette({
  site,
  locationLabel
}) {
  const address = buildSiteAddress(site);
  const label = getSiteDisplayName(site) || locationLabel;
  return <div className={styles.siteVignette}>
      <div className={styles.siteVignetteMap}>
        <SiteMapPreview latitude={site.latitude} longitude={site.longitude} label={label} address={address} compact />
      </div>
      <div className={styles.siteVignetteText}>
        <span className={styles.siteVignetteName}>{label}</span>
        {address ? <span className={styles.siteVignetteAddress}>{address}</span> : null}
      </div>
    </div>;
}
export default function EquipmentDetailSpecsPanel({
  equipment,
  formData,
  clientSites = [],
  clientSsids = [],
  peerFirewalls = [],
  peerServers = [],
  peerStorage = [],
  onOpenEquipment,
  onComputerTypeChange,
  computerTypeSaving = false,
  remoteAccessAction = null,
  compact = false,
  title
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentDetailCopy(locale), [locale]);
  const diskBayCopy = useMemo(() => getEquipmentFormOptionsCopy(locale).widgets?.diskBay || {}, [locale]);
  const panelTitle = title ?? copy.specs.title;
  const displayFormData = useMemo(() => {
    if (equipment?.type !== "BorneWifi") return formData;
    const raw = equipment?.rawData?.data || equipment?.rawData || equipment || {};
    const persistedSsids = formData?.ssids ?? raw.ssids ?? equipment?.ssids ?? [];
    const rebuilt = buildBorneWifiSsidFormState({
      ...equipment,
      ssids: persistedSsids,
      rawData: {
        ...equipment?.rawData,
        data: {
          ...raw,
          ssids: persistedSsids
        }
      }
    }, {
      ssids: clientSsids
    });
    return {
      ...formData,
      ssids: persistedSsids,
      clientSsids: rebuilt.clientSsids,
      assignedSsidIds: rebuilt.assignedSsidIds
    };
  }, [equipment, formData, clientSsids]);
  const haPeer = useMemo(() => {
    if (!formData?.modeHA) return null;
    if (equipment?.type === "Firewalls") return resolveFirewallHaPeer(equipment, peerFirewalls);
    if (equipment?.type === "Servers" || equipment?.type === "Serveurs") return resolveServerHaPeer(equipment, peerServers);
    if (equipment?.type === "NAS" || equipment?.type === "Storage" || equipment?.type === "Stockage") return resolveStorageHaPeer(equipment, peerStorage);
    return null;
  }, [equipment, formData?.modeHA, peerFirewalls, peerServers, peerStorage]);
  const hostServerPeer = useMemo(() => {
    if (equipment?.type !== "Servers" && equipment?.type !== "Serveurs") return null;
    if (!formData?.hostServerName) return null;
    return resolveHostServerPeer({
      ...equipment,
      hostServerName: formData.hostServerName
    }, peerServers);
  }, [equipment, formData?.hostServerName, peerServers]);
  const showStorageDiskBays = useMemo(() => {
    if (equipment?.type !== "NAS" && equipment?.type !== "Storage") return false;
    const profile = getStorageFormProfile(displayFormData?.storageType || displayFormData?.type);
    return shouldShowStorageDiskBays(displayFormData, {
      showDisques: profile.showDisques
    });
  }, [equipment?.type, displayFormData]);
  const rawSections = buildEquipmentDetailSections(equipment, displayFormData, locale);
  const baseSections = equipment?.type === "Internet" ? mergeInternetDisplaySections(rawSections) : rawSections;
  const sections = useMemo(() => {
    let nextSections = baseSections;
    if (haPeer && equipment?.type === "Firewalls") {
      const peerName = getFirewallDisplayName(haPeer);
      if (peerName) {
        nextSections = nextSections.map(section => {
          if (section.id !== "ha") return section;
          const peerFieldIndex = section.fields.findIndex(field => field.key === "firewallHAName");
          if (peerFieldIndex >= 0) {
            return {
              ...section,
              fields: section.fields.map((field, index) => index === peerFieldIndex ? {
                ...field,
                value: peerName
              } : field)
            };
          }
          const roleIndex = section.fields.findIndex(field => field.key === "roleHA");
          const peerField = {
            key: "firewallHAName",
            label: copy.fields.firewallHAName,
            value: peerName,
            mono: false,
            source: "manual"
          };
          const fields = [...section.fields];
          if (roleIndex >= 0) fields.splice(roleIndex + 1, 0, peerField);else fields.push(peerField);
          return {
            ...section,
            fields
          };
        });
      }
    }
    if (haPeer && (equipment?.type === "Servers" || equipment?.type === "Serveurs")) {
      const peerName = getServerDisplayName(haPeer);
      if (peerName) {
        nextSections = nextSections.map(section => {
          if (section.id !== "ha") return section;
          const peerFieldIndex = section.fields.findIndex(field => field.key === "serverHAName");
          if (peerFieldIndex >= 0) {
            return {
              ...section,
              fields: section.fields.map((field, index) => index === peerFieldIndex ? {
                ...field,
                value: peerName
              } : field)
            };
          }
          const roleIndex = section.fields.findIndex(field => field.key === "roleHA");
          const peerField = {
            key: "serverHAName",
            label: copy.fields.serverHAName || copy.fields.firewallHAName,
            value: peerName,
            mono: false,
            source: "manual"
          };
          const fields = [...section.fields];
          if (roleIndex >= 0) fields.splice(roleIndex + 1, 0, peerField);else fields.push(peerField);
          return {
            ...section,
            fields
          };
        });
      }
    }
    if (haPeer && (equipment?.type === "NAS" || equipment?.type === "Storage" || equipment?.type === "Stockage")) {
      const peerName = getStorageDisplayName(haPeer);
      if (peerName) {
        nextSections = nextSections.map(section => {
          if (section.id !== "ha") return section;
          const peerFieldIndex = section.fields.findIndex(field => field.key === "storageHAName");
          if (peerFieldIndex >= 0) {
            return {
              ...section,
              fields: section.fields.map((field, index) => index === peerFieldIndex ? {
                ...field,
                value: peerName
              } : field)
            };
          }
          const roleIndex = section.fields.findIndex(field => field.key === "roleHA");
          const peerField = {
            key: "storageHAName",
            label: copy.fields.storageHAName || copy.fields.firewallHAName,
            value: peerName,
            mono: false,
            source: "manual"
          };
          const fields = [...section.fields];
          if (roleIndex >= 0) fields.splice(roleIndex + 1, 0, peerField);else fields.push(peerField);
          return {
            ...section,
            fields
          };
        });
      }
    }
    if (hostServerPeer && (equipment?.type === "Servers" || equipment?.type === "Serveurs")) {
      const hostName = getServerDisplayName(hostServerPeer);
      if (hostName) {
        nextSections = nextSections.map(section => {
          if (section.id !== "system") return section;
          const hostFieldIndex = section.fields.findIndex(field => field.key === "hostServerName");
          if (hostFieldIndex >= 0) {
            return {
              ...section,
              fields: section.fields.map((field, index) => index === hostFieldIndex ? {
                ...field,
                value: hostName
              } : field)
            };
          }
          const hypervisorIndex = section.fields.findIndex(field => field.key === "hypervisor");
          const hostField = {
            key: "hostServerName",
            label: copy.fields.hostServerName,
            value: hostName,
            mono: false,
            source: "manual"
          };
          const fields = [...section.fields];
          if (hypervisorIndex >= 0) fields.splice(hypervisorIndex + 1, 0, hostField);else fields.push(hostField);
          return {
            ...section,
            fields
          };
        });
      }
    }
    return nextSections;
  }, [baseSections, haPeer, hostServerPeer, equipment?.type, copy.fields.firewallHAName, copy.fields.serverHAName, copy.fields.storageHAName, copy.fields.hostServerName]);
  const sectionsGridClass = resolveSectionsGridClass(sections.length);
  const rmmManagedComputer = equipment?.type === "Ordinateurs" && isRmmManagedEquipment(equipment);
  const rmmInlineFields = useMemo(() => {
    if (!rmmManagedComputer) return [];
    return sections.flatMap(section => section.fields);
  }, [rmmManagedComputer, sections]);
  const showComputerTypePicker = equipment?.type === "Ordinateurs" && typeof onComputerTypeChange === "function";
  const computerTypePicker = showComputerTypePicker ? <div className={styles.computerTypePicker}>
      <ComputerTypePicker value={formData?.computerType || equipment?.computerType || ""} onChange={onComputerTypeChange} locale={locale} label={copy.fields.computerType} disabled={computerTypeSaving} compact />
    </div> : null;
  const locationName = String(formData?.location || equipment?.location || "").trim();
  const resolvedSite = useMemo(() => locationName ? findClientSiteByLocation(clientSites, locationName) : null, [clientSites, locationName]);
  const showSiteVignette = Boolean(locationName && locationName !== "Sans site");
  const resolveEquipmentLink = field => {
    if (!onOpenEquipment) return null;
    if ((field.key === "firewallHAName" || field.key === "serverHAName" || field.key === "storageHAName") && haPeer) {
      return {
        onClick: () => onOpenEquipment(haPeer),
        title: copy.specs.openHaPeer
      };
    }
    if (field.key === "hostServerName" && hostServerPeer) {
      return {
        onClick: () => onOpenEquipment(hostServerPeer),
        title: copy.specs.openHostServer
      };
    }
    return null;
  };
  if (!sections.length) {
    if (computerTypePicker) {
      return <section className={`${styles.panel} ${compact ? styles.panelCompact : ""}`}>
          {!compact ? <header className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                <Icon icon="mdi:clipboard-text-outline" className={styles.panelTitleIcon} aria-hidden />
                {panelTitle}
              </h2>
            </header> : null}
          <div className={styles.sections}>
            {computerTypePicker}
          </div>
        </section>;
    }
    return <section className={`${styles.panel} ${compact ? styles.panelCompact : ""}`}>
        <header className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>
            <Icon icon="mdi:clipboard-text-outline" className={styles.panelTitleIcon} aria-hidden />
            {panelTitle}
          </h2>
        </header>
        <p className={styles.empty}>{copy.specs.empty}</p>
      </section>;
  }
  if (rmmManagedComputer && !compact) {
    const showLocationMap = showSiteVignette;
    const inlineFields = rmmInlineFields.filter(field => (field.key !== "location" || !showLocationMap) && field.key !== "computerType");
    const meaningfulFields = inlineFields.filter(field => field.key !== "clientName" && field.key !== "name");
    if (!showLocationMap && meaningfulFields.length === 0 && !computerTypePicker) {
      return null;
    }
    return <section className={`${styles.panel} ${styles.panelRmmSlim}`}>
        <div className={styles.rmmVeritasStrip}>
          {showLocationMap ? <SiteLocationVignette site={resolvedSite || {
          name: locationName
        }} locationLabel={locationName} /> : null}
          <div className={styles.rmmVeritasFields}>
              {computerTypePicker}
              {meaningfulFields.map(field => <SpecField key={field.key} field={field} remoteAccessAction={remoteAccessAction} equipmentLink={resolveEquipmentLink(field)} layout="inline" copy={copy} />)}
            </div>
        </div>
      </section>;
  }
  return <section className={`${styles.panel} ${compact ? styles.panelCompact : ""}`}>
      {!compact ? <header className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>
              <Icon icon="mdi:clipboard-text-outline" className={styles.panelTitleIcon} aria-hidden />
              {panelTitle}
            </h2>
            <p className={styles.panelSubtitle}>
              {rmmManagedComputer ? copy.specs.manualFields : copy.specs.manualOrIntegrations}
            </p>
          </div>
        </header> : null}

      <div className={`${styles.sections} ${compact ? styles.sectionsCompact : ""} ${compact ? "" : sectionsGridClass}`}>
        {sections.map(section => {
        const isInternetLink = section.id === "internetLink";
        const hasDebitGauges = isInternetLink && (formData?.debitDownload || formData?.debitUpload || formData?.debit);
        const showLocationMap = section.id === "identity" && showSiteVignette;
        const visibleFields = (() => {
          let fields = hasDebitGauges ? section.fields.filter(field => !DEBIT_FIELD_KEYS.has(field.key)) : section.fields;
          if (showLocationMap) {
            fields = fields.filter(field => field.key !== "location");
          }
          if (showComputerTypePicker) {
            fields = fields.filter(field => field.key !== "computerType");
          }
          return fields;
        })();
        const isRemoteSection = section.id === "remote" && remoteAccessAction?.kind === "server";
        const showSectionRemoteAction = isRemoteSection && !visibleFields.some(field => shouldShowRemoteAccessFieldAction(field.key, remoteAccessAction));
        return <article key={section.id} className={styles.sectionCard}>
              <header className={styles.sectionHeader}>
                <Icon icon={section.icon || "mdi:information-outline"} className={styles.sectionIcon} aria-hidden />
                <div className={styles.sectionHeadText}>
                  <h3 className={styles.sectionTitle}>{section.label}</h3>
                </div>
                {showSectionRemoteAction ? <EquipmentRemoteAccessLaunchButton variant="inline" className={styles.sectionHeaderAction} label={remoteAccessAction.label} icon={remoteAccessAction.icon} title={remoteAccessAction.tooltip} onClick={remoteAccessAction.launch} /> : null}
              </header>

              {showLocationMap ? <SiteLocationVignette site={resolvedSite || {
            name: locationName
          }} locationLabel={locationName} /> : null}

              {section.id === "identity" && computerTypePicker ? computerTypePicker : null}

              {hasDebitGauges ? <InternetDebitCounters download={formData?.debitDownload} upload={formData?.debitUpload} combined={formData?.debit} /> : null}

              {visibleFields.length > 0 ? <div className={`${styles.fieldGrid} ${compact ? styles.fieldGridCompact : ""}`}>
                  {visibleFields.map(field => <SpecField key={field.key} field={field} remoteAccessAction={remoteAccessAction} equipmentLink={resolveEquipmentLink(field)} copy={copy} />)}
                </div> : null}

              {section.id === "storage" && showStorageDiskBays ? <div className={styles.storageDiskDisplay}>
                  <StorageDiskBayDisplay formData={displayFormData} widgetsCopy={diskBayCopy} />
                </div> : null}
            </article>;
      })}
      </div>
    </section>;
}
