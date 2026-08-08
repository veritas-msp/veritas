import React, { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { WIFI_SSID_BAND_OPTIONS, WIFI_SSID_TYPE_OPTIONS, createWifiSsidEntry, getWifiSsidById, normalizeWifiSsidCatalog } from "./wifiApSsidUtils";
import { formatSelectedSummary, getWifiApSsidCopy, getWifiBandLabel, getWifiTypeLabel } from "./wifiApSsidI18n";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./WifiApSsidEditor.module.css";
export default function WifiApSsidEditor({
  clientSsids = [],
  assignedSsidIds = [],
  onClientSsidsChange,
  onAssignedSsidIdsChange,
  idPrefix = "wifi-ap-ssid"
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getWifiApSsidCopy(locale), [locale]);
  const catalog = normalizeWifiSsidCatalog(clientSsids);
  const assignedSet = new Set(assignedSsidIds);
  const broadcastable = catalog.filter(entry => entry.nom.trim());
  const updateCatalog = nextCatalog => {
    onClientSsidsChange?.(nextCatalog);
  };
  const updateAssigned = nextAssigned => {
    onAssignedSsidIdsChange?.(nextAssigned);
  };
  const updateCatalogRow = (id, patch) => {
    updateCatalog(catalog.map(row => row.id === id ? {
      ...row,
      ...patch
    } : row));
  };
  const addCatalogRow = () => {
    const entry = createWifiSsidEntry();
    updateCatalog([...catalog, entry]);
    updateAssigned([...assignedSsidIds, entry.id]);
  };
  const removeCatalogRow = id => {
    updateCatalog(catalog.filter(row => row.id !== id));
    updateAssigned(assignedSsidIds.filter(ssidId => ssidId !== id));
  };
  const toggleAssigned = ssidId => {
    if (assignedSet.has(ssidId)) {
      updateAssigned(assignedSsidIds.filter(id => id !== ssidId));
    } else {
      updateAssigned([...assignedSsidIds, ssidId]);
    }
  };
  const selectedNames = assignedSsidIds.map(id => getWifiSsidById(catalog, id)?.nom).filter(Boolean);
  return <div className={styles.root}>
      <div className={styles.section}>
        <div className={styles.header}>
          <div>
            <h4 className={styles.sectionTitle}>{copy.catalogTitle}</h4>
            <p className={styles.lead}>{copy.catalogLead}</p>
          </div>
          <button type="button" className={styles.addButton} onClick={addCatalogRow}>
            <Icon icon="mdi:plus" width={16} aria-hidden />
            {copy.addSsid}
          </button>
        </div>

        {catalog.length === 0 ? <div className={styles.empty}>
            <Icon icon="mdi:wifi-off" width={22} className={styles.emptyIcon} aria-hidden />
            <p>{copy.emptyCatalog}</p>
            <button type="button" className={styles.addButtonInline} onClick={addCatalogRow}>
              {copy.addFirstSsid}
            </button>
          </div> : <div className={styles.list}>
            {catalog.map((row, index) => {
          const rowId = `${idPrefix}-catalog-${row.id}`;
          const isPublic = row.type === "public";
          return <div key={row.id} className={styles.card}>
                  <div className={styles.cardHead}>
                    <span className={styles.cardIndex}>
                      {interpolate(copy.ssidIndex, {
                  index: index + 1
                })}
                    </span>
                    <button type="button" className={styles.removeButton} onClick={() => removeCatalogRow(row.id)} aria-label={interpolate(copy.removeSsidAria, {
                index: index + 1
              })}>
                      <Icon icon="mdi:close" width={16} aria-hidden />
                    </button>
                  </div>
                  <div className={styles.grid}>
                    <div className={`${formStyles.field} ${styles.fieldWide}`}>
                      <label className={formStyles.label} htmlFor={`${rowId}-nom`}>
                        {copy.ssidName}
                      </label>
                      <input id={`${rowId}-nom`} type="text" className={formStyles.input} value={row.nom} onChange={e => updateCatalogRow(row.id, {
                  nom: e.target.value
                })} placeholder={copy.ssidNamePlaceholder} />
                    </div>
                    <div className={formStyles.field}>
                      <label className={formStyles.label} htmlFor={`${rowId}-vlan`}>
                        {copy.vlan}
                      </label>
                      <input id={`${rowId}-vlan`} type="text" className={formStyles.input} value={row.vlan} onChange={e => updateCatalogRow(row.id, {
                  vlan: e.target.value
                })} placeholder={copy.vlanPlaceholder} />
                    </div>
                    <div className={formStyles.field}>
                      <label className={formStyles.label} htmlFor={`${rowId}-bande`}>
                        {copy.band}
                      </label>
                      <select id={`${rowId}-bande`} className={formStyles.input} value={row.bande} onChange={e => updateCatalogRow(row.id, {
                  bande: e.target.value
                })}>
                        {WIFI_SSID_BAND_OPTIONS.map(({
                    value
                  }) => <option key={value} value={value}>
                            {getWifiBandLabel(locale, value)}
                          </option>)}
                      </select>
                    </div>
                    <div className={formStyles.field}>
                      <label className={formStyles.label} htmlFor={`${rowId}-type`}>
                        {copy.type}
                      </label>
                      <select id={`${rowId}-type`} className={formStyles.input} value={row.type} onChange={e => {
                  const nextType = e.target.value;
                  updateCatalogRow(row.id, {
                    type: nextType,
                    portailCaptif: nextType === "public" ? row.portailCaptif : false
                  });
                }}>
                        {WIFI_SSID_TYPE_OPTIONS.map(({
                    value
                  }) => <option key={value} value={value}>
                            {getWifiTypeLabel(locale, value)}
                          </option>)}
                      </select>
                    </div>
                    {isPublic && <div className={`${formStyles.field} ${styles.fieldWide}`}>
                        <label className={formStyles.slaToggle} htmlFor={`${rowId}-portail`}>
                          <span className={formStyles.slaToggleLabel}>{copy.captivePortal}</span>
                          <span className={formStyles.switchWrap}>
                            <input type="checkbox" id={`${rowId}-portail`} className={formStyles.switchInput} checked={!!row.portailCaptif} onChange={e => updateCatalogRow(row.id, {
                      portailCaptif: e.target.checked
                    })} />
                            <span className={formStyles.switchTrack} aria-hidden>
                              <span className={formStyles.switchThumb} aria-hidden />
                            </span>
                          </span>
                        </label>
                      </div>}
                  </div>
                </div>;
        })}
          </div>}
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>{copy.broadcastTitle}</h4>
        <p className={styles.lead}>{copy.broadcastLead}</p>

        {broadcastable.length === 0 ? <div className={styles.emptyAssign}>
            <p>{copy.emptyAssign}</p>
          </div> : <div className={styles.assignList}>
            {broadcastable.map(entry => {
          const checked = assignedSet.has(entry.id);
          return <label key={entry.id} className={`${styles.assignItem} ${checked ? styles.assignItemActive : ""}`}>
                  <input type="checkbox" className={styles.assignCheckbox} checked={checked} onChange={() => toggleAssigned(entry.id)} />
                  <span className={styles.assignContent}>
                    <span className={styles.assignName}>{entry.nom}</span>
                    <span className={styles.assignMeta}>
                      {[entry.vlan ? interpolate(copy.vlanMeta, {
                  vlan: entry.vlan
                }) : null, getWifiBandLabel(locale, entry.bande), entry.type === "public" ? copy.typePublic : copy.typePrivate].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {checked && <Icon icon="mdi:wifi" className={styles.assignWifiIcon} aria-hidden />}
                </label>;
        })}
          </div>}

        {assignedSsidIds.length > 0 && <p className={styles.assignSummary}>
            {formatSelectedSummary(locale, assignedSsidIds.length, selectedNames)}
          </p>}
      </div>
    </div>;
}
