import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import KnowledgeTagPicker from "./KnowledgeTagPicker";
import styles from "./knowledgeBase.module.css";

function contactLabel(contact) {
  const name = `${contact.prenom || ""} ${contact.nom || ""}`.trim();
  return name || contact.email || `#${contact.id}`;
}

function OptionToggle({ checked, disabled, label, hint, onChange }) {
  return (
    <label className={`${styles.optionCard} ${checked ? styles.optionCardActive : ""}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} />
      <span>
        {label}
        {hint ? <div className={styles.hint}>{hint}</div> : null}
      </span>
    </label>
  );
}

export default function KnowledgeShareForm({
  copy,
  disabled = false,
  intro,
  inheritedFromText,
  showInherit = false,
  inheritSharing = true,
  onInheritSharingChange,
  visibleToAgents,
  onVisibleToAgentsChange,
  visibleToAllClients,
  onVisibleToAllClientsChange,
  visibleToAllContacts,
  onVisibleToAllContactsChange,
  clients = [],
  contacts = [],
  clientIds = [],
  contactIds = [],
  onClientIdsChange,
  onContactIdsChange,
  clientTagIds = [],
  contactTagIds = [],
  onClientTagIdsChange,
  onContactTagIdsChange,
  clientTags = [],
  contactTags = [],
  tagCatalog = [],
  tagCatalogLoading = false
}) {
  const [clientQuery, setClientQuery] = useState("");
  const [contactQuery, setContactQuery] = useState("");

  const selectedClients = useMemo(
    () => clients.filter(row => clientIds.includes(Number(row.id))),
    [clients, clientIds]
  );
  const selectedContacts = useMemo(
    () => contacts.filter(row => contactIds.includes(Number(row.id))),
    [contacts, contactIds]
  );
  const clientSuggestions = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    return clients
      .filter(row => !clientIds.includes(Number(row.id)))
      .filter(row => !q || String(row.name || "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [clients, clientIds, clientQuery]);
  const contactSuggestions = useMemo(() => {
    const q = contactQuery.trim().toLowerCase();
    return contacts
      .filter(row => !contactIds.includes(Number(row.id)))
      .filter(row => !q || contactLabel(row).toLowerCase().includes(q) || String(row.email || "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [contacts, contactIds, contactQuery]);

  return (
    <>
      {intro ? <p className={styles.shareIntro}>{intro}</p> : null}
      {inheritedFromText ? <p className={styles.hint}>{inheritedFromText}</p> : null}
      <div className={styles.shareLayout}>
        <section className={styles.shareSection}>
          <h3 className={styles.shareSectionTitle}>
            <Icon icon="mdi:account-hard-hat-outline" />
            {copy.audienceAgents}
          </h3>
          {showInherit ? (
            <OptionToggle
              checked={inheritSharing}
              disabled={disabled}
              label={copy.inheritSharing}
              hint={copy.inheritSharingHint}
              onChange={onInheritSharingChange}
            />
          ) : null}
          <OptionToggle
            checked={visibleToAgents}
            disabled={disabled}
            label={copy.visibleToAgents}
            hint={copy.visibleToAgentsHint}
            onChange={onVisibleToAgentsChange}
          />
        </section>
        <div className={styles.shareAudienceGrid}>
          <section className={styles.shareSection}>
            <h3 className={styles.shareSectionTitle}>
              <Icon icon="mdi:domain" />
              {copy.clientsLabel}
            </h3>
            <OptionToggle
              checked={visibleToAllClients}
              disabled={disabled}
              label={copy.visibleToAllClients}
              hint={copy.visibleToAllClientsHint}
              onChange={onVisibleToAllClientsChange}
            />
            {!visibleToAllClients ? (
              <div className={styles.shareFields}>
                <div className={styles.sideLabel}>{copy.clientsSpecific}</div>
                <div className={styles.chipList}>
                  {selectedClients.map(row => (
                    <span key={row.id} className={styles.chip}>
                      {row.name}
                      {!disabled ? (
                        <button type="button" onClick={() => onClientIdsChange(clientIds.filter(id => id !== Number(row.id)))}>×</button>
                      ) : null}
                    </span>
                  ))}
                </div>
                {!disabled ? (
                  <>
                    <input className={styles.search} value={clientQuery} onChange={event => setClientQuery(event.target.value)} placeholder={copy.clientsPlaceholder} />
                    {clientQuery && clientSuggestions.length ? (
                      <div className={styles.suggestList}>
                        {clientSuggestions.map(row => (
                          <button
                            key={row.id}
                            type="button"
                            className={styles.suggestItem}
                            onClick={() => {
                              onClientIdsChange([...clientIds, Number(row.id)]);
                              setClientQuery("");
                            }}
                          >
                            {row.name}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : null}
                <div className={styles.sideLabel}>{copy.clientTagsSpecific}</div>
                <p className={styles.hint}>{copy.clientTagsHint}</p>
                <KnowledgeTagPicker
                  catalog={tagCatalog}
                  selectedIds={clientTagIds}
                  selectedTags={clientTags}
                  onChange={onClientTagIdsChange}
                  disabled={disabled}
                  loading={tagCatalogLoading}
                  placeholder={copy.tagsPlaceholder}
                  emptyLabel={copy.tagsEmpty}
                />
              </div>
            ) : null}
          </section>
          <section className={styles.shareSection}>
            <h3 className={styles.shareSectionTitle}>
              <Icon icon="mdi:account-group-outline" />
              {copy.contactsLabel}
            </h3>
            <OptionToggle
              checked={visibleToAllContacts}
              disabled={disabled}
              label={copy.visibleToAllContacts}
              hint={copy.visibleToAllContactsHint}
              onChange={onVisibleToAllContactsChange}
            />
            {!visibleToAllContacts ? (
              <div className={styles.shareFields}>
                <div className={styles.sideLabel}>{copy.contactsSpecific}</div>
                <div className={styles.chipList}>
                  {selectedContacts.map(row => (
                    <span key={row.id} className={styles.chip}>
                      {contactLabel(row)}
                      {!disabled ? (
                        <button type="button" onClick={() => onContactIdsChange(contactIds.filter(id => id !== Number(row.id)))}>×</button>
                      ) : null}
                    </span>
                  ))}
                </div>
                {!disabled ? (
                  <>
                    <input className={styles.search} value={contactQuery} onChange={event => setContactQuery(event.target.value)} placeholder={copy.contactsPlaceholder} />
                    {contactQuery && contactSuggestions.length ? (
                      <div className={styles.suggestList}>
                        {contactSuggestions.map(row => (
                          <button
                            key={row.id}
                            type="button"
                            className={styles.suggestItem}
                            onClick={() => {
                              onContactIdsChange([...contactIds, Number(row.id)]);
                              setContactQuery("");
                            }}
                          >
                            {contactLabel(row)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : null}
                <div className={styles.sideLabel}>{copy.contactTagsSpecific}</div>
                <p className={styles.hint}>{copy.contactTagsHint}</p>
                <KnowledgeTagPicker
                  catalog={tagCatalog}
                  selectedIds={contactTagIds}
                  selectedTags={contactTags}
                  onChange={onContactTagIdsChange}
                  disabled={disabled}
                  loading={tagCatalogLoading}
                  placeholder={copy.tagsPlaceholder}
                  emptyLabel={copy.tagsEmpty}
                />
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </>
  );
}
