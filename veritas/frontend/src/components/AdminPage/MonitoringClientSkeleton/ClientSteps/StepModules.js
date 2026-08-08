import { motion } from "framer-motion";
import styles from "./Form.module.css";
import Icon from "@mdi/react";
import { Icon as IconifyIcon } from "@iconify/react";
import { mdiWeb, mdiWallFire, mdiWifiMarker, mdiBug } from "@mdi/js";
import { FaEthernet } from "react-icons/fa";
import { IoServerSharp } from "react-icons/io5";
const labels = {
  Internet: "Internet",
  Serveurs: "Servers",
  Sauvegarde: "Backup",
  Stockage: "Storage",
  Firewall: "Firewall",
  Antispam: "Antispam",
  Antivirus: "Antivirus",
  Office365: "Microsoft Entra",
  NDD: "Domain names",
  CertificatsSSL: "SSL certificates",
  Switch: "Switch",
  BorneWifi: "WiFi AP"
};
const descriptions = {
  Internet: "WAN connections and backup links management",
  Serveurs: "Physical and virtual server monitoring",
  Sauvegarde: "Backup and backup job management",
  Stockage: "Storage device monitoring (NAS/SAN)",
  Firewall: "Firewall and network security monitoring",
  Antispam: "Spam and malicious email protection",
  Antivirus: "Endpoint antivirus protection",
  Office365: "Microsoft Entra management (formerly Azure AD)",
  NDD: "Domain name monitoring (registrar, expiration)",
  CertificatsSSL: "TLS/SSL monitoring: expiration, issuer and certificate validity",
  Switch: "Network switch and distribution equipment monitoring",
  BorneWifi: "WiFi access point and controller monitoring"
};
const StepModules = ({
  form,
  setForm
}) => {
  const toggleModule = key => {
    setForm(prev => ({
      ...prev,
      modules_monitoring: {
        ...prev.modules_monitoring,
        [key]: !prev.modules_monitoring[key]
      }
    }));
  };
  const infrastructureModules = ["Internet", "Serveurs", "Stockage", "Firewall", "Switch", "BorneWifi"];
  const cybersecuriteModules = ["Sauvegarde", "Antivirus", "Antispam"];
  const servicesModules = ["NDD", "CertificatsSSL", "Office365"];
  const MODULE_ICON_COLOR = "#15d1a0";
  const MODULE_ICON_COLOR_INACTIVE = "#9ca3af";
  const renderModuleIcon = (moduleKey, active, categoryColor) => {
    const raw = String(moduleKey || "");
    const key = raw.replace(/\s+/g, "").toLowerCase();
    const iconColor = active ? "#1a1a1a" : MODULE_ICON_COLOR_INACTIVE;
    switch (key) {
      case "internet":
        return <Icon path={mdiWeb} size={1.2} color={iconColor} />;
      case "serveurs":
        return <IconifyIcon icon="mingcute:server-fill" width={32} height={32} color={iconColor} />;
      case "stockage":
        return <IoServerSharp size={32} color={iconColor} />;
      case "firewall":
        return <Icon path={mdiWallFire} size={1.2} color={iconColor} />;
      case "switch":
        return <FaEthernet size={32} color={iconColor} />;
      case "bornewifi":
        return <Icon path={mdiWifiMarker} size={1.2} color={iconColor} />;
      case "sauvegarde":
        return <IconifyIcon icon="material-symbols:backup" width={32} height={32} color={iconColor} />;
      case "antivirus":
        return <Icon path={mdiBug} size={1.2} color={iconColor} />;
      case "antispam":
        return <IconifyIcon icon="material-symbols:mail-shield-outline" width={32} height={32} color={iconColor} />;
      case "ndd":
        return <IconifyIcon icon="stash:domain" width={32} height={32} color={iconColor} />;
      case "certificatessl":
        return <IconifyIcon icon="mdi:certificate-outline" width={32} height={32} color={iconColor} />;
      case "office365":
        return <IconifyIcon icon="hugeicons:office-365" width={32} height={32} color={iconColor} />;
      default:
        return null;
    }
  };
  const CategorySection = ({
    title,
    modules,
    categoryColor = "#15d1a0"
  }) => {
    const getActiveBackground = color => {
      if (color === "#3b82f6") return "#eff6ff";
      if (color === "#ef4444") return "#fef2f2";
      if (color === "#8b5cf6") return "#f5f3ff";
      return "#f0fdfa";
    };
    return <div style={{
      background: '#ffffff',
      borderRadius: '10px',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    }}>
        <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        paddingBottom: '0.75rem',
        borderBottom: '2px solid #1a1a1a'
      }}>
          <div style={{
          width: '3px',
          height: '18px',
          background: '#1a1a1a',
          borderRadius: '2px'
        }} />
          <h3 style={{
          margin: 0,
          color: '#1a1a1a',
          fontSize: '0.9rem',
          fontWeight: '700',
          letterSpacing: '0.02em'
        }}>
            {title}
          </h3>
        </div>
        
        <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: '0.65rem'
      }}>
          {modules.map(key => {
          const isActive = form.modules_monitoring[key];
          return <button key={key} type="button" onClick={() => toggleModule(key)} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            padding: '0.6rem 0.65rem',
            background: isActive ? '#f0fdfa' : '#ffffff',
            border: isActive ? '2px solid #15d1a0' : '2px solid #e5e7eb',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            textAlign: 'left',
            width: '100%'
          }} onMouseEnter={e => {
            if (!isActive) {
              e.currentTarget.style.borderColor = '#15d1a0';
              e.currentTarget.style.background = '#f9fafb';
            }
          }} onMouseLeave={e => {
            if (!isActive) {
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.background = '#ffffff';
            }
          }}>
              <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              flexShrink: 0
            }}>
                {renderModuleIcon(key, isActive, categoryColor)}
              </div>
              <div style={{
              flex: 1,
              minWidth: 0
            }}>
                <div style={{
                fontWeight: '600',
                color: isActive ? '#1a1a1a' : '#6b7280',
                fontSize: '0.85rem'
              }}>
                  {labels[key]}
                </div>
              </div>
            </button>;
        })}
      </div>
    </div>;
  };
  return <motion.div className={styles.stepContainer} initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.4,
    ease: "circOut"
  }} style={{
    display: "flex",
    flexDirection: "column",
    width: "100%"
  }}>
      <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "1rem",
      flex: 1,
      minHeight: 0
    }}>
        {}
        <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.75rem',
        alignItems: 'flex-end'
      }}>
          <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem'
        }}>
            <label style={{
            display: 'block',
            fontWeight: 600,
            color: '#1a1a1a',
            fontSize: '0.9rem'
          }}>
              Report frequency
            </label>
            <select value={form.report_frequency || 'Mensuel'} onChange={e => setForm(prev => ({
            ...prev,
            report_frequency: e.target.value
          }))} style={{
            width: '100%',
            padding: '0.55rem 0.75rem',
            border: '1px solid #e0e0e0',
            borderRadius: 8,
            background: '#ffffff',
            color: '#1a1a1a',
            fontSize: '0.9rem',
            transition: 'all 0.2s ease'
          }} onFocus={e => {
            e.target.style.borderColor = '#15d1a0';
            e.target.style.boxShadow = '0 0 0 3px rgba(21, 209, 160, 0.1)';
          }} onBlur={e => {
            e.target.style.borderColor = '#e0e0e0';
            e.target.style.boxShadow = 'none';
          }}>
              <option value="Mensuel">Monthly</option>
              <option value="Bi mensuel">Bi-monthly</option>
              <option value="Trimestriel">Quarterly</option>
              <option value="Semestriel">Semi-annual</option>
            </select>
          </div>

        </div>

        {}
        <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.1rem",
        flex: 1,
        minHeight: 0
      }}>
          <CategorySection title="Infrastructure" modules={infrastructureModules} categoryColor="#3b82f6" />
          
          <CategorySection title="Cybersecurity" modules={cybersecuriteModules} categoryColor="#ef4444" />
          
          <CategorySection title="Services" modules={servicesModules} categoryColor="#8b5cf6" />
        </div>
      </div>
    </motion.div>;
};
export default StepModules;
