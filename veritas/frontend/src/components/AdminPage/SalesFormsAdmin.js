import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { deleteSalesForm, deleteSupportForm, fetchSalesForms, fetchSupportForms } from "../../api/tickets";
import { describeTicketTargetsSummary } from "../../utils/salesFormTargetRules";
import { Card, Btn } from "./AdminUi";
import SalesFormModal from "./SalesFormModal";
import styles from "./AdminTickets.module.css";
import pageLayout from "../EnterprisesPage/EnterprisesPage.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getAdminDeleteConfirmsCopy } from "./adminModalsI18n";

const SALES_KIND_FILTERS = [
  { key: "", labelFr: "Tous", labelEn: "All" },
  { key: "prestation", labelFr: "Prestations", labelEn: "Professional services" },
  { key: "installation", labelFr: "Installations", labelEn: "Installations" }
];
const SUPPORT_KIND_FILTERS = [
  { key: "", labelFr: "Tous", labelEn: "All" },
  { key: "incident", labelFr: "Incident", labelEn: "Incident" },
  { key: "demande", labelFr: "Demande", labelEn: "Request" },
  { key: "probleme", labelFr: "Problème", labelEn: "Problem" },
  { key: "changement", labelFr: "Changement", labelEn: "Change" }
];

function describeFormVisibility(form, locale) {
  if (form?.visibility !== "assigned") return locale === "fr" ? "Tous les agents" : "All agents";
  const parts = [];
  if (form.profileNames?.length) parts.push(`${form.profileNames.length} ${locale === "fr" ? "profil(s)" : "profile(s)"}`);
  if (form.userIds?.length) parts.push(`${form.userIds.length} ${locale === "fr" ? "agent(s)" : "agent(s)"}`);
  if (form.teamIds?.length) parts.push(`${form.teamIds.length} ${locale === "fr" ? "équipe(s)" : "team(s)"}`);
  return parts.length ? parts.join(" · ") : (locale === "fr" ? "Restreint (vide)" : "Restricted (empty)");
}

function describeTicketTargets(form) {
  return describeTicketTargetsSummary(form?.ticketTargets);
}

function kindLabel(kind, family, locale) {
  const filters = family === "support" ? SUPPORT_KIND_FILTERS : SALES_KIND_FILTERS;
  const match = filters.find(item => item.key === kind);
  if (!match) return kind || "-";
  return locale === "en" ? match.labelEn : match.labelFr;
}

