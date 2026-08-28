import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { fetchClientsList, fetchContactsList } from "../../api/clients";
import { fetchKnowledgeFolder, fetchKnowledgeTagCatalog } from "../../api/knowledgeBase";
import KnowledgeShareForm from "./KnowledgeShareForm";
import styles from "./knowledgeBase.module.css";

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
  const [loadingShare, setLoadingShare] = useState(false);
  const [inheritedSharing, setInheritedSharing] = useState(null);

  useEffect(() => {
    if (!open) return;
    setName(folder?.name || "");
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
      <div className={`${styles.modalShell} ${mode === "share" ? styles.modalShellWide : ""}`} onClick={event => event.stopPropagation()}>
        <div className={styles.modalHead}>
          <h2>{title}</h2>
          <button type="button" className={styles.folderTool} onClick={onClose}><Icon icon="mdi:close" /></button>
        </div>
        <div className={`${styles.modalBody} ${mode === "share" ? styles.modalBodyShare : ""}`}>
          {mode !== "share" ? (
            <input className={styles.search} value={name} onChange={event => setName(event.target.value)} placeholder={copy.folderNamePlaceholder} autoFocus />
          ) : loadingShare ? (
            <p className={styles.hint}>{copy.loading}</p>
          ) : (
            <KnowledgeShareForm
              copy={copy}
              intro={copy.folderShareHint}
              inheritedFromText={inheritSharing && inheritedSharing?.folders?.length > 1
                ? `${copy.inheritedFrom}: ${inheritedSharing.folders.map(item => item.name).join(" → ")}`
                : null}
              showInherit={Boolean(folder?.parentId)}
              inheritSharing={inheritSharing}
              onInheritSharingChange={setInheritSharing}
              visibleToAgents={visibleToAgents}
              onVisibleToAgentsChange={setVisibleToAgents}
              visibleToAllClients={visibleToAllClients}
              onVisibleToAllClientsChange={setVisibleToAllClients}
              visibleToAllContacts={visibleToAllContacts}
              onVisibleToAllContactsChange={setVisibleToAllContacts}
              clients={clients}
              contacts={contacts}
              clientIds={clientIds}
              contactIds={contactIds}
              onClientIdsChange={setClientIds}
              onContactIdsChange={setContactIds}
              clientTagIds={clientTagIds}
              contactTagIds={contactTagIds}
              onClientTagIdsChange={setClientTagIds}
              onContactTagIdsChange={setContactTagIds}
              clientTags={clientTags}
              contactTags={contactTags}
              tagCatalog={tagCatalog}
              tagCatalogLoading={tagCatalogLoading}
            />
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
