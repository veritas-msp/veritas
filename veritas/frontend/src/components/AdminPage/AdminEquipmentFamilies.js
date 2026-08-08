import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminCommonCopy, useAdminPageCopy } from "../../hooks/useAdminCopy";
import { interpolate } from "../../i18n/translate";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";
import { createEquipmentFamily, deleteEquipmentFamily, fetchEquipmentFamilies, updateEquipmentFamily } from "../../api/equipmentFamilies";
import EquipmentFamilyFormModal from "./EquipmentFamilyFormModal";
import { buildDefaultEquipmentFamilyDraft, buildEquipmentFamilyDraftFromFamily, getDefaultEquipmentFamilies } from "./equipmentFamilyConstants";
import { Btn, Card, ConfirmModal, Page, Switch, Table, Toolbar } from "./AdminUi";
import adminUi from "./AdminUi.module.css";
const EMPTY_FORM = buildDefaultEquipmentFamilyDraft();
export default function AdminEquipmentFamilies() {
  const copy = useAdminPageCopy("equipmentFamilies");
  const adminCopy = useAdminCommonCopy();
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const defaultFamilies = useMemo(() => getDefaultEquipmentFamilies(), []);
  const allFamilies = useMemo(() => {
    const custom = families.map(family => ({
      ...family,
      isSystem: false
    }));
    return [...defaultFamilies, ...custom].sort((a, b) => {
      if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label, "fr");
    });
  }, [defaultFamilies, families]);
  const notifyUpdated = () => {
    window.dispatchEvent(new CustomEvent("equipmentFamiliesUpdated"));
  };
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchEquipmentFamilies({
        admin: true
      });
      setFamilies(data);
    } catch (err) {
      toast.error(err.message || copy.loadError);
      setFamilies([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const openCreate = () => {
    setEditing(null);
    setForm(buildDefaultEquipmentFamilyDraft());
    setModalOpen(true);
  };
  const openEdit = family => {
    setEditing(family);
    setForm(buildEquipmentFamilyDraftFromFamily(family));
    setModalOpen(true);
  };
  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };
  const saveFamily = async () => {
    setSaving(true);
    try {
      const payload = {
        label: form.label.trim(),
        icon: form.icon.trim() || "mdi:devices",
        displayMode: form.displayMode || "hexagon",
        enabled: form.enabled !== false,
        sortOrder: form.sortOrder === "" ? 100 : Number(form.sortOrder),
        honeycombQ: form.honeycombQ === "" ? null : Number(form.honeycombQ),
        honeycombR: form.honeycombR === "" ? null : Number(form.honeycombR),
        fields: (form.fields || []).map((field, index) => ({
          fieldKey: field.fieldKey,
          label: String(field.label || "").trim(),
          fieldType: field.fieldType || "text",
          required: Boolean(field.required),
          displayOrder: (index + 1) * 10
        })).filter(field => field.label)
      };
      if (!payload.label) {
        toast.warn(copy.labelRequired);
        return;
      }
      if (editing) {
        const {
          family
        } = await updateEquipmentFamily(editing.id, payload);
        setFamilies(prev => prev.map(item => item.id === family.id ? family : item));
        toast.success(copy.updated);
      } else {
        if (form.familyKey.trim()) payload.familyKey = form.familyKey.trim();
        const {
          family
        } = await createEquipmentFamily(payload);
        setFamilies(prev => [...prev, family].sort((a, b) => a.sortOrder - b.sortOrder));
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
  const toggleEnabled = async (family, enabled) => {
    try {
      const {
        family: updated
      } = await updateEquipmentFamily(family.id, {
        enabled
      });
      setFamilies(prev => prev.map(item => item.id === updated.id ? updated : item));
      notifyUpdated();
    } catch (err) {
      toast.error(err.message || copy.toggleError);
    }
  };
  const handleDelete = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      await deleteEquipmentFamily(confirmDelete.id);
      setFamilies(prev => prev.filter(item => item.id !== confirmDelete.id));
      toast.success(copy.deleted);
      notifyUpdated();
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err.message || copy.deleteError);
    } finally {
      setSaving(false);
    }
  };
  const columns = [{
    key: "enabled",
    label: adminCopy.activeColumn,
    width: "72px",
    render: row => row.isSystem ? <Icon icon="mdi:lock-outline" title={adminCopy.systemFamily} style={{
      fontSize: "1.1rem",
      color: "var(--msp-muted-light, #94a3b8)"
    }} /> : <Switch checked={row.enabled} onChange={on => toggleEnabled(row, on)} />
  }, {
    key: "label",
    label: adminCopy.family,
    render: row => <div>
          <div className={adminUi.tablePrimaryText}>{row.label}</div>
          <div className={adminUi.tableSubtext}>
            {row.familyKey}
            {row.isSystem ? ` · ${adminCopy.defaultBadge}` : ""}
          </div>
        </div>
  }, {
    key: "icon",
    label: adminCopy.icon,
    width: "72px",
    render: row => <Icon icon={row.icon || "mdi:devices"} style={{
      fontSize: "1.25rem",
      color: "var(--msp-accent)"
    }} />
  }, {
    key: "fields",
    label: adminCopy.fields,
    width: "88px",
    render: row => row.isSystem ? adminCopy.integrated : row.fields?.length || 0
  }, {
    key: "items",
    label: adminCopy.equipment,
    width: "88px",
    render: row => row.isSystem ? "-" : row.itemCount || 0
  }, {
    key: "displayMode",
    label: adminCopy.display,
    width: "100px",
    render: row => row.displayMode === "brick" ? adminCopy.brick : adminCopy.hexagon
  }, {
    key: "actions",
    label: "",
    width: "88px",
    render: row => row.isSystem ? <span className={adminUi.tableSubtext} title={adminCopy.builtInFamily}>-</span> : <div className={adminUi.tableActions}>
            <button type="button" className={adminUi.tableActionBtn} title={adminCopy.edit} onClick={() => openEdit(row)}>
              <Icon icon="mdi:pencil-outline" />
            </button>
            <button type="button" className={`${adminUi.tableActionBtn} ${adminUi.tableActionBtnDanger}`} title={adminCopy.delete} onClick={() => setConfirmDelete(row)}>
              <Icon icon="mdi:trash-can-outline" />
            </button>
          </div>
  }];
  return <Page>
      <Card title={copy.title} description={copy.description} fill action={<Btn icon="mdi:plus" onClick={openCreate}>
            {copy.newFamily}
          </Btn>}>
        <Toolbar meta={(() => {
        const custom = families.length;
        const active = families.filter(f => f.enabled).length;
        const key = custom > 1 && active > 1 ? "metaBothPlural" : custom > 1 ? "metaCustomPlural" : active > 1 ? "metaActivePlural" : "meta";
        return interpolate(copy[key], {
          defaults: defaultFamilies.length,
          custom,
          active
        });
      })()} />

        {loading ? <p className={adminUi.adminMutedText}>{adminCopy.loading}</p> : <Table columns={columns} rows={allFamilies} emptyMessage={copy.empty} />}
      </Card>

      <EquipmentFamilyFormModal open={modalOpen} mode={editing ? "edit" : "create"} draft={form} setDraft={setForm} saving={saving} onClose={closeModal} onSave={saveFamily} />

      <ConfirmModal open={Boolean(confirmDelete)} onClose={() => !saving && setConfirmDelete(null)} onConfirm={handleDelete} title={copy.deleteTitle} message={confirmDelete ? interpolate(copy.deleteMessage, {
      label: confirmDelete.label
    }) : ""} confirmLabel={adminCopy.delete} icon="mdi:trash-can-outline" confirmVariant="danger" />
    </Page>;
}