export default function SalesFormsAdmin({ family = "sales" }) {
  const locale = useAppLocale();
  const deleteCopy = useMemo(() => getAdminDeleteConfirmsCopy(locale), [locale]);
  const isSupport = family === "support";
  const kindFilters = isSupport ? SUPPORT_KIND_FILTERS : SALES_KIND_FILTERS;
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [modalForm, setModalForm] = useState(null);

  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      const rows = isSupport
        ? await fetchSupportForms({ includeDisabled: true })
        : await fetchSalesForms({ includeDisabled: true });
      setForms(Array.isArray(rows) ? rows : []);
    } catch (error) {
      toast.error(error.message || (locale === "fr" ? "Erreur de chargement" : "Error loading forms"));
      setForms([]);
    } finally {
      setLoading(false);
    }
  }, [isSupport, locale]);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const filteredForms = useMemo(() => {
    if (!kindFilter) return forms;
    return forms.filter(form => form.kind === kindFilter);
  }, [forms, kindFilter]);

  const openCreateModal = () => {
    setModalMode("create");
    setModalForm(null);
    setModalOpen(true);
  };
  const openEditModal = form => {
    setModalMode("edit");
    setModalForm(form);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setModalForm(null);
  };
  const handleSaved = async () => {
    await loadForms();
  };
  const removeForm = async formId => {
    if (!window.confirm(deleteCopy.salesFormDelete)) return;
    try {
      if (isSupport) await deleteSupportForm(formId);
      else await deleteSalesForm(formId);
      toast.success(locale === "fr" ? "Formulaire supprimé" : "Form deleted");
      if (modalOpen && String(modalForm?.id) === String(formId)) closeModal();
      await loadForms();
    } catch (error) {
      toast.error(error.message || (locale === "fr" ? "Erreur de suppression" : "Error deleting form"));
    }
  };

  const cardTitle = isSupport
    ? (locale === "fr" ? "Formulaires support" : "Support forms")
    : (locale === "fr" ? "Formulaires prestations & installations" : "Professional services & installation forms");
  const cardDescription = isSupport
    ? (locale === "fr"
      ? "Créez des types de ticket (incident, demande, problème, changement) et les champs affichés à la création, y compris l’accès public."
      : "Create ticket types (incident, request, problem, change) and fields shown at creation, including public access.")
    : (locale === "fr"
      ? "Créez des types de demande (prestation ou installation) et les champs affichés à la création."
      : "Create request types (professional service or installation) and fields shown when creating a request.");
  const defaultKind = isSupport ? "incident" : "prestation";

  return <>
      <Card title={cardTitle} description={cardDescription} fill action={<Btn icon="mdi:plus" onClick={openCreateModal}>
            {locale === "fr" ? "Nouveau formulaire" : "New form"}
          </Btn>}>
        <div className={styles.subSectionHead} style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {kindFilters.map(item => <button key={item.key || "all"} type="button" className={`${pageLayout.chip} ${kindFilter === item.key ? pageLayout.chipActive : ""}`} onClick={() => setKindFilter(item.key)}>
                {locale === "en" ? item.labelEn : item.labelFr}
              </button>)}
          </div>
        </div>

        <div className={styles.userTableWrapper}>
          <table className={`${styles.userTable} ${styles.clientTable}`}>
            <thead>
              <tr>
                <th>{locale === "fr" ? "TYPE" : "TYPE"}</th>
                <th>{locale === "fr" ? "FORMULAIRE" : "FORM"}</th>
                <th>{locale === "fr" ? "CHAMPS" : "FIELDS"}</th>
                <th>{locale === "fr" ? "USAGES" : "USES"}</th>
                <th>{locale === "fr" ? "VISIBILITÉ" : "VISIBILITY"}</th>
                {isSupport ? <th>{locale === "fr" ? "PUBLIC" : "PUBLIC"}</th> : <th>{locale === "fr" ? "CIBLES" : "TICKET TARGETS"}</th>}
                <th>{locale === "fr" ? "ACTIF" : "ACTIVE"}</th>
                <th style={{ textAlign: "right" }}>{locale === "fr" ? "ACTIONS" : "ACTIONS"}</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "1rem", color: "var(--msp-muted)" }}>
                    {locale === "fr" ? "Chargement…" : "Loading…"}
                  </td>
                </tr>}
              {!loading && filteredForms.length === 0 && <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "1rem", color: "var(--msp-muted)" }}>
                    {locale === "fr" ? "Aucun formulaire configuré" : "No forms configured"}
                  </td>
                </tr>}
              {filteredForms.map(form => <tr key={form.id} className={styles.userRow}>
                  <td>{kindLabel(form.kind, family, locale)}</td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                      <Icon icon={form.icon || "mdi:file-document-outline"} aria-hidden />
                      {form.label}
                    </span>
                  </td>
                  <td>{form.fields?.length || 0}</td>
                  <td>{Number(form.usageCount) || 0}</td>
                  <td>{describeFormVisibility(form, locale)}</td>
                  <td>
                    {isSupport
                      ? (form.publicEnabled ? (form.publicSlug || (locale === "fr" ? "Oui" : "Yes")) : (locale === "fr" ? "Non" : "No"))
                      : describeTicketTargets(form)}
                  </td>
                  <td>{form.enabled !== false ? (locale === "fr" ? "Oui" : "Yes") : (locale === "fr" ? "Non" : "No")}</td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "0.25rem" }}>
                      <button type="button" className={styles.actionButton} title={locale === "fr" ? "Modifier" : "Edit"} onClick={() => openEditModal(form)}>
                        <Icon icon="mdi:pencil-outline" />
                      </button>
                      <button type="button" className={`${styles.actionButton} ${styles.danger}`} title={locale === "fr" ? "Supprimer" : "Delete"} onClick={() => removeForm(form.id)}>
                        <Icon icon="mdi:delete-outline" />
                      </button>
                    </div>
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </Card>

      <SalesFormModal
        open={modalOpen}
        mode={modalMode}
        initialForm={modalForm}
        family={family}
        kindDefault={kindFilter || defaultKind}
        onClose={closeModal}
        onSaved={handleSaved}
      />
    </>;
}
