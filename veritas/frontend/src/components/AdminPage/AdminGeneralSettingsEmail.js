import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import API_BASE_URL from "../../config";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { interpolate } from "../../i18n/translate";
import {
  fetchTicketAutomationConfig,
  saveTicketAutomationConfig
} from "../../utils/ticketAutomationStorage";
import {
  COLLECTOR_PROVIDER_PRESETS,
  findCollectorProviderPreset,
  formatCollectorStatPercent,
  resolveCollectorEmailStats
} from "./collectorConstants";
import { getAdminMailCollectCopy } from "./adminMailCollectI18n";
import { getAdminGeneralSettingsCopy } from "./adminGeneralSettingsI18n";
import SettingsSection from "./AdminGeneralSettingsSection";
import AdminGeneralSettingsLoading from "./AdminGeneralSettingsLoading";
import { Btn, Badge, EntityStatus, Switch } from "./AdminUi";
import s from "./AdminGeneralSettingsPlatform.module.css";
import CollectorFormModal from "./CollectorFormModal";
import CollectorDeleteModal from "./CollectorDeleteModal";
import CollectorFoldersModal from "./CollectorFoldersModal";
import CollectorMailboxPeekModal from "./CollectorMailboxPeekModal";
import CollectorLogsModal from "./CollectorLogsModal";

