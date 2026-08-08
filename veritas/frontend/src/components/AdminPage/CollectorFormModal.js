import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { Switch } from "./AdminUi";
import { getLocalizedCollectorFormSections, getLocalizedCollectorProviders, interpolate } from "./adminMailCollectI18n";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./CollectorFormModal.module.css";
const MANUAL_PROVIDER_KEY = "imap-pop3";
export default function CollectorFormModal({
  open,
  copy,
  mode = "create",
  draft,
  setDraft,
  providerKey = "",
  onProviderChange,
  saving = false,
  testing = false,
  onClose,
  onSave,
  onTestConnection,
  onBrowseFolders,
  initialSection
}) {
  const cf = copy.collectorForm;
  const isCreate = mode === "create";
  const [activeSection, setActiveSection] = useState("provider");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const providerPresets = useMemo(() => getLocalizedCollectorProviders(copy), [copy]);
  const formSections = useMemo(() => getLocalizedCollectorFormSections(copy), [copy]);
  const selectedProvider = useMemo(() => providerPresets.find(item => item.key === providerKey) || null, [providerKey, providerPresets]);
  const isManualProvider = providerKey === MANUAL_PROVIDER_KEY;
  useEffect(() => {
    if (!open) return;
    setActiveSection(initialSection || (isCreate ? "provider" : "connection"));
    setShowAdvanced(Boolean(draft?.port || draft?.validateCertMode === "validate-cert"));
  }, [open, initialSection, isCreate, draft?.port, draft?.validateCertMode]);
  const sectionMeta = useMemo(() => ({
    provider: Boolean(providerKey),
    connection: Boolean(isManualProvider && String(draft?.username || "").trim() && String(draft?.server || "").trim() && (String(draft?.password || "").trim() || !isCreate)),
    ingestion: Boolean(draft?.inboxFolder)
  }), [draft, isCreate, isManualProvider, providerKey]);
  if (!open || !draft) return null;
  const patchDraft = patch => setDraft(prev => ({
    ...prev,
    ...patch
  }));
  const handleProviderSelect = key => {
    const provider = providerPresets.find(item => item.key === key);
    if (!provider || provider.comingSoon) return;
    onProviderChange?.(key);
    if (isCreate) {
      setActiveSection("connection");
    }
  };
  const canOpenSection = sectionId => {
    if (sectionId === "provider") return true;
    if (!providerKey || !isManualProvider) return false;
    if (sectionId === "connection") return true;
    if (sectionId === "ingestion") {
      if (!isCreate) return true;
      return sectionMeta.connection;
    }
    return false;
  };
  const handleSectionChange = sectionId => {
    if (!canOpenSection(sectionId)) return;
    setActiveSection(sectionId);
  };
  const intervalMinutes = Number(draft.checkIntervalMinutes ?? 5);
  const intervalHint = intervalMinutes > 1 ? interpolate(cf.intervalHintMany, {
    minutes: intervalMinutes
  }) : interpolate(cf.intervalHintOne, {
    minutes: intervalMinutes
  });
  const modalTitle = isCreate ? cf.createTitle : draft.name ? interpolate(cf.editTitle, {
    name: draft.name
  }) : cf.editTitleFallback;
  const modalSubtitle = isCreate ? cf.createSubtitle : cf.editSubtitle;
  const renderProviderStep = () => <>
      <div className={layout.sectionHead}>
        <h3 className={layout.sectionTitle}>{cf.providerTitle}</h3>
        <p className={layout.sectionDesc}>{cf.providerDesc}</p>
      </div>
      <div className={styles.providerGrid}>
        {providerPresets.map(provider => {
        const selected = providerKey === provider.key;
        const disabled = Boolean(provider.comingSoon);
        const comingSoonLabel = copy.providers[provider.key]?.comingSoon ?? copy.common.comingSoon;
        return <button key={provider.key} type="button" className={`${styles.providerTile} ${selected ? styles.providerTileActive : ""}`} onClick={() => handleProviderSelect(provider.key)} disabled={disabled} aria-pressed={selected}>
              {provider.comingSoon && <span className={styles.comingSoonBadge}>{comingSoonLabel}</span>}
              <Icon icon={provider.icon} className={styles.providerTileIcon} aria-hidden />
              <span className={styles.providerTileLabel}>{provider.label}</span>
              <span className={styles.providerTileHint}>
                {provider.comingSoon ? copy.common.notAvailable : provider.hint}
              </span>
            </button>;
      })}
      </div>
    </>;
  const renderConnectionStep = () => <>
      <div className={layout.sectionHead}>
        <h3 className={layout.sectionTitle}>
          {selectedProvider?.connectionTitle || cf.connectionDefaultTitle}
        </h3>
        <p className={layout.sectionDesc}>
          {selectedProvider?.connectionDescription || cf.connectionDefaultDesc}
        </p>
      </div>

      <div className={layout.fieldGrid2}>
        <div className={layout.field}>
          <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="collector-email">
            {cf.emailLabel}
          </label>
          <input id="collector-email" type="email" className={layout.input} value={draft.username || ""} onChange={e => patchDraft({
          username: e.target.value
        })} placeholder={cf.emailPlaceholder} autoComplete="off" />
        </div>
        <div className={layout.field}>
          <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="collector-password">
            {cf.passwordLabel}
          </label>
          <input id="collector-password" type="password" className={layout.input} value={draft.password || ""} onChange={e => patchDraft({
          password: e.target.value
        })} placeholder={cf.passwordPlaceholder} autoComplete="new-password" />
        </div>
        <div className={`${layout.field} ${layout.fieldFull}`}>
          <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="collector-server">
            {cf.serverLabel}
          </label>
          <input id="collector-server" type="text" className={layout.input} value={draft.server || ""} onChange={e => patchDraft({
          server: e.target.value
        })} placeholder={cf.serverPlaceholder} />
        </div>
        <div className={`${layout.field} ${layout.fieldFull}`}>
          <label className={layout.label} htmlFor="collector-name">
            {cf.nameLabel}
          </label>
          <input id="collector-name" type="text" className={layout.input} value={draft.name || ""} onChange={e => patchDraft({
          name: e.target.value
        })} placeholder={cf.namePlaceholder} />
        </div>
      </div>

      <button type="button" className={styles.advancedToggle} onClick={() => setShowAdvanced(prev => !prev)} aria-expanded={showAdvanced}>
        <Icon icon={showAdvanced ? "mdi:chevron-up" : "mdi:chevron-down"} aria-hidden />
        {cf.advancedToggle}
      </button>

      {showAdvanced ? <div className={layout.fieldGrid2}>
          <div className={layout.field}>
            <label className={layout.label} htmlFor="collector-port">
              {cf.portLabel}
            </label>
            <input id="collector-port" type="text" className={layout.input} value={draft.port || ""} onChange={e => patchDraft({
          port: e.target.value
        })} placeholder={cf.portPlaceholder} />
          </div>
          <div className={layout.field}>
            <label className={layout.label} htmlFor="collector-cert">
              {cf.certLabel}
            </label>
            <select id="collector-cert" className={layout.input} value={draft.validateCertMode || "no-validate-cert"} onChange={e => patchDraft({
          validateCertMode: e.target.value
        })}>
              <option value="no-validate-cert">{copy.certOptions.noValidate}</option>
              <option value="validate-cert">{copy.certOptions.validate}</option>
            </select>
          </div>
        </div> : null}

      <div className={styles.connectionTestRow}>
        <button type="button" className={styles.secondaryBtn} onClick={onTestConnection} disabled={saving || testing}>
          {testing ? <>
              <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
              {cf.testingConnection}
            </> : <>
              <Icon icon="mdi:connection" aria-hidden />
              {cf.testConnection}
            </>}
        </button>
      </div>
    </>;
  const renderIngestionStep = () => {
    const section = formSections.find(item => item.id === "ingestion");
    return <>
        <div className={layout.sectionHead}>
          <h3 className={layout.sectionTitle}>{section?.label}</h3>
          <p className={layout.sectionDesc}>
            {cf.ingestionDescBefore}
            <strong>{cf.ingestionDescTab}</strong>
            {cf.ingestionDescAfter}
          </p>
        </div>

        <div className={styles.statusRow}>
          <div>
            <div className={styles.statusLabel}>{cf.statusLabel}</div>
            <p className={styles.statusHint}>{cf.statusHint}</p>
          </div>
          <Switch checked={Boolean(draft.enabled)} onChange={on => patchDraft({
          enabled: on
        })} label={draft.enabled ? copy.common.active : copy.common.inactive} />
        </div>

        <div className={styles.folderSection}>
          <h4 className={styles.folderSectionTitle}>{cf.scanFolderTitle}</h4>
          <div className={layout.field}>
            <label className={layout.label} htmlFor="collector-inbox">
              {cf.inboxLabel}
            </label>
            <div className={styles.folderRow}>
              <input id="collector-inbox" type="text" className={layout.input} value={draft.inboxFolder || ""} onChange={e => patchDraft({
              inboxFolder: e.target.value
            })} placeholder={cf.inboxPlaceholder} />
              <button type="button" className={styles.browseBtn} title={copy.common.browseFolders} onClick={() => onBrowseFolders("inboxFolder")}>
                <Icon icon="mdi:folder-search-outline" />
              </button>
            </div>
          </div>
        </div>

        <div className={styles.folderSection}>
          <h4 className={styles.folderSectionTitle}>{cf.moveFolderTitle}</h4>
          <p className={styles.folderSectionHint}>{cf.moveFolderHint}</p>
          <div className={layout.fieldGrid2}>
            <div className={layout.field}>
              <label className={layout.label} htmlFor="collector-accepted">
                {cf.acceptedLabel}
              </label>
              <div className={styles.folderRow}>
                <input id="collector-accepted" type="text" className={layout.input} value={draft.acceptedFolder || ""} onChange={e => patchDraft({
                acceptedFolder: e.target.value
              })} placeholder={cf.acceptedPlaceholder} />
                <button type="button" className={styles.browseBtn} title={copy.common.browseFolders} onClick={() => onBrowseFolders("acceptedFolder")}>
                  <Icon icon="mdi:folder-search-outline" />
                </button>
              </div>
            </div>
            <div className={layout.field}>
              <label className={layout.label} htmlFor="collector-refused">
                {cf.refusedLabel}
              </label>
              <div className={styles.folderRow}>
                <input id="collector-refused" type="text" className={layout.input} value={draft.refusedFolder || ""} onChange={e => patchDraft({
                refusedFolder: e.target.value
              })} placeholder={cf.refusedPlaceholder} />
                <button type="button" className={styles.browseBtn} title={copy.common.browseFolders} onClick={() => onBrowseFolders("refusedFolder")}>
                  <Icon icon="mdi:folder-search-outline" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.folderSection}>
          <h4 className={styles.folderSectionTitle}>{cf.behaviorTitle}</h4>
          <div className={styles.toggleGrid}>
            <div className={styles.toggleCard}>
              <span className={styles.toggleCardLabel}>{cf.autoIngestLabel}</span>
              <Switch checked={Boolean(draft.ingestEnabled)} onChange={on => patchDraft({
              ingestEnabled: on
            })} />
            </div>
            <div className={styles.toggleCard}>
              <span className={styles.toggleCardLabel}>{cf.unreadOnlyLabel}</span>
              <Switch checked={draft.unreadOnly !== false} onChange={on => patchDraft({
              unreadOnly: on
            })} />
            </div>
          </div>

          <div className={styles.rangeBlock}>
            <label className={layout.label} htmlFor="collector-interval">
              {cf.intervalLabel}
            </label>
            <input id="collector-interval" type="range" className={styles.rangeInput} min="1" max="120" step="1" value={intervalMinutes} onChange={e => patchDraft({
            checkIntervalMinutes: Number(e.target.value || 5)
          })} />
            <div className={styles.rangeHint}>{intervalHint}</div>
          </div>
        </div>
      </>;
  };
  const renderSectionContent = () => {
    switch (activeSection) {
      case "provider":
        return renderProviderStep();
      case "connection":
        return isManualProvider ? renderConnectionStep() : renderProviderStep();
      case "ingestion":
        return renderIngestionStep();
      default:
        return null;
    }
  };
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={layout.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="collector-form-modal-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon={isCreate ? "mdi:inbox-arrow-down-outline" : "mdi:email-sync-outline"} />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{cf.eyebrow}</p>
              <h2 className={layout.title} id="collector-form-modal-title">
                {modalTitle}
              </h2>
              <p className={layout.subtitle}>{modalSubtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={saving || testing} aria-label={copy.common.close}>
            <FaTimes />
          </button>
        </header>

        <div className={layout.body}>
          <nav className={layout.nav} aria-label={cf.sectionsAria}>
            {formSections.map(section => {
            const locked = !canOpenSection(section.id);
            return <button key={section.id} type="button" className={`${layout.navItem} ${activeSection === section.id ? layout.navItemActive : ""} ${locked ? styles.navItemLocked : ""}`} onClick={() => handleSectionChange(section.id)} aria-current={activeSection === section.id ? "step" : undefined} aria-disabled={locked} disabled={locked}>
                  <Icon icon={section.icon} className={layout.navItemIcon} aria-hidden />
                  <span className={layout.navItemText}>
                    <span className={layout.navItemLabel}>{section.label}</span>
                    <span className={layout.navItemHint}>{section.description}</span>
                  </span>
                  {sectionMeta[section.id] && <span className={layout.navBadge}>✓</span>}
                </button>;
          })}
          </nav>

          <div className={layout.content}>{renderSectionContent()}</div>
        </div>

        <footer className={layout.footer}>
          <div className={`${layout.footerActions} ${styles.footerActionsEnd}`}>
            <button type="button" className={layout.ghostBtn} onClick={onClose} disabled={saving || testing}>
              {copy.common.cancel}
            </button>
            <button type="button" className={layout.primaryBtn} onClick={onSave} disabled={saving || testing || !isManualProvider || isCreate && !sectionMeta.connection}>
              {saving ? <>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                  {copy.common.saving}
                </> : isCreate ? <>
                  <Icon icon="mdi:check" aria-hidden />
                  {cf.createBtn}
                </> : <>
                  <Icon icon="mdi:content-save-outline" aria-hidden />
                  {copy.common.save}
                </>}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
