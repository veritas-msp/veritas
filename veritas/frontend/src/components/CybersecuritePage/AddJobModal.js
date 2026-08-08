import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { fetchClientModules, saveClientModules } from "../../api/clients";
import styles from "./InstanceSauvegardeModal.module.css";
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : r & 0x3 | 0x8;
    return v.toString(16);
  });
};
function getStorageOptions(equipements) {
  const options = [];
  if (!equipements?.NAS) return options;
  equipements.NAS.forEach(item => {
    if (item.type === 'Disque dur externe') {
      options.push({
        value: `DISQUE-${item.nom}${item.numeroDisque ? `-${item.numeroDisque}` : ''}`,
        label: `${item.nom} (Disque dur externe)${item.numeroDisque ? ` - N°${item.numeroDisque}` : ''}`
      });
    } else if (item.type === 'NAS') {
      options.push({
        value: `NAS-${item.nom}`,
        label: `${item.nom} (NAS) - ${item.fabricant || ''} ${item.modele || ''}`
      });
      if (item.luns && Array.isArray(item.luns)) {
        item.luns.forEach(lun => {
          const lunName = lun.nom || lun.iqn || 'LUN';
          options.push({
            value: `LUN-${item.nom}-${lunName}`,
            label: `${lunName} (LUN sur ${item.nom})${lun.capacite ? ` - ${lun.capacite}` : ''}`
          });
        });
      }
    }
  });
  if (equipements.SAN) {
    equipements.SAN.forEach(san => {
      options.push({
        value: `SAN-${san.nom}`,
        label: `${san.nom} (SAN) - ${san.fabricant || ''} ${san.modele || ''}`
      });
      if (san.luns && Array.isArray(san.luns)) {
        san.luns.forEach(lun => {
          const lunName = lun.nom || lun.iqn || 'LUN';
          options.push({
            value: `LUN-${san.nom}-${lunName}`,
            label: `${lunName} (LUN sur ${san.nom})`
          });
        });
      }
    });
  }
  return options;
}
const REGULARITE_OPTIONS = ['Quotidienne', 'Hebdomadaire', 'Mensuelle', 'Annuelle'];
const RETENTION_OPTIONS = ['7 jours', '14 jours', '30 jours', '60 jours', '90 jours', '6 mois'];
const TYPE_OPTIONS = ['Complète', 'Incrémentale', 'Différentielle', 'Syntèse'];
export default function AddJobModal({
  open,
  onClose,
  clients = [],
  onSaved,
  mode = "add",
  clientId: initialClientId,
  instance: initialInstance,
  initialJob
}) {
  const isEdit = mode === "edit";
  const [clientId, setClientId] = useState(initialClientId || "");
  const [instanceId, setInstanceId] = useState(initialInstance ? initialInstance.id || initialInstance.instanceId || "" : "");
  const [equipements, setEquipements] = useState(null);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    serveurLie: "",
    stockageLie: "",
    type: "",
    regularite: "",
    horaire: "",
    retention: ""
  });
  const selectedInstance = instances.find(i => (i.id || i.instanceId) === instanceId) || (isEdit && initialInstance ? {
    ...initialInstance,
    id: initialInstance.id || initialInstance.instanceId
  } : null);
  const isHycu = selectedInstance?.logiciel === "HYCU Backup";
  const stockageOptions = getStorageOptions(equipements || {});
  const loadClientData = useCallback(async (cid, preserveInstanceId) => {
    if (!cid) {
      setEquipements(null);
      setInstances([]);
      setInstanceId("");
      return;
    }
    setLoading(true);
    try {
      const data = await fetchClientModules(cid);
      const eq = data.equipements || {};
      setEquipements(eq);
      const list = (eq.Backup?.instances || []).filter(inst => inst.logiciel === "HYCU Backup" || inst.logiciel === "Veeam");
      setInstances(list);
      setInstanceId(preserveInstanceId != null && preserveInstanceId !== "" ? preserveInstanceId : list.length ? list[0].id || list[0].instanceId : "");
    } catch (e) {
      toast.error("Error loading client data");
      setInstances([]);
      setEquipements(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!open) return;
    if (isEdit && initialClientId && initialInstance) {
      setClientId(initialClientId);
      setInstanceId(initialInstance.id || initialInstance.instanceId || "");
    } else {
      setClientId("");
      setInstanceId("");
      setForm({
        nom: "",
        serveurLie: "",
        stockageLie: "",
        type: "",
        regularite: "",
        horaire: "",
        retention: ""
      });
    }
    setInstances([]);
    setEquipements(null);
  }, [open, isEdit, initialClientId, initialInstance]);
  useEffect(() => {
    if (open && clientId) {
      const preserveId = isEdit && initialInstance ? initialInstance.id || initialInstance.instanceId || "" : null;
      loadClientData(clientId, preserveId);
    }
  }, [open, clientId, loadClientData, isEdit, initialInstance]);
  useEffect(() => {
    if (!open || !isEdit || !initialJob) return;
    setForm({
      nom: initialJob.nom || initialJob.jobName || "",
      serveurLie: initialJob.serveurLie || initialJob.source || "",
      stockageLie: initialJob.destination || initialJob.stockageLie || "",
      type: initialJob.type || initialJob.typeBackup || "",
      regularite: initialJob.regularite || "",
      horaire: initialJob.horaire || (initialJob.horaire === 0 ? "00:00" : "") || "",
      retention: initialJob.retention || ""
    });
  }, [open, isEdit, initialJob]);
  const updateForm = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.nom.trim()) {
      toast.error("Job name is required");
      return;
    }
    if (!clientId || !instanceId) {
      toast.error("Please select a client and an instance");
      return;
    }
    const inst = instances.find(i => (i.id || i.instanceId) === instanceId) || (isEdit ? initialInstance : null);
    if (!inst) return;
    setSaving(true);
    try {
      const data = await fetchClientModules(clientId);
      const eq = data.equipements || {};
      const currentInstances = eq.Backup?.instances || [];
      if (isEdit && initialJob) {
        const jobId = initialJob.id;
        const updatedJob = {
          ...initialJob,
          nom: form.nom.trim(),
          serveurLie: form.serveurLie || "",
          stockageLie: isHycu ? "" : form.stockageLie || "",
          destination: isHycu ? "Datacenter PSI" : form.stockageLie || "",
          type: form.type || "",
          regularite: form.regularite || "",
          horaire: form.horaire || "",
          retention: form.retention || ""
        };
        const updatedInstances = currentInstances.map(inSt => {
          if ((inSt.id || inSt.instanceId) !== instanceId) return inSt;
          const jobs = (inSt.jobs || []).map(j => (j.id || j.jobId) === jobId ? updatedJob : j);
          return {
            ...inSt,
            jobs
          };
        });
        await saveClientModules(clientId, {
          equipements: {
            ...eq,
            Backup: {
              instances: updatedInstances
            }
          }
        });
        toast.success("Job updated");
      } else {
        const newJob = {
          id: generateUUID(),
          nom: form.nom.trim(),
          serveurLie: form.serveurLie || "",
          stockageLie: isHycu ? "" : form.stockageLie || "",
          destination: isHycu ? "Datacenter PSI" : form.stockageLie || "",
          type: form.type || "",
          regularite: form.regularite || "",
          horaire: form.horaire || "",
          retention: form.retention || "",
          replicationVers: ""
        };
        const updatedInstances = currentInstances.map(inSt => {
          if ((inSt.id || inSt.instanceId) !== instanceId) return inSt;
          const jobs = [...(inSt.jobs || []), newJob];
          return {
            ...inSt,
            jobs
          };
        });
        await saveClientModules(clientId, {
          equipements: {
            ...eq,
            Backup: {
              instances: updatedInstances
            }
          }
        });
        toast.success("Job added");
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err?.message || (isEdit ? "Error updating job" : "Error adding job"));
    } finally {
      setSaving(false);
    }
  };
  if (!open) return null;
  const modalContent = <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{
      maxWidth: '640px'
    }}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <Icon icon={isEdit ? "mdi:pencil" : "mdi:backup-restore"} className={styles.modalIcon} />
            <h3>{isEdit ? "Edit job" : "Add a job"}</h3>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} title="Close">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {isEdit && initialInstance && <div className={styles.clientBadge} style={{
            marginBottom: "1rem"
          }}>
                Instance: <strong>{initialInstance.logiciel || "Backup"} {initialInstance.server ? `- ${initialInstance.server}` : ""}</strong>
              </div>}
            {!isEdit && <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>Client <span className={styles.required}>*</span></label>
                  <select className={styles.fieldInput} value={clientId} onChange={e => setClientId(e.target.value ? Number(e.target.value) : "")}>
                    <option value="">Select a client</option>
                    {(clients || []).map(c => <option key={c.id} value={c.id}>{c.name || c.nom || `Client ${c.id}`}</option>)}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>Instance (HYCU ou Veeam) <span className={styles.required}>*</span></label>
                  <select className={styles.fieldInput} value={instanceId} onChange={e => setInstanceId(e.target.value || "")} disabled={!clientId || loading || instances.length === 0}>
                    <option value="">Select an instance</option>
                    {instances.map(inst => <option key={inst.id || inst.instanceId} value={inst.id || inst.instanceId}>
                        {inst.logiciel || "Instance"} {inst.server ? `- ${inst.server}` : ""}
                      </option>)}
                  </select>
                  {clientId && !loading && instances.length === 0 && <p className={styles.loadingText}>No HYCU or Veeam instance for this client.</p>}
                </div>
              </div>}

            {(selectedInstance || isEdit && initialInstance) && <>
                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>Job name <span className={styles.required}>*</span></label>
                  <input type="text" className={styles.fieldInput} value={form.nom} onChange={e => updateForm("nom", e.target.value)} placeholder="Job name" />
                </div>
                {!isHycu && <>
                    <div className={styles.formGrid}>
                      <div className={styles.formField}>
                        <label className={styles.fieldLabel}>Target (server)</label>
                        <select className={styles.fieldInput} value={form.serveurLie} onChange={e => updateForm("serveurLie", e.target.value)}>
                          <option value="">No target</option>
                          {(equipements?.Serveurs || []).map((s, i) => <option key={i} value={s.nom}>
                              {s.nom} - {Array.isArray(s.role) ? s.role.join(", ") : s.role} ({s.ip})
                            </option>)}
                        </select>
                      </div>
                      <div className={styles.formField}>
                        <label className={styles.fieldLabel}>Destination</label>
                        <select className={styles.fieldInput} value={form.stockageLie} onChange={e => updateForm("stockageLie", e.target.value)}>
                          <option value="">No destination</option>
                          {stockageOptions.map((opt, i) => <option key={i} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className={styles.formGrid} style={{
                gridTemplateColumns: "1fr 1fr 1fr 1fr"
              }}>
                      <div className={styles.formField}>
                        <label className={styles.fieldLabel}>Backup type</label>
                        <select className={styles.fieldInput} value={form.type} onChange={e => updateForm("type", e.target.value)}>
                          <option value="">Select</option>
                          {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className={styles.formField}>
                        <label className={styles.fieldLabel}>Frequency</label>
                        <select className={styles.fieldInput} value={form.regularite} onChange={e => updateForm("regularite", e.target.value)}>
                          <option value="">Select</option>
                          {REGULARITE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className={styles.formField}>
                        <label className={styles.fieldLabel}>Horaire</label>
                        <input type="time" className={styles.fieldInput} value={form.horaire} onChange={e => updateForm("horaire", e.target.value)} />
                      </div>
                      <div className={styles.formField}>
                        <label className={styles.fieldLabel}>Retention</label>
                        <select className={styles.fieldInput} value={form.retention} onChange={e => updateForm("retention", e.target.value)}>
                          <option value="">Select</option>
                          {RETENTION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    </div>
                  </>}
              </>}
          </div>
          <div className={styles.modalFooter}>
            <div className={styles.modalFooterRight}>
              <button type="button" className={styles.cancelButton} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={styles.submitButton} disabled={saving || !selectedInstance && !(isEdit && initialInstance) || !form.nom.trim()}>
                {saving ? "Saving..." : isEdit ? "Save" : "Add job"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>;
  return createPortal(modalContent, document.body);
}
