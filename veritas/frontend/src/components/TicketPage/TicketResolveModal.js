import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import exclusionStyles from "./TicketExclusionModal.module.css";
import modalStyles from "./TicketResolveModal.module.css";
import SuggestionAutocomplete from "../shared/SuggestionAutocomplete/SuggestionAutocomplete";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import { fetchSolutionCatalog } from "../../api/tickets";
import { interpolate } from "../../i18n/translate";
import { getCanonicalSolutionCatalogLabel, localizeSolutionCatalogOptions } from "./solutionCatalogI18n";
import { buildSupportCreditDebitsPayload, getTotalResolveCreditDebit, getUsableSupportCreditPacks } from "./ticketClientSummaryUtils";
const SECTION_ORDER = ["solution", "credits"];
function clampCreditAmount(value, max = 999) {
  const parsed = Math.floor(Number(value) || 0);
  if (parsed < 0) return 0;
  if (Number.isFinite(max) && max >= 0) return Math.min(parsed, max);
  return parsed;
}
export default function TicketResolveModal({
  open,
  ticket,
  copy,
  locale = "fr",
  saving = false,
  creditEnabled = false,
  onCreditEnabledChange,
  creditAmounts = {},
  onCreditAmountsChange,
  creditsProLocked = false,
  onCreditsProClick,
  supportCredit = null,
  supportCreditBalance = 0,
  hasPendingReply = false,
  onClose,
  onConfirm
}) {
  const [reason, setReason] = useState("");
  const [interventionType, setInterventionType] = useState("");
  const [actionType, setActionType] = useState("");
  const [interventionOptions, setInterventionOptions] = useState([]);
  const [actionOptions, setActionOptions] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [activeSection, setActiveSection] = useState("solution");
  const [perPackAmount, setPerPackAmount] = useState(1);
  const localizedInterventionOptions = useMemo(() => localizeSolutionCatalogOptions(interventionOptions, locale), [interventionOptions, locale]);
  const localizedActionOptions = useMemo(() => localizeSolutionCatalogOptions(actionOptions, locale), [actionOptions, locale]);
  const visibleSections = useMemo(() => {
    return SECTION_ORDER.map(id => ({
      id,
      ...copy.sections?.[id]
    })).filter(section => section.label);
  }, [copy.sections]);
  const usablePacks = useMemo(() => getUsableSupportCreditPacks(supportCredit?.packs), [supportCredit?.packs]);
  const creditBalance = Number(supportCreditBalance || 0);
  const creditEligible = supportCredit?.eligible === true;
  const creditConsumed = supportCredit?.consumed === true;
  const totalDebited = Number(supportCredit?.totalDebited || 0);
  const canConfigureCredits = creditEligible && !creditConsumed && !creditsProLocked && (usablePacks.length > 0 || creditBalance > 0);
  const plannedDebitTotal = useMemo(() => creditEnabled ? getTotalResolveCreditDebit(creditAmounts, supportCredit?.packs) : 0, [creditEnabled, creditAmounts, supportCredit?.packs]);
  const handleSectionClick = sectionId => {
    if (sectionId === "credits" && creditsProLocked) {
      onCreditsProClick?.();
      return;
    }
    setActiveSection(sectionId);
  };
  const solutionIncomplete = !reason.trim() || !interventionType.trim() || !actionType.trim();
  useEffect(() => {
    if (!open) return;
    setReason("");
    setInterventionType("");
    setActionType("");
    setActiveSection("solution");
    setPerPackAmount(1);
  }, [open]);
  useEffect(() => {
    if (!visibleSections.some(section => section.id === activeSection)) {
      setActiveSection(visibleSections[0]?.id || "solution");
    }
  }, [visibleSections, activeSection]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadCatalog = async () => {
      setLoadingCatalog(true);
      try {
        const [interventions, actions] = await Promise.all([fetchSolutionCatalog({
          category: "intervention"
        }), fetchSolutionCatalog({
          category: "action"
        })]);
        if (cancelled) return;
        setInterventionOptions(Array.isArray(interventions) ? interventions : []);
        setActionOptions(Array.isArray(actions) ? actions : []);
      } catch {
        if (!cancelled) {
          setInterventionOptions([]);
          setActionOptions([]);
        }
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    };
    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = event => {
      if (event.key === "Escape" && !saving) onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, saving, onClose]);
  const applyPerPackAmount = nextValue => {
    const amount = clampCreditAmount(nextValue);
    setPerPackAmount(amount);
    if (usablePacks.length === 0) {
      onCreditAmountsChange?.({
        __legacy: amount
      });
      return;
    }
    const nextAmounts = {};
    usablePacks.forEach(pack => {
      nextAmounts[pack.id] = Math.min(amount, Number(pack.remaining_amount) || 0);
    });
    onCreditAmountsChange?.(nextAmounts);
  };
  const updatePackAmount = (packId, value, maxRemaining) => {
    onCreditAmountsChange?.({
      ...creditAmounts,
      [packId]: clampCreditAmount(value, maxRemaining)
    });
  };
  const handleSubmit = event => {
    event.preventDefault();
    if (!canSubmit) return;
    const supportCreditDebits = creditEnabled ? buildSupportCreditDebitsPayload(creditAmounts, supportCredit?.packs) : [];
    onConfirm?.({
      reason: reason.trim(),
      interventionType: getCanonicalSolutionCatalogLabel(interventionType.trim()),
      actionType: getCanonicalSolutionCatalogLabel(actionType.trim()),
      consumeSupportCredit: supportCreditDebits.length > 0,
      supportCreditDebits
    });
  };
  if (!open || !ticket || !copy) return null;
  const ticketNumber = ticket.ticket_number || ticket.id || "-";
  const ticketTitle = ticket.title || copy.untitledTicket;
  const canSubmit = Boolean(reason.trim()) && Boolean(interventionType.trim()) && Boolean(actionType.trim()) && !saving;
  const creditAvailableLabel = creditBalance === 1 ? interpolate(copy.creditAvailable, {
    count: creditBalance
  }) : interpolate(copy.creditAvailablePlural, {
    count: creditBalance
  });
  const creditConsumedLabel = interpolate(copy.creditConsumed, {
    count: totalDebited > 0 ? totalDebited : 1
  });
  const activeMeta = visibleSections.find(section => section.id === activeSection);
  return createPortal(<div className={layout.overlay} onClick={saving ? undefined : onClose} role="presentation">
      <div className={`${layout.shell} ${modalStyles.shell}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ticket-resolve-modal-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon="mdi:check-circle-outline" />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{copy.eyebrow}</p>
              <h2 className={layout.title} id="ticket-resolve-modal-title">
                {copy.title}
              </h2>
              <p className={layout.subtitle}>{copy.subtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.closeAria}>
            <FaTimes />
          </button>
        </header>

        <form className={modalStyles.form} onSubmit={handleSubmit}>
          <div className={layout.body}>
            <nav className={layout.nav} aria-label={copy.navAria}>
              {visibleSections.map(section => {
              const isCreditsLocked = section.id === "credits" && creditsProLocked;
              return <button key={section.id} type="button" className={`${layout.navItem} ${activeSection === section.id && !isCreditsLocked ? layout.navItemActive : ""} ${isCreditsLocked ? modalStyles.navItemProLocked : ""}`} onClick={() => handleSectionClick(section.id)} aria-current={activeSection === section.id && !isCreditsLocked ? "step" : undefined} aria-disabled={isCreditsLocked || undefined}>
                    <Icon icon={section.icon || "mdi:circle-outline"} className={layout.navItemIcon} aria-hidden />
                    <span className={layout.navItemText}>
                      <span className={modalStyles.navItemLabelRow}>
                        <span className={`${layout.navItemLabel} ${section.id === "solution" && solutionIncomplete ? layout.navItemLabelRequired : ""}`}>
                          {section.label}
                        </span>
                        {isCreditsLocked ? <ProFeatureBadge variant="inline" className={modalStyles.navItemProBadge} /> : null}
                      </span>
                      <span className={layout.navItemHint}>{section.description}</span>
                    </span>
                  </button>;
            })}
            </nav>

            <div className={`${layout.content} ${modalStyles.content}`}>
              <div className={exclusionStyles.ticketContextCard}>
                <div className={exclusionStyles.ticketContextIcon} aria-hidden>
                  <Icon icon="mdi:ticket-confirmation-outline" />
                </div>
                <div className={exclusionStyles.ticketContextText}>
                  <div className={exclusionStyles.ticketContextLabel}>{copy.ticketLabel}</div>
                  <div className={exclusionStyles.ticketContextTitle}>
                    #{ticketNumber} · {ticketTitle}
                  </div>
                </div>
              </div>

              {hasPendingReply ? <div className={modalStyles.pendingReplyBanner}>
                  <Icon icon="mdi:message-reply-text-outline" aria-hidden />
                  <span>{copy.pendingReplyHint}</span>
                </div> : null}

              <div className={layout.sectionHead}>
                <h3 className={layout.sectionTitle}>{activeMeta?.label}</h3>
                <p className={layout.sectionDesc}>{activeMeta?.description}</p>
              </div>

              {activeSection === "solution" ? <>
                  <div className={modalStyles.infoBanner}>
                    <Icon icon="mdi:information-outline" aria-hidden />
                    <span>{copy.infoBanner}</span>
                  </div>

                  <div className={modalStyles.catalogGrid}>
                    <SuggestionAutocomplete id="ticket-resolve-intervention" label={copy.interventionLabel} required placeholder={copy.interventionPlaceholder} value={interventionType} options={localizedInterventionOptions} disabled={saving || loadingCatalog} onChange={setInterventionType} emptyMessage={loadingCatalog ? copy.loading : copy.interventionEmpty} />
                    <SuggestionAutocomplete id="ticket-resolve-action" label={copy.actionLabel} required placeholder={copy.actionPlaceholder} value={actionType} options={localizedActionOptions} disabled={saving || loadingCatalog} onChange={setActionType} emptyMessage={loadingCatalog ? copy.loading : copy.actionEmpty} />
                  </div>

                  <div className={layout.field}>
                    <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="ticket-resolve-reason">
                      {copy.reasonLabel}
                    </label>
                    <textarea id="ticket-resolve-reason" className={layout.input} value={reason} onChange={e => setReason(e.target.value)} placeholder={copy.reasonPlaceholder} rows={5} maxLength={4000} disabled={saving} style={{
                  resize: "vertical",
                  minHeight: "6.5rem"
                }} />
                  </div>
                </> : null}

              {activeSection === "credits" && !creditsProLocked ? <div className={modalStyles.creditPanel}>
                  <div className={modalStyles.creditBalanceRow}>
                    <Icon icon="mdi:ticket-confirmation-outline" aria-hidden />
                    <span>
                      {creditConsumed ? creditConsumedLabel : creditBalance > 0 ? creditAvailableLabel : copy.noCreditHint}
                    </span>
                  </div>

                  {canConfigureCredits ? <>
                      <label className={modalStyles.creditOption}>
                        <input type="checkbox" checked={creditEnabled} onChange={e => onCreditEnabledChange?.(e.target.checked)} disabled={saving} />
                        <span>{usablePacks.length > 0 ? copy.consumeCredit : copy.consumeCreditLegacy}</span>
                      </label>

                      {creditEnabled ? <>
                          <div className={modalStyles.creditBulkRow}>
                            <div className={modalStyles.creditBulkText}>
                              <span className={modalStyles.creditBulkLabel}>{copy.creditPerPackLabel}</span>
                              <span className={modalStyles.creditBulkHint}>{copy.creditPerPackHint}</span>
                            </div>
                            <input type="number" className={modalStyles.creditAmountInput} min={0} max={999} value={perPackAmount} onChange={e => applyPerPackAmount(e.target.value)} disabled={saving} aria-label={copy.creditPerPackLabel} />
                          </div>

                          {usablePacks.length > 0 ? <div className={modalStyles.creditPackList}>
                              {usablePacks.map(pack => {
                      const packId = pack.id;
                      const remaining = Number(pack.remaining_amount) || 0;
                      const label = pack.label || `Carnet #${String(packId).slice(0, 8)}`;
                      return <div key={packId} className={modalStyles.creditPackRow}>
                                    <div className={modalStyles.creditPackMeta}>
                                      <span className={modalStyles.creditPackLabel}>{label}</span>
                                      <span className={modalStyles.creditPackRemaining}>
                                        {interpolate(copy.creditPackRemaining, {
                              count: remaining
                            })}
                                      </span>
                                    </div>
                                    <input type="number" className={modalStyles.creditAmountInput} min={0} max={remaining} value={creditAmounts[packId] ?? 0} onChange={e => updatePackAmount(packId, e.target.value, remaining)} disabled={saving} aria-label={interpolate(copy.creditPackAmountAria, {
                          label
                        })} />
                                  </div>;
                    })}
                            </div> : <div className={modalStyles.creditPackRow}>
                              <div className={modalStyles.creditPackMeta}>
                                <span className={modalStyles.creditPackLabel}>{copy.consumeCreditLegacy}</span>
                              </div>
                              <input type="number" className={modalStyles.creditAmountInput} min={0} max={creditBalance} value={creditAmounts.__legacy ?? 0} onChange={e => onCreditAmountsChange?.({
                      __legacy: clampCreditAmount(e.target.value, creditBalance)
                    })} disabled={saving} aria-label={copy.consumeCreditLegacy} />
                            </div>}

                          <div className={modalStyles.creditTotalRow}>
                            {interpolate(copy.creditTotalDebit, {
                      count: plannedDebitTotal
                    })}
                          </div>
                        </> : null}
                    </> : null}
                </div> : null}
            </div>
          </div>

          <footer className={layout.footer}>
            <span className={layout.footerHint}>{copy.footerHint}</span>
            <div className={layout.footerActions}>
              <button type="button" className={layout.ghostBtn} onClick={onClose} disabled={saving}>
                {copy.cancel}
              </button>
              <button type="submit" className={layout.primaryBtn} disabled={!canSubmit}>
                {saving ? copy.confirming : copy.confirm}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>, document.body);
}
