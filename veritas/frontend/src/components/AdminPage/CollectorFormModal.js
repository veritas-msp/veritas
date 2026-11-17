import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { Switch } from "./AdminUi";
import {
  getLocalizedCollectorProviders,
  interpolate
} from "./adminMailCollectI18n";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./CollectorFormModal.module.css";

const QUICK_PROVIDER_KEYS = ["gmail", "outlook-com", "o365", "ovh", "imap-pop3"];

function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

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
  peeking = false,
  onClose,
  onSave,
  onTestConnection,
  onPeekMailbox,
  onBrowseFolders
}) {
  const cf = copy.collectorForm;
  const isCreate = mode === "create";
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMoreProviders, setShowMoreProviders] = useState(false);

  const providerPresets = useMemo(() => getLocalizedCollectorProviders(copy), [copy]);
  const selectedProvider = useMemo(
    () => providerPresets.find(item => item.key === providerKey) || null,
    [providerKey, providerPresets]
  );

  const featuredProviders = useMemo(
    () => QUICK_PROVIDER_KEYS.map(key => providerPresets.find(item => item.key === key)).filter(Boolean),
    [providerPresets]
  );
  const extraProviders = useMemo(
    () => providerPresets.filter(item => !QUICK_PROVIDER_KEYS.includes(item.key)),
    [providerPresets]
  );

  const isCustomImap = !providerKey || providerKey === "imap-pop3";
  const serverLocked = Boolean(selectedProvider?.defaults?.server) && !isCustomImap;

  useEffect(() => {
    if (!open) return;
    setShowAdvanced(!isCreate);
    setShowMoreProviders(Boolean(providerKey) && !QUICK_PROVIDER_KEYS.includes(providerKey));
  }, [open, isCreate, providerKey]);

  const emailOrLogin = String(draft?.username || "").trim();
  const hasPassword = Boolean(String(draft?.password || "").trim()) || !isCreate;
  const hasServer = Boolean(String(draft?.server || "").trim());
  const canSave = Boolean(providerKey && emailOrLogin && hasPassword && hasServer);
  const credentialsReady = Boolean(emailOrLogin && hasServer && hasPassword);

  if (!open || !draft) return null;

  const patchDraft = patch => setDraft(prev => ({ ...prev, ...patch }));

  const handleProviderSelect = key => {
    const provider = providerPresets.find(item => item.key === key);
    if (!provider || provider.comingSoon) return;
    onProviderChange?.(key);
  };

  const handleEmailChange = value => {
    const next = { username: value };
    if (!String(draft.name || "").trim() || String(draft.name).trim() === String(draft.username || "").trim()) {
      next.name = looksLikeEmail(value) ? value.trim() : draft.name;
    }
    patchDraft(next);
  };

  const intervalMinutes = Number(draft.checkIntervalMinutes ?? 5);
  const intervalHint =
    intervalMinutes > 1
      ? interpolate(cf.intervalHintMany, { minutes: intervalMinutes })
      : interpolate(cf.intervalHintOne, { minutes: intervalMinutes });

  const modalTitle = isCreate
    ? cf.createTitle
    : draft.name
      ? interpolate(cf.editTitle, { name: draft.name })
      : cf.editTitleFallback;
  const modalSubtitle = isCreate ? cf.createSubtitle : cf.editSubtitle;

  const renderProviderChip = provider => {
    const selected = providerKey === provider.key;
    const disabled = Boolean(provider.comingSoon);
    return (
      <button
        key={provider.key}
        type="button"
        className={`${styles.providerChip}${selected ? ` ${styles.providerChipActive}` : ""}`}
        onClick={() => handleProviderSelect(provider.key)}
        disabled={disabled}
        aria-pressed={selected}
        title={provider.comingSoon ? copy.common.comingSoon : provider.hint}
      >
        <Icon icon={provider.icon} aria-hidden />
        <span>{provider.label}</span>
      </button>
    );
  };

  return createPortal(
    <div className={layout.overlay} onClick={onClose} role="presentation">
      <div
        className={`${layout.shell} ${styles.shell} ${styles.shellSimple}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="collector-form-modal-title"
      >
        <div className={layout.accentBar} aria-hidden />

        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon={isCreate ? "mdi:email-plus-outline" : "mdi:email-sync-outline"} />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{cf.eyebrow}</p>
              <h2 className={layout.title} id="collector-form-modal-title">
                {modalTitle}
              </h2>
              <p className={layout.subtitle}>{modalSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            className={layout.closeBtn}
            onClick={onClose}
            disabled={saving || testing}
            aria-label={copy.common.close}
          >
            <FaTimes />
          </button>
        </header>

        <div className={`${layout.bodySingle} ${styles.body}`}>
          <div className={layout.content}>
            <div className={styles.simplePane}>
              <section className={styles.simpleSection}>
                <h3 className={styles.simpleSectionTitle}>{cf.providerTitle}</h3>
                <div className={styles.providerChips}>
                  {featuredProviders.map(renderProviderChip)}
                  {showMoreProviders ? extraProviders.map(renderProviderChip) : null}
                </div>
                {extraProviders.length > 0 ? (
                  <button
                    type="button"
                    className={styles.moreProvidersBtn}
                    onClick={() => setShowMoreProviders(prev => !prev)}
                    aria-expanded={showMoreProviders}
                  >
                    <Icon icon={showMoreProviders ? "mdi:chevron-up" : "mdi:chevron-down"} aria-hidden />
                    {showMoreProviders ? cf.hideProviders : cf.moreProviders}
                  </button>
                ) : null}
                {selectedProvider ? (
                  <p className={styles.providerHelp}>{selectedProvider.connectionDescription || selectedProvider.hint}</p>
                ) : (
                  <p className={styles.providerHelp}>{cf.providerDesc}</p>
                )}
              </section>

              <section className={styles.simpleSection}>
                <h3 className={styles.simpleSectionTitle}>{cf.accountTitle || cf.connectionDefaultTitle}</h3>
                <div className={layout.fieldGrid2}>
                  <div className={`${layout.field} ${layout.fieldFull}`}>
                    <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="collector-email">
                      {cf.emailLabel}
                    </label>
                    <input
                      id="collector-email"
                      type="text"
                      className={layout.input}
                      value={draft.username || ""}
                      onChange={e => handleEmailChange(e.target.value)}
                      placeholder={cf.emailPlaceholder}
                      autoComplete="username"
                      spellCheck={false}
                      autoFocus={isCreate}
                    />
                    <p className={styles.fieldHint}>{cf.emailHint}</p>
                  </div>

                  <div className={`${layout.field} ${layout.fieldFull}`}>
                    <label
                      className={`${layout.label}${isCreate ? ` ${layout.labelRequired}` : ""}`}
                      htmlFor="collector-password"
                    >
                      {cf.passwordLabel}
                    </label>
                    <input
                      id="collector-password"
                      type="password"
                      className={layout.input}
                      value={draft.password || ""}
                      onChange={e => patchDraft({ password: e.target.value })}
                      placeholder={isCreate ? cf.passwordPlaceholder : cf.passwordKeepPlaceholder}
                      autoComplete="new-password"
                    />
                    <p className={styles.fieldHint}>{isCreate ? cf.passwordHint : cf.passwordKeepHint}</p>
                  </div>

                  {isCustomImap || !serverLocked ? (
                    <div className={`${layout.field} ${layout.fieldFull}`}>
                      <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="collector-server">
                        {cf.serverLabel}
                      </label>
                      <input
                        id="collector-server"
                        type="text"
                        className={layout.input}
                        value={draft.server || ""}
                        onChange={e => patchDraft({ server: e.target.value })}
                        placeholder={cf.serverPlaceholder}
                      />
                    </div>
                  ) : (
                    <div className={`${layout.field} ${layout.fieldFull}`}>
                      <label className={layout.label} htmlFor="collector-server-ro">
                        {cf.serverLabel}
                      </label>
                      <input
                        id="collector-server-ro"
                        type="text"
                        className={layout.input}
                        value={draft.server || ""}
                        readOnly
                        disabled
                      />
                      <p className={styles.fieldHint}>{cf.serverPresetHint || cf.connectionDefaultDesc}</p>
                    </div>
                  )}
                </div>

                <div className={styles.actionsRow}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={onTestConnection}
                    disabled={saving || testing || !credentialsReady}
                  >
                    {testing ? (
                      <>
                        <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                        {cf.testingConnection}
                      </>
                    ) : (
                      <>
                        <Icon icon="mdi:connection" aria-hidden />
                        {cf.testConnection}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={onPeekMailbox}
                    disabled={saving || testing || peeking || !credentialsReady}
                  >
                    {peeking ? (
                      <>
                        <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                        {cf.peekingMailbox}
                      </>
                    ) : (
                      <>
                        <Icon icon="mdi:email-search-outline" aria-hidden />
                        {cf.peekMailbox}
                      </>
                    )}
                  </button>
                </div>
              </section>

              <button
                type="button"
                className={styles.advancedToggle}
                onClick={() => setShowAdvanced(prev => !prev)}
                aria-expanded={showAdvanced}
              >
                <Icon icon={showAdvanced ? "mdi:chevron-up" : "mdi:chevron-down"} aria-hidden />
                {cf.advancedToggle}
              </button>

              {showAdvanced ? (
                <section className={styles.simpleSection}>
                  <div className={styles.statusCard}>
                    <div>
                      <div className={styles.statusLabel}>{cf.statusLabel}</div>
                      <p className={styles.statusHint}>{cf.statusHint}</p>
                    </div>
                    <Switch
                      checked={Boolean(draft.enabled)}
                      onChange={on => patchDraft({ enabled: on })}
                      label={draft.enabled ? copy.common.active : copy.common.inactive}
                    />
                  </div>

                  <div className={layout.fieldGrid2}>
                    <div className={layout.field}>
                      <label className={layout.label} htmlFor="collector-name">
                        {cf.nameLabel}
                      </label>
                      <input
                        id="collector-name"
                        type="text"
                        className={layout.input}
                        value={draft.name || ""}
                        onChange={e => patchDraft({ name: e.target.value })}
                        placeholder={cf.namePlaceholder}
                      />
                    </div>

                    <div className={layout.field}>
                      <label className={layout.label} htmlFor="collector-inbox">
                        {cf.inboxLabel}
                      </label>
                      <div className={`${styles.folderRow} ${styles.folderRowPeek}`}>
                        <input
                          id="collector-inbox"
                          type="text"
                          className={layout.input}
                          value={draft.inboxFolder || ""}
                          onChange={e => patchDraft({ inboxFolder: e.target.value })}
                          placeholder={cf.inboxPlaceholder}
                        />
                        <button
                          type="button"
                          className={styles.browseBtn}
                          title={copy.common.browseFolders}
                          onClick={() => onBrowseFolders?.("inboxFolder")}
                        >
                          <Icon icon="mdi:folder-search-outline" />
                        </button>
                      </div>
                    </div>

                    <div className={layout.field}>
                      <label className={layout.label} htmlFor="collector-accepted">
                        {cf.acceptedLabel}
                      </label>
                      <div className={styles.folderRow}>
                        <input
                          id="collector-accepted"
                          type="text"
                          className={layout.input}
                          value={draft.acceptedFolder || ""}
                          onChange={e => patchDraft({ acceptedFolder: e.target.value })}
                          placeholder={cf.acceptedPlaceholder}
                        />
                        <button
                          type="button"
                          className={styles.browseBtn}
                          title={copy.common.browseFolders}
                          onClick={() => onBrowseFolders?.("acceptedFolder")}
                        >
                          <Icon icon="mdi:folder-search-outline" />
                        </button>
                      </div>
                    </div>

                    <div className={layout.field}>
                      <label className={layout.label} htmlFor="collector-refused">
                        {cf.refusedLabel}
                      </label>
                      <div className={styles.folderRow}>
                        <input
                          id="collector-refused"
                          type="text"
                          className={layout.input}
                          value={draft.refusedFolder || ""}
                          onChange={e => patchDraft({ refusedFolder: e.target.value })}
                          placeholder={cf.refusedPlaceholder}
                        />
                        <button
                          type="button"
                          className={styles.browseBtn}
                          title={copy.common.browseFolders}
                          onClick={() => onBrowseFolders?.("refusedFolder")}
                        >
                          <Icon icon="mdi:folder-search-outline" />
                        </button>
                      </div>
                    </div>

                    <div className={layout.field}>
                      <label className={layout.label} htmlFor="collector-security">
                        {cf.securityLabel}
                      </label>
                      <select
                        id="collector-security"
                        className={layout.input}
                        value={draft.security || "tls"}
                        onChange={e => patchDraft({ security: e.target.value })}
                      >
                        <option value="tls">{copy.securityOptions?.tls || "TLS"}</option>
                        <option value="ssl">{copy.securityOptions?.ssl || "SSL"}</option>
                        <option value="none">{copy.securityOptions?.none || "None"}</option>
                      </select>
                    </div>

                    <div className={layout.field}>
                      <label className={layout.label} htmlFor="collector-port">
                        {cf.portLabel}
                      </label>
                      <input
                        id="collector-port"
                        type="text"
                        className={layout.input}
                        value={draft.port || ""}
                        onChange={e => patchDraft({ port: e.target.value })}
                        placeholder={cf.portPlaceholder}
                      />
                    </div>

                    <div className={layout.field}>
                      <label className={layout.label} htmlFor="collector-cert">
                        {cf.certLabel}
                      </label>
                      <select
                        id="collector-cert"
                        className={layout.input}
                        value={draft.validateCertMode || "no-validate-cert"}
                        onChange={e => patchDraft({ validateCertMode: e.target.value })}
                      >
                        <option value="no-validate-cert">{copy.certOptions.noValidate}</option>
                        <option value="validate-cert">{copy.certOptions.validate}</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.toggleGrid}>
                    <div className={styles.toggleCard}>
                      <span className={styles.toggleCardLabel}>{cf.autoIngestLabel}</span>
                      <Switch
                        checked={Boolean(draft.ingestEnabled)}
                        onChange={on => patchDraft({ ingestEnabled: on })}
                      />
                    </div>
                    <div className={styles.toggleCard}>
                      <div>
                        <span className={styles.toggleCardLabel}>{cf.unreadOnlyLabel}</span>
                        <p className={styles.toggleCardHint}>{cf.unreadOnlyHint}</p>
                      </div>
                      <Switch
                        checked={draft.unreadOnly !== false}
                        onChange={on => patchDraft({ unreadOnly: on })}
                      />
                    </div>
                  </div>

                  <div className={styles.rangeBlock}>
                    <label className={layout.label} htmlFor="collector-interval">
                      {cf.intervalLabel}
                    </label>
                    <input
                      id="collector-interval"
                      type="range"
                      className={styles.rangeInput}
                      min="1"
                      max="120"
                      step="1"
                      value={intervalMinutes}
                      onChange={e => patchDraft({ checkIntervalMinutes: Number(e.target.value || 5) })}
                    />
                    <div className={styles.rangeHint}>{intervalHint}</div>
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </div>

        <footer className={layout.footer}>
          <div className={styles.footerLeft}>
            <span className={layout.footerHint}>{cf.footerHint || ""}</span>
          </div>
          <div className={layout.footerActions}>
            <button
              type="button"
              className={layout.ghostBtn}
              onClick={onClose}
              disabled={saving || testing}
            >
              {copy.common.cancel}
            </button>
            <button
              type="button"
              className={layout.primaryBtn}
              onClick={onSave}
              disabled={saving || testing || !canSave}
            >
              {saving ? (
                <>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                  {copy.common.saving}
                </>
              ) : isCreate ? (
                <>
                  <Icon icon="mdi:check" aria-hidden />
                  {cf.createBtn}
                </>
              ) : (
                <>
                  <Icon icon="mdi:content-save-outline" aria-hidden />
                  {copy.common.save}
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