function buildDefaultCollector() {
  return {
    id: `collector-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: "",
    enabled: true,
    server: "",
    protocol: "imap",
    security: "tls",
    validateCertMode: "no-validate-cert",
    inboxFolder: "INBOX",
    port: "",
    username: "",
    password: "",
    acceptedFolder: "",
    refusedFolder: "",
    unreadOnly: false,
    checkIntervalMinutes: 5,
    ingestEnabled: true,
    lastCheckedAt: "",
    logs: [],
    stats: { collected: 0, validated: 0, ignored: 0 }
  };
}

function ensureUniqueCollectorIds(collectors = []) {
  const seen = new Set();
  return (Array.isArray(collectors) ? collectors : []).map((collector, idx) => {
    const rawId = String(collector?.id || "").trim();
    const baseId = rawId || `collector-${Date.now()}-${idx}-${Math.random().toString(16).slice(2, 8)}`;
    if (!seen.has(baseId)) {
      seen.add(baseId);
      return { ...collector, id: baseId };
    }
    const nextId = `${baseId}-${idx}-${Math.random().toString(16).slice(2, 6)}`;
    seen.add(nextId);
    return { ...collector, id: nextId };
  });
}

export default function AdminGeneralSettingsEmail() {
  const locale = useAppLocale();
  const copy = useMemo(() => getAdminGeneralSettingsCopy(locale), [locale]);
  const mc = useMemo(() => getAdminMailCollectCopy(locale), [locale]);
  const emailCopy = copy.email;

  const [loading, setLoading] = useState(true);
  const [collectors, setCollectors] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(buildDefaultCollector());
  const [providerKey, setProviderKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [togglingId, setTogglingId] = useState("");
  const [forcingId, setForcingId] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [foldersOpen, setFoldersOpen] = useState(false);
  const [foldersTargetField, setFoldersTargetField] = useState("inboxFolder");
  const [availableFolders, setAvailableFolders] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(false);

  const [peekOpen, setPeekOpen] = useState(false);
  const [peeking, setPeeking] = useState(false);
  const [peekFolder, setPeekFolder] = useState("INBOX");
  const [peekUnreadOnly, setPeekUnreadOnly] = useState(true);
  const [peekMessages, setPeekMessages] = useState([]);
  const [peekTotal, setPeekTotal] = useState(0);
  const [peekUnseen, setPeekUnseen] = useState(0);
  const [peekIdentity, setPeekIdentity] = useState(null);

  const [logsOpen, setLogsOpen] = useState(false);
  const [logsName, setLogsName] = useState("");
  const [logsRows, setLogsRows] = useState([]);

  const entityStatusLabels = useMemo(
    () => ({
      activeLabel: mc.common.active,
      inactiveLabel: mc.common.inactive
    }),
    [mc.common.active, mc.common.inactive]
  );

  const loadCollectors = useCallback(async () => {
    const config = await fetchTicketAutomationConfig();
    setCollectors(ensureUniqueCollectorIds(Array.isArray(config?.mailCollectors) ? config.mailCollectors : []));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadCollectors()
      .catch(() => {
        if (!cancelled) toast.error(emailCopy.loadError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [emailCopy.loadError, loadCollectors]);

  const persistCollectors = async (nextCollectors, successMessage) => {
    const base = await fetchTicketAutomationConfig();
    const saved = await saveTicketAutomationConfig({
      ...base,
      mailCollectors: nextCollectors
    });
    setCollectors(ensureUniqueCollectorIds(Array.isArray(saved?.mailCollectors) ? saved.mailCollectors : nextCollectors));
    if (successMessage) toast.success(successMessage);
    return saved;
  };

  const resolveCredentials = (source = draft) => {
    const stored = collectors.find(item => String(item.id) === String(editingId || source?.id));
    const username = String(source?.username || "").trim();
    const typedPassword = String(source?.password || "").trim();
    const storedUsername = String(stored?.username || "").trim();
    const canReusePassword =
      !typedPassword &&
      username &&
      storedUsername &&
      username.toLowerCase() === storedUsername.toLowerCase();
    return {
      ...source,
      username,
      password: typedPassword || (canReusePassword ? String(stored?.password || "") : "")
    };
  };

  const appendDraftLog = (level, message) => {
    const entry = {
      id: `collector-log-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      level: String(level || "info"),
      message: String(message || ""),
      createdAt: new Date().toISOString()
    };
    setDraft(prev => {
      const current = Array.isArray(prev?.logs) ? prev.logs : [];
      return { ...prev, logs: [entry, ...current].slice(0, 200) };
    });
  };

  const openCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setDraft(buildDefaultCollector());
    setProviderKey("");
    setShowModal(true);
  };

  const openEdit = collector => {
    setModalMode("edit");
    setEditingId(collector.id);
    setDraft({
      ...buildDefaultCollector(),
      ...collector,
      password: ""
    });
    setProviderKey(findCollectorProviderPreset(collector).key);
    setShowModal(true);
  };

  const closeModal = ({ force = false } = {}) => {
    if (!force && (saving || testing)) return;
    setShowModal(false);
    setEditingId(null);
    setDraft(buildDefaultCollector());
    setProviderKey("");
    setFoldersOpen(false);
    setAvailableFolders([]);
    setLoadingFolders(false);
    setTesting(false);
  };

  const applyProviderPreset = key => {
    const selected = COLLECTOR_PROVIDER_PRESETS.find(item => item.key === key);
    if (!selected || selected.comingSoon) return;
    setProviderKey(key);
    const defaults = selected.defaults || {};
    const isManualImap = key === "imap-pop3";
    setDraft(prev => ({
      ...prev,
      protocol: defaults.protocol || prev.protocol || "imap",
      security: defaults.security || prev.security || "tls",
      validateCertMode: defaults.validateCertMode || prev.validateCertMode || "no-validate-cert",
      server: isManualImap
        ? prev.server || defaults.server || ""
        : defaults.server !== undefined && defaults.server !== ""
          ? defaults.server
          : prev.server,
      port: isManualImap
        ? prev.port || defaults.port || ""
        : defaults.port !== undefined
          ? defaults.port
          : prev.port,
      inboxFolder: defaults.inboxFolder || prev.inboxFolder || "INBOX"
    }));
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/collectors/test-connection`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collector: {
            ...draft,
            password: resolveCredentials(draft).password
          }
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || mc.toast.imapConnectionFailed);
      }
      const identity = payload?.identity;
      const identityLabel =
        identity?.user && identity?.host ? `${identity.user} @ ${identity.host}` : "";
      toast.success(
        identityLabel
          ? `${payload?.message || mc.toast.imapTestSuccess} (${identityLabel})`
          : payload?.message || mc.toast.imapTestSuccess
      );
      appendDraftLog(
        "success",
        identityLabel
          ? `${mc.collectorForm.logConnectionSuccess} ${identityLabel}`
          : mc.collectorForm.logConnectionSuccess
      );
    } catch (error) {
      toast.error(error?.message || mc.toast.imapTestError);
      appendDraftLog(
        "error",
        interpolate(mc.collectorForm.logConnectionFailed, {
          error: error?.message || mc.collectorForm.unknownError
        })
      );
    } finally {
      setTesting(false);
    }
  };

  const loadPeek = async ({
    folder = peekFolder,
    unreadOnly = peekUnreadOnly,
    openModal = true
  } = {}) => {
    const collector = resolveCredentials();
    if (
      !String(collector.username || "").trim() ||
      !String(collector.server || "").trim() ||
      !String(collector.password || "").trim()
    ) {
      toast.error(mc.toast.emailRequired);
      return;
    }
    const targetFolder = String(folder || collector.inboxFolder || "INBOX").trim() || "INBOX";
    setPeekFolder(targetFolder);
    setPeekUnreadOnly(Boolean(unreadOnly));
    if (openModal) setPeekOpen(true);
    setPeeking(true);
    try {
      const [peekResponse, foldersResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/tickets/collectors/peek-messages`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            collector,
            folder: targetFolder,
            limit: 40,
            unreadOnly: Boolean(unreadOnly)
          })
        }),
        availableFolders.length
          ? Promise.resolve(null)
          : fetch(`${API_BASE_URL}/tickets/collectors/folders`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ collector })
            }).catch(() => null)
      ]);
      const payload = await peekResponse.json().catch(() => ({}));
      if (!peekResponse.ok || payload?.success === false) {
        throw new Error(payload?.error || mc.collectorPeek?.loadError || emailCopy.peekError);
      }
      setPeekMessages(Array.isArray(payload.messages) ? payload.messages : []);
      setPeekTotal(Number(payload.total) || 0);
      setPeekUnseen(Number(payload.unseen) || 0);
      setPeekIdentity({
        user: payload.user || collector.username,
        host: payload.host || collector.server
      });
      if (foldersResponse) {
        const foldersPayload = await foldersResponse.json().catch(() => ({}));
        if (foldersResponse.ok && Array.isArray(foldersPayload?.folders)) {
          setAvailableFolders(foldersPayload.folders);
        }
      }
    } catch (error) {
      toast.error(error?.message || mc.collectorPeek?.loadError || emailCopy.peekError);
      setPeekMessages([]);
      setPeekTotal(0);
      setPeekUnseen(0);
    } finally {
      setPeeking(false);
    }
  };

  const openFolders = async targetField => {
    setFoldersTargetField(targetField);
    setFoldersOpen(true);
    setLoadingFolders(true);
    setAvailableFolders([]);
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/collectors/folders`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collector: resolveCredentials() })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || mc.toast.foldersFailed);
      }
      setAvailableFolders(Array.isArray(payload?.folders) ? payload.folders : []);
      appendDraftLog("info", mc.collectorForm.logFoldersSuccess);
    } catch (error) {
      toast.error(error?.message || mc.toast.foldersError);
      appendDraftLog(
        "error",
        interpolate(mc.collectorForm.logFoldersFailed, {
          error: error?.message || mc.collectorForm.unknownError
        })
      );
    } finally {
      setLoadingFolders(false);
    }
  };

  const applyFolderSelection = folderName => {
    const key = String(foldersTargetField || "inboxFolder");
    setDraft(prev => ({ ...prev, [key]: String(folderName || "") }));
    setFoldersOpen(false);
  };

  const saveCollector = async () => {
    const username = String(draft.username || "").trim();
    const server = String(draft.server || "").trim();
    const name = String(draft.name || username).trim();
    if (!username) {
      toast.error(mc.toast.emailRequired);
      return;
    }
    if (!server) {
      toast.error(mc.toast.serverRequired);
      return;
    }
    if (!String(draft.password || "").trim() && modalMode === "create") {
      toast.error(mc.toast.passwordRequired);
      return;
    }
    const previous =
      modalMode === "edit" ? collectors.find(item => String(item.id) === String(editingId)) : null;
    const usernameChanged =
      previous && String(previous.username || "").trim().toLowerCase() !== username.toLowerCase();
    if (modalMode === "edit" && usernameChanged && !String(draft.password || "").trim()) {
      toast.error(mc.toast.passwordRequiredOnLoginChange || mc.toast.passwordRequired);
      return;
    }

    const payload = {
      ...buildDefaultCollector(),
      ...draft,
      id: modalMode === "edit" && editingId ? editingId : draft.id,
      name,
      server,
      username,
      protocol: "imap",
      security: String(draft.security || "tls"),
      inboxFolder: String(draft.inboxFolder || "INBOX").trim() || "INBOX",
      acceptedFolder: String(draft.acceptedFolder || "").trim(),
      refusedFolder: String(draft.refusedFolder || "").trim()
    };
    if (modalMode === "edit" && !String(payload.password || "").trim()) {
      delete payload.password;
    }

    const nextCollectors = ensureUniqueCollectorIds(
      modalMode === "create"
        ? [...collectors, payload]
        : collectors.map(item =>
            item.id === editingId
              ? { ...item, ...payload, password: payload.password || item.password || "" }
              : item
          )
    );

    setSaving(true);
    try {
      await persistCollectors(
        nextCollectors,
        modalMode === "create" ? mc.toast.collectorAdded : mc.toast.collectorUpdated
      );
      closeModal({ force: true });
    } catch (error) {
      toast.error(error?.message || mc.toast.collectorSaveError);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      const nextCollectors = collectors.filter(item => item.id !== deleteTarget.id);
      await persistCollectors(nextCollectors, mc.toast.collectorDeleted);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error?.message || mc.toast.collectorDeleteError);
    } finally {
      setDeleting(false);
    }
  };

  const toggleEnabled = async (collector, enabled) => {
    const collectorId = String(collector?.id || "");
    if (!collectorId) return;
    setTogglingId(collectorId);
    const nextCollectors = collectors.map(item =>
      item.id === collectorId ? { ...item, enabled: Boolean(enabled) } : item
    );
    setCollectors(nextCollectors);
    try {
      await persistCollectors(
        nextCollectors,
        enabled ? emailCopy.enabledToast : emailCopy.disabledToast
      );
    } catch (error) {
      toast.error(error?.message || mc.toast.collectorSaveError);
      await loadCollectors();
    } finally {
      setTogglingId("");
    }
  };

  const forceFetch = async collector => {
    const collectorId = String(collector?.id || "");
    if (!collectorId) return;
    setForcingId(collectorId);
    try {
      const response = await fetch(`${API_BASE_URL}/tickets/collectors/force-fetch`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collector })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || mc.toast.forceFetchFailed);
      }
      const stats = payload?.stats || {};
      toast.success(
        interpolate(mc.toast.forceFetchSuccess, {
          attached: Number(stats.attached || 0),
          ignored: Number(stats.ignored || 0)
        })
      );
      await loadCollectors();
    } catch (error) {
      toast.error(error?.message || mc.toast.forceFetchError);
    } finally {
      setForcingId("");
    }
  };

  const openLogs = collector => {
    setLogsName(String(collector?.name || mc.common.collectorFallback));
    setLogsRows(Array.isArray(collector?.logs) ? collector.logs : []);
    setLogsOpen(true);
  };

  if (loading) {
    return <AdminGeneralSettingsLoading message={copy.loading} />;
  }

  return (
    <>
      <SettingsSection title={emailCopy.title} description={emailCopy.description} icon="mdi:email-outline" className={s.collectorsSection}>
        <div className={s.collectorsToolbar}>
          <p className={s.collectorsMeta}>
            {collectors.length === 0
              ? emailCopy.emptyHint
              : interpolate(emailCopy.countLabel, { count: collectors.length })}
          </p>
          <Btn icon="mdi:plus" onClick={openCreate}>
            {emailCopy.addBtn}
          </Btn>
        </div>

        {collectors.length === 0 ? (
          <div className={s.collectorsEmpty}>
            <Icon icon="mdi:email-plus-outline" className={s.collectorsEmptyIcon} aria-hidden />
            <p className={s.collectorsEmptyTitle}>{emailCopy.emptyTitle}</p>
            <p className={s.collectorsEmptyDesc}>{emailCopy.emptyDesc}</p>
            <Btn icon="mdi:plus" onClick={openCreate}>
              {emailCopy.addBtn}
            </Btn>
          </div>
        ) : (
          <div className={s.collectorsList}>
            {collectors.map(collector => {
              const stats = resolveCollectorEmailStats(collector);
              const validatedPct = formatCollectorStatPercent(stats.validated, stats.collected);
              const ignoredPct = formatCollectorStatPercent(stats.ignored, stats.collected);
              const isActive = collector.enabled !== false;
              const busy = togglingId === collector.id || forcingId === collector.id;
              return (
                <article
                  key={collector.id}
                  className={`${s.collectorCard}${isActive ? "" : ` ${s.collectorCardInactive}`}`}
                >
                  <div className={s.collectorCardMain}>
                    <button
                      type="button"
                      className={s.collectorCardIdentity}
                      onClick={() => openEdit(collector)}
                    >
                      <span className={s.collectorCardIcon} aria-hidden>
                        <Icon icon="mdi:mailbox-outline" />
                      </span>
                      <span className={s.collectorCardText}>
                        <span className={s.collectorCardName}>
                          {collector.name || mc.common.collectorFallback}
                        </span>
                        <span className={s.collectorCardSub}>
                          {[collector.username, collector.server].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </span>
                    </button>

                    <div className={s.collectorCardMeta}>
                      <EntityStatus active={isActive} {...entityStatusLabels} />
                      <Badge variant="muted">
                        {String(collector.protocol || "imap").toUpperCase()} /{" "}
                        {String(collector.security || "tls").toUpperCase()}
                      </Badge>
                      <Badge variant="muted">{collector.inboxFolder || "INBOX"}</Badge>
                      <Badge variant="muted">
                        {Number(collector.checkIntervalMinutes ?? 5)} {mc.common.minSuffix}
                      </Badge>
                    </div>
                  </div>

                  <div className={s.collectorCardStats}>
                    <div className={s.collectorStat}>
                      <span className={s.collectorStatLabel}>{mc.collectors.columns.collected}</span>
                      <span className={s.collectorStatValue}>{stats.collected}</span>
                    </div>
                    <div className={s.collectorStat}>
                      <span className={s.collectorStatLabel}>{mc.collectors.columns.validated}</span>
                      <span className={s.collectorStatValue}>
                        {stats.validated}
                        {stats.collected > 0 ? (
                          <span className={s.collectorStatPctOk}> ({validatedPct})</span>
                        ) : null}
                      </span>
                    </div>
                    <div className={s.collectorStat}>
                      <span className={s.collectorStatLabel}>{mc.collectors.columns.ignored}</span>
                      <span className={s.collectorStatValue}>
                        {stats.ignored}
                        {stats.collected > 0 ? (
                          <span className={s.collectorStatPctWarn}> ({ignoredPct})</span>
                        ) : null}
                      </span>
                    </div>
                    <div className={s.collectorStat}>
                      <span className={s.collectorStatLabel}>{mc.collectors.columns.logs}</span>
                      <span className={s.collectorStatValue}>
                        {Array.isArray(collector.logs) ? collector.logs.length : 0}
                      </span>
                    </div>
                  </div>

                  <div className={s.collectorCardActions}>
                    <Switch
                      checked={isActive}
                      disabled={busy}
                      onChange={value => toggleEnabled(collector, value)}
                      label={isActive ? mc.common.active : mc.common.inactive}
                    />
                    <div className={s.collectorActionBtns}>
                      <button
                        type="button"
                        className={s.collectorActionBtn}
                        title={mc.collectors.actions.forceFetch}
                        disabled={busy}
                        onClick={() => forceFetch(collector)}
                      >
                        <Icon
                          icon={
                            forcingId === collector.id
                              ? "mingcute:loading-3-fill"
                              : "mingcute:refresh-2-fill"
                          }
                        />
                      </button>
                      <button
                        type="button"
                        className={s.collectorActionBtn}
                        title={mc.collectors.actions.viewLogs}
                        onClick={() => openLogs(collector)}
                      >
                        <Icon icon="mingcute:time-line" />
                      </button>
                      <button
                        type="button"
                        className={s.collectorActionBtn}
                        title={mc.collectors.actions.edit}
                        onClick={() => openEdit(collector)}
                      >
                        <Icon icon="mdi:pencil-outline" />
                      </button>
                      <button
                        type="button"
                        className={`${s.collectorActionBtn} ${s.collectorActionBtnDanger}`}
                        title={mc.collectors.actions.delete}
                        onClick={() => setDeleteTarget(collector)}
                      >
                        <Icon icon="mdi:delete-outline" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SettingsSection>

      <CollectorFormModal
        open={showModal}
        copy={mc}
        mode={modalMode}
        draft={draft}
        setDraft={setDraft}
        providerKey={providerKey}
        onProviderChange={applyProviderPreset}
        saving={saving}
        testing={testing}
        peeking={peeking}
        onClose={closeModal}
        onSave={saveCollector}
        onTestConnection={testConnection}
        onPeekMailbox={() =>
          loadPeek({
            folder: String(draft.inboxFolder || "INBOX").trim() || "INBOX",
            unreadOnly: draft.unreadOnly !== false,
            openModal: true
          })
        }
        onBrowseFolders={openFolders}
        initialSection={modalMode === "create" ? "provider" : "connection"}
      />

      <CollectorMailboxPeekModal
        open={peekOpen}
        copy={mc}
        loading={peeking}
        folder={peekFolder}
        folders={availableFolders}
        unreadOnly={peekUnreadOnly}
        identity={peekIdentity}
        messages={peekMessages}
        total={peekTotal}
        unseen={peekUnseen}
        onClose={() => !peeking && setPeekOpen(false)}
        onReload={() =>
          loadPeek({ folder: peekFolder, unreadOnly: peekUnreadOnly, openModal: true })
        }
        onFolderChange={folder =>
          loadPeek({ folder, unreadOnly: peekUnreadOnly, openModal: true })
        }
        onUnreadOnlyChange={value =>
          loadPeek({ folder: peekFolder, unreadOnly: value, openModal: true })
        }
      />

      <CollectorFoldersModal
        open={foldersOpen}
        copy={mc}
        loading={loadingFolders}
        folders={availableFolders}
        onClose={() => setFoldersOpen(false)}
        onSelect={applyFolderSelection}
      />

      <CollectorLogsModal
        open={logsOpen}
        copy={mc}
        locale={locale}
        collectorName={logsName}
        logs={logsRows}
        onClose={() => setLogsOpen(false)}
      />

      <CollectorDeleteModal
        open={Boolean(deleteTarget)}
        collectorName={deleteTarget?.name || mc.common.collectorFallback}
        saving={deleting}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
