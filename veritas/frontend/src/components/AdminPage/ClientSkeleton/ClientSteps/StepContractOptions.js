import React, { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import styles from "./StepGeneral.module.css";
import { fetchActiveUsers } from "../../../../api/users";
import { useContractModuleOptions } from "../../../../hooks/useContractModuleOptions";
const StepContractOptions = ({
  form,
  setForm
}) => {
  const {
    enabledModules
  } = useContractModuleOptions();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [commercialSearch, setCommercialSearch] = useState("");
  const [selectedCommercialUser, setSelectedCommercialUser] = useState(null);
  const [commercialDropdownOpen, setCommercialDropdownOpen] = useState(false);
  const commercialAutocompleteRef = useRef(null);
  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const usersData = await fetchActiveUsers();
        setUsers(usersData);
        if (form.commercial) {
          const existing = usersData.find(u => u.id === form.commercial);
          if (existing) {
            setSelectedCommercialUser(existing);
            setCommercialSearch(existing.username || existing.email || "");
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
  }, []);
  useEffect(() => {
    const handleClickOutside = e => {
      if (commercialAutocompleteRef.current && !commercialAutocompleteRef.current.contains(e.target)) {
        setCommercialDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const updateContract = (field, value) => {
    setForm(prev => ({
      ...prev,
      contrat: {
        ...prev.contrat,
        [field]: value
      }
    }));
  };
  const handleModuleChange = (moduleName, checked) => {
    setForm(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [moduleName]: checked
      }
    }));
  };
  const modulesConfig = enabledModules.map(mod => ({
    key: mod.moduleKey,
    label: mod.label,
    icon: mod.icon || "mdi:puzzle-outline"
  }));
  return <div className={styles.container}>
      {}
      <div className={styles.introBlock}>
        <div className={styles.introIconWrapper}>
          <Icon icon="ph:file-text-fill" className={styles.introIcon} />
        </div>
        <div className={styles.introTextWrapper}>
          <p className={styles.introText}>
            The contract defines the framework of the relationship with the company:
            agreement type, validity period and subscribed options (support,
            monitoring, hosting, etc.). Complete this information to ensure
            clear and consistent tracking in Veritas.
          </p>
        </div>
      </div>
      <div className={styles.introDivider} />

      {}
      <div className={styles.section}>
        <h3 className={styles.sectionHeading}>Contract type</h3>
        <div className={styles.contractTypeGrid}>
          {[{
          key: "EDUCATION",
          label: "Education / schools",
          emoji: "🎓"
        }, {
          key: "PROFESSIONNEL",
          label: "Professional",
          emoji: "🏢"
        }, {
          key: "HEBERGEMENT",
          label: "Hosting",
          emoji: "☁️"
        }].map(type => {
          const active = form.contrat?.type === type.key;
          return <button key={type.key} type="button" className={`${styles.contractTypeCard} ${active ? styles.contractTypeCardActive : ""}`} onClick={() => updateContract("type", type.key)}>
                <span className={styles.contractTypeIcon}>{type.emoji}</span>
                <span className={styles.contractTypeLabel}>{type.label}</span>
              </button>;
        })}
        </div>
      </div>

      {}
      <div className={styles.section}>
        <h3 className={styles.sectionHeading}>Contract</h3>
        <div className={`${styles.formSection} ${styles.gridThree}`}>
          <div className={styles.formField}>
            <label htmlFor="contractStart">Start date *</label>
            <input id="contractStart" type="date" value={form.contrat?.debut || ""} onChange={e => updateContract("debut", e.target.value)} required />
          </div>

          <div className={styles.formField}>
            <label htmlFor="contractEnd">Expiration date *</label>
            <input id="contractEnd" type="date" value={form.contrat?.expiration || ""} onChange={e => updateContract("expiration", e.target.value)} required />
          </div>

          <div className={styles.formField}>
            <label htmlFor="commercial">Sales representative</label>
            <div className={styles.userAutocomplete} ref={commercialAutocompleteRef}>
              <input id="commercial" type="text" className={styles.userInput} placeholder="Search for a sales representative..." value={commercialSearch || selectedCommercialUser?.username || selectedCommercialUser?.email || ""} onChange={e => {
              const value = e.target.value;
              setCommercialSearch(value);
              setSelectedCommercialUser(null);
              setForm(prev => ({
                ...prev,
                commercial: ""
              }));
              setCommercialDropdownOpen(true);
            }} onFocus={() => setCommercialDropdownOpen(true)} disabled={loadingUsers} />
              {commercialDropdownOpen && Array.isArray(users) && <div className={styles.userDropdown}>
                  {users.length === 0 ? <div className={styles.userDropdownEmpty}>
                      No users found
                    </div> : users.filter(user => commercialSearch.trim() ? (user.username || user.email || "").toLowerCase().includes(commercialSearch.trim().toLowerCase()) : true).slice(0, 15).map(user => <button key={user.id} type="button" className={`${styles.userOption} ${selectedCommercialUser?.id === user.id ? styles.userOptionSelected : ""}`} onClick={() => {
                setSelectedCommercialUser(user);
                setCommercialSearch(user.username || user.email || "");
                setForm(prev => ({
                  ...prev,
                  commercial: user.id
                }));
                setCommercialDropdownOpen(false);
              }}>
                          {user.username || user.email}
                          {user.email ? ` (${user.email})` : ""}
                        </button>)}
                </div>}
            </div>
          </div>
        </div>
      </div>

      {}
      <div className={styles.section}>
        <h3 className={styles.sectionHeading}>Contract options</h3>
        <p className={styles.sectionDescription}>
          Contract options represent the services enabled for this company:
          support, corrective or preventive interventions, monitoring, hosting, digital
          signage, video surveillance, etc. Select only the options actually
          subscribed to accurately reflect the contractual scope in Veritas.
        </p>
        <div className={styles.modulesGrid}>
          {modulesConfig.map(({
          key,
          label,
          icon
        }) => {
          const active = !!form.modules?.[key];
          return <div key={key} className={`${styles.moduleItem} ${active ? styles.moduleItemActive : ""}`} role="button" tabIndex={0} aria-pressed={active} onClick={() => handleModuleChange(key, !active)} onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleModuleChange(key, !active);
            }
          }}>
                <div className={styles.moduleHeader}>
                  <Icon icon={icon} className={styles.moduleIcon} />
                  <div className={styles.moduleTitleBlock}>
                    <span className={styles.moduleName}>{label}</span>
                  </div>
                </div>
              </div>;
        })}
        </div>
      </div>
    </div>;
};
export default StepContractOptions;
