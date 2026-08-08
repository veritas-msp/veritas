import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { createPlanningEventType, deletePlanningEventType, fetchPlanningEventTypes, resetPlanningEventTypes, updatePlanningEventType } from "../../api/planningEventTypes";
import { useAdminCommonCopy } from "../../hooks/useAdminCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { getPlanningAdminPageCopy } from "./adminPlanningI18n";
import PlanningEventTypeFormModal from "./PlanningEventTypeFormModal";
import { buildDefaultPlanningEventTypeDraft, buildPlanningEventTypeDraftFromType, getPlanningKpiToneColor } from "./planningEventTypeConstants";
import { Btn, Card, ConfirmModal, Page, Switch, Table, Toolbar } from "./AdminUi";
import adminUi from "./AdminUi.module.css";
import formStyles from "./ContractModuleOptionFormModal.module.css";

const EMPTY_FORM = buildDefaultPlanningEventTypeDraft();

export default function AdminPlanning() {
  const locale = useAppLocale();
  const copy = useMemo(() => getPlanningAdminPageCopy(locale), [locale]);
  const adminCopy = useAdminCommonCopy();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const notifyUpdated = () => {
    window.dispatchEvent(new CustomEvent("planningEventTypesUpdated"));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPlanningEventTypes({
        admin: true
      });
      setTypes(data);
    } catch (err) {
      toast.error(err.message || copy.loadError);
      setTypes([]);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = type => {
    setEditing(type);
    setForm(buildPlanningEventTypeDraftFromType(type));
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const saveType = async () => {
    setSaving(true);
    try {
      const payload = {
        label: form.label.trim(),
        icon: form.icon.trim() || "mdi:calendar-blank",
        kpiTone: form.kpiTone || "blue",
        enabled: form.enabled !== false,
        formSelectable: form.formSelectable !== false
      };
      if (!payload.label) {
        toast.warn(copy.labelRequired);
        return;
      }
      if (form.sortOrder !== "") payload.sortOrder = Number(form.sortOrder);
      if (editing) {
        const {
          type
        } = await updatePlanningEventType(editing.id, payload);
        setTypes(prev => prev.map(item => item.id === type.id ? type : item));
        toast.success(copy.updated);
      } else {
        if (form.typeKey.trim()) payload.typeKey = form.typeKey.trim();
        const {
          type
        } = await createPlanningEventType(payload);
        setTypes(prev => [...prev, type].sort((a, b) => a.sortOrder - b.sortOrder));
        toast.success(copy.created);
      }
      notifyUpdated();
      closeModal();
    } catch (err) {
      toast.error(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (type, enabled) => {
    try {
      const {
        type: updated
      } = await updatePlanningEventType(type.id, {
        enabled
      });
      setTypes(prev => prev.map(item => item.id === updated.id ? updated : item));
      notifyUpdated();
    } catch (err) {
      toast.error(err.message || copy.toggleError);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      await deletePlanningEventType(confirmDelete.id);
      setTypes(prev => prev.filter(item => item.id !== confirmDelete.id));
      notifyUpdated();
      toast.success(copy.deleted);
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err.message || copy.deleteError);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      const data = await resetPlanningEventTypes();
      setTypes(data.types || []);
      notifyUpdated();
      toast.success(copy.resetSuccess);
      setConfirmReset(false);
    } catch (err) {
      toast.error(err.message || copy.resetError);
    } finally {
      setSaving(false);
    }
  };

  const columns = [{
    key: "enabled",
    label: adminCopy.activeColumn,
    width: "72px",
    render: row => <Switch checked={row.enabled} onChange={on => toggleEnabled(row, on)} />
  }, {
    key: "label",
    label: adminCopy.label,
    render: row => <div>
          <div className={adminUi.tablePrimaryText}>{row.label}</div>
          <div className={adminUi.tableSubtext}>
            {row.typeKey}
            {row.eventUsageCount > 0 ? <span className={adminUi.tableUsageWarn}>
                {interpolate(row.eventUsageCount > 1 ? copy.eventUsagePlural : copy.eventUsage, {
            count: row.eventUsageCount
          })}
              </span> : null}
          </div>
        </div>
  }, {
    key: "icon",
    label: adminCopy.icon,
    width: "72px",
    render: row => <Icon icon={row.icon || "mdi:calendar-blank"} style={{
      fontSize: "1.25rem",
      color: "var(--msp-accent)"
    }} />
  }, {
    key: "kpiTone",
    label: copy.toneColumn,
    width: "100px",
    render: row => {
      const tone = row.kpiTone || "blue";
      return <span className={formStyles.toneSwatchInline} style={{
        background: getPlanningKpiToneColor(tone)
      }} title={tone} aria-label={tone} />;
    }
  }, {
    key: "formSelectable",
    label: copy.formSelectableYes,
    width: "140px",
    render: row => row.formSelectable !== false ? copy.formSelectableYes : copy.formSelectableNo
  }, {
    key: "actions",
    label: "",
    width: "88px",
    render: row => {
      const blocked = row.typeKey === "campagne" || row.eventUsageCount > 0;
      return <div className={adminUi.tableActions}>
            <button type="button" className={adminUi.tableActionBtn} title={adminCopy.edit} onClick={() => openEdit(row)}>
              <Icon icon="mdi:pencil-outline" />
            </button>
            <button type="button" className={`${adminUi.tableActionBtn} ${adminUi.tableActionBtnDanger}`} title={blocked ? interpolate(row.eventUsageCount > 1 ? copy.deleteBlockedPlural : copy.deleteBlocked, {
          count: row.eventUsageCount || 0
        }) : adminCopy.delete} disabled={blocked} onClick={() => !blocked && setConfirmDelete(row)}>
              <Icon icon="mdi:trash-can-outline" />
            </button>
          </div>;
    }
  }];

  const activeCount = types.filter(t => t.enabled).length;
  const total = types.length;
  const metaKey = total > 1 && activeCount > 1 ? "metaBothPlural" : total > 1 ? "metaPlural" : activeCount > 1 ? "metaActivePlural" : "meta";

  return <Page>
      <Card title={copy.title} description={copy.description} fill action={<Btn icon="mdi:plus" onClick={openCreate}>
            {copy.newType}
          </Btn>}>
        <Toolbar meta={interpolate(copy[metaKey], {
        total,
        active: activeCount
      })} action={<Btn variant="secondary" size="sm" icon="mdi:restore" onClick={() => setConfirmReset(true)}>
              {copy.reset}
            </Btn>} />
        {loading ? <p className={adminUi.adminMutedText}>{adminCopy.loading}</p> : <Table columns={columns} rows={types} emptyMessage={copy.empty} />}
      </Card>

      <PlanningEventTypeFormModal open={modalOpen} mode={editing ? "edit" : "create"} draft={form} setDraft={setForm} saving={saving} onClose={closeModal} onSave={saveType} />

      <ConfirmModal open={Boolean(confirmDelete)} onClose={() => !saving && setConfirmDelete(null)} onConfirm={handleDelete} title={copy.deleteTitle} message={confirmDelete ? interpolate(copy.deleteMessage, {
      label: confirmDelete.label
    }) : ""} confirmLabel={adminCopy.delete} icon="mdi:trash-can-outline" confirmVariant="danger" />

      <ConfirmModal open={confirmReset} onClose={() => !saving && setConfirmReset(false)} onConfirm={handleReset} title={copy.resetTitle} message={copy.resetMessage} confirmLabel={copy.reset} icon="mdi:restore" confirmVariant="primary" />
    </Page>;
}
