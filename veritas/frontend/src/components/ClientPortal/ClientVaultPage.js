import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import { VAULT_CATEGORIES, fetchPortalVaultFiles, fetchPortalVaultSecrets, getPortalVaultDownloadUrl, getPortalVaultPreviewUrl, revealPortalVaultSecret, requestPortalVaultSecretRevocation } from "../../api/clientPortalVault";
import portalLayout from "./ClientDashboard.module.css";
import layout from "../EnterprisesPage/EnterprisesPage.module.css";
import tableStyles from "../TicketPage/TicketPage.module.css";
import pageStyles from "./ClientPortalPages.module.css";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
import VaultDocumentPreviewModal from "../shared/VaultDocumentPreviewModal/VaultDocumentPreviewModal";
import ClientVaultSecretDeleteModal from "./ClientVaultSecretDeleteModal";
import { getClientPortalCopy } from "./clientPortalI18n";
const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
export default function ClientVaultPage() {
  const locale = useAppLocale();
  const copy = useMemo(() => getClientPortalCopy(locale), [locale]);
  const t = copy.vault;
  const vaultTabs = useMemo(() => [{
    key: "documents",
    label: t.tabDocuments,
    icon: "mdi:file-document-outline",
    tone: "blue"
  }, {
    key: "secrets",
    label: t.tabSecrets,
    icon: "mdi:key-variant",
    tone: "violet"
  }], [t.tabDocuments, t.tabSecrets]);
  const [activeTab, setActiveTab] = useState("documents");
  const [files, setFiles] = useState([]);
  const [fileTotal, setFileTotal] = useState(0);
  const [secrets, setSecrets] = useState([]);
  const [secretTotal, setSecretTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [previewFile, setPreviewFile] = useState(null);
  const [revealedSecret, setRevealedSecret] = useState(null);
  const [revealingId, setRevealingId] = useState(null);
  const [revokingId, setRevokingId] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const loadDocuments = useCallback(async () => {
    const data = await fetchPortalVaultFiles({
      category: categoryFilter,
      search: search.trim() || undefined
    });
    setFiles(data.files);
    setFileTotal(data.total);
  }, [categoryFilter, search]);
  const loadSecrets = useCallback(async () => {
    const data = await fetchPortalVaultSecrets();
    setSecrets(data.secrets);
    setSecretTotal(data.total);
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadDocuments(), loadSecrets()]);
    } catch (error) {
      setFiles([]);
      setFileTotal(0);
      setSecrets([]);
      setSecretTotal(0);
      toast.error(error.message || t.loadError);
    } finally {
      setLoading(false);
    }
  }, [loadDocuments, loadSecrets, t.loadError]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      load();
    }, search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);
  const categoriesInList = useMemo(() => [...new Set(files.map(file => file.category).filter(Boolean))].sort(), [files]);
  const tabCounts = useMemo(() => ({
    documents: fileTotal,
    secrets: secretTotal
  }), [fileTotal, secretTotal]);
  const visibleCount = activeTab === "documents" ? files.length : secrets.length;
  const countLabel = activeTab === "documents" ? copy.formatDocumentCount(visibleCount) : copy.formatSharedAccessCount(visibleCount);
  const handleRevealSecret = async secret => {
    if (!secret?.id || revealingId) return;
    setRevealingId(secret.id);
    try {
      const revealed = await revealPortalVaultSecret(secret.id);
      setRevealedSecret(revealed);
      setSecrets(prev => prev.map(row => row.id === secret.id ? {
        ...row,
        view_count: revealed.view_count,
        views_remaining: revealed.views_remaining,
        availability: revealed.views_remaining > 0 ? "active" : "exhausted"
      } : row));
      if (revealed.views_remaining <= 0) {
        setSecretTotal(prev => Math.max(prev - 1, 0));
      }
    } catch (error) {
      toast.error(error.message || t.revealError);
      await loadSecrets();
    } finally {
      setRevealingId(null);
    }
  };
  const handleRequestRevocation = async secretId => {
    if (!secretId || revokingId) return;
    setRevokingId(secretId);
    try {
      await requestPortalVaultSecretRevocation(secretId);
      setSecrets(prev => prev.filter(row => row.id !== secretId));
      setSecretTotal(prev => Math.max(prev - 1, 0));
      if (revealedSecret?.id === secretId) setRevealedSecret(null);
      setDeleteConfirmOpen(false);
      toast.success(t.deleteSuccess);
    } catch (error) {
      toast.error(error.message || t.deleteError);
    } finally {
      setRevokingId(null);
    }
  };
  return <div className={`${portalLayout.mainScrollFill} ${layout.page}`}>
      <div className={`${portalLayout.portalShell} ${tableStyles.ticketShell}`}>
        <header className={layout.hero}>
          <div className={layout.heroText}>
            <p className={layout.eyebrow}>
              <Icon icon="mdi:safe-square-outline" aria-hidden />
              {t.eyebrow}
            </p>
            <h1 className={layout.pageTitle}>{t.pageTitle}</h1>
            <p className={layout.pageSubtitle}>
              {loading ? copy.common.loading : countLabel}
            </p>
          </div>
        </header>

        {!loading ? <div className={pageStyles.kpiRow2}>
            {vaultTabs.map(tab => {
          const count = tabCounts[tab.key] || 0;
          const active = activeTab === tab.key;
          return <button key={tab.key} type="button" className={`${layout.kpiCard} ${active ? layout.kpiCardActive : ""}`.trim()} onClick={() => setActiveTab(tab.key)} aria-pressed={active}>
                  <div className={`${layout.kpiIconWrap} ${layout[`kpiIcon_${tab.tone}`] || layout.kpiIcon_blue}`}>
                    <Icon icon={tab.icon} aria-hidden />
                  </div>
                  <div className={layout.kpiBody}>
                    <span className={layout.kpiValue}>{count}</span>
                    <span className={layout.kpiLabel}>{tab.label}</span>
                  </div>
                </button>;
        })}
          </div> : null}

        <div className={tableStyles.mainColumn}>
          {activeTab === "documents" ? <div className={`${layout.toolbar} ${tableStyles.toolbarGrow}`}>
              <div className={`${layout.searchWrap} ${tableStyles.searchWrapFull}`}>
                <Icon icon="mdi:magnify" className={layout.searchIcon} aria-hidden />
                <input type="text" inputMode="search" className={layout.searchInput} placeholder={t.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} aria-label={t.searchAria} />
                {search ? <button type="button" className={layout.clearButton} onClick={() => setSearch("")} aria-label={copy.ticket.list.clearSearchAria}>
                    <FaTimes />
                  </button> : null}
              </div>
              <select className={layout.sortSelect} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} aria-label={t.filterAria}>
                <option value="all">{t.allTypes}</option>
                {(categoriesInList.length ? categoriesInList : VAULT_CATEGORIES).map(cat => <option key={cat} value={cat}>
                    {copy.getVaultCategoryLabel(cat)}
                  </option>)}
              </select>
              <span className={layout.toolbarMeta}>{countLabel}</span>
            </div> : <div className={`${layout.toolbar} ${tableStyles.toolbarGrow}`}>
              <span className={layout.toolbarMeta}>{countLabel}</span>
            </div>}

          {loading ? <div className={layout.stateBox}>
              <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
              <span>{t.loading}</span>
            </div> : activeTab === "documents" ? files.length === 0 ? <div className={layout.emptyState}>
                <Icon icon="mdi:file-document-outline" className={layout.emptyStateIcon} aria-hidden />
                <p className={layout.emptyStateTitle}>{t.emptyDocumentsTitle}</p>
                <p className={layout.emptyStateHint}>{t.emptyDocumentsHint}</p>
              </div> : <div className={tableStyles.tablePanel}>
                <div className={`${pageStyles.panelContent} ${pageStyles.panelContentGrid}`}>
                  {files.map(file => <ClientVaultFileCard key={file.id} file={file} copy={copy} onPreview={() => setPreviewFile(file)} />)}
                </div>
              </div> : secrets.length === 0 ? <div className={layout.emptyState}>
              <Icon icon="mdi:key-variant" className={layout.emptyStateIcon} aria-hidden />
              <p className={layout.emptyStateTitle}>{t.emptySecretsTitle}</p>
              <p className={layout.emptyStateHint}>{t.emptySecretsHint}</p>
            </div> : <div className={tableStyles.tablePanel}>
              <div className={pageStyles.panelContent}>
                <div className={pageStyles.secretsList}>
                  {secrets.map(secret => <article key={secret.id} className={pageStyles.secretCard}>
                      <div className={pageStyles.secretCardIconWrap} aria-hidden>
                        <Icon icon="mdi:key-variant" />
                      </div>
                      <div className={pageStyles.secretCardBody}>
                        <h2 className={pageStyles.secretCardTitle}>{secret.title}</h2>
                        {secret.description ? <p className={pageStyles.secretCardDesc}>{secret.description}</p> : null}
                        <div className={pageStyles.secretCardMeta}>
                          <span>
                            {interpolate(t.expiresAt, {
                        date: copy.formatPortalDateTime(secret.expires_at)
                      })}
                          </span>
                          <span>
                            {copy.formatViewRemaining(secret.views_remaining, secret.max_views)}
                          </span>
                        </div>
                      </div>
                      <div className={pageStyles.secretCardActions}>
                        <button type="button" className={layout.primaryBtn} onClick={() => handleRevealSecret(secret)} disabled={revealingId === secret.id || secret.views_remaining <= 0}>
                          {revealingId === secret.id ? <>
                              <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                              {t.revealing}
                            </> : <>
                              <Icon icon="mdi:eye-outline" aria-hidden />
                              {t.reveal}
                            </>}
                        </button>
                      </div>
                    </article>)}
                </div>
              </div>
            </div>}
        </div>
      </div>

      {previewFile ? <VaultDocumentPreviewModal file={previewFile} onClose={() => setPreviewFile(null)} previewUrl={getPortalVaultPreviewUrl(previewFile.id)} downloadUrl={getPortalVaultDownloadUrl(previewFile.id)} /> : null}

      {revealedSecret ? <ClientVaultSecretRevealModal secret={revealedSecret} copy={copy} revoking={revokingId === revealedSecret.id} onClose={() => {
      if (revokingId) return;
      setDeleteConfirmOpen(false);
      setRevealedSecret(null);
    }} onRequestRevocation={() => setDeleteConfirmOpen(true)} /> : null}

      <ClientVaultSecretDeleteModal open={deleteConfirmOpen && Boolean(revealedSecret)} secret={revealedSecret} saving={Boolean(revealedSecret && revokingId === revealedSecret.id)} onClose={() => {
      if (revokingId) return;
      setDeleteConfirmOpen(false);
    }} onConfirm={() => revealedSecret?.id && handleRequestRevocation(revealedSecret.id)} />
    </div>;
}
function ClientVaultFileCard({
  file,
  copy,
  onPreview
}) {
  const t = copy.vault;
  const isImage = IMAGE_MIMES.has(file.mime_type);
  const isPdf = file.mime_type === "application/pdf";
  return <article className={pageStyles.docCard}>
      <button type="button" className={pageStyles.docCardThumb} onClick={onPreview} title={t.openTitle}>
        {isImage ? <img src={getPortalVaultPreviewUrl(file.id)} alt="" loading="lazy" /> : <Icon icon={isPdf ? "mdi:file-pdf-box" : "mdi:file-document-outline"} className={`${pageStyles.docCardThumbIcon} ${isPdf ? pageStyles.docCardThumbPdf : ""}`} aria-hidden />}
      </button>
      <div className={pageStyles.docCardBody}>
        <h2 className={pageStyles.docCardName} title={file.file_name}>
          {file.file_name}
        </h2>
        <span className={pageStyles.categoryBadge}>{copy.getVaultCategoryLabel(file.category)}</span>
        {file.description ? <p className={pageStyles.docCardDesc}>{file.description}</p> : null}
        <p className={pageStyles.docCardMeta}>
          {copy.formatPortalDate(file.created_at)} · {copy.formatSize(file.size_bytes)}
        </p>
      </div>
      <div className={pageStyles.docCardActions}>
        <button type="button" className={pageStyles.docCardActionBtn} onClick={onPreview} title={t.previewTitle}>
          <Icon icon="mdi:eye-outline" aria-hidden />
        </button>
        <a href={getPortalVaultDownloadUrl(file.id)} download={file.file_name} className={pageStyles.docCardActionBtn} title={t.downloadTitle}>
          <Icon icon="mdi:download-outline" aria-hidden />
        </a>
      </div>
    </article>;
}
function ClientVaultSecretRevealModal({
  secret,
  copy,
  revoking,
  onClose,
  onRequestRevocation
}) {
  const t = copy.vault;
  const [copiedField, setCopiedField] = useState(null);
  const copyValue = async (label, value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      window.setTimeout(() => setCopiedField(null), 1500);
      toast.success(t.copied);
    } catch {
      toast.error(t.copyError);
    }
  };
  const revealMeta = interpolate(t.revealMeta, {
    date: copy.formatPortalDateTime(secret.expires_at),
    views: copy.formatViewRemaining(secret.views_remaining, secret.max_views)
  });
  return createPortal(<div className={formStyles.overlay} onClick={onClose} role="presentation">
      <div className={`${formStyles.shell} ${formStyles.shellMedium}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="vault-secret-reveal-title">
        <div className={formStyles.accentBar} aria-hidden />
        <header className={formStyles.header}>
          <div className={formStyles.headerMain}>
            <div className={formStyles.headerIconWrap} aria-hidden>
              <Icon icon="mdi:key-variant" />
            </div>
            <div className={formStyles.headerText}>
              <p className={formStyles.eyebrow}>{t.revealEyebrow}</p>
              <h2 className={formStyles.title} id="vault-secret-reveal-title">
                {secret.title}
              </h2>
              <p className={formStyles.subtitle}>{t.revealSubtitle}</p>
            </div>
          </div>
          <button type="button" className={formStyles.closeBtn} onClick={onClose} aria-label={copy.common.close}>
            <FaTimes />
          </button>
        </header>

        <div className={pageStyles.secretModalBody}>
          {secret.description ? <p className={pageStyles.secretModalIntro}>{secret.description}</p> : null}

          {secret.login ? <div className={pageStyles.secretField}>
              <span className={pageStyles.secretFieldLabel}>{t.loginLabel}</span>
              <div className={pageStyles.secretValueRow}>
                <code className={pageStyles.secretValue}>{secret.login}</code>
                <button type="button" className={pageStyles.secretCopyBtn} onClick={() => copyValue("login", secret.login)}>
                  <Icon icon={copiedField === "login" ? "mdi:check" : "mdi:content-copy"} aria-hidden />
                </button>
              </div>
            </div> : null}

          <div className={pageStyles.secretField}>
            <span className={pageStyles.secretFieldLabel}>{t.secretLabel}</span>
            <div className={pageStyles.secretValueRow}>
              <code className={pageStyles.secretValue}>{secret.secret}</code>
              <button type="button" className={pageStyles.secretCopyBtn} onClick={() => copyValue("secret", secret.secret)}>
                <Icon icon={copiedField === "secret" ? "mdi:check" : "mdi:content-copy"} aria-hidden />
              </button>
            </div>
          </div>

          <p className={pageStyles.secretModalMeta}>{revealMeta}</p>

          <p className={pageStyles.secretModalWarning}>{t.revealWarning}</p>
        </div>

        <footer className={formStyles.footer}>
          <span className={formStyles.footerHint}>{copy.common.confidentialUse}</span>
          <div className={formStyles.footerActions}>
            <button type="button" className={`${formStyles.ghostBtn} ${formStyles.footerDeleteBtn}`.trim()} onClick={onRequestRevocation} disabled={revoking}>
              {revoking ? t.deleting : t.deleteAccess}
            </button>
            <button type="button" className={formStyles.primaryBtn} onClick={onClose}>
              {copy.common.close}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
