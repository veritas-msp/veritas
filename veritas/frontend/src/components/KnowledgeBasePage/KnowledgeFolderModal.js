import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { fetchClientsList, fetchContactsList } from "../../api/clients";
import { fetchKnowledgeFolder, fetchKnowledgeTagCatalog } from "../../api/knowledgeBase";
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

export default function KnowledgeFolderModal({
  open,
  mode,
  folder,
  parentId,
  copy,
  saving,
  onClose,
  onCreate,
  onRename
}) {
  const [name, setName] = useState("");
  const [inheritSharing, setInheritSharing] = useState(true);
  const [visibleToAgents, setVisibleToAgents] = useState(true);
  const [visibleToAllClients, setVisibleToAllClients] = useState(false);
  const [visibleToAllContacts, setVisibleToAllContacts] = useState(false);
  const [clientIds, setClientIds] = useState([]);
  const [contactIds, setContactIds] = useState([]);
  const [clientTagIds, setClientTagIds] = useState([]);
  const [contactTagIds, setContactTagIds] = useState([]);
  const [clientTags, setClientTags] = useState([]);
  const [contactTags, setContactTags] = useState([]);
  const [tagCatalog, setTagCatalog] = useState([]);
  const [tagCatalogLoading, setTagCatalogLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [clientQuery, setClientQuery] = useState("");
  const [contactQuery, setContactQuery] = useState("");
  const [loadingShare, setLoadingShare] = useState(false);
  const [inheritedSharing, setInheritedSharing] = useState(null);

  useEffect(() => {
    if (!open) return;
    setName(folder?.name || "");
    setClientQuery("");
    setContactQuery("");
    setInheritedSharing(null);
    if (mode !== "share" || !folder?.id) return undefined;
    let cancelled = false;
    setLoadingShare(true);
    setTagCatalogLoading(true);
    (async () => {
      try {
        const [loaded, clientRows, contactRows, catalog] = await Promise.all([
          fetchKnowledgeFolder(folder.id),
          fetchClientsList().catch(() => []),
          fetchContactsList().catch(() => []),
          fetchKnowledgeTagCatalog().catch(() => [])
        ]);
        if (cancelled) return;
        const next = loaded.folder || folder;
        setInheritSharing(next.inheritSharing !== false);
        setVisibleToAgents(next.visibleToAgents !== false);
        setVisibleToAllClients(next.visibleToAllClients === true);
        setVisibleToAllContacts(next.visibleToAllContacts === true);
        setClientIds((next.clientIds || []).map(id => Number(id)));
        setContactIds((next.contactIds || []).map(id => Number(id)));
        setClientTagIds((next.clientTagIds || []).map(String));
        setContactTagIds((next.contactTagIds || []).map(String));
        setClientTags(Array.isArray(next.clientTags) ? next.clientTags : []);
        setContactTags(Array.isArray(next.contactTags) ? next.contactTags : []);
        setTagCatalog(Array.isArray(catalog) ? catalog : []);
        setClients(Array.isArray(clientRows) ? clientRows : []);
        setContacts(Array.isArray(contactRows) ? contactRows : []);
        setInheritedSharing(loaded.inheritedSharing || null);
      } finally {
        if (!cancelled) {
          setLoadingShare(false);
          setTagCatalogLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [open, mode, folder]);

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
    return clients.filter(row => !clientIds.includes(Number(row.id))).filter(row => !q || String(row.name || "").toLowerCase().includes(q)).slice(0, 8);
  }, [clients, clientIds, clientQuery]);
  const contactSuggestions = useMemo(() => {
    const q = contactQuery.trim().toLowerCase();
    return contacts.filter(row => !contactIds.includes(Number(row.id))).filter(row => !q || contactLabel(row).toLowerCase().includes(q) || String(row.email || "").toLowerCase().includes(q)).slice(0, 8);
  }, [contacts, contactIds, contactQuery]);

  if (!open) return null;

  const title = mode === "share" ? copy.shareFolder : mode === "rename" ? copy.renameFolder : parentId ? copy.newSubfolder : copy.newFolder;

  const submit = async () => {
    if (mode === "create") {
      await onCreate({ name, parentId });
      return;
    }
    if (mode === "rename") {
      await onRename(folder.id, { name });
      return;
    }
    await onRename(folder.id, {
      inheritSharing,
      visibleToAgents,
      visibleToAllClients,
      visibleToAllContacts,
      clientIds,
      contactIds,
      clientTagIds,
      contactTagIds
    });
  };

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalShell} onClick={event => event.stopPropagation()}>
        <div className={styles.modalHead}>
          <h2>{title}</h2>
          <button type="button" className={styles.folderTool} onClick={onClose}><Icon icon="mdi:close" /></button>
        </div>
        <div className={styles.modalBody}>
          {mode !== "share" ? (
            <input className={styles.search} value={name} onChange={event => setName(event.target.value)} placeholder={copy.folderNamePlaceholder} autoFocus />
          ) : loadingShare ? (
            <p className={styles.hint}>{copy.loading}</p>
          ) : (
            <>
              <p className={styles.hint}>{copy.folderShareHint}</p>
              {inheritSharing && inheritedSharing?.folders?.length > 1 ? (
                <p className={styles.hint}>
                  {copy.inheritedFrom}: {inheritedSharing.folders.map(item => item.name).join(" → ")}
                </p>
              ) : null}
              {folder?.parentId ? (
                <OptionToggle
                  checked={inheritSharing}
                  label={copy.inheritSharing}
                  hint={copy.inheritSharingHint}
                  onChange={setInheritSharing}
                />
              ) : null}
              <OptionToggle checked={visibleToAgents} label={copy.visibleToAgents} hint={copy.visibleToAgentsHint} onChange={setVisibleToAgents} />
              <OptionToggle checked={visibleToAllClients} label={copy.visibleToAllClients} hint={copy.visibleToAllClientsHint} onChange={setVisibleToAllClients} />
              {!visibleToAllClients ? (
                <div>
                  <div className={styles.sideLabel}>{copy.clientsSpecific}</div>
                  <div className={styles.chipList}>
                    {selectedClients.map(row => (
                      <span key={row.id} className={styles.chip}>
                        {row.name}
                        <button type="button" onClick={() => setClientIds(ids => ids.filter(id => id !== Number(row.id)))}>×</button>
                      </span>
                    ))}
                  </div>
                  <input className={styles.search} value={clientQuery} onChange={event => setClientQuery(event.target.value)} placeholder={copy.clientsPlaceholder} />
                  {clientQuery && clientSuggestions.length ? (
                    <div className={styles.suggestList}>
                      {clientSuggestions.map(row => (
                        <button key={row.id} type="button" className={styles.suggestItem} onClick={() => { setClientIds(ids => [...ids, Number(row.id)]); setClientQuery(""); }}>{row.name}</button>
                      ))}
                    </div>
                  ) : null}
                  <div className={styles.sideLabel}>{copy.clientTagsSpecific}</div>
                  <p className={styles.hint}>{copy.clientTagsHint}</p>
                  <KnowledgeTagPicker
                    catalog={tagCatalog}
                    selectedIds={clientTagIds}
                    selectedTags={clientTags}
                    onChange={setClientTagIds}
                    loading={tagCatalogLoading}
                    placeholder={copy.tagsPlaceholder}
                    emptyLabel={copy.tagsEmpty}
                  />
                </div>
              ) : null}
              <OptionToggle checked={visibleToAllContacts} label={copy.visibleToAllContacts} hint={copy.visibleToAllContactsHint} onChange={setVisibleToAllContacts} />
              {!visibleToAllContacts ? (
                <div>
                  <div className={styles.sideLabel}>{copy.contactsSpecific}</div>
                  <div className={styles.chipList}>
                    {selectedContacts.map(row => (
                      <span key={row.id} className={styles.chip}>
                        {contactLabel(row)}
                        <button type="button" onClick={() => setContactIds(ids => ids.filter(id => id !== Number(row.id)))}>×</button>
                      </span>
                    ))}
                  </div>
                  <input className={styles.search} value={contactQuery} onChange={event => setContactQuery(event.target.value)} placeholder={copy.contactsPlaceholder} />
                  {contactQuery && contactSuggestions.length ? (
                    <div className={styles.suggestList}>
                      {contactSuggestions.map(row => (
                        <button key={row.id} type="button" className={styles.suggestItem} onClick={() => { setContactIds(ids => [...ids, Number(row.id)]); setContactQuery(""); }}>{contactLabel(row)}</button>
                      ))}
                    </div>
                  ) : null}
                  <div className={styles.sideLabel}>{copy.contactTagsSpecific}</div>
                  <p className={styles.hint}>{copy.contactTagsHint}</p>
                  <KnowledgeTagPicker
                    catalog={tagCatalog}
                    selectedIds={contactTagIds}
                    selectedTags={contactTags}
                    onChange={setContactTagIds}
                    loading={tagCatalogLoading}
                    placeholder={copy.tagsPlaceholder}
                    emptyLabel={copy.tagsEmpty}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose}>{copy.modalCancel}</button>
          <button type="button" className={styles.secondaryBtn} onClick={submit} disabled={saving || loadingShare || (mode !== "share" && !name.trim())}>
            {saving ? copy.saving : copy.save}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
