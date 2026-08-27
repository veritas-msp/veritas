import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { interpolate } from "../../i18n/translate";
import { fetchClientsList, fetchContactsList } from "../../api/clients";
import { deleteKnowledgeArticle, fetchKnowledgeArticle, fetchKnowledgeFolder, fetchKnowledgeFolders, fetchKnowledgeTagCatalog, publishKnowledgeArticle, resolveKnowledgeHtml, resolveKnowledgeJson, toStoredKnowledgeHtml, toStoredKnowledgeJson, unpublishKnowledgeArticle, updateKnowledgeArticle } from "../../api/knowledgeBase";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import cyberStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import KnowledgeBaseEditor from "./KnowledgeBaseEditor";
import KnowledgeCategoryModal from "./KnowledgeCategoryModal";
import KnowledgeTagPicker from "./KnowledgeTagPicker";
import { flattenFolderOptions } from "./KnowledgeFolderTree";
import { KNOWLEDGE_ARTICLE_HTML_CONFIG } from "./knowledgeEditorNodes";
import styles from "./knowledgeBase.module.css";

function contactLabel(contact) {
  const name = `${contact.prenom || ""} ${contact.nom || ""}`.trim();
  return name || contact.email || `#${contact.id}`;
}

function formatDate(value, locale) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : "fr-FR");
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

function htmlHasText(html) {
  return Boolean(String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function ArticleReader({
  copy,
  title,
  category,
  status,
  publishedAt,
  contentHtml,
  showBanner
}) {
  return (
    <article className={styles.reader}>
      {showBanner ? (
        <div className={styles.previewBanner}>
          <Icon icon="mdi:eye-outline" width={18} />
          <span>{status === "published" ? copy.previewHint : copy.previewDraftHint}</span>
        </div>
      ) : null}
      <div className={styles.readerInner}>
        {category ? <p className={styles.readerCategory}>{category}</p> : null}
        <h1 className={styles.readerTitle}>{title || copy.untitled}</h1>
        <p className={styles.readerMeta}>
          <span className={`${styles.badge} ${status === "draft" ? styles.badgeDraft : ""}`}>
            {status === "published" ? copy.statusPublished : copy.statusDraft}
          </span>
          {publishedAt ? <span>{copy.publishedAt} {publishedAt}</span> : null}
        </p>
        {htmlHasText(contentHtml) ? (
          <div
            className={styles.readerBody}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(resolveKnowledgeHtml(contentHtml), KNOWLEDGE_ARTICLE_HTML_CONFIG) }}
          />
        ) : (
          <p className={styles.previewEmpty}>{copy.previewEmpty}</p>
        )}
      </div>
    </article>
  );
}

