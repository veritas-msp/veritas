import { useCallback, useEffect, useMemo, useState } from "react";
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
import { getDnsProvider } from "./dnsFormConfig";
import {
  extractDomainsFromModules,
  formatDomainSummary,
  isManualDomain,
  normalizeDomainItem,
  removeMonitoredDomain,
  saveMonitoredDomains
} from "./domainSolutionUtils";
import layout from "./EnterpriseFormModal.module.css";
import styles from "./DomainsConfigModal.module.css";
import SolutionProviderIcon from "./SolutionProviderIcon";
import DomainAddChoiceModal from "./DomainAddChoiceModal";
import DomainAddManualModal from "./DomainAddManualModal";
import DomainAddIntegrationModal from "./DomainAddIntegrationModal";
import {
  UiKitButton,
  UiKitModalNavSectionButton,
  uiKitLayoutsStyles as kit,
  useFinderNavIndicator
} from "../UiKit";
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
  isCommunity = false
}) {
  const locale = useAppLocale();
  const configCopy = useMemo(() => getEnterpriseConfigModalsCopy(locale), [locale]);
  const copy = useMemo(() => getDomainsModalCopy(locale), [locale]);
  const common = useCommonCopy();

  const [activeSection] = useState("inventory");
  const { trackRef: navTrackRef, indicator: navIndicator } = useFinderNavIndicator([activeSection, Boolean(client?.id)]);
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

  const domains = useMemo(() => extractDomainsFromModules(modulesData), [modulesData]);

  const navSections = useMemo(
    () => [
      {
        id: "inventory",
        label: copy.sections.inventory?.label || copy.sections.overview.label,
        icon: "mdi:format-list-bulleted"
      }
    ],
    [copy]
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

  useEffect(() => {
    if (!client?.id) return;
    if (initialOpenAddChoice || initialSection === "provider" || initialSection === "add") {
      setChoiceOpen(true);
      return;
    }
    if (initialSection === "manual" || initialProviderId === "manual") {
      setEditingDomain(null);
      setManualForm(EMPTY_MANUAL_FORM);
      setManualOpen(true);
    }
  }, [client?.id, initialOpenAddChoice, initialSection, initialProviderId]);

  const openAddChoice = () => {
    setChoiceOpen(true);
  };

  const closeChoice = () => setChoiceOpen(false);

  const openManualCreate = () => {
    setChoiceOpen(false);
    setEditingDomain(null);
    setManualForm(EMPTY_MANUAL_FORM);
    setManualOpen(true);
  };

  const openIntegration = () => {
    setChoiceOpen(false);
    setIntegrationOpen(true);
  };

  const startEditingDomain = domain => {
    const normalized = normalizeDomainItem(domain);
    if (!normalized || !isManualDomain(domain)) return;
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
  };

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
  };

  if (!client?.id) return null;

  const HeaderAnimated = SECTION_ANIMATED.inventory;
  const inventoryTitle = copy.inventory?.title || copy.overview.title;
  const inventoryDesc = copy.inventory?.description || copy.overview.description;

  return (
    <>
      {createPortal(
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
                  <p className={layout.subtitle}>{client?.name || copy.defaultClientName}</p>
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

            <div className={layout.body}>
              <aside className={`${kit.finderSidebar} ${layout.modalNav}`} aria-label={copy.navAria}>
                <nav
                  ref={navTrackRef}
                  className={`${kit.finderPrimary} ${kit.finderPrimaryAnimated} ${layout.modalNavTrack}`}
                >
                  {navIndicator.ready ? (
                    <div
                      className={kit.finderNavIndicator}
                      style={{
                        transform: `translate3d(0, ${navIndicator.top}px, 0)`,
                        height: navIndicator.height
                      }}
                      aria-hidden
                    />
                  ) : null}
                  {navSections.map(section => (
                    <UiKitModalNavSectionButton
                      key={section.id}
                      section={section}
                      active={activeSection === section.id}
                      badge={domains.length > 0 ? String(domains.length) : null}
                      onSelect={() => {}}
                      finderItemClass={kit.finderItem}
                      finderItemActiveClass={kit.finderItemActive}
                      finderItemIconClass={kit.finderItemIcon}
                      finderItemLabelClass={kit.finderItemLabel}
                      navBadgeClass={layout.navBadge}
                      navBadgeSlotClass={layout.navBadgeSlot}
                    />
                  ))}
                </nav>
              </aside>

              <div className={layout.content}>
                <div className={kit.contentFadeUp} key="inventory">
                  <div className={styles.sectionFill}>
                    <div className={`${layout.sectionHead} ${layout.sectionPinned}`}>
                      <div className={styles.sectionHeadRow}>
                        <div>
                          <h3 className={layout.sectionTitle}>{inventoryTitle}</h3>
                          <p className={layout.sectionDesc}>{inventoryDesc}</p>
                        </div>
                        <UiKitButton
                          type="button"
                          square
                          variant="primary"
                          icon="mdi:plus"
                          onClick={openAddChoice}
                          disabled={loading || saving}
                          aria-label={copy.overview?.addHostBtn || copy.empty?.addBtn || copy.addChoice?.title}
                          title={copy.overview?.addHostBtn || copy.empty?.addBtn || copy.addChoice?.title}
                        />
                      </div>
                    </div>

                    {loading ? (
                      <div className={styles.empty}>
                        <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
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
                                deleting={deletingDomainKey === (normalized?.nom || "").toLowerCase()}
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
                          <UiKitButton type="button" variant="primary" icon="mdi:plus" onClick={openAddChoice}>
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
      )}

      <DomainAddChoiceModal
        open={choiceOpen}
        copy={copy}
        onClose={closeChoice}
        onChooseManual={openManualCreate}
        onChooseIntegration={openIntegration}
      />

      <DomainAddManualModal
        open={manualOpen}
        copy={copy}
        form={manualForm}
        onChange={setManualForm}
        onClose={() => {
          if (saving) return;
          setManualOpen(false);
          setEditingDomain(null);
          setManualForm(EMPTY_MANUAL_FORM);
        }}
        onSave={handleSaveManual}
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
        onClose={() => setIntegrationOpen(false)}
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
