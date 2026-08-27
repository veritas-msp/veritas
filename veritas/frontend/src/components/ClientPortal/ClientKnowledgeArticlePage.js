import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { fetchPortalKnowledgeArticle, resolveKnowledgeHtml } from "../../api/knowledgeBase";
import { getClientPortalCopy } from "./clientPortalI18n";
import { sanitizeHtml } from "../../utils/sanitizeHtml";
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
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.knowledgeBase;
  const printRef = useRef(null);
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);

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
              <Link to="/client/knowledge-base" className={pageStyles.articleAction}>
                <Icon icon="mdi:arrow-left" /> {t.back}
              </Link>
              {article ? (
                <>
                  <button type="button" className={pageStyles.articleAction} onClick={printArticle}>
                    <Icon icon="mdi:printer-outline" /> {t.print}
                  </button>
                  <button type="button" className={pageStyles.articleAction} onClick={downloadPdf} disabled={pdfBusy}>
                    <Icon icon="mdi:file-pdf-box" /> {t.downloadPdf}
                  </button>
                  <button type="button" className={pageStyles.articleAction} onClick={copyLink}>
                    <Icon icon="mdi:link-variant" /> {t.copyLink}
                  </button>
                </>
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
              <div className={pageStyles.printHeader} data-print-title>
                <h1>{article.title}</h1>
                {article.category ? <p className={pageStyles.meta}>{article.category}</p> : null}
              </div>
              <article className={`${pageStyles.articleBody} ${kbStyles.readerBody}`}>
                {article.updatedAt ? <p className={pageStyles.meta}>{t.updated} {formatDate(article.updatedAt, locale)}</p> : null}
                <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(resolveKnowledgeHtml(article.contentHtml), KNOWLEDGE_ARTICLE_HTML_CONFIG) }} />
              </article>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
