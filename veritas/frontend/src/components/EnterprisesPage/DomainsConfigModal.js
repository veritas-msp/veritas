import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { fetchClientModules } from "../../api/clients";
import { fetchSettings } from "../../api/settings";
import { getGlobalOvhStatus } from "../../api/clientOvh";
import { showError, showSuccess } from "../../utils/toast";
import { settingsToMap } from "../AdminPage/integrationsCatalog";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getEnterpriseConfigModalsCopy } from "./enterpriseConfigModalsI18n";
import { getDomainsModalCopy } from "./domainsConfigModalI18n";
import { interpolate } from "../../i18n/translate";
import { getDnsProvider, getDnsProviderOptions, resolveProviderGlobalConfigured } from "./dnsFormConfig";
import {
  extractDomainsFromModules,
  formatDomainSummary,
  isManualDomain,
  normalizeDomainItem,
  refreshMonitoredDomainsFromOvh,
  removeMonitoredDomain,
  saveMonitoredDomains
} from "./domainSolutionUtils";
import layout from "./EnterpriseFormModal.module.css";
import styles from "./DomainsConfigModal.module.css";
import SolutionProviderIcon from "./SolutionProviderIcon";
import DomainAddChoiceModal from "./DomainAddChoiceModal";
import DomainAddManualModal from "./DomainAddManualModal";
import DomainAddIntegrationModal from "./DomainAddIntegrationModal";
import { UiKitButton, uiKitLayoutsStyles as kit } from "../UiKit";
import EquipmentHoverIcon, { SECTION_ANIMATED } from "../EquipementPage/EquipmentHoverIcon";

const EMPTY_MANUAL_FORM = {
  nom: "",
  registrar: "",
  expiration: ""
};

function DomainRow({ domain, copy, onEdit, onDelete, deleting }) {
  const summary = formatDomainSummary(domain);
  const normalized = normalizeDomainItem(domain) || domain || {};
  const manual = isManualDomain(domain);
  const canEdit = manual;

  return (
    <article className={styles.card}>
      <button
        type="button"
        className={styles.cardMainBtn}
        onClick={() => (canEdit ? onEdit?.(domain) : undefined)}
        disabled={!canEdit}
      >
        <div className={styles.cardHead}>
          <div className={styles.cardTitleWrap}>
            <SolutionProviderIcon provider={getDnsProvider(summary.providerId)} fallbackIcon="stash:domain" />
            <strong className={styles.cardTitle}>{summary.label}</strong>
          </div>
          {manual ? (
            <span className={`${styles.statusBadge} ${styles.statusNeutral}`}>{copy.badges.manual || "Manuel"}</span>
          ) : (
            <span className={`${styles.statusBadge} ${styles.statusActive}`}>
              {summary.providerId?.toUpperCase?.() || "API"}
            </span>
          )}
        </div>
        <div className={styles.cardMeta}>
          <div>
            <span className={styles.metaLabel}>{copy.meta?.registrar || copy.manual.registrar}</span>
            <span className={styles.metaValue}>{normalized.registrar || "—"}</span>
          </div>
          <div>
            <span className={styles.metaLabel}>{copy.table.expiration}</span>
            <span className={styles.metaValue}>
              {normalized.expiration
                ? new Date(normalized.expiration).toLocaleDateString(copy.bcp47)
                : "—"}
            </span>
          </div>
          <div>
            <span className={styles.metaLabel}>{copy.table.renewal}</span>
            <span className={styles.metaValue}>
              {normalized.renewalMode
                ? copy.formatRenewalModeLabel(normalized.renewalMode)
                : normalized.autoRenew == null
                  ? "—"
                  : normalized.autoRenew
                    ? copy.renewal.automatic
                    : copy.renewal.manual}
            </span>
          </div>
        </div>
        {summary.meta ? <p className={styles.cardNotes}>{summary.meta}</p> : null}
      </button>
      <div className={styles.cardActions}>
        {canEdit ? (
          <UiKitButton
            type="button"
            square
            variant="secondary"
            icon="mdi:pencil-outline"
            onClick={() => onEdit?.(domain)}
            disabled={deleting}
            title={copy.overview.editTitle}
            aria-label={copy.formatEditAria(summary.label)}
          />
        ) : null}
        <UiKitButton
          type="button"
          square
          variant="ghost"
          className={styles.dangerSquare}
          icon="mdi:trash-can-outline"
          onClick={() => onDelete?.(domain)}
          disabled={deleting}
          title={copy.overview.removeTitle}
          aria-label={copy.formatRemoveAria(summary.label)}
        />
      </div>
    </article>
  );
}

