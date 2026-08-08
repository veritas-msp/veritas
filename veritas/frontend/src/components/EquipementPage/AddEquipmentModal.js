import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { FaServer, FaShieldAlt, FaHdd, FaNetworkWired, FaWifi, FaGlobe, FaEdit } from "react-icons/fa";
import styles from "./AddEquipmentModal.module.css";
import { fetchClientsList } from "../../api/clients";
import EquipmentFormModal from "./EquipmentFormModal";
import ModalDiscardConfirm from "../Misc/ModalDiscardConfirm";
import { useModalCloseGuard } from "../../hooks/useModalCloseGuard";
const CATEGORIES = [{
  id: "Internet",
  label: "Internet",
  icon: FaGlobe
}, {
  id: "Firewalls",
  label: "Firewalls",
  icon: FaShieldAlt
}, {
  id: "Servers",
  label: "Servers",
  icon: FaServer
}, {
  id: "Storage",
  label: "Storage",
  icon: FaHdd
}, {
  id: "Switch",
  label: "Switch",
  icon: FaNetworkWired
}, {
  id: "BorneWifi",
  label: "Borne WiFi",
  icon: FaWifi
}];
export default function AddEquipmentModal({
  onClose,
  onEquipmentAdded,
  prefilledClient = null
}) {
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [enterpriseSearch, setEnterpriseSearch] = useState("");
  const [enterpriseDropdownOpen, setEnterpriseDropdownOpen] = useState(false);
  const enterpriseAutocompleteRef = useRef(null);
  const hasLoadedClientsRef = useRef(false);
  useEffect(() => {
    const handleClickOutside = e => {
      if (enterpriseAutocompleteRef.current && !enterpriseAutocompleteRef.current.contains(e.target)) {
        setEnterpriseDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const filteredClients = enterpriseSearch.trim() ? clients.filter(c => (c.name || "").toLowerCase().includes(enterpriseSearch.trim().toLowerCase())) : clients;
  useEffect(() => {
    if (step < 2 || hasLoadedClientsRef.current) return;
    const controller = new AbortController();
    setLoadingClients(true);
    fetchClientsList({
      signal: controller.signal
    }).then(all => {
      setClients(Array.isArray(all) ? all : []);
      hasLoadedClientsRef.current = true;
    }).catch(err => {
      if (err?.name === "AbortError") return;
      console.error("Error chargement clients:", err);
      setClients([]);
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingClients(false);
    });
    return () => {
      controller.abort();
    };
  }, [step]);
  const handleCategorySelect = category => {
    setSelectedCategory(category);
    setStep(2);
  };
  const handleBack = () => {
    if (step === 2) {
      setSelectedCategory(null);
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
  };
  const handleManualAddClick = () => {
    if (prefilledClient) {
      setSelectedClient(prefilledClient);
      setShowClientModal(true);
      return;
    }
    setStep(3);
  };
  const handleClientSelectAndOpen = client => {
    setSelectedClient(client);
    setShowClientModal(true);
  };
  const handleClientModalClose = () => {
    setShowClientModal(false);
    setSelectedClient(null);
    onEquipmentAdded?.();
    onClose();
  };
  const hasUnsavedChanges = step > 1 || Boolean(selectedCategory || selectedClient || enterpriseSearch.trim());
  const {
    requestClose,
    discardConfirmOpen,
    cancelDiscard,
    confirmDiscard
  } = useModalCloseGuard({
    open: true,
    onClose,
    hasUnsavedChanges
  });
  if (showClientModal && selectedClient && selectedCategory) {
    return createPortal(<EquipmentFormModal client={selectedClient} category={selectedCategory} onBack={() => setShowClientModal(false)} onSuccess={handleClientModalClose} />, document.body);
  }
  return createPortal(<>
    <div className={styles.overlay} onClick={requestClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <div className={styles.header}>
            <h2 className={styles.title}>
              <Icon icon="mdi:plus-circle-outline" className={styles.titleIcon} />
              Add equipment
            </h2>
            <button type="button" className={styles.closeBtn} onClick={requestClose} title="Close" aria-label="Close">
              <FaTimes />
            </button>
          </div>

          <div className={styles.stepsIndicator} title={`Step ${step} of 3`}>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{
              width: `${step / 3 * 100}%`
            }} />
            </div>
          </div>

          <div className={styles.body}>
            {}
            {step === 1 && <div className={styles.stepContent}>
                <p className={styles.stepDescription}>
                  Which hardware category do you want to add?
                </p>
                <div className={styles.categoryGrid}>
                  {CATEGORIES.map(cat => {
                const IconComponent = cat.icon;
                return <button key={cat.id} type="button" className={styles.categoryCard} onClick={() => handleCategorySelect(cat)}>
                        <IconComponent className={styles.categoryIcon} />
                        <span>{cat.label}</span>
                      </button>;
              })}
                </div>
              </div>}

            {}
            {step === 2 && selectedCategory && <div className={styles.stepContent}>
                <button type="button" className={styles.backLink} onClick={handleBack}>
                  <Icon icon="mdi:arrow-left" /> Back to category
                </button>
                <p className={styles.stepDescription}>
                  How do you want to add this equipment?
                </p>
                <div className={styles.sourceOptions}>
                  {}
                  <div className={`${styles.sourceCard} ${styles.sourceCardDisabled}`}>
                    <Icon icon="mdi:cloud-download-outline" className={styles.sourceIcon} />
                    <h3 className={styles.sourceTitle}>Import via integration</h3>
                    <p className={styles.sourceDesc}>
                      CheckMK, API...
                    </p>
                    <span className={styles.comingSoon}>Coming soon</span>
                  </div>

                  {}
                  <button type="button" className={styles.sourceCard} onClick={handleManualAddClick}>
                    <Icon icon="mdi:pencil-plus-outline" className={styles.sourceIcon} />
                    <h3 className={styles.sourceTitle}>Manual entry</h3>
                    <p className={styles.sourceDesc}>
                      {prefilledClient ? "Enter the hardware details" : "Enter the hardware and company details"}
                    </p>
                  </button>
                </div>
              </div>}

            {}
            {step === 3 && selectedCategory && <div className={styles.stepContent}>
                <button type="button" className={styles.backLink} onClick={handleBack}>
                  <Icon icon="mdi:arrow-left" /> Back to source
                </button>
                <p className={styles.stepDescription}>
                  Select the company and enter the hardware details.
                </p>
                {loadingClients ? <div className={styles.loadingClients}>Loading companies...</div> : clients.length === 0 ? <p className={styles.noClients}>
                    No companies available.
                  </p> : <div className={styles.step4Form}>
                    <label className={styles.clientSelectLabel}>
                      Company
                    </label>
                    <div className={styles.enterpriseAutocomplete} ref={enterpriseAutocompleteRef}>
                      <input type="text" className={styles.enterpriseInput} placeholder="Search for a company..." value={enterpriseSearch || (selectedClient?.name ?? "")} onChange={e => {
                  setEnterpriseSearch(e.target.value);
                  setSelectedClient(null);
                  setEnterpriseDropdownOpen(true);
                }} onFocus={() => setEnterpriseDropdownOpen(true)} />
                      {enterpriseDropdownOpen && <div className={styles.enterpriseDropdown}>
                          {filteredClients.length === 0 ? <div className={styles.enterpriseDropdownEmpty}>
                              No company found
                            </div> : filteredClients.slice(0, 15).map(client => <button key={client.id} type="button" className={`${styles.enterpriseOption} ${selectedClient?.id === client.id ? styles.enterpriseOptionSelected : ""}`} onClick={() => {
                    setSelectedClient(client);
                    setEnterpriseSearch(client.name);
                    setEnterpriseDropdownOpen(false);
                  }}>
                                {client.name}
                              </button>)}
                        </div>}
                    </div>
                    <button type="button" className={styles.continueButton} disabled={!selectedClient} onClick={() => selectedClient && handleClientSelectAndOpen(selectedClient)}>
                      <FaEdit className={styles.continueButtonIcon} />
                      Enter hardware details
                    </button>
                  </div>}
              </div>}
          </div>
        </div>
    </div>
    <ModalDiscardConfirm open={discardConfirmOpen} onConfirm={confirmDiscard} onClose={cancelDiscard} />
    </>, document.getElementById("modal-root") || document.body);
}
