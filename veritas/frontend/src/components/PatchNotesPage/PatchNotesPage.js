import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { VERITAS_VERSION } from "../../constants/version";
import { PATCH_NOTES } from "../../constants/patchNotes";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import account from "../Misc/AccountPage/AccountPage.module.css";
import { getPatchNotesPageCopy } from "./patchNotesPageI18n";
import styles from "./PatchNotesPage.module.css";

function formatDisplayDate(value, locale) {
  if (!value) return null;
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(locale || undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

export default function PatchNotesPage() {
  const locale = useAppLocale();
  const t = useMemo(() => getPatchNotesPageCopy(locale), [locale]);
  const notes = useMemo(
    () => [...PATCH_NOTES].sort((a, b) => String(b.version).localeCompare(String(a.version), undefined, { numeric: true })),
    []
  );

  return (
    <div className={`${layout.page} ${styles.page}`}>
      <div className={`${layout.shell} ${layout.shellFluid}`}>
        <header className={layout.hero}>
          <div className={layout.heroText}>
            <p className={layout.eyebrow}>
              <Icon icon="mdi:notebook-outline" aria-hidden />
              {t.eyebrow}
            </p>
            <h1 className={layout.pageTitle}>{t.title}</h1>
            <p className={layout.pageSubtitle}>{t.subtitle}</p>
          </div>
          <div className={layout.heroActions}>
            <span className={styles.versionBadge} title={`${t.currentVersion} v${VERITAS_VERSION}`}>
              <Icon icon="mdi:tag-outline" aria-hidden />
              v{VERITAS_VERSION}
            </span>
          </div>
        </header>

        <div className={`${account.contentScroll} ${styles.scroll}`}>
          {notes.length === 0 ? (
            <section className={account.sectionPanel}>
              <div className={account.sectionBody}>
                <p className={styles.empty}>{t.empty}</p>
              </div>
            </section>
          ) : (
            <div className={styles.timeline} aria-label={t.itemsLabel}>
              {notes.map(entry => (
                <article key={entry.version} className={styles.entry}>
                  <header className={styles.entryHeader}>
                    <h2 className={styles.entryVersion}>v{entry.version}</h2>
                    {entry.date ? (
                      <time className={styles.entryDate} dateTime={entry.date}>
                        {formatDisplayDate(entry.date, locale)}
                      </time>
                    ) : null}
                  </header>
                  <div className={styles.entryBody}>
                    {Array.isArray(entry.highlights) && entry.highlights.length > 0 ? (
                      <ul className={styles.highlights}>
                        {entry.highlights.map((item, index) => (
                          <li key={`${entry.version}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.empty}>{t.empty}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
