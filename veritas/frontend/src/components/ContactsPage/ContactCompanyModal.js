import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { getClientNameWithoutCode, getClientNumber } from "../../utils/clientDisplay";
import { getContactDetailCopy } from "./contactDetailI18n";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "./ContactCompanyModal.module.css";

export default function ContactCompanyModal({
  open = false,
  contactName = "",
  companies = [],
  loading = false,
  saving = false,
  onClose,
  onSelect
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getContactDetailCopy(locale).companyModal, [locale]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setSearch("");
  }, [open]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return companies;
    return companies.filter((row) => String(row.name || "").toLowerCase().includes(query));
  }, [companies, search]);

  if (!open) return null;

  const subtitle = contactName
    ? interpolate(copy.subtitleWithName, { name: contactName })
    : copy.subtitleDefault;

  const handleClose = () => {
    if (saving) return;
    onClose?.();
  };

  const handleSelect = (row) => {
    if (saving) return;
    onSelect?.(row);
  };

  return createPortal(
    <div className={formStyles.overlay} onClick={handleClose} role="presentation">
      <div
        className={`${formStyles.shell} ${styles.shell}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-company-modal-title"
      >
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:domain-plus" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
              <h2 className={formStyles.title} id="contact-company-modal-title">
                {copy.title}
              </h2>
              <p className={formStyles.subtitle}>{subtitle}</p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={handleClose} disabled={saving} aria-label={copy.close}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <div className={`${formStyles.field} ${styles.searchField}`}>
            <label className={formStyles.label} htmlFor="contact-company-search">
              {copy.search}
            </label>
            <input
              id="contact-company-search"
              type="search"
              className={formStyles.input}
              placeholder={copy.searchPlaceholder}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              disabled={saving || loading}
              autoFocus
            />
          </div>

          {loading ? (
            <div className={styles.state}>
              <Icon icon="mdi:loading" className={formStyles.spinning} aria-hidden />
              <span>{copy.loading}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.state}>
              <Icon icon="mdi:domain-off" className={styles.stateIcon} aria-hidden />
              <p>{companies.length === 0 ? copy.empty : copy.noResults}</p>
            </div>
          ) : (
            <div className={styles.companyList} role="listbox" aria-label={copy.search}>
              {filtered.map((row) => {
                const code = getClientNumber(row);
                const label = getClientNameWithoutCode(row) || row.name || "";
                return (
                  <button
                    key={row.id}
                    type="button"
                    className={styles.companyBtn}
                    onClick={() => handleSelect(row)}
                    disabled={saving}
                    role="option"
                  >
                    <span className={styles.companyIcon} aria-hidden>
                      <Icon icon="mdi:domain" />
                    </span>
                    <span className={styles.companyCopy}>
                      <span className={styles.companyName}>{label}</span>
                      {code ? <span className={styles.companyCode}>{code}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>{saving ? copy.adding : copy.hint}</span>
          <div className={formStyles.footerActions}>
            <button type="button" className={formStyles.ghostBtn} onClick={handleClose} disabled={saving}>
              {copy.cancel}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.getElementById("modal-root") || document.body
  );
}
