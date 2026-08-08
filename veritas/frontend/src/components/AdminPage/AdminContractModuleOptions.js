import { useCallback, useEffect, useState } from "react";
import { useAdminCommonCopy, useAdminPageCopy } from "../../hooks/useAdminCopy";
import { interpolate } from "../../i18n/translate";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";
import { createContractModuleOption, deleteContractModuleOption, fetchContractModuleOptionsAdmin, resetContractModuleOptions, updateContractModuleOption } from "../../api/contractModuleOptions";
import ContractModuleOptionFormModal from "./ContractModuleOptionFormModal";
import { buildContractModuleOptionDraftFromModule, buildDefaultContractModuleOptionDraft } from "./contractModuleOptionConstants";
import { Btn, Card, ConfirmModal, Page, Switch, Table, Toolbar } from "./AdminUi";
import adminUi from "./AdminUi.module.css";
const EMPTY_FORM = buildDefaultContractModuleOptionDraft();
export default function AdminContractModuleOptions() {
  const copy = useAdminPageCopy("contractModules");
  const adminCopy = useAdminCommonCopy();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const notifyUpdated = () => {
    window.dispatchEvent(new CustomEvent("contractModuleOptionsUpdated"));
  };
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchContractModuleOptionsAdmin();
      setModules(data.modules || []);
    } catch (err) {
      toast.error(err.message || copy.loadError);
      setModules([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };
  const openEdit = mod => {
    setEditing(mod);
    setForm(buildContractModuleOptionDraftFromModule(mod));
    setModalOpen(true);
  };
  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };
  const saveModule = async () => {
    setSaving(true);
    try {
      const payload = {
        label: form.label.trim(),
        icon: form.icon.trim() || "mdi:puzzle-outline",
        enabled: form.enabled
      };
      if (!editing && form.moduleKey.trim()) payload.moduleKey = form.moduleKey.trim();
      if (form.sortOrder !== "") payload.sortOrder = Number(form.sortOrder);
      if (editing) {
        const {
          module
        } = await updateContractModuleOption(editing.id, payload);
        setModules(prev => prev.map(m => m.id === module.id ? module : m));
        toast.success(copy.updated);
      } else {
        const {
          module
        } = await createContractModuleOption(payload);
        setModules(prev => [...prev, module].sort((a, b) => a.sortOrder - b.sortOrder));
        toast.success(copy.added);
      }
      notifyUpdated();
      closeModal();
    } catch (err) {
      toast.error(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };
  const toggleEnabled = async (mod, enabled) => {
    try {
      const {
        module
      } = await updateContractModuleOption(mod.id, {
        enabled
      });
      setModules(prev => prev.map(m => m.id === module.id ? module : m));
      notifyUpdated();
    } catch (err) {
      toast.error(err.message || copy.toggleError);
    }
  };
  const handleDelete = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      await deleteContractModuleOption(confirmDelete.id);
      setModules(prev => prev.filter(m => m.id !== confirmDelete.id));
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
      const data = await resetContractModuleOptions();
      setModules(data.modules || []);
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
            {row.moduleKey}
            {row.clientUsageCount > 0 && <span className={adminUi.tableUsageWarn}>
                {interpolate(row.clientUsageCount > 1 ? copy.clientUsagePlural : copy.clientUsage, {
            count: row.clientUsageCount
          })}
              </span>}
          </div>
        </div>
  }, {
    key: "icon",
    label: adminCopy.icon,
    width: "72px",
    render: row => <Icon icon={row.icon || "mdi:puzzle-outline"} style={{
      fontSize: "1.25rem",
      color: "var(--msp-accent)"
    }} />
  }, {
    key: "sortOrder",
    label: adminCopy.order,
    width: "72px",
    render: row => row.sortOrder
  }, {
    key: "actions",
    label: "",
    width: "88px",
    render: row => {
      const inUse = (row.clientUsageCount || 0) > 0;
      const deleteTitle = inUse ? interpolate(row.clientUsageCount > 1 ? copy.deleteBlockedPlural : copy.deleteBlocked, {
        count: row.clientUsageCount
      }) : adminCopy.delete;
      return <div className={adminUi.tableActions}>
          <button type="button" className={adminUi.tableActionBtn} title={adminCopy.edit} onClick={() => openEdit(row)}>
            <Icon icon="mdi:pencil-outline" />
          </button>
          <button type="button" className={`${adminUi.tableActionBtn} ${adminUi.tableActionBtnDanger}`} title={deleteTitle} disabled={inUse} onClick={() => !inUse && setConfirmDelete(row)} style={{
          cursor: inUse ? "not-allowed" : "pointer",
          opacity: inUse ? 0.45 : 1
        }}>
            <Icon icon="mdi:trash-can-outline" />
          </button>
        </div>;
    }
  }];
  return <Page>
      <Card title={copy.title} description={copy.description} fill action={<Btn icon="mdi:plus" onClick={openCreate}>
            {copy.addOption}
          </Btn>}>
        <Toolbar meta={(() => {
        const total = modules.length;
        const active = modules.filter(m => m.enabled).length;
        const key = total > 1 && active > 1 ? "metaBothPlural" : total > 1 ? "metaPlural" : active > 1 ? "metaActivePlural" : "meta";
        return interpolate(copy[key], {
          total,
          active
        });
      })()} action={<Btn variant="secondary" size="sm" icon="mdi:restore" onClick={() => setConfirmReset(true)}>
              {adminCopy.reset}
            </Btn>} />

        {loading ? <p className={adminUi.adminMutedText}>{adminCopy.loading}</p> : <Table columns={columns} rows={modules} emptyMessage={copy.empty} />}
      </Card>

      <ContractModuleOptionFormModal open={modalOpen} mode={editing ? "edit" : "create"} draft={form} setDraft={setForm} saving={saving} onClose={closeModal} onSave={saveModule} />

      <ConfirmModal open={confirmReset} onClose={() => !saving && setConfirmReset(false)} onConfirm={handleReset} title={copy.resetTitle} message={copy.resetMessage} confirmLabel={adminCopy.reset} icon="mdi:restore" confirmVariant="primary" />

      <ConfirmModal open={Boolean(confirmDelete)} onClose={() => !saving && setConfirmDelete(null)} onConfirm={handleDelete} title={copy.deleteTitle} message={interpolate(copy.deleteMessage, {
      label: confirmDelete?.label || ""
    })} confirmLabel={adminCopy.delete} />
    </Page>;
}
