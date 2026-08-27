import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCan } from "../../contexts/PermissionsContext";
import { interpolate } from "../../i18n/translate";
import { createKnowledgeArticle, fetchKnowledgeArticles } from "../../api/knowledgeBase";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import cyberStyles from "../CybersecuritePage/CybersecuritePage.module.css";
import { getKnowledgeBaseCopy } from "./knowledgeBaseI18n";
import KnowledgeArticleEditor from "./KnowledgeArticleEditor";
import styles from "./knowledgeBase.module.css";

function formatDate(value, locale) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : "fr-FR");
}

export default function KnowledgeBasePage({ onNavigate }) {
  const location = useLocation();
  const articleId = useMemo(() => {
    const match = String(location.pathname || "").match(/^\/knowledge-base\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  }, [location.pathname]);
  const locale = useAppLocale();
  const copy = useMemo(() => getKnowledgeBaseCopy(locale), [locale]);
  const canCreate = useCan("knowledge_base.create");
  const canEdit = useCan("knowledge_base.edit") || canCreate;
  const canDelete = useCan("knowledge_base.delete");
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchKnowledgeArticles({
        search: search.trim() || undefined,
        status
      });
      setArticles(rows);
    } catch (err) {
      setArticles([]);
      toast.error(err.message || copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [search, status, copy.loadError]);

  useEffect(() => {
    if (articleId) return undefined;
    const timer = window.setTimeout(() => { load(); }, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search, articleId]);

  const openArticle = useCallback(id => {
    onNavigate?.("KnowledgeBase", { articleId: id });
  }, [onNavigate]);

  const backToList = useCallback(() => {
    onNavigate?.("KnowledgeBase");
  }, [onNavigate]);

  const create = useCallback(async () => {
    setCreating(true);
    try {
      const article = await createKnowledgeArticle({ title: copy.untitled });
      toast.success(copy.created);
      openArticle(article.id);
    } catch (err) {
      toast.error(err.message || copy.createError);
    } finally {
      setCreating(false);
    }
  }, [copy.untitled, copy.created, copy.createError, openArticle]);

  const drafts = articles.filter(row => row.status === "draft").length;
  const published = articles.filter(row => row.status === "published").length;

  if (articleId) {
    return (
      <div className={cyberStyles.page}>
        <KnowledgeArticleEditor
          articleId={articleId}
          copy={copy}
          canEdit={canEdit}
          canDelete={canDelete}
          onBack={backToList}
        />
      </div>
    );
  }

  return (
    <div className={cyberStyles.page}>
      <MspPageHero
        eyebrow={copy.eyebrow}
        title={copy.pageTitle}
        subtitle={copy.subtitle}
        icon="mdi:book-open-page-variant-outline"
        actions={canCreate ? (
          <button type="button" className={styles.primaryBtn} onClick={create} disabled={creating}>
            <Icon icon="mdi:plus" /> {copy.newArticle}
          </button>
        ) : null}
      />
      <div className={styles.content}>
        <div className={styles.kpiRow}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrap}><Icon icon="mdi:book-open-page-variant-outline" width={22} /></div>
            <div><div className={styles.kpiValue}>{articles.length}</div><div className={styles.kpiLabel}>{copy.kpiTotal}</div></div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrap}><Icon icon="mdi:file-edit-outline" width={22} /></div>
            <div><div className={styles.kpiValue}>{drafts}</div><div className={styles.kpiLabel}>{copy.kpiDrafts}</div></div>
          </div>
          <div className={styles.kpiCard}>
            <div className={styles.kpiIconWrap}><Icon icon="mdi:check-decagram-outline" width={22} /></div>
            <div><div className={styles.kpiValue}>{published}</div><div className={styles.kpiLabel}>{copy.kpiPublished}</div></div>
          </div>
        </div>
        <div className={styles.toolbar}>
          <input className={styles.search} value={search} onChange={event => setSearch(event.target.value)} placeholder={copy.searchPlaceholder} />
          <div className={styles.filters}>
            {["all", "draft", "published"].map(key => (
              <button
                key={key}
                type="button"
                className={`${styles.filterBtn} ${status === key ? styles.filterBtnActive : ""}`}
                onClick={() => setStatus(key)}
              >
                {key === "all" ? copy.filterAll : key === "draft" ? copy.filterDraft : copy.filterPublished}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <p className={styles.empty}>{copy.loading}</p>
        ) : articles.length === 0 ? (
          <div className={styles.empty}>
            <p>{search || status !== "all" ? copy.emptyFiltered : copy.emptyTitle}</p>
            <p>{copy.emptyHint}</p>
          </div>
        ) : (
          <div className={styles.list}>
            {articles.map(article => (
              <button key={article.id} type="button" className={styles.card} onClick={() => openArticle(article.id)}>
                <div>
                  <h3 className={styles.cardTitle}>{article.title || copy.untitled}</h3>
                  <div className={styles.cardMeta}>
                    <span className={`${styles.badge} ${article.status === "draft" ? styles.badgeDraft : ""}`}>
                      {article.status === "published" ? copy.statusPublished : copy.statusDraft}
                    </span>
                    {article.visibleToAgents ? <span>{copy.audienceAgents}</span> : null}
                    {article.clientCount ? <span>{interpolate(copy.audienceClients, { count: String(article.clientCount) })}</span> : null}
                    {article.contactCount ? <span>{interpolate(copy.audienceContacts, { count: String(article.contactCount) })}</span> : null}
                    <span>{copy.updated} {formatDate(article.updatedAt, locale)}</span>
                  </div>
                </div>
                <Icon icon="mdi:chevron-right" width={22} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
