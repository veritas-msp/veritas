import { motion } from "framer-motion";
import styles from "./Form.module.css";
import { getIconPath } from "../../../../utils/assetHelper";
const icons = {
  Serveurs: getIconPath('serveurs.png'),
  Sauvegarde: getIconPath('sauvegarde.png'),
  Stockage: getIconPath('stockage.png'),
  Firewall: getIconPath('firewall.png'),
  Antispam: getIconPath('antispam.png'),
  Antivirus: getIconPath('antivirus.png'),
  Office365: getIconPath('office365.png'),
  NDD: getIconPath('ndd.png')
};
const labels = {
  Serveurs: "Servers",
  Sauvegarde: "Backup",
  Stockage: "Storage",
  Firewall: "Firewall",
  Antispam: "Antispam",
  Antivirus: "Antivirus",
  Office365: "Office 365",
  NDD: "Domain names"
};
const StepGeneral = ({
  form,
  setForm
}) => {
  const handleChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const toggleModule = key => {
    setForm(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [key]: !prev.modules[key]
      }
    }));
  };
  const moduleOrder = ["Serveurs", "Stockage", "Firewall", "Sauvegarde", "Antivirus", "Antispam", "NDD", "Office365"];
  return <motion.div className={styles.stepContainer} initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.4,
    ease: "circOut"
  }}>
      {}
      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>👤 Client Information</h3>
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label htmlFor="clientName">Client name</label>
            <input id="clientName" value={form.clientName} onChange={e => handleChange("clientName", e.target.value)} placeholder="Ex: ACME Corp" />
          </div>
          <div className={styles.formField}>
            <label htmlFor="reportFrequency">Report frequency</label>
            <select id="reportFrequency" value={form.reportFrequency} onChange={e => handleChange("reportFrequency", e.target.value)}>
              <option value="Monthly">Monthly</option>
              <option value="Bi-monthly">Bi-monthly</option>
              <option value="Quarterly">Quarterly</option>
            </select>
          </div>
        </div>
      </div>

      {}
      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>📄 Maintenance contract</h3>
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label htmlFor="contratDebut">Start date</label>
            <input id="contratDebut" type="date" value={form.contrat?.debut || ""} onChange={e => setForm(prev => ({
            ...prev,
            contrat: {
              ...prev.contrat,
              debut: e.target.value
            }
          }))} />
          </div>
          <div className={styles.formField}>
            <label htmlFor="contratExpiration">Expiration date</label>
            <input id="contratExpiration" type="date" value={form.contrat?.expiration || ""} onChange={e => setForm(prev => ({
            ...prev,
            contrat: {
              ...prev.contrat,
              expiration: e.target.value
            }
          }))} />
          </div>
        </div>
      </div>

      {}
      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>📦 Enabled modules</h3>
        <ModuleGrid modules={form.modules} moduleOrder={moduleOrder} onToggle={toggleModule} />
      </div>
    </motion.div>;
};
const ModuleGrid = ({
  modules,
  moduleOrder,
  onToggle
}) => <div className={styles.moduleGrid}>
    {moduleOrder.map(key => <button key={key} type="button" className={`${styles.moduleToggleButton} ${modules[key] ? styles.active : ""}`} onClick={() => onToggle(key)}>
        <img src={icons[key]} alt="" />
        <span>{labels[key]}</span>
      </button>)}
  </div>;
export default StepGeneral;
