import { useMemo } from "react";
import { Icon } from "@iconify/react";
import { createCommunicationEntry, enforcePrimaryCommunications, setPrimaryCommunication, sortCommunicationsByType } from "../../utils/contactCommunications";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getContactCommunicationTypes, getContactFormModalCopy, interpolate } from "./contactFormModalI18n";
import styles from "../EnterprisesPage/EnterpriseFormModal.module.css";
function CommunicationEntryRow({
  entry,
  typeDef,
  commCopy,
  onUpdate,
  onRemove,
  onSetPrimary
}) {
  const inputId = `contact-comm-${entry.id}`;
  return <li className={styles.commRow}>
      <Icon icon={typeDef.icon} className={styles.commRowIcon} aria-hidden />
      <input id={inputId} type={typeDef.inputType} className={`${styles.input} ${styles.commRowInput}`} value={entry.value} onChange={e => onUpdate(entry.id, {
      value: e.target.value
    })} placeholder={typeDef.placeholder} autoComplete="off" required aria-required="true" aria-label={typeDef.label} />
      <div className={styles.commRowActions}>
        {entry.isPrimary ? <span className={styles.commStarFavorite} title={commCopy.favoriteTitle} aria-label={`${typeDef.label} ${commCopy.favoriteTitle}`}>
            <Icon icon="mdi:star" aria-hidden />
          </span> : <button type="button" className={styles.commStarBtn} onClick={() => onSetPrimary(entry.id)} title={commCopy.setFavorite} aria-label={commCopy.setFavorite}>
            <Icon icon="mdi:star-outline" aria-hidden />
          </button>}
        <button type="button" className={styles.commRemoveBtn} onClick={() => onRemove(entry.id)} aria-label={interpolate(commCopy.removeAria, {
        label: typeDef.label
      })}>
          <Icon icon="mdi:close" aria-hidden />
        </button>
      </div>
    </li>;
}
export default function ContactCommunicationsEditor({
  communications = [],
  onChange
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getContactFormModalCopy(locale), [locale]);
  const commCopy = copy.communications;
  const communicationTypes = useMemo(() => getContactCommunicationTypes(locale), [locale]);
  const groupLabels = useMemo(() => ({
    email: commCopy.groupEmails,
    telephone: commCopy.groupPhones
  }), [commCopy]);
  const groupedCommunications = useMemo(() => communicationTypes.map(type => ({
    ...type,
    label: groupLabels[type.id] || type.label,
    entries: sortCommunicationsByType(communications).filter(entry => entry.type === type.id)
  })).filter(group => group.entries.length > 0), [communicationTypes, communications, groupLabels]);
  const commit = next => {
    onChange(enforcePrimaryCommunications(next));
  };
  const updateEntry = (entryId, patch) => {
    commit(communications.map(entry => String(entry.id) === String(entryId) ? {
      ...entry,
      ...patch
    } : entry));
  };
  const removeEntry = entryId => {
    commit(communications.filter(entry => String(entry.id) !== String(entryId)));
  };
  const setPrimary = entryId => {
    commit(setPrimaryCommunication(communications, entryId));
  };
  const addEntry = type => {
    const hasSameType = communications.some(entry => entry.type === type);
    commit([...communications, createCommunicationEntry(type, {
      isPrimary: !hasSameType
    })]);
  };
  return <div className={styles.commSection}>
      {groupedCommunications.length === 0 ? <p className={styles.hint}>{commCopy.emptyHint}</p> : <div className={styles.commGroups}>
          {groupedCommunications.map(group => <section key={group.id} className={styles.commGroup}>
              <h4 className={styles.commGroupTitle}>{group.label}</h4>
              <ul className={styles.commList}>
                {group.entries.map(entry => <CommunicationEntryRow key={entry.id} entry={entry} typeDef={group} commCopy={commCopy} onUpdate={updateEntry} onRemove={removeEntry} onSetPrimary={setPrimary} />)}
              </ul>
            </section>)}
        </div>}

      <div className={styles.commAddBlock}>
        <p className={styles.commAddLabel}>{commCopy.addLabel}</p>
        <div className={styles.commTypeGrid}>
          {communicationTypes.map(type => <button key={type.id} type="button" className={styles.commTypeCard} onClick={() => addEntry(type.id)}>
              <Icon icon={type.icon} className={styles.commTypeCardIcon} aria-hidden />
              <span>{type.label}</span>
            </button>)}
        </div>
      </div>
    </div>;
}
