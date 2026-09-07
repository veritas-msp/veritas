import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { getPrestataireDetailCopy } from "./prestataireDetailI18n";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import styles from "../ContactsPage/ContactCompanyModal.module.css";

function formatContactPreview(row) {
  const contacts = Array.isArray(row?.contacts) ? row.contacts : [];
  const first = contacts[0];
  if (first) {
    const name = [first.prenom, first.nom].filter(Boolean).join(" ");
    return name || first.email || first.telephone || "";
  }
  const legacy = [row?.contact_prenom, row?.contact_nom].filter(Boolean).join(" ");
  return legacy || row?.email || row?.telephone || "";
}

export default function PrestataireAttachModal({
  open = false,
  companyName = "",
  providers = [],
  loading = false,
  saving = false,
  onClose,
  onSelect
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getPrestataireDetailCopy(locale).attachModal, [locale]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setSearch("");
  }, [open]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = Array.isArray(providers) ? providers : [];
    if (!query) return list;
    return list.filter(row => {
      const haystack = [
        row.nom,
        row.type,
        row.email,
        row.telephone,
        formatContactPreview(row),
        ...(Array.isArray(row.contacts)
          ? row.contacts.flatMap(c => [c.nom, c.prenom, c.email, c.telephone])
          : [])
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [providers, search]);

  if (!open) return null;

  const subtitle = companyName
    ? interpolate(copy.subtitleWithName, { name: companyName })
    : copy.subtitleDefault;

  const handleClose = () => {
    if (saving) return;
    onClose?.();
  };

  const handleSelect = row => {
    if (saving) return;
    onSelect?.(row);
  };

  return createPortal(
    <div className={formStyles.overlay} onClick={handleClose} role="presentation">
      <div
        className={`${formStyles.shell} ${styles.shell}`}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prestataire-attach-modal-title"
      >
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:handshake-outline" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{copy.eyebrow}</p>
              <h2 className={formStyles.title} id="prestataire-attach-modal-title">
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
            <label className={formStyles.label} htmlFor="prestataire-attach-search">
              {copy.search}
            </label>
            <input
              id="prestataire-attach-search"
              type="search"
              className={formStyles.input}
              placeholder={copy.searchPlaceholder}
              value={search}
              onChange={event => setSearch(event.target.value)}
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
              <Icon icon="mdi:handshake-outline" className={styles.stateIcon} aria-hidden />
              <p>{providers.length === 0 ? copy.empty : copy.noResults}</p>
            </div>
          ) : (
            <div className={styles.companyList} role="listbox" aria-label={copy.search}>
              {filtered.map(row => {
                const preview = formatContactPreview(row);
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
                      <Icon icon="mdi:handshake-outline" />
                    </span>
                    <span className={styles.companyCopy}>
                      <span className={styles.companyName}>{row.nom || "-"}</span>
                      <span className={styles.companyMeta}>
                        {[row.type, preview].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
