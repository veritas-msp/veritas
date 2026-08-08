import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { MODULE_SECTIONS, isModuleLockedForEdition } from "../../../config/modulesCatalog";
import { getVeritasCommercialLinks } from "../../../config/commercial";
import styles from "./AddModuleModal.module.css";
const PRICING_URL = getVeritasCommercialLinks().pricing;
function openPricingPage() {
  window.open(PRICING_URL, "_blank", "noopener,noreferrer");
}
export default function AddModuleModal({
  open,
  onClose,
  onSelectModule,
  isCommunity = false,
  access = {},
  activeDocType = ""
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = event => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);
  if (!open) return null;
  const handleModuleClick = module => {
    if (isModuleLockedForEdition(module, isCommunity)) {
      openPricingPage();
      return;
    }
    if (!isCommunity && access[module.key] === false) {
      return;
    }
    onSelectModule(module.docType);
    onClose();
  };
  return createPortal(<div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.panel} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="add-module-modal-title">
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <Icon icon="mdi:close" width={20} />
        </button>

        <header className={styles.header}>
          <h2 className={styles.title} id="add-module-modal-title">
            Add a module
          </h2>
          <p className={styles.subtitle}>
            Choose a module to open. Veritas Pro pages (scheduling, services, reports, SLA &amp; KPI, billing…) require a subscription.
          </p>
        </header>

        <div className={styles.body}>
          {MODULE_SECTIONS.map(section => <section key={section.id} className={styles.section} aria-label={section.label}>
              <h3 className={styles.sectionTitle}>{section.label}</h3>
              <div className={styles.grid}>
                {section.modules.map(module => {
              const locked = isModuleLockedForEdition(module, isCommunity);
              const profileBlocked = !isCommunity && access[module.key] === false;
              const isActive = activeDocType === module.docType || module.docType === "Contrat" && activeDocType === "ContratDetail" || module.docType === "Contact" && activeDocType === "ContactDetail" || module.docType === "Ticket" && ["Ticket", "TicketDetail", "TicketCreate"].includes(activeDocType) || module.docType === "TicketSales" && ["TicketSales", "TicketSalesCreate", "TicketSalesDetail"].includes(activeDocType) || module.docType === "Hardware" && ["Hardware", "Equipment", "EquipmentDetail"].includes(activeDocType) || module.docType === "Cybersecurite" && ["Cybersecurite", "CampaignDetail", "AntivirusDetail", "AntispamDetail"].includes(activeDocType) || module.docType === "Service" && ["Service", "TenantDetail"].includes(activeDocType) || module.docType === "Report" && ["Report", "MonitoringDetail"].includes(activeDocType);
              const cardClass = [styles.card, isActive ? styles.cardActive : "", locked ? styles.cardLocked : "", profileBlocked ? styles.cardDisabled : ""].filter(Boolean).join(" ");
              return <button key={module.key} type="button" className={cardClass} onClick={() => handleModuleClick(module)} disabled={profileBlocked} title={locked ? "Veritas Pro · view pricing" : profileBlocked ? "Module not enabled for your profile" : module.description}>
                      {module.proOnly ? <span className={styles.badgePro}>Pro</span> : null}
                      <span className={styles.iconWrap} aria-hidden>
                        <Icon icon={module.icon} className={styles.icon} />
                      </span>
                      <span className={styles.cardLabel}>{module.label}</span>
                      <span className={styles.cardDesc}>{module.description}</span>
                      {locked ? <span className={styles.lockOverlay} aria-hidden>
                          <Icon icon="mdi:lock-outline" className={styles.lockIcon} />
                        </span> : null}
                    </button>;
            })}
              </div>
            </section>)}
        </div>

        {isCommunity ? <p className={styles.footer}>
            Need scheduling, cybersecurity, reports, or advanced integrations?{" "}
            <a href={PRICING_URL} target="_blank" rel="noopener noreferrer">
              Discover Veritas Pro
            </a>
          </p> : null}
      </div>
    </div>, document.body);
}
