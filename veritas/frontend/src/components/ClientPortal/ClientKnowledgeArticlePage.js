import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { commentPortalKnowledgeArticle, deletePortalKnowledgeComment, fetchPortalKnowledgeArticle, markPortalKnowledgeHelpful, ratePortalKnowledgeArticle, resolveKnowledgeHtml, togglePortalKnowledgeFavorite, updatePortalKnowledgeComment } from "../../api/knowledgeBase";
import { getClientPortalCopy } from "./clientPortalI18n";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
import { extractHeadings, highlightHtml, withHeadingIds } from "../KnowledgeBasePage/knowledgeArticleHelpers";
import { KNOWLEDGE_ARTICLE_HTML_CONFIG } from "../KnowledgeBasePage/knowledgeEditorNodes";
import kbStyles from "../KnowledgeBasePage/knowledgeBase.module.css";
import MspPageHero from "../Misc/MspPageHero/MspPageHero";
import portalStyles from "./ClientDashboard.module.css";
import pageStyles from "./ClientPortalPages.module.css";

function formatDate(value, locale) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : "fr-FR");
}

function articleFileName(title) {
  const slug = String(title || "article")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${slug || "article"}.pdf`;
}

function StarRatingInput({ value, onChange, disabled, formatAria }) {
  return (
    <div className={pageStyles.starRating} role="radiogroup">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={formatAria(star)}
          className={`${pageStyles.starBtn} ${star <= value ? pageStyles.starBtnActive : ""}`}
          disabled={disabled}
          onClick={() => onChange(star)}
        >
          <Icon icon={star <= value ? "mdi:star" : "mdi:star-outline"} aria-hidden />
        </button>
      ))}
    </div>
  );
}

async function downloadArticlePdf(sourceEl, filename) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf")
  ]);
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:fixed;left:-12000px;top:0;width:800px;background:#fff;color:#111;padding:28px;z-index:-1;";
  wrap.appendChild(sourceEl.cloneNode(true));
  wrap.querySelectorAll("[data-print-title]").forEach(el => {
    el.style.display = "block";
  });
  document.body.appendChild(wrap);
  try {
    const canvas = await html2canvas(wrap, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff"
    });
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = canvas.height * imgWidth / canvas.width;
    const imgData = canvas.toDataURL("image/png");
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    pdf.save(filename);
  } finally {
    wrap.remove();
  }
}

export default function ClientKnowledgeArticlePage() {
  const { articleId } = useParams();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.knowledgeBase;
  const printRef = useRef(null);
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentDraft, setEditingCommentDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const loaded = await fetchPortalKnowledgeArticle(articleId);
        if (!cancelled) setArticle(loaded);
      } catch (err) {
        if (!cancelled) {
          setArticle(null);
          toast.error(err.message || t.notFound);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [articleId, t.notFound]);

  const printArticle = useCallback(() => {
    window.print();
  }, []);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t.linkCopied);
    } catch {
      toast.error(t.copyError);
    }
  }, [t.copyError, t.linkCopied]);

  const downloadPdf = useCallback(async () => {
    if (!printRef.current || pdfBusy) return;
    setPdfBusy(true);
    const toastId = toast.info(t.pdfGenerating, { autoClose: false });
    try {
      await downloadArticlePdf(printRef.current, articleFileName(article?.title));
    } catch {
      toast.error(t.pdfError);
    } finally {
      toast.dismiss(toastId);
      setPdfBusy(false);
    }
  }, [article?.title, pdfBusy, t.pdfError, t.pdfGenerating]);

  const starAria = useCallback(star => interpolate(star === 1 ? t.starOne : t.starMany, { count: String(star) }), [t.starMany, t.starOne]);

  const submitRating = useCallback(async rating => {
    if (feedbackBusy) return;
    setFeedbackBusy(true);
    try {
      const next = await ratePortalKnowledgeArticle(articleId, rating);
      setArticle(next);
      toast.success(t.ratingSaved);
    } catch (err) {
      toast.error(err.message || t.ratingError);
    } finally {
      setFeedbackBusy(false);
    }
  }, [articleId, feedbackBusy, t.ratingError, t.ratingSaved]);

  const submitComment = useCallback(async event => {
    event.preventDefault();
    const body = commentDraft.trim();
    if (!body || feedbackBusy) return;
    setFeedbackBusy(true);
    try {
      const next = await commentPortalKnowledgeArticle(articleId, body);
      setArticle(next);
      setCommentDraft("");
      toast.success(t.commentSent);
    } catch (err) {
      toast.error(err.message || t.commentError);
    } finally {
      setFeedbackBusy(false);
    }
  }, [articleId, commentDraft, feedbackBusy, t.commentError, t.commentSent]);

  const removeComment = useCallback(async commentId => {
    if (feedbackBusy) return;
    if (!window.confirm(t.commentDeleteConfirm)) return;
    setFeedbackBusy(true);
    try {
      const next = await deletePortalKnowledgeComment(articleId, commentId);
      setArticle(next);
      if (editingCommentId === commentId) {
        setEditingCommentId(null);
        setEditingCommentDraft("");
      }
      toast.success(t.commentDeleted);
    } catch (err) {
      toast.error(err.message || t.commentError);
    } finally {
      setFeedbackBusy(false);
    }
  }, [articleId, editingCommentId, feedbackBusy, t.commentDeleteConfirm, t.commentDeleted, t.commentError]);

  const startEditComment = useCallback(comment => {
    if (feedbackBusy || !comment?.isMine) return;
    setEditingCommentId(comment.id);
    setEditingCommentDraft(String(comment.body || ""));
  }, [feedbackBusy]);

  const cancelEditComment = useCallback(() => {
    setEditingCommentId(null);
    setEditingCommentDraft("");
  }, []);

  const saveEditComment = useCallback(async () => {
    const body = editingCommentDraft.trim();
    if (!editingCommentId || !body || feedbackBusy) return;
    setFeedbackBusy(true);
    try {
      const next = await updatePortalKnowledgeComment(articleId, editingCommentId, body);
      setArticle(next);
      setEditingCommentId(null);
      setEditingCommentDraft("");
      toast.success(t.commentUpdated);
    } catch (err) {
      toast.error(err.message || t.commentUpdateError);
    } finally {
      setFeedbackBusy(false);
    }
  }, [articleId, editingCommentDraft, editingCommentId, feedbackBusy, t.commentUpdateError, t.commentUpdated]);

  const headings = useMemo(
    () => extractHeadings(withHeadingIds(article?.contentHtml)),
    [article?.contentHtml]
  );
  const articleHtml = useMemo(() => {
    if (!article) return "";
    return highlightHtml(
      sanitizeHtml(resolveKnowledgeHtml(withHeadingIds(article.contentHtml)), KNOWLEDGE_ARTICLE_HTML_CONFIG),
      searchQuery
    );
  }, [article, searchQuery]);

  return (
    <div className={`${portalStyles.mainScrollFill} ${portalStyles.portalPage}`}>
      <div className={`${portalStyles.mainContent} ${portalStyles.portalShell}`}>
        <MspPageHero
          className={pageStyles.portalPageHero}
          eyebrow={t.eyebrow}
          title={article?.title || t.pageTitle}
          subtitle={article?.category || t.subtitle}
          icon="mdi:book-open-page-variant-outline"
          actions={(
            <div className={pageStyles.articleActions}>
              <Link to="/client/knowledge-base" className={pageStyles.articleBack}>
                <Icon icon="mdi:arrow-left" aria-hidden />
                {t.back}
              </Link>
              {article ? (
                <div className={pageStyles.articleActionGroup} role="group">
                  <button
                    type="button"
                    className={`${pageStyles.articleIconBtn} ${article.isFavorite ? pageStyles.articleIconBtnOn : ""}`}
                    title={article.isFavorite ? t.favoriteRemove : t.favoriteAdd}
                    aria-label={article.isFavorite ? t.favoriteRemove : t.favoriteAdd}
                    aria-pressed={article.isFavorite}
                    onClick={async () => {
                      try {
                        const next = await togglePortalKnowledgeFavorite(articleId);
                        setArticle(next);
                      } catch (err) {
                        toast.error(err.message || t.helpfulError);
                      }
                    }}
                  >
                    <Icon icon={article.isFavorite ? "mdi:bookmark" : "mdi:bookmark-outline"} aria-hidden />
                  </button>
                  <button type="button" className={pageStyles.articleIconBtn} onClick={printArticle} title={t.print} aria-label={t.print}>
                    <Icon icon="mdi:printer-outline" aria-hidden />
                  </button>
                  <button type="button" className={pageStyles.articleIconBtn} onClick={downloadPdf} disabled={pdfBusy} title={t.downloadPdf} aria-label={t.downloadPdf}>
                    <Icon icon="mdi:file-pdf-box" aria-hidden />
                  </button>
                  <button type="button" className={pageStyles.articleIconBtn} onClick={copyLink} title={t.copyLink} aria-label={t.copyLink}>
                    <Icon icon="mdi:link-variant" aria-hidden />
                  </button>
                </div>
              ) : null}
            </div>
          )}
        />
        <section className={portalStyles.panel}>
          {loading ? (
            <p className={portalStyles.empty}>{t.loading}</p>
          ) : !article ? (
            <p className={portalStyles.empty}>{t.notFound}</p>
          ) : (
            <div ref={printRef}>
              <nav className={pageStyles.breadcrumb}>
                <Link to="/client/knowledge-base">{t.breadcrumbHome}</Link>
                {(article.breadcrumb || []).map((folder, index, all) => (
                  <span key={folder.id}>
                    <span className={pageStyles.breadcrumbSep}>/</span>
                    {index === all.length - 1 ? (
                      <Link to={`/client/knowledge-base?folderId=${encodeURIComponent(folder.id)}`}>{folder.name}</Link>
                    ) : (
                      <span>{folder.name}</span>
                    )}
                  </span>
                ))}
                <span className={pageStyles.breadcrumbSep}>/</span>
                <span>{article.title}</span>
              </nav>
              <div className={pageStyles.articleLayout}>
                <div className={pageStyles.articleMain}>
              <div className={pageStyles.printHeader} data-print-title>
                <h1>{article.title}</h1>
                {article.category ? <p className={pageStyles.meta}>{article.category}</p> : null}
              </div>
              <article className={`${pageStyles.articleBody} ${kbStyles.readerBody}`}>
                {article.updatedAt ? <p className={pageStyles.meta}>{t.updated} {formatDate(article.updatedAt, locale)}</p> : null}
                <div dangerouslySetInnerHTML={{ __html: articleHtml }} />
              </article>
              {article.canGiveFeedback ? (
                <div className={pageStyles.helpfulBox}>
                  <p>{t.helpfulAsk}</p>
                  <div className={pageStyles.helpfulBtns}>
                    <button type="button" className={`${pageStyles.articleAction} ${article.myHelpful === true ? pageStyles.filterChipOn : ""}`} disabled={feedbackBusy} onClick={async () => {
                      try {
                        const next = await markPortalKnowledgeHelpful(articleId, true);
                        setArticle(next);
                        toast.success(t.helpfulThanks);
                      } catch (err) {
                        toast.error(err.message || t.helpfulError);
                      }
                    }}>{t.helpfulYes}</button>
                    <button type="button" className={`${pageStyles.articleAction} ${article.myHelpful === false ? pageStyles.filterChipOn : ""}`} disabled={feedbackBusy} onClick={async () => {
                      try {
                        const next = await markPortalKnowledgeHelpful(articleId, false);
                        setArticle(next);
                        toast.success(t.helpfulThanks);
                      } catch (err) {
                        toast.error(err.message || t.helpfulError);
                      }
                    }}>{t.helpfulNo}</button>
                  </div>
                </div>
              ) : null}
              {(article.related || []).length ? (
                <div className={pageStyles.seeAlso}>
                  <h2>{t.seeAlso}</h2>
                  <ul>
                    {article.related.map(row => (
                      <li key={row.id}><Link to={`/client/knowledge-base/${row.id}`}>{row.title}</Link></li>
                    ))}
                  </ul>
                </div>
              ) : null}
                </div>
                {headings.length > 1 ? (
                  <aside className={pageStyles.articleToc}>
                    <div className={pageStyles.articleTocTitle}>{t.tocTitle}</div>
                    <ol>
                      {headings.map(heading => (
                        <li key={heading.id} style={{ paddingLeft: `${(heading.level - 1) * 0.55}rem` }}>
                          <a href={`#${heading.id}`}>{heading.text}</a>
                        </li>
                      ))}
                    </ol>
                  </aside>
                ) : null}
              </div>
            </div>
          )}
        </section>
        {!loading && article && (article.ratingsEnabled || article.commentsEnabled) ? (
          <section className={`${portalStyles.panel} ${pageStyles.feedbackPanel}`}>
            {article.ratingsEnabled ? (
              <div className={`${pageStyles.feedbackBlock} ${pageStyles.feedbackRating}`}>
                <h2 className={pageStyles.feedbackTitle}>{t.rateThis}</h2>
                {article.ratingCount ? (
                  <p className={pageStyles.meta}>
                    {interpolate(t.averageRating, { avg: String(article.ratingAverage || 0), count: String(article.ratingCount || 0) })}
                  </p>
                ) : null}
                {article.canGiveFeedback ? (
                  <>
                    <p className={pageStyles.feedbackLabel}>{t.yourRating}</p>
                    <StarRatingInput
                      value={Number(article.myRating) || 0}
                      onChange={submitRating}
                      disabled={feedbackBusy}
                      formatAria={starAria}
                    />
                  </>
                ) : (
                  <p className={pageStyles.meta}>{t.commentNeedContact}</p>
                )}
              </div>
            ) : null}
            {article.commentsEnabled ? (
              <div className={`${pageStyles.feedbackBlock} ${pageStyles.feedbackComments}`}>
                <h2 className={pageStyles.feedbackTitle}>{t.commentsTitle}</h2>
                {article.commentsCompany ? <p className={pageStyles.meta}>{t.commentsSharedHint}</p> : null}
                {article.canGiveFeedback ? (
                  <form className={pageStyles.commentForm} onSubmit={submitComment}>
                    <textarea
                      className={pageStyles.commentInput}
                      value={commentDraft}
                      onChange={event => setCommentDraft(event.target.value)}
                      placeholder={t.commentPlaceholder}
                      maxLength={2000}
                      rows={4}
                      disabled={feedbackBusy}
                    />
                    <button type="submit" className={pageStyles.articleAction} disabled={feedbackBusy || !commentDraft.trim()}>
                      {t.commentSend}
                    </button>
                  </form>
                ) : (
                  <p className={pageStyles.meta}>{t.commentNeedContact}</p>
                )}
                {(article.comments || []).length === 0 ? (
                  <p className={pageStyles.meta}>{t.commentEmpty}</p>
                ) : (
                  <ul className={pageStyles.commentList}>
                    {(article.comments || []).map(comment => {
                      const isEditing = String(editingCommentId) === String(comment.id);
                      return (
                      <li key={comment.id} className={pageStyles.commentItem}>
                        <div className={pageStyles.commentHead}>
                          <strong>{comment.authorName}</strong>
                          {comment.companyName ? <span> · {comment.companyName}</span> : null}
                          <span className={pageStyles.meta}> · {formatDate(comment.createdAt, locale)}</span>
                          {comment.edited ? <span className={pageStyles.meta}> · {copy.common.edited}</span> : null}
                        </div>
                        {isEditing ? (
                          <div className={pageStyles.commentEditBox}>
                            <textarea
                              className={pageStyles.commentInput}
                              value={editingCommentDraft}
                              onChange={event => setEditingCommentDraft(event.target.value)}
                              maxLength={2000}
                              rows={4}
                              disabled={feedbackBusy}
                            />
                            <div className={pageStyles.commentActions}>
                              <button type="button" className={pageStyles.articleAction} disabled={feedbackBusy} onClick={cancelEditComment}>
                                {copy.common.cancel}
                              </button>
                              <button type="button" className={pageStyles.articleAction} disabled={feedbackBusy || !editingCommentDraft.trim()} onClick={saveEditComment}>
                                {copy.common.save}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className={pageStyles.commentBody}>{comment.body}</p>
                        )}
                        {comment.isMine && !isEditing ? (
                          <div className={pageStyles.commentActions}>
                            <button
                              type="button"
                              className={pageStyles.commentAction}
                              disabled={feedbackBusy}
                              onClick={() => startEditComment(comment)}
                            >
                              {t.commentEdit}
                            </button>
                            <button
                              type="button"
                              className={`${pageStyles.commentAction} ${pageStyles.commentActionDanger}`}
                              disabled={feedbackBusy}
                              onClick={() => removeComment(comment.id)}
                            >
                              {t.commentDelete}
                            </button>
                          </div>
                        ) : null}
                      </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
