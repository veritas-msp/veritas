import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { createTicket, fetchSalesForms } from "../../api/tickets";
import { resolveMatchingRules, describeMatchingRulesSummary } from "../../utils/salesFormTargetRules";
import { fetchClientsList, fetchContactsList } from "../../api/clients";
import { fetchUsers } from "../../api/users";
import { useAuthContext } from "../../contexts/AuthContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getTicketSalesCreatePageCopy } from "./ticketSalesCreatePageI18n";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import account from "../Misc/AccountPage/AccountPage.module.css";
import s from "./TicketCreatePage.module.css";
import salesStyles from "./TicketSalesCreatePage.module.css";
import SalesFormFieldsRenderer, { buildDynamicFieldLines, filterVisibleFields, validateDynamicFields } from "./SalesFormFieldsRenderer";
function SectionPanel({
  title,
  description,
  children,
  className
}) {
  return <section className={`${account.sectionPanel} ${className || ""}`.trim()}>
      {(title || description) && <header className={account.sectionHeader}>
          <div className={s.sectionHeaderMain}>
            {title && <h2 className={account.sectionTitle}>{title}</h2>}
            {description && <p className={account.sectionDesc}>{description}</p>}
          </div>
        </header>}
      <div className={account.sectionBody}>{children}</div>
    </section>;
}
function getUserLabel(user, copy) {
  return user?.ticket_helpdesk_display_name || user?.name || user?.nom || user?.username || user?.email || (user?.id ? copy.formatUserFallback(user.id) : "");
}
function getClientLabel(client) {
  return String(client?.name || client?.nom || "").trim();
}
function getClientSearchText(client) {
  return [client?.name, client?.nom, client?.code, client?.email, client?.ville].filter(Boolean).join(" ").toLowerCase();
}
function SalesCreateRecap({
  kind,
  formLabel,
  contactLabel,
  clientLabel,
  priority,
  fields,
  copy
}) {
  const priorityLabel = copy.priorityOptions.find(p => p.key === priority)?.label || priority;
  const kindLabel = copy.getKindShortLabel(kind);
  return <div className={s.recapBody}>
      <div className={s.recapHero}>
        <div className={s.recapBadges}>
          <span className={`${s.recapBadge} ${s.recapTypeBadge_demande}`}>{kindLabel}</span>
          <span className={`${s.recapBadge} ${s.recapPriorityBadge}`}>{priorityLabel}</span>
        </div>
        <h3 className={s.recapSubject}>{formLabel}</h3>
      </div>
      <div className={s.recapTable}>
        <div className={s.recapRow}>
          <span className={s.recapRowLabel}>{copy.recap.requester}</span>
          <span className={s.recapRowValue}>{contactLabel || "-"}</span>
        </div>
        <div className={s.recapRow}>
          <span className={s.recapRowLabel}>{copy.recap.client}</span>
          <span className={s.recapRowValue}>{clientLabel || "-"}</span>
        </div>
        {fields.map(row => <div key={row.label} className={s.recapRow}>
            <span className={s.recapRowLabel}>{row.label}</span>
            <span className={s.recapRowValue}>{row.value || "-"}</span>
          </div>)}
      </div>
    </div>;
}
export default function TicketSalesCreatePage({
  onNavigate,
  initialData
}) {
  const {
    user: authUser
  } = useAuthContext();
  const locale = useAppLocale();
  const copy = useMemo(() => getTicketSalesCreatePageCopy(locale), [locale]);
  const contactDropdownRef = useRef(null);
  const clientDropdownRef = useRef(null);
  const [contacts, setContacts] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [salesForms, setSalesForms] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorPulseTick, setErrorPulseTick] = useState(0);
  const [ticketKind, setTicketKind] = useState(initialData?.kind === "installation" ? "installation" : "prestation");
  const [selectedFormId, setSelectedFormId] = useState("");
  const [dynamicValues, setDynamicValues] = useState({});
  const [requesterUserId, setRequesterUserId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [contactHighlight, setContactHighlight] = useState(0);
  const [clientHighlight, setClientHighlight] = useState(0);
  const defaultedRequesterRef = useRef(false);
  const [priority, setPriority] = useState("normal");
  const [purchaseOrder, setPurchaseOrder] = useState("");
  const [commercialUserId, setCommercialUserId] = useState("");
  const [hasProjectManager, setHasProjectManager] = useState(false);
  const [projectManagerUserId, setProjectManagerUserId] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const agentLabel = authUser?.username?.trim() || authUser?.email || copy.agentFallback;
  const formsForKind = useMemo(() => salesForms.filter(form => form.kind === ticketKind && form.enabled !== false), [salesForms, ticketKind]);
  const selectedForm = useMemo(() => formsForKind.find(form => String(form.id) === String(selectedFormId)) || formsForKind[0] || null, [formsForKind, selectedFormId]);
  const activeFields = useMemo(() => filterVisibleFields((selectedForm?.fields || []).filter(field => field.enabled !== false), dynamicValues), [selectedForm, dynamicValues]);
  const fieldLookups = useMemo(() => ({
    users,
    contacts,
    clients
  }), [users, contacts, clients]);
  const formTicketTargets = useMemo(() => selectedForm?.ticketTargets || {}, [selectedForm]);
  const matchingTargetRules = useMemo(() => resolveMatchingRules(formTicketTargets, dynamicValues), [formTicketTargets, dynamicValues]);
  const priorityLocked = matchingTargetRules.length === 1 && Boolean(matchingTargetRules[0]?.targets?.priority);
  useEffect(() => {
    const rulePriority = matchingTargetRules.length === 1 ? matchingTargetRules[0]?.targets?.priority : null;
    setPriority(rulePriority || "normal");
  }, [selectedFormId, matchingTargetRules]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingData(true);
      try {
        const [contactRows, clientRows, userRows, formRows] = await Promise.all([fetchContactsList().catch(() => []), fetchClientsList().catch(() => []), fetchUsers().catch(() => []), fetchSalesForms().catch(() => [])]);
        if (!cancelled) {
          setContacts(Array.isArray(contactRows) ? contactRows : []);
          setClients(Array.isArray(clientRows) ? clientRows : []);
          setUsers(Array.isArray(userRows) ? userRows : []);
          setSalesForms(Array.isArray(formRows) ? formRows : []);
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!formsForKind.length) {
      setSelectedFormId("");
      return;
    }
    if (!formsForKind.some(form => String(form.id) === String(selectedFormId))) {
      setSelectedFormId(formsForKind[0].id);
    }
  }, [formsForKind, selectedFormId]);
  useEffect(() => {
    setDynamicValues({});
  }, [selectedFormId]);
  useEffect(() => {
    if (defaultedRequesterRef.current || !authUser?.id) return;
    defaultedRequesterRef.current = true;
    setRequesterUserId(String(authUser.id));
    setContactSearch(agentLabel);
  }, [authUser?.id, agentLabel]);
  useEffect(() => {
    if (!initialData?.clientId || clients.length === 0) return;
    const match = clients.find(c => String(c.id) === String(initialData.clientId));
    if (!match) return;
    setSelectedClientId(String(match.id));
    setClientSearch(match.name || match.client_name || "");
  }, [initialData?.clientId, clients]);
  useEffect(() => {
    const handleClickOutside = e => {
      if (contactDropdownRef.current && !contactDropdownRef.current.contains(e.target)) {
        setShowContactDropdown(false);
      }
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target)) {
        setShowClientDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  useEffect(() => {
    if (!confirmOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [confirmOpen]);
  const selectedRequesterAgent = useMemo(() => users.find(u => String(u.id) === String(requesterUserId)) || null, [users, requesterUserId]);
  const selectedClient = useMemo(() => clients.find(c => String(c.id) === String(selectedClientId)) || null, [clients, selectedClientId]);
  const requesterLabel = useMemo(() => {
    if (selectedRequesterAgent) return getUserLabel(selectedRequesterAgent, copy);
    return "";
  }, [selectedRequesterAgent, copy]);
  const clientLabel = useMemo(() => (selectedClient ? getClientLabel(selectedClient) : ""), [selectedClient]);
  const filteredClientOptions = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    const mapped = clients
      .filter(c => c?.id)
      .map(c => ({
        id: String(c.id),
        label: getClientLabel(c),
        searchText: getClientSearchText(c),
        raw: c
      }))
      .filter(opt => opt.label);
    if (!q) return mapped.slice(0, 50);
    return mapped.filter(opt => opt.searchText.includes(q) || opt.label.toLowerCase().includes(q)).slice(0, 50);
  }, [clients, clientSearch]);
  const filteredRequesterOptions = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    const agentOpts = users
      .filter(u => u?.id)
      .map(u => ({
        kind: "agent",
        id: String(u.id),
        label: getUserLabel(u, copy),
        searchText: [getUserLabel(u, copy), u.email, u.username].filter(Boolean).join(" ").toLowerCase(),
        meta: u.email || copy.agentFallback,
        raw: u
      }))
      .filter(opt => opt.label);
    if (!q) return agentOpts.slice(0, 50);
    return agentOpts.filter(opt => opt.searchText.includes(q) || opt.label.toLowerCase().includes(q)).slice(0, 50);
  }, [users, contactSearch, copy]);
  const commercialLabel = useMemo(() => {
    if (!commercialUserId) return "";
    const user = users.find(row => String(row.id) === String(commercialUserId));
    return getUserLabel(user, copy);
  }, [users, commercialUserId, copy]);
  const projectManagerLabel = useMemo(() => {
    if (!projectManagerUserId) return "";
    const user = users.find(row => String(row.id) === String(projectManagerUserId));
    return getUserLabel(user, copy);
  }, [users, projectManagerUserId, copy]);
  const projectManagerDisplay = hasProjectManager ? projectManagerLabel || "-" : copy.noValue;
  const sortedUsers = useMemo(() => [...users].sort((a, b) => getUserLabel(a, copy).localeCompare(getUserLabel(b, copy), copy.localeTag, {
    sensitivity: "base"
  })), [users, copy]);
  const selectClient = useCallback(client => {
    if (!client?.id) return;
    setSelectedClientId(String(client.id));
    setClientSearch(getClientLabel(client));
    setShowClientDropdown(false);
    setFieldErrors(prev => ({
      ...prev,
      client: undefined
    }));
    const commercialId = client?.commercial_id || client?.commercialId || "";
    if (commercialId) {
      setCommercialUserId(String(commercialId));
    }
  }, []);
  const selectRequesterAgent = useCallback(user => {
    if (!user?.id) return;
    setRequesterUserId(String(user.id));
    setContactSearch(getUserLabel(user, copy));
    setShowContactDropdown(false);
    setFieldErrors(prev => ({
      ...prev,
      requester: undefined
    }));
  }, [copy]);
  const selectRequesterOption = useCallback(option => {
    if (!option?.raw) return;
    selectRequesterAgent(option.raw);
  }, [selectRequesterAgent]);
  const handleKindChange = kind => {
    setTicketKind(kind);
    setSelectedFormId("");
    setDynamicValues({});
  };
  const validateForm = () => {
    const errors = {};
    if (!requesterUserId) errors.requester = true;
    if (!selectedClientId) errors.client = true;
    if (!selectedForm) errors.form = true;
    if (selectedForm && !validateDynamicFields(selectedForm.fields || [], dynamicValues)) errors.details = true;
    if (hasProjectManager && !projectManagerUserId) errors.projectManager = true;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setErrorPulseTick(t => t + 1);
      return false;
    }
    return true;
  };
  const handleOpenConfirm = () => {
    if (!validateForm()) return;
    setConfirmOpen(true);
  };
  const handleCreate = async () => {
    if (!validateForm()) return;
    const clientIdNum = Number(selectedClientId);
    const clientId = Number.isFinite(clientIdNum) ? clientIdNum : selectedClientId || null;
    const clientName = clientLabel || "Client";
    const title = `${selectedForm.label} - ${clientName}`;
    const kindLabel = copy.getKindShortLabel(selectedForm.kind);
    const salesMetaLines = [`${copy.body.purchaseOrder}: ${purchaseOrder.trim() || "-"}`, `${copy.body.commercial}: ${commercialLabel || "-"}`, `${copy.body.projectManager}: ${projectManagerDisplay}`];
    const dynamicLines = buildDynamicFieldLines(selectedForm.fields || [], dynamicValues, fieldLookups);
    const bodyLines = [`${copy.body.type}: ${kindLabel}`, `${copy.body.form}: ${selectedForm.label}`, `${copy.body.requester}: ${requesterLabel || "-"}`, `${copy.body.company}: ${clientName}`, ...salesMetaLines, ...dynamicLines];
    const visibleValues = Object.fromEntries(filterVisibleFields(selectedForm.fields || [], dynamicValues).map(field => [field.fieldKey, dynamicValues[field.fieldKey]]));
    const displayValues = Object.fromEntries(filterVisibleFields(selectedForm.fields || [], dynamicValues).map(field => {
      const line = buildDynamicFieldLines([field], dynamicValues, fieldLookups)[0] || "";
      const display = line.includes(": ") ? line.split(": ").slice(1).join(": ") : "";
      return [field.fieldKey, display === "-" ? "" : display];
    }));
    const fieldLabels = Object.fromEntries(
      (selectedForm.fields || [])
        .filter(field => field?.fieldKey)
        .map(field => [field.fieldKey, String(field.label || "").trim() || field.fieldKey])
    );
    setSubmitting(true);
    try {
      const created = await createTicket({
        title,
        description: bodyLines.join("\n"),
        priority: matchingTargetRules.length === 1 && matchingTargetRules[0]?.targets?.priority ? matchingTargetRules[0].targets.priority : priority,
        status: matchingTargetRules.length === 1 && matchingTargetRules[0]?.targets?.status ? matchingTargetRules[0].targets.status : "new",
        type: selectedForm.kind === "installation" ? "installation" : "prestation",
        category: selectedForm.categorySlug,
        channel: "web",
        clientId,
        assignedUserId: null,
        requesterUserId: requesterUserId || null,
        requesterContactId: null,
        salesFormData: {
          formId: selectedForm.id,
          formKey: selectedForm.key,
          formLabel: selectedForm.label,
          kind: selectedForm.kind,
          categorySlug: selectedForm.categorySlug,
          purchaseOrder: purchaseOrder.trim() || null,
          commercialUserId: commercialUserId || null,
          commercialLabel: commercialLabel || null,
          hasProjectManager,
          projectManagerUserId: hasProjectManager ? projectManagerUserId || null : null,
          projectManagerLabel: projectManagerDisplay || null,
          clientName: clientName || null,
          contactName: requesterLabel || null,
          contactEmail: selectedRequesterAgent?.email || null,
          values: visibleValues,
          displayValues,
          fieldLabels
        }
      });
      const ticketCount = created?.multiple ? created.count : 1;
      toast.success(ticketCount > 1 ? copy.formatCreatedMultiple(ticketCount, selectedForm.label) : selectedForm.kind === "installation" ? copy.toasts.createdInstallation : copy.toasts.createdPrestation);
      setConfirmOpen(false);
      if (created?.id) {
        onNavigate?.("TicketSalesDetail", {
          ticketId: created.id,
          ticketNumber: created.ticket_number,
          ticketFamily: "sales",
          fromPage: "TicketSales"
        });
      } else if (created?.tickets?.[0]?.id) {
        onNavigate?.("TicketSalesDetail", {
          ticketId: created.tickets[0].id,
          ticketNumber: created.tickets[0].ticket_number,
          ticketFamily: "sales",
          fromPage: "TicketSales"
        });
      } else {
        onNavigate?.("TicketSales");
      }
    } catch (error) {
      toast.error(error.message || copy.toasts.createError);
    } finally {
      setSubmitting(false);
    }
  };
  const recapFields = [{
    label: copy.recap.purchaseOrder,
    value: purchaseOrder.trim() || "-"
  }, {
    label: copy.recap.commercial,
    value: commercialLabel || "-"
  }, {
    label: copy.recap.projectManager,
    value: projectManagerDisplay
  }, ...activeFields.map(field => ({
    label: field.label,
    value: buildDynamicFieldLines([field], dynamicValues, fieldLookups)[0]?.split(": ").slice(1).join(": ") || "-"
  }))];
  return <div className={`${layout.page} msp-page-grid`}>
      <div className={layout.shell}>
        <header className={layout.hero}>
          <div className={layout.heroText}>
            <p className={layout.eyebrow}>
              <Icon icon="mdi:briefcase-edit-outline" aria-hidden />
              {copy.eyebrow}
            </p>
            <h1 className={layout.pageTitle}>{copy.pageTitle}</h1>
            <p className={layout.pageSubtitle}>{copy.formatPageSubtitle(agentLabel)}</p>
          </div>
          <div className={layout.heroActions}>
            <button type="button" className={s.btnSecondary} onClick={() => onNavigate?.("TicketSales")}>
              <Icon icon="mdi:arrow-left" />
              {copy.back}
            </button>
            <button type="button" className={layout.primaryBtn} onClick={handleOpenConfirm} disabled={submitting || loadingData}>
              <Icon icon="mdi:check" />
              {submitting ? copy.creating : copy.createRequest}
            </button>
          </div>
        </header>

        <div className={`${s.typeKpiRow} ${salesStyles.kindKpiRow}`}>
          {copy.salesKinds.map(item => <button key={item.key} type="button" className={`${layout.kpiCard} ${ticketKind === item.key ? layout.kpiCardActive : ""}`} onClick={() => handleKindChange(item.key)}>
              <div className={`${layout.kpiIconWrap} ${layout.kpiIcon_blue}`}>
                <Icon icon={item.icon} />
              </div>
              <div className={layout.kpiBody}>
                <span className={layout.kpiValue}>{item.label}</span>
                <span className={layout.kpiLabel}>{item.hint}</span>
              </div>
            </button>)}
        </div>

        <div className={account.contentScroll}>
          <div className={account.contentGridWide}>
            <div className={s.formStack}>
              <SectionPanel title={copy.sections.nature}>
                {formsForKind.length === 0 ? <p className={s.detailsAvailabilityTitle} style={{
                margin: 0
              }}>
                    {loadingData ? copy.loadingForms : copy.noForms}
                  </p> : <div className={`${s.typeGrid} ${salesStyles.formTypeGrid}`}>
                    {formsForKind.map(form => <button key={form.id} type="button" className={`${s.typeCard} ${String(selectedFormId) === String(form.id) ? s.typeCardActive : ""}`} onClick={() => setSelectedFormId(form.id)}>
                        <Icon icon={form.icon || "mdi:file-document-outline"} className={s.typeIcon} aria-hidden />
                        <span className={s.typeLabel}>{form.label}</span>
                      </button>)}
                  </div>}
              </SectionPanel>

              <SectionPanel title={copy.sections.requester} className={s.panelAllowOverflow}>
                <div className={s.demandeurBlock}>
                  <p className={s.detailsAvailabilityTitle}>{copy.requesterContact}</p>
                  <div className={s.contactSearchRow}>
                    <div className={s.contactPicker} ref={contactDropdownRef}>
                      <div data-pulse={fieldErrors.requester ? errorPulseTick : undefined} className={`${s.contactInputWrap} ${showContactDropdown ? s.contactInputWrapOpen : ""} ${fieldErrors.requester ? s.contactInputWrapError : ""} ${fieldErrors.requester ? s.fieldErrorPulse : ""}`}>
                        <Icon icon="mdi:magnify" className={s.contactInputIcon} aria-hidden />
                        <input type="text" className={s.contactInput} value={contactSearch} placeholder={copy.searchContact} disabled={loadingData} aria-expanded={showContactDropdown} aria-haspopup="listbox" onChange={e => {
                        setContactSearch(e.target.value);
                        setRequesterUserId("");
                        setShowContactDropdown(true);
                        setContactHighlight(0);
                        setFieldErrors(prev => ({
                          ...prev,
                          requester: undefined
                        }));
                      }} onFocus={() => {
                        setShowContactDropdown(true);
                      }} onKeyDown={e => {
                        if (!showContactDropdown || filteredRequesterOptions.length === 0) return;
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setContactHighlight(h => Math.min(h + 1, filteredRequesterOptions.length - 1));
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setContactHighlight(h => Math.max(h - 1, 0));
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          const picked = filteredRequesterOptions[contactHighlight];
                          if (picked) selectRequesterOption(picked);
                        } else if (e.key === "Escape") setShowContactDropdown(false);
                      }} />
                      </div>
                      {showContactDropdown && <div className={s.contactDropdown} role="listbox">
                          {filteredRequesterOptions.length === 0 ? <div className={s.contactEmpty}>{copy.noContactFound}</div> : filteredRequesterOptions.map((opt, idx) => {
                        return <button key={`${opt.kind}-${opt.id}`} type="button" className={`${s.contactOption} ${idx === contactHighlight ? s.contactOptionActive : ""}`} onMouseEnter={() => setContactHighlight(idx)} onClick={() => selectRequesterOption(opt)}>
                                  <span className={s.contactOptionName}>{opt.label}</span>
                                  {opt.meta && <span className={s.contactOptionMeta}>{opt.meta}</span>}
                                </button>;
                      })}
                        </div>}
                    </div>
                  </div>

                  {selectedRequesterAgent && <div className={s.contactSummaryCard}>
                      <div className={s.contactSummaryMain}>
                        <div className={s.clientAvatarSm} aria-hidden>
                          {(getUserLabel(selectedRequesterAgent, copy) || "?").split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase()}
                        </div>
                        <div className={s.contactSummaryTop}>
                          <div className={s.contactSummaryIdentity}>
                            <p className={s.contactSummaryName}>{getUserLabel(selectedRequesterAgent, copy)}</p>
                            <p className={s.contactSummaryCompany}>{copy.agentFallback}</p>
                          </div>
                        </div>
                        {selectedRequesterAgent.email && <div className={s.contactSummaryMetaGrid}>
                            <p className={s.contactSummaryMeta}>
                              <Icon icon="mdi:email-outline" aria-hidden />
                              <span>{selectedRequesterAgent.email}</span>
                            </p>
                          </div>}
                      </div>
                    </div>}

                  <p className={s.detailsAvailabilityTitle} style={{ marginTop: "1rem" }}>{copy.companyLabel}</p>
                  <div className={s.contactSearchRow}>
                    <div className={s.contactPicker} ref={clientDropdownRef}>
                      <div data-pulse={fieldErrors.client ? errorPulseTick : undefined} className={`${s.contactInputWrap} ${showClientDropdown ? s.contactInputWrapOpen : ""} ${fieldErrors.client ? s.contactInputWrapError : ""} ${fieldErrors.client ? s.fieldErrorPulse : ""}`}>
                        <Icon icon="mdi:magnify" className={s.contactInputIcon} aria-hidden />
                        <input type="text" className={s.contactInput} value={clientSearch} placeholder={copy.searchCompany} disabled={loadingData} aria-expanded={showClientDropdown} aria-haspopup="listbox" onChange={e => {
                        setClientSearch(e.target.value);
                        setSelectedClientId("");
                        setShowClientDropdown(true);
                        setClientHighlight(0);
                        setFieldErrors(prev => ({
                          ...prev,
                          client: undefined
                        }));
                      }} onFocus={() => setShowClientDropdown(true)} onKeyDown={e => {
                        if (!showClientDropdown || filteredClientOptions.length === 0) return;
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setClientHighlight(h => Math.min(h + 1, filteredClientOptions.length - 1));
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setClientHighlight(h => Math.max(h - 1, 0));
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          const picked = filteredClientOptions[clientHighlight];
                          if (picked) selectClient(picked.raw);
                        } else if (e.key === "Escape") setShowClientDropdown(false);
                      }} />
                      </div>
                      {showClientDropdown && <div className={s.contactDropdown} role="listbox">
                          {filteredClientOptions.length === 0 ? <div className={s.contactEmpty}>{copy.noCompanyFound}</div> : filteredClientOptions.map((opt, idx) => <button key={opt.id} type="button" className={`${s.contactOption} ${idx === clientHighlight ? s.contactOptionActive : ""}`} onMouseEnter={() => setClientHighlight(idx)} onClick={() => selectClient(opt.raw)}>
                                  <span className={s.contactOptionName}>{opt.label}</span>
                                </button>)}
                        </div>}
                    </div>
                  </div>
                </div>
              </SectionPanel>

              <SectionPanel title={copy.sections.details}>
                <div data-pulse={fieldErrors.details ? errorPulseTick : undefined} className={fieldErrors.details ? s.fieldErrorPulse : undefined}>
                  <SalesFormFieldsRenderer fields={activeFields} values={dynamicValues} users={users} contacts={contacts} clients={clients} fieldErrors={fieldErrors.details} errorPulseTick={errorPulseTick} onChange={nextValues => {
                  setDynamicValues(nextValues);
                  setFieldErrors(prev => ({
                    ...prev,
                    details: undefined
                  }));
                }} />
                </div>
              </SectionPanel>
            </div>

            <aside className={`${s.formStack} ${s.sideColumn}`}>
              <SectionPanel title={copy.sections.context}>
                <dl className={s.contractFacts}>
                  <div className={s.contractFactRow}>
                    <dt className={s.contractFactLabel}>
                      <Icon icon="mdi:shape-outline" className={s.contractFactIcon} aria-hidden />
                      {copy.context.type}
                    </dt>
                    <dd className={s.contractFactCompany}>
                      {copy.salesKinds.find(item => item.key === ticketKind)?.label || "-"}
                    </dd>
                  </div>
                  <div className={s.contractFactRow}>
                    <dt className={s.contractFactLabel}>
                      <Icon icon="mdi:tag-outline" className={s.contractFactIcon} aria-hidden />
                      {copy.context.category}
                    </dt>
                    <dd className={selectedForm ? s.contractFactCompany : s.contractFactEmpty}>
                      {selectedForm?.label || "-"}
                    </dd>
                  </div>
                  <div className={s.contractFactRow}>
                    <dt className={s.contractFactLabel}>
                      <Icon icon="mdi:domain" className={s.contractFactIcon} aria-hidden />
                      {copy.context.company}
                    </dt>
                    <dd className={clientLabel ? s.contractFactCompany : s.contractFactEmpty}>
                      {clientLabel || "-"}
                    </dd>
                  </div>
                  <div className={s.contractFactRow}>
                    <dt className={s.contractFactLabel}>
                      <Icon icon="mdi:account-outline" className={s.contractFactIcon} aria-hidden />
                      {copy.context.requester}
                    </dt>
                    <dd className={requesterLabel ? s.contractFactCompany : s.contractFactEmpty}>
                      {requesterLabel || "-"}
                    </dd>
                  </div>
                  <div className={s.contractFactRow}>
                    <dt className={s.contractFactLabel}>
                      <Icon icon="mdi:file-document-outline" className={s.contractFactIcon} aria-hidden />
                      {copy.context.purchaseOrder}
                    </dt>
                    <dd className={purchaseOrder.trim() ? s.contractFactCompany : s.contractFactEmpty}>
                      {purchaseOrder.trim() || "-"}
                    </dd>
                  </div>
                  <div className={s.contractFactRow}>
                    <dt className={s.contractFactLabel}>
                      <Icon icon="mdi:account-tie-outline" className={s.contractFactIcon} aria-hidden />
                      {copy.context.commercial}
                    </dt>
                    <dd className={commercialLabel ? s.contractFactCompany : s.contractFactEmpty}>
                      {commercialLabel || "-"}
                    </dd>
                  </div>
                  <div className={s.contractFactRow}>
                    <dt className={s.contractFactLabel}>
                      <Icon icon="mdi:briefcase-account-outline" className={s.contractFactIcon} aria-hidden />
                      {copy.context.projectManager}
                    </dt>
                    <dd className={hasProjectManager && projectManagerLabel ? s.contractFactCompany : s.contractFactEmpty}>
                      {projectManagerDisplay}
                    </dd>
                  </div>
                </dl>
              </SectionPanel>

              <SectionPanel title={copy.sections.commercial}>
                <div className={salesStyles.salesFields}>
                  <div className={s.equipmentField}>
                    <label className={s.equipmentFieldLabel} htmlFor="sales-create-purchase-order">
                      {copy.purchaseOrder}
                    </label>
                    <div className={s.fieldShell}>
                      <input id="sales-create-purchase-order" type="text" className={s.fieldShellControl} value={purchaseOrder} placeholder={copy.purchaseOrderPlaceholder} onChange={e => setPurchaseOrder(e.target.value)} />
                    </div>
                  </div>

                  <div className={s.equipmentField}>
                    <label className={s.equipmentFieldLabel} htmlFor="sales-create-commercial">
                      {copy.commercial}
                    </label>
                    <select id="sales-create-commercial" className={s.select} value={commercialUserId} onChange={e => setCommercialUserId(e.target.value)}>
                      <option value="">{copy.selectCommercial}</option>
                      {sortedUsers.map(user => <option key={user.id} value={user.id}>
                          {getUserLabel(user, copy)}
                        </option>)}
                    </select>
                  </div>

                  <div className={s.equipmentField}>
                    <span className={s.equipmentFieldLabel} id="sales-create-project-manager-label">
                      {copy.projectManager}
                    </span>
                    <div className={s.segmentedGroup} role="radiogroup" aria-labelledby="sales-create-project-manager-label">
                      <button type="button" role="radio" aria-checked={!hasProjectManager} className={`${s.segmentedBtn} ${!hasProjectManager ? s.segmentedBtnActive : ""}`} onClick={() => {
                      setHasProjectManager(false);
                      setProjectManagerUserId("");
                      setFieldErrors(prev => ({
                        ...prev,
                        projectManager: undefined
                      }));
                    }}>
                        <Icon icon="mdi:close-circle-outline" aria-hidden />
                        {copy.no}
                      </button>
                      <button type="button" role="radio" aria-checked={hasProjectManager} className={`${s.segmentedBtn} ${hasProjectManager ? s.segmentedBtnActive : ""}`} onClick={() => setHasProjectManager(true)}>
                        <Icon icon="mdi:account-tie-outline" aria-hidden />
                        {copy.yes}
                      </button>
                    </div>
                    {hasProjectManager && <div data-pulse={fieldErrors.projectManager ? errorPulseTick : undefined} className={`${salesStyles.projectManagerField} ${fieldErrors.projectManager ? s.fieldErrorPulse : ""}`}>
                        <label className={s.equipmentFieldLabel} htmlFor="sales-create-project-manager">
                          {copy.projectManagerResponsible}
                        </label>
                        <select id="sales-create-project-manager" className={s.select} value={projectManagerUserId} onChange={e => {
                      setProjectManagerUserId(e.target.value);
                      setFieldErrors(prev => ({
                        ...prev,
                        projectManager: undefined
                      }));
                    }}>
                          <option value="">{copy.selectProjectManager}</option>
                          {sortedUsers.map(user => <option key={user.id} value={user.id}>
                              {getUserLabel(user, copy)}
                            </option>)}
                        </select>
                      </div>}
                  </div>
                </div>
              </SectionPanel>

              <SectionPanel title={copy.sections.settings}>
                <div className={s.equipmentField}>
                  <label className={s.equipmentFieldLabel} htmlFor="sales-create-priority">
                    {copy.priorityLabel}
                  </label>
                  <select id="sales-create-priority" className={s.select} value={priority} disabled={priorityLocked} onChange={e => setPriority(e.target.value)}>
                    {copy.priorityOptions.map(item => <option key={item.key} value={item.key}>
                        {item.label}
                      </option>)}
                  </select>
                  {priorityLocked && <p className={s.detailsAvailabilityTitle} style={{
                  margin: "0.35rem 0 0"
                }}>
                      {copy.priorityLocked}
                    </p>}
                </div>
                <div className={s.equipmentField} style={{
                marginTop: "0.75rem"
              }}>
                  <p className={s.detailsAvailabilityTitle} style={{
                  margin: 0
                }}>
                    {copy.generatedTickets}
                  </p>
                  <p className={s.detailsAvailabilityTitle} style={{
                  margin: "0.35rem 0 0",
                  fontWeight: 400
                }}>
                    {describeMatchingRulesSummary(matchingTargetRules)}
                  </p>
                  {matchingTargetRules.length > 0 && <ul className={salesStyles.targetRuleList}>
                      {matchingTargetRules.map(rule => <li key={rule.id}>
                          <strong>{rule.label}</strong>
                          {[rule.targets?.priority ? copy.formatRulePriority(rule.targets.priority) : null, rule.targets?.status ? copy.formatRuleStatus(rule.targets.status) : null, rule.targets?.assigneeUserIds?.length ? copy.formatRuleAssignees(rule.targets.assigneeUserIds.length) : null, rule.targets?.teamIds?.length ? copy.formatRuleTeams(rule.targets.teamIds.length) : null].filter(Boolean).join(" · ") || copy.defaultRuleProps}
                        </li>)}
                    </ul>}
                </div>
              </SectionPanel>
            </aside>
          </div>
        </div>
      </div>

      {confirmOpen && createPortal(<div className={s.confirmOverlay} onClick={() => !submitting && setConfirmOpen(false)} role="presentation">
            <div className={s.confirmShell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="sales-create-recap-title">
              <div className={s.confirmAccentBar} aria-hidden />
              <div className={s.confirmHeader}>
                <div className={s.confirmHeaderMain}>
                  <div className={s.confirmHeaderIconWrap} aria-hidden>
                    <Icon icon="mdi:clipboard-check-outline" className={s.confirmHeaderIcon} />
                  </div>
                  <div>
                    <h2 id="sales-create-recap-title" className={s.confirmTitle}>
                      {copy.recap.title}
                    </h2>
                    <p className={s.confirmSubtitle}>{copy.recap.subtitle}</p>
                  </div>
                </div>
                <button type="button" className={s.confirmCloseBtn} onClick={() => setConfirmOpen(false)} disabled={submitting} aria-label={copy.recap.close}>
                  <FaTimes />
                </button>
              </div>
              <div className={s.confirmBody}>
                <SalesCreateRecap kind={ticketKind} formLabel={selectedForm.label} contactLabel={requesterLabel || null} clientLabel={clientLabel} priority={priority} fields={recapFields} copy={copy} />
              </div>
              <div className={s.confirmFooter}>
                <button type="button" className={s.recapCancelBtn} onClick={() => setConfirmOpen(false)} disabled={submitting}>
                  {copy.recap.cancel}
                </button>
                <button type="button" className={s.recapConfirmBtn} onClick={handleCreate} disabled={submitting}>
                  <Icon icon={submitting ? "mdi:loading" : "mdi:check-bold"} className={submitting ? s.recapConfirmSpinner : undefined} />
                  {submitting ? copy.creating : copy.recap.confirm}
                </button>
              </div>
            </div>
          </div>, document.body)}
    </div>;
}
