import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { fetchOvhDomains } from "../../api/clientOvh";
import { getIconPath } from "../../utils/assetHelper";
import { integrationIconStyle, isIntegrationProLocked } from "../AdminPage/integrationsCatalog";
import { notifyProFeature } from "../Misc/ProFeature/proFeatureUtils";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { showError, showSuccess } from "../../utils/toast";
import { UiKitButton } from "../UiKit";
import { getDnsProvider, getDnsProviderOptions, resolveProviderGlobalConfigured } from "./dnsFormConfig";
import { importOvhDomainsForClient, mapOvhApiDomainToMonitored } from "./domainSolutionUtils";
import OvhApiGuide from "./integrationGuides/OvhApiGuide";
import layout from "./EnterpriseFormModal.module.css";
import avStyles from "./AntivirusConfigModal.module.css";
import styles from "./DomainsConfigModal.module.css";

export default function DomainAddIntegrationModal({
  open,
  copy,
  client,
  domains,
  integrationSettings,
  globalOvhConfigured,
  isCommunity,
  onClose,
  onSaved
}) {
  const common = useCommonCopy();
  const [step, setStep] = useState("provider");
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [ovhDomains, setOvhDomains] = useState([]);
  const [loadingOvhDomains, setLoadingOvhDomains] = useState(false);
  const [selectedOvhDomains, setSelectedOvhDomains] = useState(new Set());
  const [ovhSearch, setOvhSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const dnsProviders = useMemo(
    () => getDnsProviderOptions().filter(provider => !provider.isManual),
    []
  );
  const selectedProvider = useMemo(() => getDnsProvider(selectedProviderId), [selectedProviderId]);
  const linkedDomainKeys = useMemo(
    () => new Set(domains.map(d => (d.nom || "").toLowerCase()).filter(Boolean)),
    [domains]
  );
  const filteredOvhDomains = useMemo(() => {
    const q = ovhSearch.trim().toLowerCase();
    if (!q) return ovhDomains;
    return ovhDomains.filter(domain => {
      const name = (domain.domain || domain.name || domain.nom || "").toLowerCase();
      return name.includes(q);
    });
  }, [ovhDomains, ovhSearch]);
  const selectableOvhDomains = useMemo(
    () =>
      filteredOvhDomains.filter(domain => {
        const name = (domain.domain || domain.name || domain.nom || "").toLowerCase();
        return name && !linkedDomainKeys.has(name);
      }),
    [filteredOvhDomains, linkedDomainKeys]
  );

  useEffect(() => {
    if (!open) {
      setStep("provider");
      setSelectedProviderId(null);
      setOvhDomains([]);
      setSelectedOvhDomains(new Set());
      setOvhSearch("");
      setSaving(false);
    }
  }, [open]);

  const loadOvhDomains = useCallback(
    async ({ refresh = false } = {}) => {
      setLoadingOvhDomains(true);
      if (refresh) {
        setOvhDomains([]);
        setSelectedOvhDomains(new Set());
      }
      try {
        const data = await fetchOvhDomains({ light: true, refresh });
        setOvhDomains(Array.isArray(data.domains) ? data.domains : []);
      } catch (error) {
        showError(error.message || copy.toasts.ovhLoadError);
        setOvhDomains([]);
      } finally {
        setLoadingOvhDomains(false);
      }
    },
    [copy.toasts.ovhLoadError]
  );

  useEffect(() => {
    if (!open || step !== "import" || selectedProviderId !== "ovh" || !globalOvhConfigured) return;
    loadOvhDomains();
  }, [open, step, selectedProviderId, globalOvhConfigured, loadOvhDomains]);

  if (!open) return null;

  const handleSelectProvider = provider => {
    if (provider.status === "comingSoon") {
      showError(copy.formatComingSoon(provider.label));
      return;
    }
    if (isIntegrationProLocked(provider.catalogIntegration, isCommunity)) {
      notifyProFeature(provider.label || copy.proFallback);
      return;
    }
    setSelectedProviderId(provider.id);
    if (provider.id === "ovh" && globalOvhConfigured) {
      setStep("import");
      return;
    }
    if (provider.id === "ovh" && !globalOvhConfigured) {
      setStep("guide");
    }
  };

  const toggleOvhDomainSelection = domainName => {
    setSelectedOvhDomains(prev => {
      const next = new Set(prev);
      if (next.has(domainName)) next.delete(domainName);
      else next.add(domainName);
      return next;
    });
  };

  const handleImport = async () => {
    if (!client?.id || selectedOvhDomains.size === 0) return;
    setSaving(true);
    try {
      const selected = ovhDomains.filter(domain => {
        const name = domain.domain || domain.name || domain.nom;
        return selectedOvhDomains.has(name);
      });
      await importOvhDomainsForClient(client.id, selected, domains);
      showSuccess(copy.formatImportSuccess(selected.length));
      await onSaved?.();
      onClose();
    } catch (error) {
      showError(error.message || copy.toasts.importError);
    } finally {
      setSaving(false);
    }
  };

  const title =
    step === "import"
      ? copy.import.title
      : step === "guide"
        ? copy.provider.guideTitle
        : copy.provider.title;
  const description =
    step === "import"
      ? copy.import.description
      : step === "guide"
        ? copy.provider.guideDesc
        : copy.provider.description;

  return createPortal(
    <div className={`${layout.overlay} ${layout.overlayStacked}`} onClick={saving ? undefined : onClose} role="presentation">
      <div
        className={`${layout.shell} ${styles.configShellWide}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="domain-integration-title"
      >
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={`${layout.headerIconWrap} ${styles.headerIconDns}`} aria-hidden>
              <Icon icon="mdi:cloud-sync-outline" />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{copy.eyebrow}</p>
              <h2 id="domain-integration-title" className={layout.title}>
                {title}
              </h2>
              <p className={layout.subtitle}>{description}</p>
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

        <div className={layout.content}>
          {step === "provider" ? (
            <>
              <div className={avStyles.providerList}>
                {dnsProviders.map(provider => {
                  const isSelected = selectedProviderId === provider.id;
                  const isComingSoon = provider.status === "comingSoon";
                  const proLocked = isIntegrationProLocked(provider.catalogIntegration, isCommunity);
                  const globalAvailable = resolveProviderGlobalConfigured(provider.id, integrationSettings, {
                    ovh: globalOvhConfigured
                  });
                  return (
                    <button
                      key={provider.id}
                      type="button"
                      className={`${avStyles.providerCard} ${isSelected ? avStyles.providerCardSelected : ""} ${isComingSoon || proLocked ? avStyles.providerCardDisabled : ""}`}
                      onClick={() => handleSelectProvider(provider)}
                      disabled={isComingSoon}
                      title={provider.description}
                    >
                      <span className={avStyles.providerCardIcon} style={integrationIconStyle(provider.iconColor)} aria-hidden>
                        {provider.image ? <img src={getIconPath(provider.image)} alt="" /> : <Icon icon={provider.icon} />}
                      </span>
                      <span className={avStyles.providerCardLabel}>{provider.label}</span>
                      {isComingSoon || proLocked || globalAvailable ? (
                        <span className={avStyles.providerCardBadges}>
                          {isComingSoon ? <span className={avStyles.providerBadgeSoon}>{copy.badges.soon}</span> : null}
                          {proLocked ? <span className={avStyles.providerBadgeSoon}>{copy.badges.pro}</span> : null}
                          {globalAvailable ? <span className={avStyles.providerBadgeGlobal}>{copy.badges.global}</span> : null}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {selectedProviderId === "ovh" ? (
                <>
                  <div className={layout.contentDivider} />
                  <div className={layout.sectionHead}>
                    <h3 className={layout.sectionTitle}>
                      {copy.formatConnectionTitle(selectedProvider?.label || "OVH")}
                    </h3>
                    <p className={layout.sectionDesc}>
                      {globalOvhConfigured ? copy.provider.globalDetected : copy.provider.globalNotActive}
                    </p>
                  </div>
                  <div className={avStyles.modeGrid}>
                    <button
                      type="button"
                      className={`${avStyles.modeCard} ${!globalOvhConfigured ? avStyles.modeCardDisabled : ""}`}
                      onClick={() => {
                        if (!globalOvhConfigured) return;
                        setStep("import");
                      }}
                      disabled={!globalOvhConfigured}
                    >
                      <span className={avStyles.modeCardIcon} aria-hidden>
                        <Icon icon="mdi:store-cog-outline" />
                      </span>
                      <span className={avStyles.modeCardTitle}>{copy.provider.globalAccountTitle}</span>
                      <span className={avStyles.modeCardDesc}>
                        {globalOvhConfigured
                          ? copy.provider.globalAccountDescActive
                          : copy.provider.globalAccountDescInactive}
                      </span>
                      <span className={avStyles.modeCardAction}>
                        {globalOvhConfigured ? copy.provider.importAction : copy.provider.activateInAdmin}
                        <Icon icon="mdi:chevron-right" aria-hidden />
                      </span>
                    </button>
                    {!globalOvhConfigured ? (
                      <button type="button" className={avStyles.modeCard} onClick={() => setStep("guide")}>
                        <span className={avStyles.modeCardIcon} aria-hidden>
                          <Icon icon="mdi:book-open-outline" />
                        </span>
                        <span className={avStyles.modeCardTitle}>{copy.provider.guideTitle}</span>
                        <span className={avStyles.modeCardDesc}>{copy.provider.guideDesc}</span>
                        <span className={avStyles.modeCardAction}>
                          {copy.provider.consult}
                          <Icon icon="mdi:chevron-right" aria-hidden />
                        </span>
                      </button>
                    ) : null}
                  </div>
                </>
              ) : null}
            </>
          ) : null}

          {step === "guide" ? <OvhApiGuide /> : null}

          {step === "import" ? (
            <>
              <p className={styles.importHint}>{copy.import.hint}</p>
              <div className={styles.importToolbar}>
                <div className={styles.importSearchWrap}>
                  <input
                    id="ovh-domain-search"
                    className={layout.input}
                    value={ovhSearch}
                    onChange={e => setOvhSearch(e.target.value)}
                    placeholder={copy.import.searchPlaceholder}
                    disabled={loadingOvhDomains}
                  />
                </div>
                <div className={styles.importToolbarActions}>
                  <UiKitButton
                    type="button"
                    variant="secondary"
                    icon={loadingOvhDomains ? "mdi:loading" : "mdi:refresh"}
                    onClick={() => loadOvhDomains({ refresh: true })}
                    disabled={loadingOvhDomains || saving}
                  >
                    {copy.import.refresh}
                  </UiKitButton>
                  <UiKitButton
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setSelectedOvhDomains(new Set(selectableOvhDomains.map(d => d.domain || d.name || d.nom)))
                    }
                    disabled={loadingOvhDomains || selectableOvhDomains.length === 0}
                  >
                    {copy.import.selectAll}
                  </UiKitButton>
                  <UiKitButton
                    type="button"
                    variant="ghost"
                    onClick={() => setSelectedOvhDomains(new Set())}
                    disabled={loadingOvhDomains || selectedOvhDomains.size === 0}
                  >
                    {copy.import.clear}
                  </UiKitButton>
                </div>
              </div>

              {loadingOvhDomains ? (
                <div className={avStyles.emptyState}>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden /> {copy.import.loading}
                </div>
              ) : filteredOvhDomains.length === 0 ? (
                <div className={avStyles.emptyState}>{copy.import.empty}</div>
              ) : (
                <div className={styles.importTableWrap}>
                  <table className={styles.importTable}>
                    <thead>
                      <tr>
                        <th scope="col" style={{ width: "2.5rem" }} aria-label={copy.table.selectionAria} />
                        <th scope="col">{copy.table.domain}</th>
                        <th scope="col">{copy.table.expiration}</th>
                        <th scope="col">{copy.table.renewal}</th>
                        <th scope="col">{copy.table.state}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOvhDomains.map(domain => {
                        const mapped = mapOvhApiDomainToMonitored(domain);
                        const domainName = mapped.nom;
                        const isSelected = selectedOvhDomains.has(domainName);
                        const alreadyLinked = linkedDomainKeys.has(domainName.toLowerCase());
                        return (
                          <tr
                            key={domainName}
                            className={`${styles.importTableRow} ${isSelected ? styles.importTableRowSelected : ""} ${alreadyLinked ? styles.importTableRowDisabled : ""}`}
                            onClick={() => !alreadyLinked && toggleOvhDomainSelection(domainName)}
                          >
                            <td>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={alreadyLinked}
                                onChange={() => toggleOvhDomainSelection(domainName)}
                                onClick={e => e.stopPropagation()}
                                aria-label={copy.formatSelectAria(domainName)}
                              />
                            </td>
                            <td>
                              <div className={styles.importDomainName}>{domainName}</div>
                            </td>
                            <td>
                              {mapped.expiration
                                ? new Date(mapped.expiration).toLocaleDateString(copy.bcp47)
                                : copy.emDash}
                            </td>
                            <td>
                              {mapped.autoRenew == null
                                ? copy.emDash
                                : mapped.autoRenew
                                  ? copy.renewal.automatic
                                  : copy.renewal.manual}
                            </td>
                            <td>
                              {alreadyLinked ? (
                                <span className={styles.domainBadge}>{copy.badges.alreadyLinked}</span>
                              ) : isSelected ? (
                                <span className={`${styles.domainBadge} ${styles.domainBadgeOk}`}>
                                  {copy.badges.selected}
                                </span>
                              ) : mapped.hasDnsZone ? (
                                <span className={`${styles.domainBadge} ${styles.domainBadgeOk}`}>
                                  {copy.badges.dnsZone}
                                </span>
                              ) : (
                                <span className={styles.domainBadge}>{copy.badges.available}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {ovhDomains.length > 0 ? (
                <p className={styles.importSelectionSummary}>
                  {copy.formatImportSummary(ovhDomains.length, selectedOvhDomains.size)}
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>
            {selectedProvider ? copy.formatRegistrarFooter(selectedProvider.label) : ""}
          </span>
          <div className={layout.footerActions}>
            {step !== "provider" ? (
              <UiKitButton
                type="button"
                variant="secondary"
                onClick={() => setStep("provider")}
                disabled={saving}
              >
                {copy.actions.back}
              </UiKitButton>
            ) : (
              <UiKitButton type="button" variant="secondary" onClick={onClose} disabled={saving}>
                {common.cancel}
              </UiKitButton>
            )}
            {step === "import" ? (
              <UiKitButton
                type="button"
                variant="primary"
                onClick={handleImport}
                disabled={saving || selectedOvhDomains.size === 0 || loadingOvhDomains}
                icon={saving ? "mdi:loading" : "mdi:download"}
              >
                {saving ? copy.actions.attaching : copy.formatAttachAction(selectedOvhDomains.size)}
              </UiKitButton>
            ) : null}
          </div>
        </footer>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
