import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { isProOnlyDocType } from "../../config/edition";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import { createListTabData } from "../../navigation/tabTypes";
import { getTabLauncherCopy, TAB_LAUNCHER_SECTIONS } from "./tabLauncherI18n";
import styles from "./TabLauncherPage.module.css";
function isItemVisible(item, {
  access,
  isCommunity,
  userRole
}) {
  if (item.adminOnly && userRole !== "admin") return false;
  if (item.accessKey && access[item.accessKey] === false) return false;
  if (item.proOnly && isCommunity && isProOnlyDocType(item.docType)) return false;
  return true;
}
export default function TabLauncherPage({
  onNavigate,
  access = {},
  isCommunity = false,
  userRole
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getTabLauncherCopy(locale), [locale]);
  const sections = useMemo(() => TAB_LAUNCHER_SECTIONS.map(section => ({
    ...section,
    title: copy.sections[section.sectionKey],
    items: section.items.filter(item => isItemVisible(item, {
      access,
      isCommunity,
      userRole
    }))
  })).filter(section => section.items.length > 0), [access, isCommunity, userRole, copy]);
  const handleSelect = item => {
    if (item.opensTab) {
      onNavigate(item.docType, createListTabData(item.docType), {
        openAsTab: true
      });
      return;
    }
    onNavigate(item.docType, null);
  };
  return <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroIcon} aria-hidden>
          <Icon icon="mdi:tab-plus" />
        </div>
        <div className={styles.heroText}>
          <h1 className={styles.title}>{copy.title}</h1>
          <p className={styles.subtitle}>{copy.subtitle}</p>
        </div>
      </header>

      <div className={styles.sections}>
        {sections.map(section => <section key={section.sectionKey} className={styles.section}>
            <h2 className={styles.sectionTitle}>{section.title}</h2>
            <div className={styles.grid}>
              {section.items.map(item => {
            const showPro = item.proOnly && isCommunity && isProOnlyDocType(item.docType);
            return <button key={item.docType} type="button" className={styles.card} onClick={() => handleSelect(item)}>
                    <span className={styles.cardIcon} aria-hidden>
                      <Icon icon={item.icon} />
                    </span>
                    <span className={styles.cardBody}>
                      <span className={styles.cardTitleRow}>
                        <span className={styles.cardTitle}>{copy.items[item.labelKey]}</span>
                        {item.opensTab ? <span className={styles.tabBadge}>{copy.tabBadge}</span> : null}
                        {showPro ? <ProFeatureBadge variant="inline" /> : null}
                      </span>
                      <span className={styles.cardDesc}>{copy.items[item.descKey]}</span>
                    </span>
                    <Icon icon="mdi:chevron-right" className={styles.cardChevron} aria-hidden />
                  </button>;
          })}
            </div>
          </section>)}
      </div>
    </div>;
}