export default function KnowledgeArticleEditor({
  articleId,
  mode = "edit",
  copy,
  locale,
  canEdit,
  canDelete,
  onBack
}) {
  const [article, setArticle] = useState(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [categoryModal, setCategoryModal] = useState(false);
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
  const [contentJson, setContentJson] = useState(null);
  const [contentHtml, setContentHtml] = useState("");
  const [clients, setClients] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [clientQuery, setClientQuery] = useState("");
  const [contactQuery, setContactQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [folderId, setFolderId] = useState("");
  const [folderOptions, setFolderOptions] = useState([]);
  const [inheritedSharing, setInheritedSharing] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setTagCatalogLoading(true);
      try {
        const [loaded, clientRows, contactRows, folderData, catalog] = await Promise.all([
          fetchKnowledgeArticle(articleId),
          fetchClientsList().catch(() => []),
          fetchContactsList().catch(() => []),
          fetchKnowledgeFolders().catch(() => ({ tree: [] })),
          fetchKnowledgeTagCatalog().catch(() => [])
        ]);
        if (cancelled) return;
        setArticle(loaded);
        setTitle(loaded.title || "");
        setCategory(loaded.category || "");
        setVisibleToAgents(loaded.visibleToAgents !== false);
        setVisibleToAllClients(loaded.visibleToAllClients === true);
        setVisibleToAllContacts(loaded.visibleToAllContacts === true);
        setClientIds((loaded.clientIds || []).map(id => Number(id)));
        setContactIds((loaded.contactIds || []).map(id => Number(id)));
        setClientTagIds((loaded.clientTagIds || []).map(String));
        setContactTagIds((loaded.contactTagIds || []).map(String));
        setClientTags(Array.isArray(loaded.clientTags) ? loaded.clientTags : []);
        setContactTags(Array.isArray(loaded.contactTags) ? loaded.contactTags : []);
        setTagCatalog(Array.isArray(catalog) ? catalog : []);
        setTagCatalogLoading(false);
        setFolderId(loaded.folderId || "");
        setInheritedSharing(loaded.inheritedSharing || null);
        setFolderOptions(flattenFolderOptions(folderData.tree || []));
        setContentJson(resolveKnowledgeJson(loaded.contentJson));
        setContentHtml(resolveKnowledgeHtml(loaded.contentHtml || ""));
        setClients(Array.isArray(clientRows) ? clientRows : []);
        setContacts(Array.isArray(contactRows) ? contactRows : []);
      } catch (err) {
        toast.error(err.message || copy.loadError);
        onBack();
      } finally {
        if (!cancelled) {
          setLoading(false);
          setTagCatalogLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [articleId, copy.loadError, onBack]);

  useEffect(() => {
    setPreviewing(false);
  }, [articleId]);

  useEffect(() => {
    if (loading) return undefined;
    if (!folderId) {
      setInheritedSharing(null);
      return undefined;
    }
    let cancelled = false;
    fetchKnowledgeFolder(folderId)
      .then(data => {
        if (!cancelled) setInheritedSharing(data.inheritedSharing || null);
      })
      .catch(() => {
        if (!cancelled) setInheritedSharing(null);
      });
    return () => { cancelled = true; };
  }, [folderId, loading]);

  useEffect(() => {
    if (!title) return;
    window.updateTabTitle?.("KnowledgeBaseArticle", { articleId, mode, title }, title);
  }, [articleId, mode, title]);

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
    visibleToAllClients,
    visibleToAllContacts,
    clientIds,
    contactIds,
    clientTagIds,
    contactTagIds,
    folderId: folderId || null,
    contentJson: toStoredKnowledgeJson(contentJson),
    contentHtml: toStoredKnowledgeHtml(contentHtml)
  }), [title, category, visibleToAgents, visibleToAllClients, visibleToAllContacts, clientIds, contactIds, clientTagIds, contactTagIds, folderId, contentJson, contentHtml]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const next = await updateKnowledgeArticle(articleId, payload());
      setArticle(next);
      setClientTagIds((next.clientTagIds || []).map(String));
      setContactTagIds((next.contactTagIds || []).map(String));
      setClientTags(Array.isArray(next.clientTags) ? next.clientTags : []);
      setContactTags(Array.isArray(next.contactTags) ? next.contactTags : []);
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
        visibleToAllClients,
        visibleToAllContacts,
        clientIds,
        contactIds,
        clientTagIds,
        contactTagIds
      });
      setArticle(next);
      setClientTagIds((next.clientTagIds || []).map(String));
      setContactTagIds((next.contactTagIds || []).map(String));
      setClientTags(Array.isArray(next.clientTags) ? next.clientTags : []);
      setContactTags(Array.isArray(next.contactTags) ? next.contactTags : []);
      toast.success(copy.published);
    } catch (err) {
      toast.error(err.message || copy.publishError);
    } finally {
      setSaving(false);
    }
  }, [articleId, payload, visibleToAgents, visibleToAllClients, visibleToAllContacts, clientIds, contactIds, clientTagIds, contactTagIds, copy.published, copy.publishError]);

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

  const contentClass = `${cyberStyles.mspContent} ${cyberStyles.mspContentList} ${styles.editorContent}`;

  if (loading || !article) {
    return (
      <main className={contentClass}>
        <div className={styles.empty}>{copy.loading}</div>
      </main>
    );
  }

  const isReadTab = mode === "read";
  const editable = Boolean(canEdit) && !isReadTab;
  const showPreview = isReadTab || previewing || !editable;
  const publishedAt = formatDate(article.publishedAt, locale);

  return (
    <>
      <MspPageHero
        className={styles.editorHero}
        eyebrow={copy.eyebrow}
        title={title || copy.untitled}
        subtitle={category || copy.subtitle}
        icon="mdi:book-open-page-variant-outline"
        actions={(
          <>
            <button type="button" className={styles.secondaryBtn} onClick={onBack}>
              <Icon icon="mdi:arrow-left" /> {copy.back}
            </button>
            {editable ? (
              <div className={styles.modeSwitch} role="tablist" aria-label={copy.previewMode}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={!previewing}
                  className={`${styles.modeBtn} ${!previewing ? styles.modeBtnActive : ""}`}
                  onClick={() => setPreviewing(false)}
                >
                  <Icon icon="mdi:pencil-outline" /> {copy.editMode}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewing}
                  className={`${styles.modeBtn} ${previewing ? styles.modeBtnActive : ""}`}
                  onClick={() => setPreviewing(true)}
                >
                  <Icon icon="mdi:eye-outline" /> {copy.previewMode}
                </button>
              </div>
            ) : null}
          </>
        )}
      />
      <main className={contentClass}>
        <div className={styles.editorPage}>
          <div className={`${styles.editorShell} ${showPreview ? styles.editorShellPreview : ""}`}>
            <section className={styles.editorMain}>
              {editable ? (
                <div className={styles.editorPane} hidden={showPreview}>
                  <input className={styles.titleInput} value={title} onChange={event => setTitle(event.target.value)} placeholder={copy.titlePlaceholder} />
                  <button
                    type="button"
                    className={`${styles.categoryPicker} ${category ? styles.categoryPickerHas : ""}`}
                    onClick={() => setCategoryModal(true)}
                  >
                    <Icon icon="mdi:tag-outline" />
                    {category || copy.categoryAssign}
                  </button>
                  <KnowledgeBaseEditor
                    articleId={articleId}
                    contentJson={contentJson}
                    editable
                    copy={copy}
                    locale={locale}
                    onChange={({ json, html }) => {
                      setContentJson(json);
                      setContentHtml(html);
                    }}
                  />
                </div>
              ) : null}
              {showPreview ? (
                <ArticleReader
                  copy={copy}
                  title={title}
                  category={category}
                  status={article.status}
                  publishedAt={publishedAt}
                  contentHtml={contentHtml}
                  showBanner={editable && previewing}
                />
              ) : null}
            </section>
            {showPreview ? null : (
            <aside className={styles.sidePanel}>
              <div className={styles.sideScroll}>
                <div className={styles.sideSection}>
                  <div className={styles.sideTitle}>{copy.optionsTitle}</div>
                  <div className={styles.sideStatus}>
                    <span className={`${styles.badge} ${article.status === "draft" ? styles.badgeDraft : ""}`}>
                      {article.status === "published" ? copy.statusPublished : copy.statusDraft}
                    </span>
                    {!editable ? <span className={styles.badge}>{copy.readOnly}</span> : null}
                  </div>
                  {publishedAt ? <p className={styles.hint}>{copy.publishedAt} {publishedAt}</p> : null}
                </div>
                <div className={styles.sideSection}>
                  <div className={styles.sideTitle}>{copy.folderLabel}</div>
                  <select className={styles.search} value={folderId} disabled={!editable} onChange={event => setFolderId(event.target.value)}>
                    <option value="">{copy.folderNone}</option>
                    {folderOptions.map(folder => (
                      <option key={folder.id} value={folder.id}>
                        {"— ".repeat(folder.depth)}{folder.name}
                      </option>
                    ))}
                  </select>
                  {inheritedSharing?.folders?.length ? (
                    <p className={styles.hint}>
                      {copy.inheritedFrom}: {inheritedSharing.folders.map(folder => folder.name).join(" → ")}
                    </p>
                  ) : null}
                </div>
                <div className={styles.sideSection}>
                  <div className={styles.sideTitle}>{copy.visibilityTitle}</div>
                  <OptionToggle
                    checked={visibleToAgents}
                    disabled={!editable}
                    label={copy.visibleToAgents}
                    hint={copy.visibleToAgentsHint}
                    onChange={setVisibleToAgents}
                  />
                </div>
                <div className={styles.sideSection}>
                  <div className={styles.sideTitle}>{copy.portalTitle}</div>
                  <OptionToggle
                    checked={visibleToAllClients}
                    disabled={!editable}
                    label={copy.visibleToAllClients}
                    hint={copy.visibleToAllClientsHint}
                    onChange={setVisibleToAllClients}
                  />
                  {!visibleToAllClients ? (
                    <div>
                      <div className={styles.sideLabel}>{copy.clientsSpecific}</div>
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
                      <div className={styles.sideLabel}>{copy.clientTagsSpecific}</div>
                      <p className={styles.hint}>{copy.clientTagsHint}</p>
                      <KnowledgeTagPicker
                        catalog={tagCatalog}
                        selectedIds={clientTagIds}
                        selectedTags={clientTags}
                        onChange={setClientTagIds}
                        disabled={!editable}
                        loading={tagCatalogLoading}
                        placeholder={copy.tagsPlaceholder}
                        emptyLabel={copy.tagsEmpty}
                      />
                    </div>
                  ) : null}
                  <OptionToggle
                    checked={visibleToAllContacts}
                    disabled={!editable}
                    label={copy.visibleToAllContacts}
                    hint={copy.visibleToAllContactsHint}
                    onChange={setVisibleToAllContacts}
                  />
                  {!visibleToAllContacts ? (
                    <div>
                      <div className={styles.sideLabel}>{copy.contactsSpecific}</div>
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
                      <div className={styles.sideLabel}>{copy.contactTagsSpecific}</div>
                      <p className={styles.hint}>{copy.contactTagsHint}</p>
                      <KnowledgeTagPicker
                        catalog={tagCatalog}
                        selectedIds={contactTagIds}
                        selectedTags={contactTags}
                        onChange={setContactTagIds}
                        disabled={!editable}
                        loading={tagCatalogLoading}
                        placeholder={copy.tagsPlaceholder}
                        emptyLabel={copy.tagsEmpty}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
              {editable ? (
                <div className={styles.sideActions}>
                  <button type="button" className={`${styles.secondaryBtn} ${styles.sideBtn}`} onClick={save} disabled={saving}>
                    <Icon icon="mdi:content-save-outline" /> {saving ? copy.saving : copy.save}
                  </button>
                  {article.status === "published" ? (
                    <button type="button" className={`${styles.secondaryBtn} ${styles.sideBtn}`} onClick={unpublish} disabled={saving}>
                      <Icon icon="mdi:file-undo-outline" /> {copy.unpublish}
                    </button>
                  ) : (
                    <button type="button" className={`${layout.primaryBtn} ${styles.sideBtn}`} onClick={publish} disabled={saving}>
                      <Icon icon="mdi:check-decagram-outline" /> {copy.publish}
                    </button>
                  )}
                  {canDelete ? (
                    <button type="button" className={`${styles.dangerBtn} ${styles.sideBtn}`} onClick={() => setConfirmDelete(true)}>
                      <Icon icon="mdi:trash-can-outline" /> {copy.delete}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </aside>
            )}
          </div>
        </div>
      </main>
      <KnowledgeCategoryModal
        open={categoryModal}
        copy={copy}
        selectedName={category}
        canManage={editable}
        assign
        onClose={() => setCategoryModal(false)}
        onSelect={setCategory}
      />
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
