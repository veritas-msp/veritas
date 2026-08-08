import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { getLocalizedTokenFormSections } from "./adminRmmI18n";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import formStyles from "./IngestionRuleFormModal.module.css";
export default function RmmEnrollmentTokenFormModal({
  open,
  copy,
  draft,
  setDraft,
  saving = false,
  clientOptions = [],
  onClose,
  onSave
}) {
  const tf = copy.tokenForm;
  const [activeSection, setActiveSection] = useState("enterprise");
  const formSections = useMemo(() => getLocalizedTokenFormSections(copy), [copy]);
  useEffect(() => {
    if (!open) return;
    setActiveSection("enterprise");
  }, [open]);
  const sectionMeta = useMemo(() => ({
    enterprise: Boolean(String(draft?.clientId || "").trim()),
    details: true
  }), [draft]);
  if (!open || !draft) return null;
  const patchDraft = patch => setDraft(prev => ({
    ...prev,
    ...patch
  }));
  const selectedClient = clientOptions.find(opt => opt.value === String(draft.clientId || ""));
  const renderSectionContent = () => {
    switch (activeSection) {
      case "enterprise":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{tf.enterpriseTitle}</h3>
              <p className={layout.sectionDesc}>{tf.enterpriseDesc}</p>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="rmm-token-client">
                  {tf.companyLabel}
                </label>
                <select id="rmm-token-client" className={layout.input} value={draft.clientId || ""} onChange={e => patchDraft({
                clientId: e.target.value
              })} autoFocus>
                  <option value="">{tf.selectCompany}</option>
                  {clientOptions.map(opt => <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>)}
                </select>
              </div>
            </div>
          </>;
      case "details":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{tf.detailsTitle}</h3>
              <p className={layout.sectionDesc}>{tf.detailsDesc}</p>
            </div>
            <div className={layout.fieldGrid2}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={layout.label} htmlFor="rmm-token-label">
                  {tf.labelOptional}
                </label>
                <input id="rmm-token-label" type="text" className={layout.input} value={draft.label || ""} onChange={e => patchDraft({
                label: e.target.value
              })} placeholder={tf.labelPlaceholder} />
              </div>
            </div>
            <div className={formStyles.statusRow} style={{
            marginTop: "0.5rem"
          }}>
              <div>
                <div className={formStyles.statusLabel}>{tf.oneTimeTitle}</div>
                <p className={formStyles.statusHint}>{tf.oneTimeHint}</p>
              </div>
              <Icon icon="mdi:shield-key-outline" style={{
              fontSize: "1.5rem",
              color: "var(--msp-muted)"
            }} aria-hidden />
            </div>
          </>;
      default:
        return null;
    }
  };
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={layout.shell} style={{
      maxWidth: "min(680px, 100%)"
    }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="rmm-token-form-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon="mdi:key-plus" />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{tf.eyebrow}</p>
              <h2 className={layout.title} id="rmm-token-form-title">
                {tf.title}
              </h2>
              <p className={layout.subtitle}>{tf.subtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.common.close}>
            <FaTimes />
          </button>
        </header>

        <div className={layout.body}>
          <nav className={layout.nav} aria-label={tf.sectionsAria}>
            {formSections.map(section => <button key={section.id} type="button" className={`${layout.navItem} ${activeSection === section.id ? layout.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                <Icon icon={section.icon} className={layout.navItemIcon} aria-hidden />
                <span className={layout.navItemText}>
                  <span className={layout.navItemLabel}>{section.label}</span>
                  <span className={layout.navItemHint}>{section.description}</span>
                </span>
                {sectionMeta[section.id] && <span className={layout.navBadge}>✓</span>}
              </button>)}
          </nav>

          <div className={layout.content}>{renderSectionContent()}</div>
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>
            {selectedClient?.label || copy.common.noCompany} · {draft.label?.trim() || copy.common.noLabel}
          </span>
          <div className={layout.footerActions}>
            <button type="button" className={layout.ghostBtn} onClick={onClose} disabled={saving}>
              {copy.common.cancel}
            </button>
            <button type="button" className={layout.primaryBtn} onClick={onSave} disabled={saving || !String(draft.clientId || "").trim()}>
              {saving ? <>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                  {tf.creating}
                </> : <>
                  <Icon icon="mdi:check" aria-hidden />
                  {tf.create}
                </>}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
