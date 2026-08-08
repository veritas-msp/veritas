import React from "react";
import { Icon } from "@iconify/react";
import RoleTagsSelect from "./RoleTagsSelect";
import { SERVER_CATALOG } from "./constants/equipmentCatalog";
import { SERVER_TYPE_OPTIONS, STORAGE_TYPE_OPTIONS, FIREWALL_TYPE_OPTIONS, ROUTEUR_TYPE_OPTIONS, ALIMENTATION_TYPE_OPTIONS, TOIP_TYPE_OPTIONS, getFirewallFormProfile, getRouterFormProfile, getServerFormProfile, getStorageFormProfile, applyFirewallTypeChange, applyRouteurTypeChange, applyServerTypeChange, applyStorageTypeChange, applyAlimentationTypeChange, getAlimentationFormProfile, applyToipTypeChange, getToipFormProfile, isToipVoipSectionVisible, normalizeServerType, normalizeStorageType, normalizeFirewallType, normalizeRouteurType, resolveToipDeploymentType, EQUIPMENT_SERIAL_PLACEHOLDER } from "./equipmentFormConfig";
import { getEquipmentFormSectionsI18n, localizeTypeOptions, getLocalizedEquipmentNamePlaceholder } from "./equipmentModalsI18n";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import InternetConnectionFields from "./InternetConnectionFields";
import InternetTypePicker from "./InternetTypePicker";
import SiteSuggestInput from "./SiteSuggestInput";
import FirewallLicencesEditor from "./FirewallLicencesEditor";
import FirewallBrandPicker from "./FirewallBrandPicker";
import RouterBrandPicker from "./RouterBrandPicker";
import ServerBrandPicker from "./ServerBrandPicker";
import StorageBrandPicker from "./StorageBrandPicker";
import SwitchBrandPicker from "./SwitchBrandPicker";
import WifiApBrandPicker from "./WifiApBrandPicker";
import AlimentationBrandPicker from "./AlimentationBrandPicker";
import ToipBrandPicker from "./ToipBrandPicker";
import WifiApSsidEditor from "./WifiApSsidEditor";
import ServerRemoteAccessFields from "./ServerRemoteAccessFields";
import StorageDiskBayPicker from "./StorageDiskBayPicker";
import CapacityInput from "./CapacityInput";
import ServerSpecFields from "./ServerSpecFields";
import styles from "../EnterprisesPage/EnterpriseFormModal.module.css";
const NETWORK_EDGE_API_TYPES = new Set(["Switch", "BorneWifi", "Alimentation", "TOIP"]);
export default function EquipmentFormSectionContent({
  activeSection,
  moduleKey,
  apiType,
  formData,
  setFormData,
  update,
  updateBrandModel,
  availableSites,
  firewallPartnerOptions,
  isPhysicalServer,
  serverType,
  isSynologyStorageForm,
  brandModelCatalog,
  storageBrandCatalog,
  isAddMode = false,
  isRequiredSectionIncomplete,
  formCopy = {}
}) {
  const locale = useAppLocale();
  const f = formCopy.fields || {};
  const optionsCopy = formCopy.options || {};
  const widgetsCopy = optionsCopy.widgets || {};
  const brandPickerLabels = {
    brandLabel: f.brand,
    otherBrandNameLabel: f.otherBrandName,
    otherModelOptionLabel: f.otherModelManual,
    otherTileLabel: f.otherTile,
    formatCustomModelAria: formCopy.formatCustomModelAria
  };
  const formSectionOptions = {
    firewallType: formData.firewallType,
    routeurType: formData.routeurType,
    serverType: formData.typeServer,
    storageType: formData.storageType,
    toipType: formData.toipType
  };
  const sections = getEquipmentFormSectionsI18n(moduleKey, locale, formSectionOptions).filter(entry => entry.id !== "voip" || isToipVoipSectionVisible(formData.toipType));
  const section = sections.find(s => s.id === activeSection);
  const firewallProfileKey = normalizeFirewallType(formData.firewallType) || "materiel";
  const firewallProfile = apiType === "Firewalls" ? {
    ...getFirewallFormProfile(formData.firewallType),
    ...(formCopy.profiles?.firewall?.[firewallProfileKey] || {})
  } : null;
  const routerProfileKey = normalizeRouteurType(formData.routeurType) || "Routeur";
  const routerProfile = apiType === "Routeur" ? {
    ...getRouterFormProfile(formData.routeurType),
    ...(formCopy.profiles?.router?.[routerProfileKey] || {})
  } : null;
  const serverProfileKey = normalizeServerType(formData.typeServer) || "virtuel";
  const serverProfile = apiType === "Servers" ? {
    ...getServerFormProfile(formData.typeServer),
    ...(formCopy.profiles?.server?.[serverProfileKey] || {})
  } : null;
  const storageProfileKey = normalizeStorageType(formData.storageType) || "nas";
  const storageProfile = apiType === "NAS" ? {
    ...getStorageFormProfile(formData.storageType),
    ...(formCopy.profiles?.storage?.[storageProfileKey] || {})
  } : null;
  const alimentationType = formData.alimentationType ?? "UPS";
  const alimentationProfile = apiType === "Alimentation" ? {
    ...getAlimentationFormProfile(formData.alimentationType),
    ...(formCopy.profiles?.alimentation?.[alimentationType] || {})
  } : null;
  const toipProfileKey = resolveToipDeploymentType(formData.toipType) || "IP-PBX";
  const toipProfile = apiType === "TOIP" ? {
    ...getToipFormProfile(formData.toipType),
    ...(formCopy.profiles?.toip?.[toipProfileKey] || {})
  } : null;
  const normalizedServerType = normalizeServerType(serverType || formData.typeServer);
  const normalizedStorageType = normalizeStorageType(formData.storageType);
  const sectionIncomplete = isAddMode && typeof isRequiredSectionIncomplete === "function" && isRequiredSectionIncomplete(activeSection);
  const sectionHead = <div className={styles.sectionHead}>
      <h3 className={`${styles.sectionTitle} ${sectionIncomplete ? styles.navItemLabelRequired : ""}`}>
        {section?.label}
      </h3>
      <p className={styles.sectionDesc}>{section?.description}</p>
    </div>;
  switch (activeSection) {
    case "identity":
      return <>
          {sectionHead}
          <div className={styles.fieldGrid2}>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={`${styles.label} ${styles.labelRequired}`} htmlFor="equipment-form-name">
                {apiType === "Ordinateurs" ? f.nameVeritas : f.name}
              </label>
              <input id="equipment-form-name" type="text" className={styles.input} value={formData.name ?? ""} onChange={e => update("name", e.target.value)} placeholder={getLocalizedEquipmentNamePlaceholder(formCopy, apiType, {
              routeurType: formData.routeurType,
              serverType: formData.typeServer,
              storageType: formData.storageType
            })} />
            </div>
            {apiType === "Ordinateurs" && (isAddMode || formData.netbios) ? <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor="equipment-form-netbios">
                  {f.netbios}
                </label>
                <input id="equipment-form-netbios" type="text" className={styles.input} value={formData.netbios ?? ""} onChange={e => update("netbios", e.target.value)} readOnly={!isAddMode && Boolean(formData.netbios)} disabled={!isAddMode && Boolean(formData.netbios)} title={!isAddMode && formData.netbios ? f.netbiosReadonlyTitle : undefined} placeholder="PC-COMPTA" />
                {isAddMode ? <p className={styles.hint}>{f.netbiosManualHint}</p> : null}
              </div> : null}
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label} htmlFor="equipment-form-site">
                {f.location}
              </label>
              <SiteSuggestInput id="equipment-form-site" value={formData.location ?? ""} onChange={nextValue => update("location", nextValue)} sites={availableSites} placeholder={f.locationPlaceholder} />
            </div>
          </div>
          {apiType === "Firewalls" && <div className={`${styles.field} ${styles.fieldFull}`} style={{
          marginTop: "1rem"
        }}>
              <span className={styles.label}>{f.deploymentType}</span>
              <div className={styles.modulesGrid}>
                {localizeTypeOptions(FIREWALL_TYPE_OPTIONS, locale, "firewall").map(({
              value,
              label,
              icon,
              description
            }) => <button key={value} type="button" className={`${styles.moduleTile} ${(formData.firewallType ?? "materiel") === value ? styles.moduleTileActive : ""}`} onClick={() => setFormData(prev => applyFirewallTypeChange(prev, value))} aria-pressed={(formData.firewallType ?? "materiel") === value} title={description}>
                    {(formData.firewallType ?? "materiel") === value && <Icon icon="mdi:check-circle" className={styles.moduleCheck} aria-hidden />}
                    <Icon icon={icon} className={styles.moduleTileIcon} aria-hidden />
                    <span className={styles.moduleTileLabel}>{label}</span>
                  </button>)}
              </div>
            </div>}
          {apiType === "Servers" && <div className={`${styles.field} ${styles.fieldFull}`} style={{
          marginTop: "1rem"
        }}>
              <span className={`${styles.label} ${isAddMode ? styles.labelRequired : ""}`}>
                {f.serverType}
              </span>
              <div className={styles.modulesGrid}>
                {localizeTypeOptions(SERVER_TYPE_OPTIONS, locale, "server").map(({
              value,
              label,
              icon,
              description
            }) => <button key={value} type="button" className={`${styles.moduleTile} ${normalizedServerType === value ? styles.moduleTileActive : ""}`} onClick={() => setFormData(prev => applyServerTypeChange(prev, value))} aria-pressed={normalizedServerType === value} title={description}>
                    {normalizedServerType === value && <Icon icon="mdi:check-circle" className={styles.moduleCheck} aria-hidden />}
                    <Icon icon={icon} className={styles.moduleTileIcon} aria-hidden />
                    <span className={styles.moduleTileLabel}>{label}</span>
                  </button>)}
              </div>
            </div>}
          {apiType === "NAS" && <div className={`${styles.field} ${styles.fieldFull}`} style={{
          marginTop: "1rem"
        }}>
              <span className={`${styles.label} ${isAddMode ? styles.labelRequired : ""}`}>
                {f.storageType}
              </span>
              <div className={styles.modulesGrid}>
                {localizeTypeOptions(STORAGE_TYPE_OPTIONS, locale, "storage").map(({
              value,
              label,
              icon,
              description
            }) => <button key={value} type="button" className={`${styles.moduleTile} ${normalizedStorageType === value ? styles.moduleTileActive : ""}`} onClick={() => setFormData(prev => applyStorageTypeChange(prev, value))} aria-pressed={normalizedStorageType === value} title={description}>
                    {normalizedStorageType === value && <Icon icon="mdi:check-circle" className={styles.moduleCheck} aria-hidden />}
                    <Icon icon={icon} className={styles.moduleTileIcon} aria-hidden />
                    <span className={styles.moduleTileLabel}>{label}</span>
                  </button>)}
              </div>
            </div>}
          {apiType === "Alimentation" && <div className={`${styles.field} ${styles.fieldFull}`} style={{
          marginTop: "1rem"
        }}>
              <span className={`${styles.label} ${isAddMode ? styles.labelRequired : ""}`}>
                {f.deploymentType}
              </span>
              <div className={styles.modulesGrid}>
                {localizeTypeOptions(ALIMENTATION_TYPE_OPTIONS, locale, "alimentation").map(({
              value,
              label,
              icon,
              description
            }) => <button key={value} type="button" className={`${styles.moduleTile} ${(formData.alimentationType ?? "Onduleur") === value ? styles.moduleTileActive : ""}`} onClick={() => setFormData(prev => applyAlimentationTypeChange(prev, value))} aria-pressed={(formData.alimentationType ?? "UPS") === value} title={description}>
                    {(formData.alimentationType ?? "UPS") === value && <Icon icon="mdi:check-circle" className={styles.moduleCheck} aria-hidden />}
                    <Icon icon={icon} className={styles.moduleTileIcon} aria-hidden />
                    <span className={styles.moduleTileLabel}>{label}</span>
                  </button>)}
              </div>
            </div>}
          {apiType === "Routeur" && <div className={`${styles.field} ${styles.fieldFull}`} style={{
          marginTop: "1rem"
        }}>
              <span className={styles.label}>{f.equipmentType}</span>
              <div className={styles.modulesGrid}>
                {localizeTypeOptions(ROUTEUR_TYPE_OPTIONS, locale, "router").map(({
              value,
              label,
              icon,
              description
            }) => <button key={value} type="button" className={`${styles.moduleTile} ${(formData.routeurType ?? "Routeur") === value ? styles.moduleTileActive : ""}`} onClick={() => setFormData(prev => applyRouteurTypeChange(prev, value))} aria-pressed={(formData.routeurType ?? "Routeur") === value} title={description}>
                    {(formData.routeurType ?? "Routeur") === value && <Icon icon="mdi:check-circle" className={styles.moduleCheck} aria-hidden />}
                    <Icon icon={icon} className={styles.moduleTileIcon} aria-hidden />
                    <span className={styles.moduleTileLabel}>{label}</span>
                  </button>)}
              </div>
            </div>}
          {apiType === "TOIP" && <div className={`${styles.field} ${styles.fieldFull}`} style={{
          marginTop: "1rem"
        }}>
              <span className={`${styles.label} ${isAddMode ? styles.labelRequired : ""}`}>
                {f.deploymentType}
              </span>
              <div className={styles.modulesGrid}>
                {localizeTypeOptions(TOIP_TYPE_OPTIONS, locale, "toip").map(({
              value,
              label,
              icon,
              description
            }) => <button key={value} type="button" className={`${styles.moduleTile} ${formData.toipType === value ? styles.moduleTileActive : ""}`} onClick={() => setFormData(prev => applyToipTypeChange(prev, value))} aria-pressed={formData.toipType === value} title={description}>
                    {formData.toipType === value && <Icon icon="mdi:check-circle" className={styles.moduleCheck} aria-hidden />}
                    <Icon icon={icon} className={styles.moduleTileIcon} aria-hidden />
                    <span className={styles.moduleTileLabel}>{label}</span>
                  </button>)}
              </div>
            </div>}
        </>;
    case "network":
      return <>
          {sectionHead}
          <div className={styles.fieldGrid2}>
            {apiType !== "Internet" && <div className={styles.field}>
                <label className={styles.label} htmlFor="equipment-form-ip">
                  {f.ipAddress}
                </label>
                <input id="equipment-form-ip" type="text" className={styles.input} value={formData.ip ?? ""} onChange={e => update("ip", e.target.value)} placeholder={f.ipPlaceholder} />
              </div>}
            {(apiType === "Firewalls" || apiType === "Routeur" || NETWORK_EDGE_API_TYPES.has(apiType) || apiType === "Servers" || apiType === "Ordinateurs" || apiType === "NAS" && storageProfile?.showNetwork) && <div className={styles.field}>
                <label className={styles.label} htmlFor="equipment-form-vlan">
                  {f.vlan}
                </label>
                <input id="equipment-form-vlan" type="text" className={styles.input} value={formData.vlan ?? ""} onChange={e => update("vlan", e.target.value)} placeholder={f.vlanPlaceholder} />
              </div>}
            {apiType === "Firewalls" && <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor="equipment-form-admin-url">
                  {f.adminUrl}
                </label>
                <input id="equipment-form-admin-url" type="url" className={styles.input} value={formData.stormshieldWanUrl ?? ""} onChange={e => update("stormshieldWanUrl", e.target.value)} placeholder={firewallProfile?.adminUrlPlaceholder || "https://192.168.10.1:10443"} />
              </div>}
            {apiType === "Routeur" && routerProfile?.showAdminUrl && <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor="equipment-form-router-admin-url">
                  {f.adminUrl}
                </label>
                <input id="equipment-form-router-admin-url" type="url" className={styles.input} value={formData.adminUrl ?? ""} onChange={e => update("adminUrl", e.target.value)} placeholder={routerProfile?.adminUrlPlaceholder || "https://192.168.1.1"} />
              </div>}
            {apiType === "Switch" && <div className={styles.field}>
                <label className={styles.label} htmlFor="equipment-form-switch-mac">
                  {f.macAddress}
                </label>
                <input id="equipment-form-switch-mac" type="text" className={styles.input} value={formData.adresseMac ?? ""} onChange={e => update("adresseMac", e.target.value)} placeholder={f.macPlaceholder} />
              </div>}
            {apiType === "BorneWifi" && <div className={styles.field}>
                <label className={styles.label} htmlFor="equipment-form-wifi-mac">
                  {f.macAddress}
                </label>
                <input id="equipment-form-wifi-mac" type="text" className={styles.input} value={formData.adresseMac ?? ""} onChange={e => update("adresseMac", e.target.value)} placeholder={f.macPlaceholder} />
              </div>}
            {apiType === "Alimentation" && <div className={styles.field}>
                <label className={styles.label} htmlFor="equipment-form-alimentation-mac">
                  {f.macAddress}
                </label>
                <input id="equipment-form-alimentation-mac" type="text" className={styles.input} value={formData.adresseMac ?? ""} onChange={e => update("adresseMac", e.target.value)} placeholder={f.macPlaceholder} />
              </div>}
            {apiType === "Ordinateurs" && <div className={styles.field}>
                <label className={styles.label} htmlFor="equipment-form-computer-mac">
                  {f.macAddress}
                </label>
                <input id="equipment-form-computer-mac" type="text" className={styles.input} value={formData.mac ?? ""} onChange={e => update("mac", e.target.value)} placeholder={f.macPlaceholder} />
              </div>}
            {apiType === "TOIP" && <div className={styles.field}>
                <label className={styles.label} htmlFor="equipment-form-toip-mac">
                  {f.macAddress}
                </label>
                <input id="equipment-form-toip-mac" type="text" className={styles.input} value={formData.adresseMac ?? ""} onChange={e => update("adresseMac", e.target.value)} placeholder={f.macPlaceholder} />
              </div>}
          </div>
        </>;
    case "management":
      if (apiType === "TOIP" && !toipProfile?.showManagement) return null;
      if (apiType !== "Switch" && apiType !== "Alimentation" && apiType !== "TOIP") return null;
      return <>
          {sectionHead}
          <div className={styles.fieldGrid2}>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <span className={styles.label}>
                {apiType === "Alimentation" ? alimentationProfile?.managementLabel || f.manageableEquipment : apiType === "TOIP" ? toipProfile?.managementLabel || f.manageableEquipment : f.manageableSwitch}
              </span>
              <div className={styles.modulesGrid} role="group" aria-label={apiType === "Alimentation" ? alimentationProfile?.managementLabel : f.manageableSwitch}>
                {[{
                value: true,
                label: f.yes,
                icon: "mdi:lan-connect"
              }, {
                value: false,
                label: f.no,
                icon: "mdi:lan-disconnect"
              }].map(({
                value,
                label,
                icon
              }) => <button key={String(value)} type="button" className={`${styles.moduleTile} ${!!formData.manageable === value ? styles.moduleTileActive : ""}`} onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  manageable: value,
                  ...(value ? {} : {
                    adminUrl: ""
                  })
                }));
              }}>
                    <Icon icon={icon} className={styles.moduleTileIcon} aria-hidden />
                    <span className={styles.moduleTileLabel}>{label}</span>
                  </button>)}
              </div>
              <p className={styles.hint}>
                {apiType === "Alimentation" ? alimentationProfile?.managementHint : apiType === "TOIP" ? toipProfile?.managementHint : f.switchManageableHint}
              </p>
            </div>
            {formData.manageable && <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor={`equipment-form-${apiType === "Alimentation" ? "alimentation" : apiType === "TOIP" ? "toip" : "switch"}-admin-url`}>
                  {f.adminUrlMonitoring}
                </label>
                <input id={`equipment-form-${apiType === "Alimentation" ? "alimentation" : apiType === "TOIP" ? "toip" : "switch"}-admin-url`} type="url" className={styles.input} value={formData.adminUrl ?? ""} onChange={e => update("adminUrl", e.target.value)} placeholder={apiType === "Alimentation" ? alimentationProfile?.adminUrlPlaceholder : apiType === "TOIP" ? toipProfile?.adminUrlPlaceholder : "https://192.168.1.10 ou https://unifi.ui.com"} />
              </div>}
          </div>
        </>;
    case "notes":
      return <>
          {sectionHead}
          {apiType === "Firewalls" ? <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label} htmlFor="equipment-form-firewall-notes">
                {f.notes}
              </label>
              <textarea id="equipment-form-firewall-notes" className={styles.input} rows={5} value={formData.commentaire ?? ""} onChange={e => update("commentaire", e.target.value)} placeholder={f.notesFirewallPlaceholder} style={{
            resize: "vertical",
            minHeight: "7rem"
          }} />
            </div> : apiType === "Routeur" ? <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label} htmlFor="equipment-form-router-notes">
                {f.notes}
              </label>
              <textarea id="equipment-form-router-notes" className={styles.input} rows={5} value={formData.commentaire ?? ""} onChange={e => update("commentaire", e.target.value)} placeholder={f.notesRouterPlaceholder} style={{
            resize: "vertical",
            minHeight: "7rem"
          }} />
            </div> : apiType === "Servers" ? <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label} htmlFor="equipment-form-server-notes">
                {f.notes}
              </label>
              <textarea id="equipment-form-server-notes" className={styles.input} rows={5} value={formData.commentaire ?? ""} onChange={e => update("commentaire", e.target.value)} placeholder={f.notesServerPlaceholder} style={{
            resize: "vertical",
            minHeight: "7rem"
          }} />
            </div> : apiType === "NAS" ? <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label} htmlFor="equipment-form-storage-notes">
                {f.notes}
              </label>
              <textarea id="equipment-form-storage-notes" className={styles.input} rows={5} value={formData.commentaire ?? ""} onChange={e => update("commentaire", e.target.value)} placeholder={f.notesStoragePlaceholder} style={{
            resize: "vertical",
            minHeight: "7rem"
          }} />
            </div> : apiType === "Switch" ? <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label} htmlFor="equipment-form-switch-notes">
                {f.notes}
              </label>
              <textarea id="equipment-form-switch-notes" className={styles.input} rows={5} value={formData.commentaire ?? ""} onChange={e => update("commentaire", e.target.value)} placeholder={f.notesSwitchPlaceholder} style={{
            resize: "vertical",
            minHeight: "7rem"
          }} />
            </div> : apiType === "BorneWifi" ? <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label} htmlFor="equipment-form-wifi-notes">
                {f.notes}
              </label>
              <textarea id="equipment-form-wifi-notes" className={styles.input} rows={5} value={formData.commentaire ?? ""} onChange={e => update("commentaire", e.target.value)} placeholder={f.notesWifiPlaceholder} style={{
            resize: "vertical",
            minHeight: "7rem"
          }} />
            </div> : apiType === "Alimentation" ? <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label} htmlFor="equipment-form-alimentation-notes">
                {f.notes}
              </label>
              <textarea id="equipment-form-alimentation-notes" className={styles.input} rows={5} value={formData.commentaire ?? ""} onChange={e => update("commentaire", e.target.value)} placeholder={f.notesAlimentationPlaceholder} style={{
            resize: "vertical",
            minHeight: "7rem"
          }} />
            </div> : apiType === "Ordinateurs" ? <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label} htmlFor="equipment-form-computer-notes">
                {f.notes}
              </label>
              <textarea id="equipment-form-computer-notes" className={styles.input} rows={5} value={formData.commentaire ?? ""} onChange={e => update("commentaire", e.target.value)} placeholder={f.notesComputerPlaceholder} style={{
            resize: "vertical",
            minHeight: "7rem"
          }} />
            </div> : apiType === "TOIP" ? <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label} htmlFor="equipment-form-toip-notes">
                {f.notes}
              </label>
              <textarea id="equipment-form-toip-notes" className={styles.input} rows={5} value={formData.commentaire ?? ""} onChange={e => update("commentaire", e.target.value)} placeholder={f.notesToipPlaceholder} style={{
            resize: "vertical",
            minHeight: "7rem"
          }} />
            </div> : null}
        </>;
    case "internetType":
      return <>
          {sectionHead}
          <InternetTypePicker value={formData.internetType ?? ""} onChange={nextType => update("internetType", nextType)} formCopy={formCopy} />
        </>;
    case "internetLink":
      return <>
          {sectionHead}
          <InternetConnectionFields values={formData} onChange={setFormData} idPrefix="equipment-form-internet" section="internetLink" useFormStyles formCopy={formCopy} />
        </>;
    case "internetNetwork":
      return <>
          {sectionHead}
          <InternetConnectionFields values={formData} onChange={setFormData} idPrefix="equipment-form-internet" section="internetNetwork" useFormStyles formCopy={formCopy} />
        </>;
    case "internetContract":
      return <>
          {sectionHead}
          <InternetConnectionFields values={formData} onChange={setFormData} idPrefix="equipment-form-internet" section="internetContract" useFormStyles formCopy={formCopy} />
        </>;
    case "internetNotes":
      return <>
          {sectionHead}
          <InternetConnectionFields values={formData} onChange={setFormData} idPrefix="equipment-form-internet" section="internetNotes" useFormStyles formCopy={formCopy} />
        </>;
    case "hardware":
      return <>
          {sectionHead}
          <div className={styles.fieldGrid2}>
            {apiType === "Firewalls" && brandModelCatalog ? <FirewallBrandPicker key={formData.firewallType ?? "materiel"} catalog={brandModelCatalog} manufacturer={formData.manufacturer} model={formData.model} onManufacturerChange={value => updateBrandModel(value)} onManufacturerInputChange={value => update("manufacturer", value)} onModelChange={value => update("model", value)} required={isAddMode} showModel={firewallProfile?.showModel !== false} {...brandPickerLabels} modelLabel={firewallProfile?.modelLabel ?? f.model} modelPlaceholder={firewallProfile?.modelPlaceholder} /> : apiType === "Routeur" && brandModelCatalog ? <RouterBrandPicker key={formData.routeurType ?? "Routeur"} catalog={brandModelCatalog} manufacturer={formData.manufacturer} model={formData.model} onManufacturerChange={value => updateBrandModel(value)} onManufacturerInputChange={value => update("manufacturer", value)} onModelChange={value => update("model", value)} required={isAddMode} showModel={routerProfile?.showModel !== false} {...brandPickerLabels} modelLabel={routerProfile?.modelLabel ?? f.model} modelPlaceholder={routerProfile?.modelPlaceholder} /> : apiType === "Switch" && brandModelCatalog ? <SwitchBrandPicker catalog={brandModelCatalog} manufacturer={formData.manufacturer} model={formData.model} onManufacturerChange={value => updateBrandModel(value)} onManufacturerInputChange={value => update("manufacturer", value)} onModelChange={value => update("model", value)} required={isAddMode} {...brandPickerLabels} modelLabel={f.model} modelPlaceholder={f.switchModelPlaceholder} /> : apiType === "BorneWifi" && brandModelCatalog ? <WifiApBrandPicker catalog={brandModelCatalog} manufacturer={formData.manufacturer} model={formData.model} onManufacturerChange={value => updateBrandModel(value)} onManufacturerInputChange={value => update("manufacturer", value)} onModelChange={value => update("model", value)} required={isAddMode} {...brandPickerLabels} modelLabel={f.model} modelPlaceholder={f.wifiModelPlaceholder} /> : apiType === "Alimentation" && brandModelCatalog ? <AlimentationBrandPicker key={formData.alimentationType ?? "UPS"} catalog={brandModelCatalog} manufacturer={formData.manufacturer} model={formData.model} onManufacturerChange={value => updateBrandModel(value)} onManufacturerInputChange={value => update("manufacturer", value)} onModelChange={value => update("model", value)} required={isAddMode} {...brandPickerLabels} modelLabel={f.model} modelPlaceholder={alimentationProfile?.modelPlaceholder || "Smart-UPS 1500"} /> : apiType === "TOIP" && brandModelCatalog ? <ToipBrandPicker key={formData.toipType || "toip"} catalog={brandModelCatalog} manufacturer={formData.manufacturer} model={formData.model} onManufacturerChange={value => updateBrandModel(value)} onManufacturerInputChange={value => update("manufacturer", value)} onModelChange={value => update("model", value)} required={isAddMode} {...brandPickerLabels} modelLabel={f.model} modelPlaceholder={toipProfile?.modelPlaceholder || "P-Series"} /> : apiType === "TOIP" && !brandModelCatalog ? <>
                <div className={styles.field}>
                  <label className={`${styles.label} ${isAddMode ? styles.labelRequired : ""}`}>
                    {f.brand}
                  </label>
                  <input type="text" className={styles.input} value={formData.manufacturer ?? ""} onChange={e => update("manufacturer", e.target.value)} placeholder={f.toipBrandPlaceholder} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{f.model}</label>
                  <input type="text" className={styles.input} value={formData.model ?? ""} onChange={e => update("model", e.target.value)} placeholder={toipProfile?.modelPlaceholder || "Solution VoIP"} />
                </div>
              </> : apiType === "Ordinateurs" ? <>
                <div className={styles.field}>
                  <label className={styles.label}>{f.brand}</label>
                  <input type="text" className={styles.input} value={formData.manufacturer ?? ""} onChange={e => update("manufacturer", e.target.value)} placeholder="Dell, HP, Lenovo…" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>{f.model}</label>
                  <input type="text" className={styles.input} value={formData.model ?? ""} onChange={e => update("model", e.target.value)} placeholder="Latitude 5540" />
                </div>
              </> : null}
            {apiType === "Servers" && serverProfile?.showHardware && <ServerBrandPicker catalog={SERVER_CATALOG} manufacturer={formData.manufacturer} model={formData.model} onManufacturerChange={value => updateBrandModel(value)} onModelChange={value => update("model", value)} required={isAddMode} {...brandPickerLabels} modelLabel={f.model} modelPlaceholder={serverProfile.modelPlaceholder} />}
            {apiType === "NAS" && storageProfile?.showHardware && storageBrandCatalog && <StorageBrandPicker key={normalizedStorageType || "nas"} catalog={storageBrandCatalog} manufacturer={formData.manufacturer} model={formData.model} onManufacturerChange={value => updateBrandModel(value)} onManufacturerInputChange={value => update("manufacturer", value)} onModelChange={value => update("model", value)} required={isAddMode} {...brandPickerLabels} modelLabel={normalizedStorageType === "cloud" ? f.cloudServiceResource : f.model} modelPlaceholder={storageProfile.modelPlaceholder} />}
            {(apiType === "Firewalls" ? firewallProfile?.showSerial : apiType === "Routeur" ? routerProfile?.showSerial : apiType === "Servers" ? serverProfile?.showSerial : apiType === "NAS" ? storageProfile?.showSerial : apiType === "Ordinateurs" ? true : NETWORK_EDGE_API_TYPES.has(apiType)) && <div className={styles.field}>
                <label className={styles.label}>{f.serialNumber}</label>
                <input type="text" className={styles.input} value={formData.serial ?? ""} onChange={e => update("serial", e.target.value)} placeholder={EQUIPMENT_SERIAL_PLACEHOLDER} />
              </div>}
            {apiType === "NAS" && storageProfile?.showWarranty && <div className={styles.field}>
                <label className={styles.label} htmlFor="equipment-form-storage-warranty">
                  {f.warrantyEnd}
                </label>
                <input id="equipment-form-storage-warranty" type="date" className={styles.input} value={formData.expirationGarantie ?? ""} onChange={e => update("expirationGarantie", e.target.value)} />
              </div>}
            {apiType === "Alimentation" && <div className={styles.field}>
                <label className={styles.label} htmlFor="equipment-form-alimentation-hardware-warranty">
                  {f.warrantyEnd}
                </label>
                <input id="equipment-form-alimentation-hardware-warranty" type="date" className={styles.input} value={formData.expirationGarantie ?? ""} onChange={e => update("expirationGarantie", e.target.value)} />
              </div>}
            {(apiType === "Firewalls" ? firewallProfile?.showFirmware : apiType === "Routeur" ? routerProfile?.showFirmware : apiType === "TOIP" ? toipProfile?.showFirmware : NETWORK_EDGE_API_TYPES.has(apiType)) && <div className={styles.field}>
                <label className={styles.label}>
                  {apiType === "Firewalls" ? firewallProfile?.firmwareLabel || f.firmware : apiType === "Routeur" ? routerProfile?.firmwareLabel || f.firmware : apiType === "TOIP" ? toipProfile?.firmwareLabel || f.softwareVersion : f.firmware}
                </label>
                <input type="text" className={styles.input} value={formData.firmware ?? ""} onChange={e => update("firmware", e.target.value)} placeholder={apiType === "Firewalls" ? firewallProfile?.firmwarePlaceholder || "4.8.1" : apiType === "Routeur" ? routerProfile?.firmwarePlaceholder || "17.9.4" : apiType === "TOIP" ? toipProfile?.firmwarePlaceholder || "20.0" : "4.8.1"} />
              </div>}
            {apiType === "BorneWifi" && <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.slaToggle} htmlFor="wifi-ap-poe">
                  <span className={styles.slaToggleLabel}>{f.poePowered}</span>
                    <span className={styles.switchWrap}>
                      <input type="checkbox" id="wifi-ap-poe" className={styles.switchInput} checked={!!formData.alimentationPoE} onChange={e => update("alimentationPoE", e.target.checked)} />
                      <span className={styles.switchTrack} aria-hidden>
                        <span className={styles.switchThumb} aria-hidden />
                      </span>
                    </span>
                </label>
              </div>}
            {apiType === "Switch" && <>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={styles.slaToggle} htmlFor="switch-poe">
                    <span className={styles.slaToggleLabel}>{f.poeSupport}</span>
                    <span className={styles.switchWrap}>
                      <input type="checkbox" id="switch-poe" className={styles.switchInput} checked={!!formData.poeSupport} onChange={e => update("poeSupport", e.target.checked)} />
                      <span className={styles.switchTrack} aria-hidden>
                        <span className={styles.switchThumb} aria-hidden />
                      </span>
                    </span>
                  </label>
                </div>
                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={styles.slaToggle} htmlFor="switch-empilage">
                    <span className={styles.slaToggleLabel}>{f.stackable}</span>
                    <span className={styles.switchWrap}>
                      <input type="checkbox" id="switch-empilage" className={styles.switchInput} checked={!!formData.empilage} onChange={e => update("empilage", e.target.checked)} />
                      <span className={styles.switchTrack} aria-hidden>
                        <span className={styles.switchThumb} aria-hidden />
                      </span>
                    </span>
                  </label>
                </div>
              </>}
            {(apiType === "Routeur" && routerProfile?.showMac || NETWORK_EDGE_API_TYPES.has(apiType) && apiType !== "Switch" && apiType !== "BorneWifi" && apiType !== "Alimentation" && apiType !== "TOIP") && <div className={styles.field}>
                <label className={styles.label}>{f.macAddress}</label>
                <input type="text" className={styles.input} value={formData.adresseMac ?? ""} onChange={e => update("adresseMac", e.target.value)} placeholder={f.macPlaceholder} />
              </div>}
            {apiType === "Firewalls" && firewallProfile?.showWarranty && <div className={styles.field}>
                <label className={styles.label} htmlFor="equipment-form-warranty">
                  {f.warrantyEnd}
                </label>
                <input id="equipment-form-warranty" type="date" className={styles.input} value={formData.expirationGarantie ?? ""} onChange={e => update("expirationGarantie", e.target.value)} />
              </div>}
            {apiType === "Routeur" && routerProfile?.showWarranty && <div className={styles.field}>
                <label className={styles.label} htmlFor="equipment-form-router-warranty">
                  {f.warrantyEnd}
                </label>
                <input id="equipment-form-router-warranty" type="date" className={styles.input} value={formData.expirationGarantie ?? ""} onChange={e => update("expirationGarantie", e.target.value)} />
              </div>}
            {apiType === "Servers" && serverProfile?.showWarranty && <div className={styles.field}>
                <label className={styles.label} htmlFor="equipment-form-server-warranty">
                  {f.warrantyEnd}
                </label>
                <input id="equipment-form-server-warranty" type="date" className={styles.input} value={formData.expirationGarantie ?? ""} onChange={e => update("expirationGarantie", e.target.value)} />
              </div>}
          </div>
        </>;
    case "voip":
      if (apiType !== "TOIP" || !isToipVoipSectionVisible(formData.toipType) || !section) {
        return null;
      }
      return <>
          {sectionHead}
          <div className={styles.fieldGrid2}>
            {toipProfile?.showExtensions && <div className={styles.field}>
                <label className={styles.label} htmlFor="equipment-form-toip-extensions">
                  {toipProfile.extensionsLabel}
                </label>
                <input id="equipment-form-toip-extensions" type="text" className={styles.input} value={formData.nombreExtensions ?? ""} onChange={e => update("nombreExtensions", e.target.value)} placeholder={toipProfile.extensionsPlaceholder} />
              </div>}
            {toipProfile?.showDomainSip && <div className={styles.field}>
                <label className={styles.label} htmlFor="equipment-form-toip-sip-domain">
                  {f.sipDomain}
                </label>
                <input id="equipment-form-toip-sip-domain" type="text" className={styles.input} value={formData.domaineSip ?? ""} onChange={e => update("domaineSip", e.target.value)} placeholder={f.sipDomainPlaceholder} />
              </div>}
          </div>
        </>;
    case "power":
      if (apiType !== "Alimentation") return null;
      return <>
          {sectionHead}
          <div className={styles.fieldGrid2}>
            {alimentationProfile?.showCapaciteVA && <div className={styles.field}>
                <label className={styles.label} htmlFor="equipment-form-capacite-va">
                  {f.capacityVa}
                </label>
                <input id="equipment-form-capacite-va" type="text" className={styles.input} value={formData.capaciteVA ?? ""} onChange={e => update("capaciteVA", e.target.value)} placeholder={alimentationProfile?.isPdu ? "3680" : "1500"} />
              </div>}
            {alimentationProfile?.showCapaciteW && <div className={styles.field}>
                <label className={styles.label} htmlFor="equipment-form-capacite-w">
                  {f.powerW}
                </label>
                <input id="equipment-form-capacite-w" type="text" className={styles.input} value={formData.capaciteW ?? ""} onChange={e => update("capaciteW", e.target.value)} placeholder="1350" />
              </div>}
            {alimentationProfile?.showNbPrises && <div className={styles.field}>
                <label className={styles.label} htmlFor="equipment-form-nb-prises">
                  {f.outletCount}
                </label>
                <input id="equipment-form-nb-prises" type="text" className={styles.input} value={formData.nbPrises ?? ""} onChange={e => update("nbPrises", e.target.value)} placeholder="24" />
              </div>}
            {alimentationProfile?.showBatteryDate && <div className={styles.field}>
                <label className={styles.label} htmlFor="equipment-form-date-batterie">
                  {f.batteryReplacementDate}
                </label>
                <input id="equipment-form-date-batterie" type="date" className={styles.input} value={formData.dateBatterie ?? ""} onChange={e => update("dateBatterie", e.target.value)} />
              </div>}
          </div>
        </>;
    case "wifi":
      if (apiType !== "BorneWifi") return null;
      return <>
          {sectionHead}
          <WifiApSsidEditor clientSsids={formData.clientSsids} assignedSsidIds={formData.assignedSsidIds} onClientSsidsChange={nextCatalog => update("clientSsids", nextCatalog)} onAssignedSsidIdsChange={nextAssigned => update("assignedSsidIds", nextAssigned)} idPrefix="equipment-form-wifi-ssid" />
        </>;
    case "ha":
      return <>
          {sectionHead}
          <label className={styles.slaToggle} htmlFor="modeHA">
            <span className={styles.slaToggleLabel}>{f.haMode}</span>
            <span className={styles.switchWrap}>
              <input type="checkbox" id="modeHA" className={styles.switchInput} checked={!!formData.modeHA} onChange={e => {
              const checked = e.target.checked;
              setFormData(prev => ({
                ...prev,
                modeHA: checked,
                ...(checked ? {} : {
                  roleHA: "",
                  firewallHAName: "",
                  firewallHA: null
                })
              }));
            }} role="switch" aria-checked={!!formData.modeHA} />
              <span className={styles.switchTrack} aria-hidden="true">
                <span className={styles.switchThumb} />
              </span>
            </span>
          </label>
          {formData.modeHA && <div className={styles.fieldGrid2}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="equipment-form-role-ha">
                  {f.haRole}
                </label>
                <select id="equipment-form-role-ha" className={styles.input} value={formData.roleHA ?? ""} onChange={e => update("roleHA", e.target.value)}>
                  <option value="">{f.dashOption}</option>
                  <option value="Primary">{f.haRolePrimary}</option>
                  <option value="Secondary">{f.haRoleSecondary}</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="equipment-form-ha-partner">
                  {f.haPartnerName}
                </label>
                <select id="equipment-form-ha-partner" className={styles.input} value={formData.firewallHAName ?? ""} onChange={e => update("firewallHAName", e.target.value)} disabled={firewallPartnerOptions.length === 0}>
                  <option value="">
                    {firewallPartnerOptions.length === 0 ? f.haNoFirewallAvailable : f.haSelectFirewall}
                  </option>
                  {firewallPartnerOptions.map(name => <option key={name} value={name}>
                      {name}
                    </option>)}
                </select>
                {firewallPartnerOptions.length === 0 && <p className={styles.hint} style={{
              marginTop: "0.35rem",
              marginBottom: 0
            }}>
                    {f.haNoPartnerHint}
                  </p>}
              </div>
            </div>}
        </>;
    case "licences":
      return <>
          {sectionHead}
          {apiType === "Firewalls" ? <FirewallLicencesEditor licences={formData.licences} onChange={nextLicenses => update("licences", nextLicenses)} idPrefix="equipment-form-licence" /> : null}
        </>;
    case "maintenance":
      return null;
    case "system":
      return <>
          {sectionHead}
          <div className={styles.fieldGrid2}>
            {apiType === "Servers" && serverProfile?.showHypervisor && <div className={styles.field}>
                <label className={styles.label} htmlFor="equipment-form-hypervisor">
                  {f.hypervisorPlatform}
                </label>
                <select id="equipment-form-hypervisor" className={styles.input} value={formData.hypervisor ?? ""} onChange={e => update("hypervisor", e.target.value)}>
                  <option value="">{f.dashOption}</option>
                  {optionsCopy.hypervisorOptions?.map(option => <option key={option.value} value={option.value}>
                      {option.label}
                    </option>)}
                </select>
              </div>}
            <div className={styles.field}>
              <label className={styles.label}>{f.osSystem}</label>
              <select className={styles.input} value={formData.systeme ?? ""} onChange={e => update("systeme", e.target.value)}>
                <option value="">{f.dashOption}</option>
                {optionsCopy.osOptionGroups?.map(group => <optgroup key={group.label} label={group.label}>
                    {group.options.map(os => <option key={os} value={os}>
                        {os}
                      </option>)}
                  </optgroup>)}
                {formData.systeme && !(optionsCopy.osOptionGroups || []).some(group => group.options.includes(formData.systeme)) && <option value={formData.systeme}>{formData.systeme} {f.currentValueSuffix}</option>}
              </select>
            </div>
            {apiType === "Servers" ? <ServerSpecFields isVirtual={Boolean(serverProfile?.showHypervisor)} cpuLabel={serverProfile?.cpuLabel || f.cpuLabelDefault} processeur={formData.processeur ?? ""} memoire={formData.memoire ?? ""} stockage={formData.stockage ?? ""} onProcesseurChange={value => update("processeur", value)} onMemoireChange={value => update("memoire", value)} onStorageChange={value => update("stockage", value)} widgetsCopy={widgetsCopy.serverSpec} /> : apiType === "Ordinateurs" ? <>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="equipment-form-domaine">
                    {f.domain}
                  </label>
                  <input id="equipment-form-domaine" type="text" className={styles.input} value={formData.domaine ?? ""} onChange={e => update("domaine", e.target.value)} placeholder={f.domainPlaceholder} />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="equipment-form-processeur">
                    {f.cpuLabelDefault || "Processeur"}
                  </label>
                  <input id="equipment-form-processeur" type="text" className={styles.input} value={formData.processeur ?? ""} onChange={e => update("processeur", e.target.value)} placeholder="Intel Core i7" />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="equipment-form-memoire">
                    {widgetsCopy.serverSpec?.memoryLabel || "Memory"}
                  </label>
                  <input id="equipment-form-memoire" type="text" className={styles.input} value={formData.memoire ?? ""} onChange={e => update("memoire", e.target.value)} placeholder="16 Go" />
                </div>
              </> : null}
            {apiType !== "Ordinateurs" ? <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label}>{f.roles}</label>
              <RoleTagsSelect groups={optionsCopy.serverRoleGroups} options={optionsCopy.serverRoleOptions} value={Array.isArray(formData.role) ? formData.role : []} onChange={roles => update("role", roles)} placeholder={f.rolesPlaceholder} widgetsCopy={widgetsCopy.roleTagsSelect} />
            </div> : null}
          </div>
        </>;
    case "remote":
      return <>
          {sectionHead}
          {apiType === "Servers" ? <div className={styles.fieldGrid2}>
              <ServerRemoteAccessFields remoteAccessSolution={formData.remoteAccessSolution} remoteAccessId={formData.remoteAccessId} onSolutionChange={value => update("remoteAccessSolution", value)} onIdChange={value => update("remoteAccessId", value)} widgetsCopy={widgetsCopy.remoteAccess} />
            </div> : null}
        </>;
    case "storage":
      return <>
          {sectionHead}
          <div className={styles.fieldGrid2}>
            {apiType === "NAS" && storageProfile?.showRole && <div className={styles.field}>
                <label className={styles.label} htmlFor="storage-role">
                  {f.storageRole}
                </label>
                <select id="storage-role" className={styles.input} value={formData.role ?? ""} onChange={e => update("role", e.target.value)}>
                  <option value="">{f.dashOption}</option>
                  {optionsCopy.storageRoleOptions?.map(opt => <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>)}
                  {formData.role && !(optionsCopy.storageRoleOptions || []).some(opt => opt.value === formData.role) && <option value={formData.role}>{formData.role} {f.currentValueSuffix}</option>}
                </select>
              </div>}
            {apiType === "NAS" && isSynologyStorageForm && storageProfile?.showQuickConnect && <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor="storage-quickconnect">
                  {f.quickConnect}
                </label>
                <input id="storage-quickconnect" type="text" className={styles.input} value={formData.quickConnect ?? ""} onChange={e => update("quickConnect", e.target.value)} placeholder={f.quickConnectPlaceholder} />
              </div>}
            {apiType === "NAS" && storageProfile?.showRaid && <div className={styles.field}>
                <label className={styles.label}>{f.raid}</label>
                <select className={styles.input} value={formData.raid ?? ""} onChange={e => update("raid", e.target.value)}>
                  <option value="">{f.dashOption}</option>
                  {optionsCopy.storageRaidOptions?.map(opt => <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>)}
                  {formData.raid && !(optionsCopy.storageRaidOptions || []).some(opt => opt.value === formData.raid) && <option value={formData.raid}>{formData.raid} {f.currentValueSuffix}</option>}
                </select>
              </div>}
            {apiType === "NAS" && storageProfile?.showDisques && <div className={`${styles.field} ${styles.fieldFull}`}>
                <StorageDiskBayPicker idPrefix="storage-form-disk" nbDisquesActuels={formData.nbDisquesActuels} nbDisquesMax={formData.nbDisquesMax} disques={formData.disques} capacite={formData.capacite} widgetsCopy={widgetsCopy.diskBay} onChange={({
              nbDisquesActuels,
              nbDisquesMax,
              disques,
              capacite
            }) => {
              setFormData(prev => ({
                ...prev,
                nbDisquesActuels,
                nbDisquesMax,
                disques,
                capacite
              }));
            }} />
              </div>}
            {apiType === "NAS" && storageProfile?.showCapacite && <div className={`${styles.field} ${styles.fieldFull}`}>
                <CapacityInput id="storage-capacite-totale" label={f.totalCapacity} value={formData.capacite ?? ""} onChange={value => update("capacite", value)} placeholder="16000" widgetsCopy={widgetsCopy.capacity} />
              </div>}
            {apiType === "NAS" && storageProfile?.showNumeroDisque && <div className={styles.field}>
                <label className={styles.label} htmlFor="storage-numero-disque">
                  {f.diskRotationNumber}
                </label>
                <input id="storage-numero-disque" type="text" className={styles.input} value={formData.numeroDisque ?? ""} onChange={e => update("numeroDisque", e.target.value)} placeholder="1" />
              </div>}
          </div>
        </>;
    default:
      return null;
  }
}
