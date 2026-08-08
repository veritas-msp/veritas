import React, { useState, useMemo, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { fetchClientModules, saveClientModules } from "../../api/clients";
import { showError, showSuccess } from "../../utils/toast";
import addStyles from "../EquipementPage/AddEquipmentModal.module.css";
import styles from "./CybersecuritePage.module.css";
import CenteredFormModal from "../Misc/CenteredFormModal";
const DEFAULT_ANTISPAM_SOLUTION_NAME = "Solution antispam";
function formatDateForInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export default function AntispamSolutionModal({
  clients,
  onClose,
  onSaved,
  mode = "add",
  client: editClient = null,
  initialSolution = null
}) {
  const isEdit = mode === "edit" && editClient && initialSolution;
  const [step, setStep] = useState(isEdit ? 2 : 1);
  const [selectedClient, setSelectedClient] = useState(isEdit ? editClient : null);
  const [enterpriseSearch, setEnterpriseSearch] = useState("");
  const [enterpriseDropdownOpen, setEnterpriseDropdownOpen] = useState(false);
  const enterpriseAutocompleteRef = useRef(null);
  const [loadingClientModules, setLoadingClientModules] = useState(isEdit);
  const [clientModules, setClientModules] = useState(null);
  const [expiration, setExpiration] = useState(isEdit ? formatDateForInput(initialSolution.expiration) : "");
  const [protectedUsers, setProtectedUsers] = useState(isEdit ? String(initialSolution.utilisateursProteges ?? initialSolution.utilisateurs ?? "") : "");
  const [watchedDomains, setWatchedDomains] = useState(isEdit ? String(initialSolution.domainesSurveilles ?? initialSolution.domaines ?? initialSolution.licences ?? initialSolution.nombre_licences ?? "") : "");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (isEdit && editClient?.id && !clientModules) {
      let cancelled = false;
      setLoadingClientModules(true);
      fetchClientModules(editClient.id).then(data => {
        if (!cancelled) setClientModules(data);
      }).catch(err => {
        console.error("Error chargement modules client:", err);
        if (!cancelled) showError("Error loading client data.");
      }).finally(() => {
        if (!cancelled) setLoadingClientModules(false);
      });
      return () => {
        cancelled = true;
      };
    }
  }, [isEdit, editClient?.id, clientModules]);
  useEffect(() => {
    const handleClickOutside = e => {
      if (enterpriseAutocompleteRef.current && !enterpriseAutocompleteRef.current.contains(e.target)) {
        setEnterpriseDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const antispamClients = useMemo(() => clients || [], [clients]);
  const filteredClients = useMemo(() => {
    const q = enterpriseSearch.trim().toLowerCase();
    if (!q) return antispamClients;
    return antispamClients.filter(c => (c.name || "").toLowerCase().includes(q));
  }, [antispamClients, enterpriseSearch]);
  const handleSelectClient = async client => {
    setSelectedClient(client);
    setEnterpriseSearch(client.name);
    setEnterpriseDropdownOpen(false);
    setStep(2);
    setLoadingClientModules(true);
    try {
      const modulesData = await fetchClientModules(client.id);
      setClientModules(modulesData);
    } catch (error) {
      console.error("Error chargement modules client:", error);
      showError("Error loading client data.");
      setStep(1);
      setSelectedClient(null);
    } finally {
      setLoadingClientModules(false);
    }
  };
  const handleClose = () => {
    onClose?.();
  };
  const totalSteps = 2;
  const handleSave = async () => {
    if (!selectedClient?.id) {
      showError("Client introuvable.");
      return;
    }
    try {
      setSaving(true);
      const modulesData = clientModules || {};
      const solutionLabel = isEdit && (initialSolution.logiciel || initialSolution.nom || initialSolution.solution || "").trim() || DEFAULT_ANTISPAM_SOLUTION_NAME;
      const modules = modulesData.modules || selectedClient.modules || {
        Monitoring: true,
        Preventif: false
      };
      const existingMonitoring = modulesData.modules_monitoring || selectedClient.modules_monitoring || {};
      const modulesMonitoring = {
        ...existingMonitoring,
        Antispam: true
      };
      const existingEquipements = modulesData.equipements || selectedClient.equipements || {};
      const antispamEquipement = existingEquipements.Antispam || {};
      const existingSolutions = Array.isArray(antispamEquipement.solutions) ? antispamEquipement.solutions : [];
      const solutionId = isEdit ? initialSolution.id ?? initialSolution.item_key : Date.now();
      const updatedSolution = {
        ...(isEdit && typeof initialSolution === "object" ? initialSolution : {}),
        id: solutionId,
        logiciel: solutionLabel,
        nom: solutionLabel,
        expiration: expiration || "",
        utilisateursProteges: protectedUsers ? parseInt(protectedUsers, 10) || 0 : 0,
        domainesSurveilles: watchedDomains ? parseInt(watchedDomains, 10) || 0 : 0
      };
      const newSolutions = isEdit ? existingSolutions.map(s => String(s.id ?? s.item_key ?? "") === String(solutionId) ? updatedSolution : s) : [...existingSolutions, updatedSolution];
      const updatedEquipements = {
        ...existingEquipements,
        Antispam: {
          ...antispamEquipement,
          solutions: newSolutions
        }
      };
      await saveClientModules(selectedClient.id, {
        modules,
        modules_monitoring: modulesMonitoring,
        equipements: updatedEquipements
      });
      showSuccess(isEdit ? "Antispam solution updated." : "Antispam solution added successfully.");
      onSaved?.({
        clientId: selectedClient.id,
        solution: updatedSolution,
        isEdit
      });
      onClose?.();
    } catch (error) {
      console.error("Error saving the antispam solution:", error);
      showError("Error saving the antispam solution.");
    } finally {
      setSaving(false);
    }
  };
  return <CenteredFormModal isOpen={true} onClose={handleClose} title={isEdit ? "Edit antispam solution" : "Add an antispam solution"} icon="mdi:email-secure">
      <div className={addStyles.body}>
        {!isEdit && step === 1 && <div className={addStyles.stepContent}>
            <p className={addStyles.stepDescription}>
              Select the company for which you want
              to add an antispam solution.
            </p>
            {antispamClients.length === 0 ? <p className={addStyles.noClients}>
                No clients available. First configure clients
                on the Companies page.
              </p> : <div className={addStyles.step4Form}>
                <label className={addStyles.clientSelectLabel}>
                  Company
                </label>
                <div className={addStyles.enterpriseAutocomplete} ref={enterpriseAutocompleteRef}>
                  <input type="text" className={addStyles.enterpriseInput} placeholder="Search for a company..." value={enterpriseSearch || (selectedClient?.name ?? "")} onChange={e => {
              setEnterpriseSearch(e.target.value);
              setSelectedClient(null);
              setEnterpriseDropdownOpen(true);
            }} onFocus={() => setEnterpriseDropdownOpen(true)} />
                  {enterpriseDropdownOpen && <div className={addStyles.enterpriseDropdown}>
                      {filteredClients.length === 0 ? <div className={addStyles.enterpriseDropdownEmpty}>
                          No company found
                        </div> : filteredClients.slice(0, 15).map(client => <button key={client.id} type="button" className={`${addStyles.enterpriseOption} ${selectedClient?.id === client.id ? addStyles.enterpriseOptionSelected : ""}`} onClick={() => handleSelectClient(client)}>
                            {client.name}
                          </button>)}
                    </div>}
                </div>
              </div>}
          </div>}

        {(step === 2 || isEdit) && selectedClient && <div className={addStyles.stepContent}>
            <p className={addStyles.stepDescription}>
              Company: <strong>{selectedClient.name}</strong>
            </p>
            {loadingClientModules ? <div style={{
          padding: "1rem",
          color: "#9ca3af"
        }}>
                Loading client data...
              </div> : <div className={addStyles.step4Form}>
                <label className={addStyles.clientSelectLabel} style={{
            marginTop: 0
          }}>
                  License expiration
                </label>
                <input type="date" className={addStyles.enterpriseInput} value={expiration} onChange={e => setExpiration(e.target.value)} />

                <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "1rem",
            marginTop: "1rem"
          }}>
                  <div>
                    <label className={addStyles.clientSelectLabel}>
                      Protected users
                    </label>
                    <input type="number" min="0" className={addStyles.enterpriseInput} placeholder="Ex: 50" value={protectedUsers} onChange={e => setProtectedUsers(e.target.value)} />
                  </div>

                  <div>
                    <label className={addStyles.clientSelectLabel}>
                      Watched domains
                    </label>
                    <input type="number" min="0" className={addStyles.enterpriseInput} placeholder="Ex: 3" value={watchedDomains} onChange={e => setWatchedDomains(e.target.value)} />
                  </div>
                </div>
              </div>}
          </div>}
      </div>

      <div className={styles.modalActions}>
        {!isEdit && step === 2 && <button type="button" className={`${styles.secondaryButton} ${styles.iconPrimaryButton}`} onClick={() => setStep(1)} disabled={saving} title="Back to company selection">
            <Icon icon="mdi:chevron-left" />
          </button>}
        <button type="button" className={`${styles.primaryButton} ${styles.iconPrimaryButton}`} onClick={handleSave} disabled={saving} title="Save antispam solution">
          <Icon icon={saving ? "mdi:loading" : "mdi:check"} className={saving ? styles.spinning : ""} />
        </button>
      </div>
    </CenteredFormModal>;
}
