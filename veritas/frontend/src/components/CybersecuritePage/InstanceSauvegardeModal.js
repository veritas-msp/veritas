import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";
import { fetchClientModules, saveClientModules } from "../../api/clients";
import styles from "./InstanceSauvegardeModal.module.css";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getCyberModalsCopy } from "./cyberModalsI18n";
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : r & 0x3 | 0x8;
    return v.toString(16);
  });
};
const INSTANCE_TYPE_LABELS = {
  'HYCU Backup': 'HYCU Backup',
  'Veeam': 'Veeam',
  'Active Backup for Microsoft 365': 'Active Backup for Microsoft 365',
  'HyperBackup': 'HyperBackup'
};
export default function InstanceBackupModal({
  open,
  onClose,
  mode,
  instanceType,
  clientId: initialClientId,
  clientName,
  instance: initialInstance,
  clients = [],
  onSaved
}) {
  const locale = useAppLocale();
  const cyberCopy = useMemo(() => getCyberModalsCopy(locale), [locale]);
  const isEdit = mode === 'edit';
  const [clientId, setClientId] = useState(initialClientId || '');
  const [equipements, setEquipements] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formInstance, setFormInstance] = useState(null);
  const currentLogiciel = isEdit ? initialInstance?.logiciel : instanceType;
  const loadModules = useCallback(async cid => {
    if (!cid) return null;
    setLoading(true);
    try {
      const data = await fetchClientModules(cid);
      setEquipements(data.equipements || {});
      const instances = data.equipements?.Sauvegarde?.instances || [];
      if (isEdit && initialInstance?.id) {
        const idx = instances.findIndex(inst => (inst.id || inst.instanceId) === (initialInstance.id || initialInstance.instanceId));
        if (idx >= 0) setFormInstance({
          ...instances[idx]
        });else setFormInstance({
          ...initialInstance
        });
      } else if (!isEdit && currentLogiciel) {
        const tempInstanceId = generateUUID();
        const newInstance = {
          id: tempInstanceId,
          logiciel: currentLogiciel,
          expiration: currentLogiciel === 'Veeam' ? '' : undefined,
          server: currentLogiciel === 'HYCU Backup' ? 'Datacenter PSI' : '',
          hyperbackupSource: currentLogiciel === 'HyperBackup' ? '' : undefined,
          hyperbackupDestination: currentLogiciel === 'HyperBackup' ? '' : undefined,
          jobs: currentLogiciel === 'HyperBackup' || currentLogiciel === 'HYCU Backup' ? [] : [],
          activeBackupModules: currentLogiciel === 'Active Backup for Microsoft 365' ? {
            oneDrive: false,
            sharePoint: false,
            exchange: false,
            teams: false,
            calendar: false,
            contacts: false
          } : undefined,
          activeBackupStorage: currentLogiciel === 'Active Backup for Microsoft 365' ? '' : undefined
        };
        setFormInstance(newInstance);
      }
      return data;
    } catch (e) {
      toast.error('Error loading client data');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isEdit, initialInstance, currentLogiciel]);
  useEffect(() => {
    if (!open) return;
    if (isEdit && initialClientId) {
      setClientId(initialClientId);
      loadModules(initialClientId);
    } else if (!isEdit && initialClientId) {
      setClientId(initialClientId);
      loadModules(initialClientId);
    } else if (!isEdit && !initialClientId) {
      setClientId('');
      setEquipements(null);
      setFormInstance(null);
    }
  }, [open, isEdit, initialClientId, loadModules]);
  useEffect(() => {
    if (!open) return;
    if (clientId && !isEdit && !formInstance && currentLogiciel) {
      loadModules(clientId);
    }
  }, [open, clientId, isEdit, currentLogiciel, loadModules]);
  const updateField = (field, value) => {
    setFormInstance(prev => prev ? {
      ...prev,
      [field]: value
    } : null);
  };
  const handleSubmit = async e => {
    e.preventDefault();
    const cid = isEdit ? initialClientId : clientId;
    if (!cid) {
      toast.error('Please select a client');
      return;
    }
    if (!formInstance) return;
    setSaving(true);
    try {
      const modulesData = equipements ? {
        equipements
      } : await fetchClientModules(cid);
      const existingEquipements = modulesData.equipements || {};
      const currentInstances = existingEquipements.Backup?.instances || [];
      let updatedInstances;
      if (isEdit) {
        const instanceId = formInstance.id || initialInstance?.id;
        updatedInstances = currentInstances.map(inst => (inst.id || inst.instanceId) === instanceId ? {
          ...formInstance,
          id: inst.id || formInstance.id
        } : inst);
      } else {
        updatedInstances = [...currentInstances, {
          ...formInstance
        }];
      }
      await saveClientModules(cid, {
        equipements: {
          ...existingEquipements,
          Backup: {
            instances: updatedInstances
          }
        }
      });
      toast.success(isEdit ? 'Instance updated' : 'Instance added');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Error saving');
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteInstance = async () => {
    if (!isEdit || !initialClientId || !formInstance) return;
    if (!window.confirm(cyberCopy.deleteBackupInstance)) return;
    setDeleting(true);
    try {
      const modulesData = equipements ? {
        equipements
      } : await fetchClientModules(initialClientId);
      const existingEquipements = modulesData.equipements || {};
      const currentInstances = existingEquipements.Backup?.instances || [];
      const instanceId = formInstance.id || initialInstance?.id;
      const updatedInstances = currentInstances.filter(inst => (inst.id || inst.instanceId) !== instanceId);
      await saveClientModules(initialClientId, {
        equipements: {
          ...existingEquipements,
          Backup: {
            instances: updatedInstances
          }
        }
      });
      toast.success("Instance deleted");
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err?.message || "Error during deletion");
    } finally {
      setDeleting(false);
    }
  };
  if (!open) return null;
  const showClientSelect = !isEdit && !initialClientId && !formInstance;
  const canShowForm = isEdit && formInstance || !isEdit && (initialClientId ? formInstance : clientId && formInstance);
  const modalContent = <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <Icon icon={isEdit ? 'mdi:pencil' : 'mdi:plus-circle'} className={styles.modalIcon} />
            <h3>
              {isEdit ? `Edit ${INSTANCE_TYPE_LABELS[currentLogiciel] || currentLogiciel} instance` : `Add ${INSTANCE_TYPE_LABELS[instanceType] || instanceType} instance`}
            </h3>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} title="Close">
            <FaTimes />
          </button>
        </div>

        {showClientSelect && <div className={styles.modalBody}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Client <span className={styles.required}>*</span></label>
              <select className={styles.fieldInput} value={clientId} onChange={e => setClientId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Select a client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.nom || `Client ${c.id}`}</option>)}
              </select>
            </div>
            {clientId && loading && <p className={styles.loadingText}>Loading...</p>}
          </div>}

        {!showClientSelect && <>
            {isEdit && clientName && <div className={styles.clientBadge}>
                Client : <strong>{clientName}</strong>
              </div>}
            {loading && !formInstance && <div className={styles.modalBody}><p className={styles.loadingText}>Loading...</p></div>}
            {canShowForm && formInstance && <form onSubmit={handleSubmit}>
                <div className={styles.modalBody}>
                  {}
                  {currentLogiciel === 'Veeam' && <div className={styles.formGrid}>
                      <div className={styles.formField}>
                        <label className={styles.fieldLabel}>Expiration date</label>
                        <input type="date" className={styles.fieldInput} value={formInstance.expiration ?? ''} onChange={e => updateField('expiration', e.target.value)} />
                      </div>
                      <div className={styles.formField}>
                        <label className={styles.fieldLabel}>Backup server</label>
                        <select className={styles.fieldInput} value={formInstance.server || ''} onChange={e => updateField('server', e.target.value)}>
                          <option value="">No backup server</option>
                          {(equipements?.Serveurs || []).map((s, i) => <option key={i} value={s.nom}>
                              {s.nom} - {Array.isArray(s.role) ? s.role.join(', ') : s.role} ({s.ip})
                            </option>)}
                        </select>
                      </div>
                    </div>}

                  {}
                  {currentLogiciel === 'Active Backup for Microsoft 365' && <div>
                      <div className={styles.formField}>
                        <label className={styles.fieldLabel}>Enabled modules</label>
                        <div className={styles.modulesGrid}>
                          {[{
                    key: 'oneDrive',
                    label: 'OneDrive'
                  }, {
                    key: 'sharePoint',
                    label: 'SharePoint'
                  }, {
                    key: 'exchange',
                    label: 'Exchange'
                  }, {
                    key: 'teams',
                    label: 'Teams'
                  }, {
                    key: 'calendar',
                    label: 'Calendar'
                  }, {
                    key: 'contacts',
                    label: 'Contacts'
                  }].map(({
                    key,
                    label
                  }) => <label key={key} className={styles.checkboxLabel}>
                              <input type="checkbox" checked={formInstance.activeBackupModules?.[key] || false} onChange={e => {
                      const updated = {
                        ...(formInstance.activeBackupModules || {
                          oneDrive: false,
                          sharePoint: false,
                          exchange: false,
                          teams: false,
                          calendar: false,
                          contacts: false
                        }),
                        [key]: e.target.checked
                      };
                      updateField('activeBackupModules', updated);
                    }} className={styles.checkbox} />
                              <span>{label}</span>
                            </label>)}
                        </div>
                      </div>
                      <div className={styles.formField}>
                        <label className={styles.fieldLabel}>Destination</label>
                        <select className={styles.fieldInput} value={formInstance.activeBackupStorage || ''} onChange={e => updateField('activeBackupStorage', e.target.value)}>
                          <option value="">Select a destination</option>
                          {(equipements?.NAS || []).filter(eq => eq.type === 'NAS' || eq.type === 'SAN').map((eq, i) => <option key={i} value={eq.nom}>
                                {eq.nom} {eq.modele ? `(${eq.modele})` : ''} {eq.ip ? ` - ${eq.ip}` : ''}
                              </option>)}
                        </select>
                      </div>
                    </div>}

                  {}
                  {currentLogiciel === 'HyperBackup' && <div className={styles.formGrid}>
                      <div className={styles.formField}>
                        <label className={styles.fieldLabel}>NAS d'origine</label>
                        <select className={styles.fieldInput} value={formInstance.hyperbackupSource ?? ''} onChange={e => updateField('hyperbackupSource', e.target.value)}>
                          <option value="">Select a source Synology NAS</option>
                          {(equipements?.NAS || []).filter(n => (n.fabricant || '').toLowerCase().includes('synology') || (n.nom || '').toLowerCase().includes('synology')).map((n, i) => <option key={i} value={`NAS-${n.nom}`}>
                                {n.nom} (NAS) - {n.fabricant || ''} {n.modele || ''}
                              </option>)}
                        </select>
                      </div>
                      <div className={styles.formField}>
                        <label className={styles.fieldLabel}>Destination NAS</label>
                        <select className={styles.fieldInput} value={formInstance.hyperbackupDestination ?? ''} onChange={e => updateField('hyperbackupDestination', e.target.value)}>
                          <option value="">Select a destination NAS or disk</option>
                          {(equipements?.NAS || []).filter(n => {
                    const src = formInstance.hyperbackupSource || '';
                    const v = `NAS-${n.nom}`;
                    return v !== src && ((n.fabricant || '').toLowerCase().includes('synology') || (n.nom || '').toLowerCase().includes('synology'));
                  }).map((n, i) => <option key={`nas-${i}`} value={`NAS-${n.nom}`}>
                                {n.nom} (NAS) - {n.fabricant || ''} {n.modele || ''}
                              </option>)}
                          {(equipements?.NAS || []).filter(n => n.type === 'Disque dur externe').map((d, i) => <option key={`d-${i}`} value={`DISQUE-${d.nom}${d.numeroDisque ? `-${d.numeroDisque}` : ''}`}>
                                {d.nom} (Disque dur externe){d.numeroDisque ? ` - N°${d.numeroDisque}` : ''}
                              </option>)}
                        </select>
                      </div>
                    </div>}

                  {}
                  {currentLogiciel === 'HYCU Backup' && <div className={styles.formField}>
                      <label className={styles.fieldLabel}>Server (Datacenter)</label>
                      <select className={styles.fieldInput} value={formInstance.server || 'Datacenter PSI'} onChange={e => updateField('server', e.target.value)}>
                        <option value="Datacenter PSI">Datacenter PSI</option>
                        {(equipements?.Serveurs || []).map((s, i) => <option key={i} value={s.nom}>
                            {s.nom} - {Array.isArray(s.role) ? s.role.join(', ') : s.role} ({s.ip})
                          </option>)}
                      </select>
                    </div>}
                </div>
                <div className={styles.modalFooter}>
                  {isEdit && <button type="button" className={styles.deleteButton} onClick={handleDeleteInstance} disabled={saving || deleting} title="Delete instance">
                      <FaTrash /> {deleting ? 'Deleting...' : 'Delete instance'}
                    </button>}
                  <div className={styles.modalFooterRight}>
                    <button type="button" className={styles.cancelButton} onClick={onClose}>
                      Cancel
                    </button>
                    <button type="submit" className={styles.submitButton} disabled={saving}>
                      {saving ? 'Saving...' : isEdit ? 'Save' : 'Add'}
                    </button>
                  </div>
                </div>
              </form>}
          </>}
      </div>
    </div>;
  return createPortal(modalContent, document.body);
}
