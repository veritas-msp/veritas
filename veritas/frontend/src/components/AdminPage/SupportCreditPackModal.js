import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { creditClientSupportTickets, updateSupportCreditPack } from "../../api/clients";
import { getClientNameWithoutCode, getClientNumber } from "../../utils/clientDisplay";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import { useAdminSupportCreditsCopy } from "../../hooks/useAdminCopy";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getSupportCreditFormSections, interpolate } from "./adminSupportCreditsI18n";
import styles from "./SupportCreditPackModal.module.css";
import NumberStepperInput from "../Misc/NumberStepperInput/NumberStepperInput";
const EMPTY_FORM = {
  clientId: "",
  amount: "",
  initial_amount: "",
  remaining_amount: "",
  label: "",
  validFrom: "",
  validUntil: "",
  note: ""
};
function toInputDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
function getClientLabel(client) {
  const number = getClientNumber(client);
  const name = getClientNameWithoutCode(client?.name, number) || client?.name || `Client #${client?.id}`;
  return number ? `${number} · ${name}` : name;
}
function normalizeSearchText(value) {
  return String(value || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}
function matchesClientSearch(client, rawQuery) {
  const query = normalizeSearchText(rawQuery);
  if (!query) return true;
  const parts = [getClientLabel(client), getClientNumber(client), getClientNameWithoutCode(client), client?.name, client?.id != null ? String(client.id) : ""].map(normalizeSearchText).filter(Boolean);
  const tokens = query.split(/\s+/).filter(Boolean);
  return tokens.every(token => parts.some(part => part.includes(token)));
}
export default function SupportCreditPackModal({
  open,
  mode,
  pack,
  clients,
  onClose,
  onSaved,
  lockClient = false
}) {
  const locale = useAppLocale();
  const copy = useAdminSupportCreditsCopy();
  const common = useCommonCopy();
  const modalCopy = copy.modal;
  const formSections = useMemo(() => getSupportCreditFormSections(locale), [locale]);
  const isEdit = mode === "edit";
  const isCreate = !isEdit;
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState("client");
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [clientDropdownCoords, setClientDropdownCoords] = useState(null);
  const clientAutocompleteRef = useRef(null);
  const clientInputRef = useRef(null);
  const clientDropdownRef = useRef(null);
  useEffect(() => {
    if (!open) {
      setClientSearch("");
      setClientDropdownOpen(false);
      setClientDropdownCoords(null);
      return;
    }
    setActiveSection(isEdit ? "client" : lockClient ? "pack" : "client");
    if (isEdit && pack) {
      setForm({
        clientId: String(pack.client_id || ""),
        amount: "",
        initial_amount: String(pack.initial_amount ?? ""),
        remaining_amount: String(pack.remaining_amount ?? ""),
        label: pack.label || "",
        validFrom: toInputDate(pack.valid_from),
        validUntil: toInputDate(pack.valid_until),
        note: pack.note || ""
      });
      return;
    }
    setForm({
      ...EMPTY_FORM,
      clientId: pack?.client_id ? String(pack.client_id) : ""
    });
    if (!pack?.client_id) {
      setClientSearch("");
    }
  }, [open, isEdit, lockClient, pack]);
  const sortedClients = useMemo(() => [...(Array.isArray(clients) ? clients : [])].sort((a, b) => getClientLabel(a).localeCompare(getClientLabel(b), copy.bcp47, {
    numeric: true
  })), [clients, copy.bcp47]);
  const selectedClient = useMemo(() => sortedClients.find(client => String(client.id) === String(form.clientId)) || null, [sortedClients, form.clientId]);
  useEffect(() => {
    if (!open || !form.clientId) return;
    const client = sortedClients.find(item => String(item.id) === String(form.clientId));
    if (client) {
      setClientSearch(getClientLabel(client));
    }
  }, [open, form.clientId, sortedClients]);
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = e => {
      const inAutocomplete = clientAutocompleteRef.current && clientAutocompleteRef.current.contains(e.target);
      const inDropdown = clientDropdownRef.current && clientDropdownRef.current.contains(e.target);
      if (!inAutocomplete && !inDropdown) {
        setClientDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);
  const filteredClients = useMemo(() => {
    const query = clientSearch.trim();
    const matches = query ? sortedClients.filter(client => matchesClientSearch(client, query)) : sortedClients;
    return matches.slice(0, query ? 30 : 15);
  }, [clientSearch, sortedClients]);
  useLayoutEffect(() => {
    if (!open || !clientDropdownOpen) {
      setClientDropdownCoords(null);
      return undefined;
    }
    const updateDropdownPosition = () => {
      const input = clientInputRef.current;
      if (!input) return;
      const rect = input.getBoundingClientRect();
      const gap = 4;
      const preferredMaxHeight = 220;
      const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
      const spaceAbove = rect.top - gap - 8;
      const openAbove = spaceBelow < 140 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(96, Math.min(preferredMaxHeight, openAbove ? spaceAbove : spaceBelow));
      setClientDropdownCoords({
        top: openAbove ? rect.top - gap - maxHeight : rect.bottom + gap,
        left: rect.left,
        width: rect.width,
        maxHeight
      });
    };
    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);
    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [open, clientDropdownOpen, clientSearch, filteredClients.length]);
  const patchForm = patch => setForm(prev => ({
    ...prev,
    ...patch
  }));
  const sectionMeta = useMemo(() => {
    const amountFilled = isEdit ? Boolean(String(form.initial_amount).trim() && String(form.remaining_amount).trim()) : Boolean(String(form.amount).trim());
    return {
      client: Boolean(form.clientId) || isEdit,
      pack: amountFilled || Boolean(form.label?.trim()),
      details: Boolean(form.validFrom || form.validUntil || form.note?.trim())
    };
  }, [form, isEdit]);
  const enterpriseLabel = isEdit ? getEnterpriseLabelFromPack(pack, selectedClient) : selectedClient ? getClientLabel(selectedClient) : "";
  const handleSubmit = async () => {
    if (!form.clientId) {
      toast.error(copy.toast.selectEnterprise);
      setActiveSection("client");
      return;
    }
    if (isEdit) {
      const initialAmount = Number(form.initial_amount);
      const remainingAmount = Number(form.remaining_amount);
      if (!Number.isInteger(initialAmount) || initialAmount <= 0) {
        toast.error(copy.toast.initialInvalid);
        setActiveSection("pack");
        return;
      }
      if (!Number.isInteger(remainingAmount) || remainingAmount < 0) {
        toast.error(copy.toast.remainingInvalid);
        setActiveSection("pack");
        return;
      }
    } else {
      const amount = Number(form.amount);
      if (!Number.isInteger(amount) || amount <= 0) {
        toast.error(copy.toast.amountInvalid);
        setActiveSection("pack");
        return;
      }
    }
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateSupportCreditPack(form.clientId, pack.id, {
          label: form.label.trim() || undefined,
          note: form.note.trim() || null,
          validFrom: form.validFrom || null,
          validUntil: form.validUntil || null,
          initial_amount: Number(form.initial_amount),
          remaining_amount: Number(form.remaining_amount)
        });
        toast.success(copy.toast.updated);
      } else {
        await creditClientSupportTickets(form.clientId, {
          amount: Number(form.amount),
          label: form.label.trim() || undefined,
          note: form.note.trim() || undefined,
          validFrom: form.validFrom || null,
          validUntil: form.validUntil || null
        });
        toast.success(interpolate(copy.toast.created, {
          amount: form.amount
        }));
      }
      onSaved?.();
      onClose?.();
    } catch (error) {
      toast.error(error.message || copy.toast.saveError);
    } finally {
      setSubmitting(false);
    }
  };
  if (!open) return null;
  const modalTitle = isEdit ? modalCopy.editTitle : modalCopy.createTitle;
  const modalSubtitle = isEdit ? modalCopy.editSubtitle : modalCopy.createSubtitle;
  const renderSectionContent = () => {
    const section = formSections.find(item => item.id === activeSection);
    switch (activeSection) {
      case "client":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{section?.label}</h3>
              <p className={layout.sectionDesc}>{section?.description}</p>
            </div>

            {isEdit || lockClient ? <>
                <p className={layout.hint}>
                  {isEdit ? modalCopy.editLockedHint : modalCopy.createLockedHint}
                </p>
                <div className={styles.clientCard}>
                  <div className={styles.clientCardIcon} aria-hidden>
                    <Icon icon="mdi:office-building-outline" />
                  </div>
                  <div className={styles.clientCardText}>
                    <div className={styles.clientCardName}>{enterpriseLabel || "-"}</div>
                    <div className={styles.clientCardHint}>{modalCopy.beneficiaryHint}</div>
                  </div>
                </div>
              </> : <>
                <p className={layout.hint}>{modalCopy.searchHint}</p>
                <div className={layout.field}>
                  <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="credit-pack-client">
                    {modalCopy.enterpriseLabel}
                  </label>
                  <div className={layout.autocomplete} ref={clientAutocompleteRef}>
                    <input id="credit-pack-client" ref={clientInputRef} type="text" className={layout.input} placeholder={modalCopy.searchPlaceholder} value={clientSearch} onChange={e => {
                  setClientSearch(e.target.value);
                  setClientDropdownOpen(true);
                  patchForm({
                    clientId: ""
                  });
                }} onFocus={() => setClientDropdownOpen(true)} autoComplete="off" autoFocus />
                  </div>
                  {clientDropdownOpen && clientDropdownCoords && createPortal(<div ref={clientDropdownRef} className={`${layout.dropdown} ${styles.clientDropdownPortal}`} style={{
                position: "fixed",
                top: clientDropdownCoords.top,
                left: clientDropdownCoords.left,
                width: clientDropdownCoords.width,
                maxHeight: clientDropdownCoords.maxHeight
              }} role="listbox" aria-label={modalCopy.enterprisesAria}>
                        {filteredClients.length === 0 ? <div className={layout.dropdownEmpty}>{modalCopy.noEnterpriseFound}</div> : filteredClients.map(client => <button key={client.id} type="button" className={`${layout.dropdownOption} ${String(form.clientId) === String(client.id) ? layout.dropdownOptionSelected : ""}`} onMouseDown={e => e.preventDefault()} onClick={() => {
                  patchForm({
                    clientId: String(client.id)
                  });
                  setClientSearch(getClientLabel(client));
                  setClientDropdownOpen(false);
                }}>
                              {getClientLabel(client)}
                            </button>)}
                      </div>, document.body)}
                </div>

                {selectedClient && <div className={styles.clientCard} style={{
              marginTop: "1rem"
            }}>
                    <div className={styles.clientCardIcon} aria-hidden>
                      <Icon icon="mdi:check" />
                    </div>
                    <div className={styles.clientCardText}>
                      <div className={styles.clientCardName}>{getClientLabel(selectedClient)}</div>
                      <div className={styles.clientCardHint}>{modalCopy.selectedHint}</div>
                    </div>
                  </div>}
              </>}
          </>;
      case "pack":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{section?.label}</h3>
              <p className={layout.sectionDesc}>{section?.description}</p>
            </div>

            <div className={layout.fieldGrid2}>
              {isEdit ? <>
                  <div className={layout.field}>
                    <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="credit-pack-initial">
                      {modalCopy.initialTickets}
                    </label>
                    <NumberStepperInput id="credit-pack-initial" min={1} inputClassName={layout.input} value={form.initial_amount} onChange={next => patchForm({
                  initial_amount: next
                })} increaseAriaLabel={modalCopy.ticketsIncrease} decreaseAriaLabel={modalCopy.ticketsDecrease} />
                  </div>
                  <div className={layout.field}>
                    <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="credit-pack-remaining">
                      {modalCopy.remainingTickets}
                    </label>
                    <NumberStepperInput id="credit-pack-remaining" min={0} inputClassName={layout.input} value={form.remaining_amount} onChange={next => patchForm({
                  remaining_amount: next
                })} increaseAriaLabel={modalCopy.ticketsIncrease} decreaseAriaLabel={modalCopy.ticketsDecrease} />
                  </div>
                </> : <div className={layout.field}>
                  <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="credit-pack-amount">
                    {modalCopy.ticketCount}
                  </label>
                  <NumberStepperInput id="credit-pack-amount" min={1} inputClassName={layout.input} value={form.amount} onChange={next => patchForm({
                amount: next
              })} placeholder={modalCopy.ticketCountPlaceholder} allowEmpty increaseAriaLabel={modalCopy.ticketsIncrease} decreaseAriaLabel={modalCopy.ticketsDecrease} required />
                </div>}

              <div className={`${layout.field} ${isCreate ? layout.fieldFull : ""}`}>
                <label className={layout.label} htmlFor="credit-pack-label">
                  {modalCopy.label}
                </label>
                <input id="credit-pack-label" type="text" className={layout.input} value={form.label} onChange={e => patchForm({
                label: e.target.value
              })} placeholder={modalCopy.labelPlaceholder} />
              </div>
            </div>

            {isCreate && <div className={styles.infoCallout}>
                <Icon icon="mdi:information-outline" className={styles.infoCalloutIcon} aria-hidden />
                <span>{modalCopy.createInfo}</span>
              </div>}
          </>;
      case "details":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{section?.label}</h3>
              <p className={layout.sectionDesc}>{section?.description}</p>
            </div>

            <div className={layout.fieldGrid2}>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="credit-pack-valid-from">
                  {modalCopy.validFrom}
                </label>
                <input id="credit-pack-valid-from" type="date" className={layout.input} value={form.validFrom} onChange={e => patchForm({
                validFrom: e.target.value
              })} />
              </div>
              <div className={layout.field}>
                <label className={layout.label} htmlFor="credit-pack-valid-until">
                  {modalCopy.validUntil}
                </label>
                <input id="credit-pack-valid-until" type="date" className={layout.input} value={form.validUntil} onChange={e => patchForm({
                validUntil: e.target.value
              })} />
              </div>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={layout.label} htmlFor="credit-pack-note">
                  {modalCopy.internalNote}
                </label>
                <textarea id="credit-pack-note" className={`${layout.input} ${styles.textarea}`} value={form.note} onChange={e => patchForm({
                note: e.target.value
              })} placeholder={modalCopy.notePlaceholder} />
              </div>
            </div>
          </>;
      default:
        return null;
    }
  };
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={layout.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="credit-pack-modal-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon={isCreate ? "mdi:ticket-confirmation-outline" : "mdi:ticket-account"} />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{modalCopy.eyebrow}</p>
              <h2 className={layout.title} id="credit-pack-modal-title">
                {modalTitle}
              </h2>
              <p className={layout.subtitle}>{modalSubtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={submitting} aria-label={modalCopy.closeAria}>
            <FaTimes />
          </button>
        </header>

        <div className={layout.body}>
          <nav className={layout.nav} aria-label={modalCopy.sectionsAria}>
            {formSections.map(section => <button key={section.id} type="button" className={`${layout.navItem} ${activeSection === section.id ? layout.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                <Icon icon={section.icon} className={layout.navItemIcon} aria-hidden />
                <span className={layout.navItemText}>
                  <span className={layout.navItemLabel}>{section.label}</span>
                  <span className={layout.navItemHint}>{section.description}</span>
                </span>
                {sectionMeta[section.id] && <span className={layout.navBadge}>✓</span>}
              </button>)}
          </nav>

          <div className={layout.content}>{renderSectionContent()}</div>
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>
            {isCreate ? modalCopy.footerCreateHint : modalCopy.footerEditHint}
          </span>
          <div className={layout.footerActions}>
            <button type="button" className={layout.ghostBtn} onClick={onClose} disabled={submitting}>
              {common.cancel}
            </button>
            <button type="button" className={layout.primaryBtn} onClick={handleSubmit} disabled={submitting}>
              {submitting ? <>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                  {common.saving}
                </> : isCreate ? <>
                  <Icon icon="mdi:check" aria-hidden />
                  {modalCopy.createBtn}
                </> : <>
                  <Icon icon="mdi:content-save-outline" aria-hidden />
                  {modalCopy.saveBtn}
                </>}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
function getEnterpriseLabelFromPack(pack, selectedClient) {
  if (pack?.client_name || pack?.client_number) {
    return getClientLabel({
      id: pack.client_id,
      name: pack.client_name,
      clientNumber: pack.client_number,
      number: pack.client_number
    });
  }
  return selectedClient ? getClientLabel(selectedClient) : "-";
}
