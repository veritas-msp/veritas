import React from "react";
import { Icon } from "@iconify/react";
import styles from "../EnterprisesPage/EnterpriseFormModal.module.css";
const EMPTY_LICENCE = {
  nom: "",
  type: "",
  expiration: ""
};
export default function FirewallLicencesEditor({
  licences = [],
  onChange,
  idPrefix = "firewall-licence"
}) {
  const list = Array.isArray(licences) ? licences : [];
  const updateLicense = (index, field, value) => {
    const next = list.map((lic, i) => i === index ? {
      ...lic,
      [field]: value
    } : lic);
    onChange(next);
  };
  const removeLicense = index => {
    onChange(list.filter((_, i) => i !== index));
  };
  const addLicense = () => {
    onChange([...list, {
      ...EMPTY_LICENCE
    }]);
  };
  return <div className={styles.licenceList}>
      {list.length === 0 ? <p className={styles.hint}>No licenses. Add a maintenance, UTM, IPS… license</p> : list.map((licence, index) => <div key={`${idPrefix}-${index}`} className={styles.licenceRow}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${idPrefix}-nom-${index}`}>
                Name
              </label>
              <input id={`${idPrefix}-nom-${index}`} type="text" className={styles.input} value={licence.nom ?? ""} onChange={e => updateLicense(index, "nom", e.target.value)} placeholder="Maintenance, UTM, IPS…" />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${idPrefix}-type-${index}`}>
                Type
              </label>
              <input id={`${idPrefix}-type-${index}`} type="text" className={styles.input} value={licence.type ?? ""} onChange={e => updateLicense(index, "type", e.target.value)} placeholder="Bundle annuel, Support 24/7…" />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={`${idPrefix}-exp-${index}`}>
                Expiration
              </label>
              <input id={`${idPrefix}-exp-${index}`} type="date" className={styles.input} value={licence.expiration ?? ""} onChange={e => updateLicense(index, "expiration", e.target.value)} />
            </div>
            <button type="button" className={styles.licenceRemoveBtn} onClick={() => removeLicense(index)} aria-label={`Delete license ${licence.nom || index + 1}`} title="Delete">
              <Icon icon="mdi:delete-outline" aria-hidden />
            </button>
          </div>)}
      <button type="button" className={styles.licenceAddBtn} onClick={addLicense}>
        <Icon icon="mdi:plus" aria-hidden />
        Add a license
      </button>
    </div>;
}