export default function DomainsConfigModal({
  client,
  onClose,
  onSaved,
  initialSection = "inventory",
  initialProviderId = null,
  initialOpenAddChoice = false,
  initialEditDomain = null,
  isCommunity = false
}) {
  const locale = useAppLocale();
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const copy = useMemo(() => getDomainsModalCopy(locale), [locale]);
  const common = useCommonCopy();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modulesData, setModulesData] = useState(null);
  const [integrationSettings, setIntegrationSettings] = useState({});
  const [globalOvhConfigured, setGlobalOvhConfigured] = useState(false);
  const [deletingDomainKey, setDeletingDomainKey] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [integrationOpen, setIntegrationOpen] = useState(false);
  const [manualForm, setManualForm] = useState(EMPTY_MANUAL_FORM);
  const [editingDomain, setEditingDomain] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const initialAddHandledRef = useRef(false);
  const initialEditHandledRef = useRef(false);
  const addFlowOnly = Boolean(initialOpenAddChoice) && !initialEditDomain;

  const domains = useMemo(() => extractDomainsFromModules(modulesData), [modulesData]);
  const integrationAvailable = useMemo(() => {
    if (globalOvhConfigured) return true;
    return getDnsProviderOptions()
      .filter(provider => !provider.isManual)
      .some(provider =>
        resolveProviderGlobalConfigured(provider.id, integrationSettings, {
          ovh: globalOvhConfigured
        })
      );
  }, [globalOvhConfigured, integrationSettings]);
  const hasOvhDomains = useMemo(
    () => domains.some(domain => normalizeDomainItem(domain)?.providerId === "ovh"),
    [domains]
  );

  const loadData = useCallback(async () => {
    if (!client?.id) return;
    setLoading(true);
    try {
      const [modules, globalStatus, settingsList] = await Promise.all([
        fetchClientModules(client.id),
        getGlobalOvhStatus().catch(() => ({ configured: false })),
        fetchSettings().catch(() => [])
      ]);
      setModulesData(modules);
      setIntegrationSettings(settingsToMap(settingsList));
      setGlobalOvhConfigured(Boolean(globalStatus?.configured));
    } catch (error) {
      console.error(error);
      showError(copy.toasts.loadError);
    } finally {
      setLoading(false);
    }
  }, [client?.id, copy.toasts.loadError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openManualCreate = useCallback(() => {
    setChoiceOpen(false);
    setEditingDomain(null);
    setManualForm(EMPTY_MANUAL_FORM);
    setManualOpen(true);
  }, []);

  const openIntegration = useCallback(() => {
    setChoiceOpen(false);
    setIntegrationOpen(true);
  }, []);

  const openAddChoice = useCallback(() => {
    setChoiceOpen(true);
  }, []);

  const closeChoice = useCallback(() => {
    setChoiceOpen(false);
    if (addFlowOnly && !manualOpen && !integrationOpen) {
      onClose?.();
    }
  }, [addFlowOnly, manualOpen, integrationOpen, onClose]);

  useEffect(() => {
    if (!client?.id || initialAddHandledRef.current) return;
    const shouldOpenChoice =
      addFlowOnly ||
      initialOpenAddChoice ||
      initialSection === "provider" ||
      initialSection === "add";
    const shouldOpenManual = initialSection === "manual" || initialProviderId === "manual";
    if (!shouldOpenChoice && !shouldOpenManual) return;
    // Add-only: open choice immediately (no inventory shell).
    // Inventory + add: wait until load finishes so badges/settings are ready.
    if (!addFlowOnly && loading) return;
    initialAddHandledRef.current = true;
    if (shouldOpenManual) openManualCreate();
    else openAddChoice();
  }, [
    client?.id,
    loading,
    addFlowOnly,
    initialOpenAddChoice,
    initialSection,
    initialProviderId,
    openAddChoice,
    openManualCreate
  ]);

  const handleSyncDomains = async () => {
    if (!client?.id || syncing || !hasOvhDomains) return;
    setSyncing(true);
    try {
      await refreshMonitoredDomainsFromOvh(client.id);
      showSuccess(copy.toasts?.synced || "Noms de domaine synchronisés");
      await loadData();
      await onSaved?.();
    } catch (error) {
      showError(error?.message || copy.toasts?.syncError || "Échec de la synchronisation");
    } finally {
      setSyncing(false);
    }
  };

  const startEditingDomain = useCallback(domain => {
    const normalized = normalizeDomainItem(domain);
    if (!normalized || !isManualDomain(domain)) return false;
    setEditingDomain(normalized);
    setManualForm({
      nom: normalized.nom || "",
      registrar:
        normalized.registrar && normalized.registrar !== copy.manualProvider.label
          ? normalized.registrar
          : "",
      expiration: normalized.expiration ? String(normalized.expiration).slice(0, 10) : ""
    });
    setManualOpen(true);
    return true;
  }, [copy.manualProvider.label]);

  useEffect(() => {
    if (!client?.id || loading || !initialEditDomain || initialEditHandledRef.current) return;
    initialEditHandledRef.current = true;
    const match =
      domains.find(entry => {
        const a = normalizeDomainItem(entry);
        const b = normalizeDomainItem(initialEditDomain);
        if (!a || !b) return false;
        if (a.id != null && b.id != null && String(a.id) === String(b.id)) return true;
        return String(a.nom || "").trim().toLowerCase() === String(b.nom || "").trim().toLowerCase();
      }) || initialEditDomain;
    if (isManualDomain(match)) {
      startEditingDomain(match);
      return;
    }
    setDeleteTarget(null);
  }, [client?.id, domains, initialEditDomain, loading, startEditingDomain]);

  const handleSaveManual = async () => {
    const nom = manualForm.nom.trim();
    if (!nom) {
      showError(copy.toasts.domainNameRequired || copy.toasts.domainNotFound);
      return;
    }
    const duplicate = domains.some(
      entry =>
        (entry.nom || "").trim().toLowerCase() === nom.toLowerCase() &&
        (!editingDomain ||
          (entry.nom || "").trim().toLowerCase() !== (editingDomain.nom || "").trim().toLowerCase())
    );
    if (duplicate) {
      showError(copy.toasts.domainDuplicate || copy.toasts.importError);
      return;
    }
    setSaving(true);
    try {
      const newDomain = normalizeDomainItem({
        ...(editingDomain || {}),
        providerId: "manual",
        isManual: true,
        nom,
        registrar: manualForm.registrar.trim() || copy.manualProvider.label,
        expiration: manualForm.expiration || ""
      });
      const nextDomains = editingDomain
        ? domains.map(entry =>
            (entry.nom || "").trim().toLowerCase() === (editingDomain.nom || "").trim().toLowerCase()
              ? { ...entry, ...newDomain, nom: newDomain.nom }
              : entry
          )
        : [...domains, newDomain];
      await saveMonitoredDomains(client.id, nextDomains);
      showSuccess(copy.toasts.manualSaved);
      setManualForm(EMPTY_MANUAL_FORM);
      setEditingDomain(null);
      setManualOpen(false);
      await loadData();
      await onSaved?.();
      if (addFlowOnly) onClose?.();
    } catch (error) {
      showError(error.message || copy.toasts.importError);
    } finally {
      setSaving(false);
    }
  };

  const requestRemoveDomain = domain => setDeleteTarget(domain);

  const confirmRemoveDomain = async () => {
    if (!deleteTarget || !client?.id) return;
    const domain = deleteTarget;
    const key = (domain.nom || "").toLowerCase();
    setDeletingDomainKey(key);
    try {
      await removeMonitoredDomain(client.id, domain);
      showSuccess(copy.toasts.removed);
      setDeleteTarget(null);
      await loadData();
      await onSaved?.();
    } catch (error) {
      showError(error.message || copy.toasts.deleteError);
    } finally {
      setDeletingDomainKey(null);
    }
  };

  const handleIntegrationSaved = async () => {
    await loadData();
    await onSaved?.();
    if (addFlowOnly) {
      setIntegrationOpen(false);
      onClose?.();
    }
  };

  if (!client?.id) return null;

  const HeaderAnimated = SECTION_ANIMATED.inventory;
  const inventoryTitle = copy.inventory?.title || copy.overview.title;

  const closeManual = () => {
    if (saving) return;
    setManualOpen(false);
    setEditingDomain(null);
    setManualForm(EMPTY_MANUAL_FORM);
    if (addFlowOnly) onClose?.();
  };

  const closeIntegration = () => {
    setIntegrationOpen(false);
    if (addFlowOnly) onClose?.();
  };

  return (
    <>
      {!addFlowOnly
        ? createPortal(
            <div className={layout.overlay} onClick={saving ? undefined : onClose} role="presentation">
              <div
                className={layout.shell}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="domains-config-title"
              >
                <div className={layout.accentBar} aria-hidden />

                <header className={layout.header}>
                  <div className={layout.headerMain}>
                    <div className={`${layout.headerIconWrap} ${styles.headerIconDns}`} aria-hidden>
                      <EquipmentHoverIcon Animated={HeaderAnimated} iconify="stash:domain" size={22} />
                    </div>
                    <div className={layout.headerText}>
                      <p className={layout.eyebrow}>{copy.eyebrow}</p>
                      <h2 id="domains-config-title" className={layout.title}>
                        {copy.title}
                      </h2>
                    </div>
                  </div>
                  <UiKitButton
                    type="button"
                    square
                    variant="secondary"
                    className={layout.closeBtn}
                    onClick={onClose}
                    disabled={saving}
                    aria-label={common.close}
                    icon="mdi:close"
                  />
                </header>

                <div className={layout.bodySingle}>
                  <div className={layout.content}>
                    <div className={kit.contentFadeUp} key="inventory">
                      <div className={styles.sectionFill}>
                        <div className={`${layout.sectionHead} ${layout.sectionPinned}`}>
                          <div className={styles.sectionHeadRow}>
                            <div>
                              <h3 className={layout.sectionTitle}>{inventoryTitle}</h3>
                            </div>
                            <div className={styles.sectionHeadActions}>
                              <UiKitButton
                                type="button"
                                square
                                variant="secondary"
                                icon={syncing ? "mdi:loading" : "mdi:sync"}
                                onClick={handleSyncDomains}
                                disabled={loading || saving || syncing || !hasOvhDomains}
                                aria-label={
                                  syncing
                                    ? copy.overview?.syncBusy || "Synchronisation…"
                                    : hasOvhDomains
                                      ? copy.overview?.syncBtn || "Synchroniser les domaines OVH"
                                      : copy.overview?.syncEmpty || "Aucun domaine OVH à synchroniser"
                                }
                                title={
                                  syncing
                                    ? copy.overview?.syncBusy || "Synchronisation…"
                                    : hasOvhDomains
                                      ? copy.overview?.syncBtn || "Synchroniser les domaines OVH"
                                      : copy.overview?.syncEmpty || "Aucun domaine OVH à synchroniser"
                                }
                              />
                              <UiKitButton
                                type="button"
                                square
                                variant="primary"
                                icon="mdi:plus"
                                onClick={openAddChoice}
                                disabled={loading || saving || syncing}
                                aria-label={
                                  copy.overview?.addHostBtn || copy.empty?.addBtn || copy.addChoice?.title
                                }
                                title={
                                  copy.overview?.addHostBtn || copy.empty?.addBtn || copy.addChoice?.title
                                }
                              />
                            </div>
                          </div>
                        </div>

                        {loading ? (
                          <div
                            className={`${styles.empty} ${styles.emptyLoading}`}
                            role="status"
                            aria-live="polite"
                          >
                            <span className={styles.emptyLoadingIcon} aria-hidden>
                              <Icon icon="mdi:loading" className={layout.spinning} />
                            </span>
                            <p className={styles.emptyTitle}>{copy.loading}</p>
                          </div>
                        ) : domains.length > 0 ? (
                          <>
                            <div className={styles.listToolbar}>
                              <p className={styles.listCount}>{copy.formatMonitoredCount(domains.length)}</p>
                            </div>
                            <div className={styles.list}>
                              {domains.map((domain, index) => {
                                const normalized = normalizeDomainItem(domain);
                                const key = `${normalized?.nom || "domain"}-${index}`;
                                return (
                                  <DomainRow
                                    key={key}
                                    domain={domain}
                                    copy={copy}
                                    onEdit={startEditingDomain}
                                    onDelete={requestRemoveDomain}
                                    deleting={
                                      deletingDomainKey === (normalized?.nom || "").toLowerCase()
                                    }
                                  />
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <div className={styles.empty}>
                            <Icon icon="stash:domain" className={styles.emptyIcon} aria-hidden />
                            <p className={styles.emptyTitle}>{copy.overview.empty}</p>
                            <p className={styles.emptyHint}>
                              {copy.empty?.noneHint || copy.addChoice?.description}
                            </p>
                            <div className={styles.emptyAction}>
                              <UiKitButton
                                type="button"
                                variant="primary"
                                icon="mdi:plus"
                                onClick={openAddChoice}
                              >
                                {copy.empty?.addBtn || copy.addChoice?.title || "Ajouter"}
                              </UiKitButton>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <footer className={layout.footer}>
                  <span className={layout.footerHint}>
                    {domains.length > 0 ? copy.formatMonitoredCount(domains.length) : ""}
                  </span>
                  <div className={layout.footerActions} />
                </footer>
              </div>
            </div>,
            document.getElementById("modal-root") || document.body
          )
        : null}

      <DomainAddChoiceModal
        open={choiceOpen}
        copy={copy}
        onClose={closeChoice}
        onChooseManual={openManualCreate}
        onChooseIntegration={openIntegration}
        integrationAvailable={integrationAvailable}
      />

      <DomainAddManualModal
        open={manualOpen}
        copy={copy}
        form={manualForm}
        onChange={setManualForm}
        onClose={closeManual}
        onSave={handleSaveManual}
        onDelete={
          editingDomain
            ? () => {
                setManualOpen(false);
                setDeleteTarget(editingDomain);
              }
            : undefined
        }
        saving={saving}
        isEditing={Boolean(editingDomain)}
      />

      <DomainAddIntegrationModal
        open={integrationOpen}
        copy={copy}
        client={client}
        domains={domains}
        integrationSettings={integrationSettings}
        globalOvhConfigured={globalOvhConfigured}
        isCommunity={isCommunity}
        onClose={closeIntegration}
        onSaved={handleIntegrationSaved}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title={configCopy.confirm.removeMonitoring.title}
        message={
          deleteTarget
            ? interpolate(configCopy.confirm.removeMonitoring.message, {
                label: formatDomainSummary(deleteTarget).label
              })
            : ""
        }
        confirmLabel={common.remove}
        variant="danger"
        icon="mdi:delete-outline"
        loading={Boolean(deletingDomainKey)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmRemoveDomain}
      />
    </>
  );
}
