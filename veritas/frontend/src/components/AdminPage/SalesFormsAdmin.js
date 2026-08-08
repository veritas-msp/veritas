import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { deleteSalesForm, fetchSalesForms } from "../../api/tickets";
import { describeTicketTargetsSummary } from "../../utils/salesFormTargetRules";
import { Card, Btn } from "./AdminUi";
import SalesFormModal from "./SalesFormModal";
import styles from "./AdminTickets.module.css";
import pageLayout from "../EnterprisesPage/EnterprisesPage.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getAdminDeleteConfirmsCopy } from "./adminModalsI18n";
function describeFormVisibility(form) {
  if (form?.visibility !== "assigned") return "All agents";
  const parts = [];
  if (form.profileNames?.length) parts.push(`${form.profileNames.length} profile(s)`);
  if (form.userIds?.length) parts.push(`${form.userIds.length} agent(s)`);
  if (form.teamIds?.length) parts.push(`${form.teamIds.length} team(s)`);
  return parts.length ? parts.join(" · ") : "Restricted (empty)";
}
function describeTicketTargets(form) {
  return describeTicketTargetsSummary(form?.ticketTargets);
}
export default function SalesFormsAdmin() {
  const locale = useAppLocale();
  const deleteCopy = useMemo(() => getAdminDeleteConfirmsCopy(locale), [locale]);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [modalForm, setModalForm] = useState(null);
  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchSalesForms({
        includeDisabled: true
      });
      setForms(Array.isArray(rows) ? rows : []);
    } catch (error) {
      toast.error(error.message || "Error loading forms");
      setForms([]);
    } finally {
      setLoading(false);
    }
  }, []);
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
      await deleteSalesForm(formId);
      toast.success("Form deleted");
      if (modalOpen && String(modalForm?.id) === String(formId)) closeModal();
      await loadForms();
    } catch (error) {
      toast.error(error.message || "Error deleting form");
    }
  };
  return <>
      <Card title="Professional services & installation forms" description="Create request types (professional service or installation) and fields shown when creating a request." fill action={<Btn icon="mdi:plus" onClick={openCreateModal}>
            New form
          </Btn>}>
        <div className={styles.subSectionHead} style={{
        marginBottom: "1rem"
      }}>
          <div style={{
          display: "flex",
          gap: "0.5rem"
        }}>
            {[{
            key: "",
            label: "All"
          }, {
            key: "prestation",
            label: "Professional services"
          }, {
            key: "installation",
            label: "Installations"
          }].map(item => <button key={item.key || "all"} type="button" className={`${pageLayout.chip} ${kindFilter === item.key ? pageLayout.chipActive : ""}`} onClick={() => setKindFilter(item.key)}>
                {item.label}
              </button>)}
          </div>
        </div>

        <div className={styles.userTableWrapper}>
          <table className={`${styles.userTable} ${styles.clientTable}`}>
            <thead>
              <tr>
                <th>TYPE</th>
                <th>FORM</th>
                <th>CATEGORY</th>
                <th>FIELDS</th>
                <th>USES</th>
                <th>VISIBILITY</th>
                <th>TICKET TARGETS</th>
                <th>ACTIVE</th>
                <th style={{
                textAlign: "right"
              }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr>
                  <td colSpan={9} style={{
                textAlign: "center",
                padding: "1rem",
                color: "var(--msp-muted)"
              }}>
                    Loading…
                  </td>
                </tr>}
              {!loading && filteredForms.length === 0 && <tr>
                  <td colSpan={9} style={{
                textAlign: "center",
                padding: "1rem",
                color: "var(--msp-muted)"
              }}>
                    No forms configured
                  </td>
                </tr>}
              {filteredForms.map(form => <tr key={form.id} className={styles.userRow}>
                  <td>{form.kind === "installation" ? "Installation" : "Professional service"}</td>
                  <td>
                    <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem"
                }}>
                      <Icon icon={form.icon || "mdi:file-document-outline"} aria-hidden />
                      {form.label}
                    </span>
                  </td>
                  <td>{form.categorySlug}</td>
                  <td>{form.fields?.length || 0}</td>
                  <td>{Number(form.usageCount) || 0}</td>
                  <td>{describeFormVisibility(form)}</td>
                  <td>{describeTicketTargets(form)}</td>
                  <td>{form.enabled !== false ? "Yes" : "No"}</td>
                  <td style={{
                textAlign: "right"
              }}>
                    <div style={{
                  display: "inline-flex",
                  gap: "0.25rem"
                }}>
                      <button type="button" className={styles.actionButton} title="Edit" onClick={() => openEditModal(form)}>
                        <Icon icon="mdi:pencil-outline" />
                      </button>
                      <button type="button" className={`${styles.actionButton} ${styles.danger}`} title="Delete" onClick={() => removeForm(form.id)}>
                        <Icon icon="mdi:delete-outline" />
                      </button>
                    </div>
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </Card>

      <SalesFormModal open={modalOpen} mode={modalMode} initialForm={modalForm} kindDefault={kindFilter || "prestation"} onClose={closeModal} onSaved={handleSaved} />
    </>;
}
