import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { interpolate } from "../../i18n/translate";
import { fetchClientsList, fetchContactsList } from "../../api/clients";
import { deleteKnowledgeArticle, fetchKnowledgeArticle, publishKnowledgeArticle, resolveKnowledgeHtml, resolveKnowledgeJson, toStoredKnowledgeHtml, toStoredKnowledgeJson, unpublishKnowledgeArticle, updateKnowledgeArticle } from "../../api/knowledgeBase";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import KnowledgeBaseEditor from "./KnowledgeBaseEditor";
import styles from "./knowledgeBase.module.css";

const ARTICLE_HTML_CONFIG = {
  ALLOWED_TAGS: ["p", "br", "strong", "em", "b", "i", "u", "s", "ul", "ol", "li", "a", "h1", "h2", "h3", "h4", "blockquote", "code", "pre", "span", "div", "img", "table", "thead", "tbody", "tr", "th", "td", "hr", "input"],
  ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "title", "class", "colspan", "rowspan", "data-type", "data-checked", "type", "checked"]
};

function contactLabel(contact) {
  const name = `${contact.prenom || ""} ${contact.nom || ""}`.trim();
  return name || contact.email || `#${contact.id}`;
}

export default function KnowledgeArticleEditor({
  articleId,
  copy,
  canEdit,
  canDelete,
  onBack
}) {
  const [article, setArticle] = useState(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [visibleToAgents, setVisibleToAgents] = useState(true);
  const [clientIds, setClientIds] = useState([]);
  const [contactIds, setContactIds] = useState([]);
  const [contentJson, setContentJson] = useState(null);
  const [contentHtml, setContentHtml] = useState("");
  const [clients, setClients] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [clientQuery, setClientQuery] = useState("");
  const [contactQuery, setContactQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [loaded, clientRows, contactRows] = await Promise.all([
          fetchKnowledgeArticle(articleId),
          fetchClientsList().catch(() => []),
          fetchContactsList().catch(() => [])
        ]);
        if (cancelled) return;
        setArticle(loaded);
        setTitle(loaded.title || "");
        setCategory(loaded.category || "");
        setVisibleToAgents(loaded.visibleToAgents !== false);
        setClientIds((loaded.clientIds || []).map(id => Number(id)));
        setContactIds((loaded.contactIds || []).map(id => Number(id)));
        setContentJson(resolveKnowledgeJson(loaded.contentJson));
        setContentHtml(resolveKnowledgeHtml(loaded.contentHtml || ""));
        setClients(Array.isArray(clientRows) ? clientRows : []);
        setContacts(Array.isArray(contactRows) ? contactRows : []);
      } catch (err) {
        toast.error(err.message || copy.loadError);
        onBack();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [articleId, copy.loadError, onBack]);

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

  const payload = useCallback(() => ({
    title,
    category,
    visibleToAgents,
    clientIds,
    contactIds,
    contentJson: toStoredKnowledgeJson(contentJson),
    contentHtml: toStoredKnowledgeHtml(contentHtml)
  }), [title, category, visibleToAgents, clientIds, contactIds, contentJson, contentHtml]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const next = await updateKnowledgeArticle(articleId, payload());
      setArticle(next);
      toast.success(copy.saved);
    } catch (err) {
      toast.error(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  }, [articleId, payload, copy.saved, copy.saveError]);

  const publish = useCallback(async () => {
    setSaving(true);
    try {
      await updateKnowledgeArticle(articleId, payload());
      const next = await publishKnowledgeArticle(articleId, {
        visibleToAgents,
        clientIds,
        contactIds
      });
      setArticle(next);
      toast.success(copy.published);
    } catch (err) {
      toast.error(err.message || copy.publishError);
    } finally {
      setSaving(false);
    }
  }, [articleId, payload, visibleToAgents, clientIds, contactIds, copy.published, copy.publishError]);

  const unpublish = useCallback(async () => {
    setSaving(true);
    try {
      const next = await unpublishKnowledgeArticle(articleId);
      setArticle(next);
      toast.success(copy.unpublished);
    } catch (err) {
      toast.error(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  }, [articleId, copy.unpublished, copy.saveError]);

  const onDelete = useCallback(async () => {
    try {
      await deleteKnowledgeArticle(articleId);
      toast.success(copy.deleted);
      onBack();
    } catch (err) {
      toast.error(err.message || copy.deleteError);
    }
  }, [articleId, copy.deleted, copy.deleteError, onBack]);

  if (loading || !article) {
    return <p className={styles.empty}>{copy.loading}</p>;
  }

  const editable = Boolean(canEdit);

  return (
    <>
      <div className={styles.topActions}>
        <button type="button" className={styles.ghostBtn} onClick={onBack}>
          <Icon icon="mdi:arrow-left" /> {copy.back}
        </button>
        {editable ? (
          <>
            <button type="button" className={styles.ghostBtn} onClick={save} disabled={saving}>{saving ? copy.saving : copy.save}</button>
            {article.status === "published" ? (
              <button type="button" className={styles.ghostBtn} onClick={unpublish} disabled={saving}>{copy.unpublish}</button>
            ) : (
              <button type="button" className={styles.primaryBtn} onClick={publish} disabled={saving}>{copy.publish}</button>
            )}
            {canDelete ? (
              <button type="button" className={styles.dangerBtn} onClick={() => setConfirmDelete(true)}>{copy.delete}</button>
            ) : null}
          </>
        ) : (
          <span className={styles.badge}>{copy.readOnly}</span>
        )}
      </div>
      <div className={styles.editorShell}>
        <section className={styles.editorMain}>
          {editable ? (
            <>
              <input className={styles.titleInput} value={title} onChange={event => setTitle(event.target.value)} placeholder={copy.titlePlaceholder} />
              <input className={styles.categoryInput} value={category} onChange={event => setCategory(event.target.value)} placeholder={copy.categoryPlaceholder} />
              <KnowledgeBaseEditor
                articleId={articleId}
                contentJson={contentJson}
                editable
                copy={copy}
                onChange={({ json, html }) => {
                  setContentJson(json);
                  setContentHtml(html);
                }}
              />
            </>
          ) : (
            <div className={styles.reader}>
              <h1>{title || copy.untitled}</h1>
              {category ? <p className={styles.hint}>{category}</p> : null}
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(resolveKnowledgeHtml(contentHtml), ARTICLE_HTML_CONFIG) }} />
            </div>
          )}
        </section>
        <aside className={styles.sidePanel}>
          <div>
            <div className={styles.sideTitle}>{copy.visibilityTitle}</div>
            <span className={`${styles.badge} ${article.status === "draft" ? styles.badgeDraft : ""}`}>
              {article.status === "published" ? copy.statusPublished : copy.statusDraft}
            </span>
          </div>
          <label className={styles.toggleRow}>
            <input type="checkbox" checked={visibleToAgents} disabled={!editable} onChange={event => setVisibleToAgents(event.target.checked)} />
            <span>
              {copy.visibleToAgents}
              <div className={styles.hint}>{copy.visibleToAgentsHint}</div>
            </span>
          </label>
          <div>
            <div className={styles.sideTitle}>{copy.clientsLabel}</div>
            <div className={styles.chipList}>
              {selectedClients.map(row => (
                <span key={row.id} className={styles.chip}>
                  {row.name}
                  {editable ? <button type="button" onClick={() => setClientIds(ids => ids.filter(id => id !== Number(row.id)))}>×</button> : null}
                </span>
              ))}
            </div>
            {editable ? (
              <>
                <input className={styles.search} value={clientQuery} onChange={event => setClientQuery(event.target.value)} placeholder={copy.clientsPlaceholder} />
                {clientQuery && clientSuggestions.length ? (
                  <div className={styles.suggestList}>
                    {clientSuggestions.map(row => (
                      <button key={row.id} type="button" className={styles.suggestItem} onClick={() => {
                        setClientIds(ids => [...ids, Number(row.id)]);
                        setClientQuery("");
                      }}>{row.name}</button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
          <div>
            <div className={styles.sideTitle}>{copy.contactsLabel}</div>
            <div className={styles.chipList}>
              {selectedContacts.map(row => (
                <span key={row.id} className={styles.chip}>
                  {contactLabel(row)}
                  {editable ? <button type="button" onClick={() => setContactIds(ids => ids.filter(id => id !== Number(row.id)))}>×</button> : null}
                </span>
              ))}
            </div>
            {editable ? (
              <>
                <input className={styles.search} value={contactQuery} onChange={event => setContactQuery(event.target.value)} placeholder={copy.contactsPlaceholder} />
                {contactQuery && contactSuggestions.length ? (
                  <div className={styles.suggestList}>
                    {contactSuggestions.map(row => (
                      <button key={row.id} type="button" className={styles.suggestItem} onClick={() => {
                        setContactIds(ids => [...ids, Number(row.id)]);
                        setContactQuery("");
                      }}>{contactLabel(row)}</button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
          <p className={styles.hint}>{copy.slashHint}</p>
        </aside>
      </div>
      <ConfirmModal
        open={confirmDelete}
        title={copy.deleteTitle}
        message={interpolate(copy.deleteMessage, { title: title || copy.untitled })}
        confirmLabel={copy.delete}
        variant="danger"
        onClose={() => setConfirmDelete(false)}
        onConfirm={onDelete}
      />
    </>
  );
}
