import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { getVisibleNotificationVariableGroups } from "../../utils/notificationVariables";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./NotificationVariablesModal.module.css";

export default function NotificationVariablesModal({
  open,
  source = "tickets",
  element = "updated",
  title = "Variables",
  intro = "",
  closeLabel = "Close",
  onClose,
  onInsert
}) {
  const groups = useMemo(() => getVisibleNotificationVariableGroups(source, element), [source, element]);
  const [activeLabel, setActiveLabel] = useState(groups[0]?.label || "");
  const sectionRefs = useRef({});
  useEffect(() => {
    if (!open) return;
    setActiveLabel(groups[0]?.label || "");
  }, [open, groups]);
  if (!open) return null;
  const jumpTo = label => {
    setActiveLabel(label);
    const node = sectionRefs.current[label];
    if (node?.scrollIntoView) node.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  };
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={layout.shell} style={{
      maxWidth: "min(860px, 100%)"
    }} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon="mdi:code-tags" />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>Notifications</p>
              <h2 className={layout.title}>{title}</h2>
              <p className={layout.subtitle}>{intro}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} aria-label={closeLabel}>
            <FaTimes />
          </button>
        </header>
        <div className={styles.body}>
          <nav className={styles.nav}>
            {groups.map(group => <button key={group.label} type="button" className={`${styles.navBtn} ${activeLabel === group.label ? styles.navBtnActive : ""}`} onClick={() => jumpTo(group.label)}>
                {group.label}
              </button>)}
          </nav>
          <div className={styles.groups}>
            {groups.map(group => <section key={group.label} className={styles.group} ref={node => {
            sectionRefs.current[group.label] = node;
          }}>
                <h3 className={styles.groupTitle}>{group.label}</h3>
                <div className={styles.list}>
                  {group.variables.map(variable => <button key={variable.key} type="button" className={styles.varBtn} title={variable.description} onClick={() => onInsert?.(variable.key)}>
                      <span className={styles.varKey}>{variable.key}</span>
                      <span className={styles.varDesc}>{variable.description}</span>
                    </button>)}
                </div>
              </section>)}
          </div>
        </div>
        <footer className={layout.footer}>
          <span className={layout.footerHint} />
          <div className={layout.footerActions}>
            <button type="button" className={layout.ghostBtn} onClick={onClose}>
              {closeLabel}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
