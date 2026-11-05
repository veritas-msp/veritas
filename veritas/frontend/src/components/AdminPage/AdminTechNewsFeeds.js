import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { useAdminCommonCopy, useAdminPageCopy } from "../../hooks/useAdminCopy";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { APP_LOCALES } from "../../i18n/locales";
import { interpolate } from "../../i18n/translate";
import {
  createTechNewsFeed,
  deleteTechNewsFeed,
  fetchTechNewsFeeds,
  fetchTechNewsFeedsMeta,
  resetTechNewsFeeds,
  updateTechNewsFeed
} from "../../api/techNewsFeeds";
import TechNewsFeedFormModal from "./TechNewsFeedFormModal";
import {
  buildDefaultTechNewsFeedDraft,
  buildTechNewsFeedDraftFromFeed,
  DEFAULT_TECH_NEWS_FEED_CATEGORIES
} from "./techNewsFeedConstants";
import { Badge, Btn, BtnIcon, ConfirmModal, Page, Switch, Table } from "./AdminUi";
import adminUi from "./AdminUi.module.css";
import platform from "./AdminGeneralSettingsPlatform.module.css";
import SettingsSection from "./AdminGeneralSettingsSection";
import AdminGeneralSettingsLoading from "./AdminGeneralSettingsLoading";
import { useFinderNavIndicator } from "../UiKit";
import { AdminShellTab } from "./AdminPlatformShell";
import s from "./AdminTechNewsFeeds.module.css";

const EMPTY_FORM = buildDefaultTechNewsFeedDraft();

const CATEGORY_TAB_ICONS = {
  all: "mdi:rss",
  cve: "mdi:shield-alert-outline",
  security: "mdi:shield-lock-outline",
  news: "mdi:newspaper-variant-outline",
  tech: "mdi:chip",
  settings: "mdi:cog-outline"
};

function localeMeta(code) {
  return (
    APP_LOCALES.find(loc => loc.code === code) || {
      code,
      flag: "",
      label: code
    }
  );
}

export default function AdminTechNewsFeeds() {
  const locale = useAppLocale();
  const copy = useAdminPageCopy("techNewsFeeds");
  const adminCopy = useAdminCommonCopy();
  const [feeds, setFeeds] = useState([]);
  const [meta, setMeta] = useState({
    categories: [],
    categoryLabels: {},
    locales: APP_LOCALES.map(loc => loc.code)
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  const categoryLabel = useCallback(
    key => meta.categoryLabels?.[key] || copy.categoryLabels?.[key] || key,
    [meta.categoryLabels, copy.categoryLabels]
  );

  const categoryKeys = useMemo(() => {
    const fromMeta = Array.isArray(meta.categories) ? meta.categories.filter(Boolean) : [];
    const keys = fromMeta.length ? fromMeta : DEFAULT_TECH_NEWS_FEED_CATEGORIES;
    return [...new Set(keys)];
  }, [meta.categories]);

  const subTabs = useMemo(
    () => [
      { key: "all", label: copy.tabs?.all || "Tous", icon: CATEGORY_TAB_ICONS.all },
      ...categoryKeys.map(key => ({
        key,
        label: categoryLabel(key),
        icon: CATEGORY_TAB_ICONS[key] || "mdi:tag-outline"
      })),
      {
        key: "settings",
        label: copy.tabs?.settings || "Paramètres",
        icon: CATEGORY_TAB_ICONS.settings
      }
    ],
    [categoryKeys, categoryLabel, copy.tabs]
  );

  const { trackRef: tabsRef, indicator: tabIndicator } = useFinderNavIndicator([
    activeTab,
    locale,
    subTabs.map(tab => tab.key).join("|")
  ]);

  const loadFeeds = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTechNewsFeeds();
      setFeeds(data.feeds || []);
    } catch (err) {
      toast.error(err.message || copy.loadError);
      setFeeds([]);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError]);

  useEffect(() => {
    fetchTechNewsFeedsMeta().then(setMeta).catch(() => {});
  }, []);

  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  useEffect(() => {
    if (activeTab === "all" || activeTab === "settings") return;
    if (!categoryKeys.includes(activeTab)) setActiveTab("all");
  }, [activeTab, categoryKeys]);

  const openCreate = (preferredCategory = "") => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      category:
        preferredCategory && preferredCategory !== "all" && preferredCategory !== "settings"
          ? preferredCategory
          : EMPTY_FORM.category
    });
    setModalOpen(true);
  };

  const openEdit = feed => {
    setEditing(feed);
    setForm(buildTechNewsFeedDraftFromFeed(feed));
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const saveFeed = async () => {
    setSaving(true);
    try {
      const payload = {
        locale: form.locale || "en",
        source: form.source.trim(),
        url: form.url.trim(),
        category: form.category,
        enabled: form.enabled
      };
      if (form.sortOrder !== "") {
        payload.sortOrder = Number(form.sortOrder);
      }
      if (editing) {
        const { feed } = await updateTechNewsFeed(editing.id, payload);
        setFeeds(prev =>
          prev
            .map(f => (f.id === feed.id ? feed : f))
            .sort((a, b) => a.sortOrder - b.sortOrder || String(a.locale).localeCompare(String(b.locale)))
        );
        toast.success(copy.updated);
      } else {
        const { feed } = await createTechNewsFeed(payload);
        setFeeds(prev =>
          [...prev, feed].sort(
            (a, b) => a.sortOrder - b.sortOrder || String(a.locale).localeCompare(String(b.locale))
          )
        );
        toast.success(copy.added);
      }
      closeModal();
    } catch (err) {
      toast.error(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (feed, enabled) => {
    try {
      const { feed: updated } = await updateTechNewsFeed(feed.id, { enabled });
      setFeeds(prev => prev.map(f => (f.id === updated.id ? updated : f)));
    } catch (err) {
      toast.error(err.message || copy.toggleError);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      await deleteTechNewsFeed(confirmDelete.id);
      setFeeds(prev => prev.filter(f => f.id !== confirmDelete.id));
      toast.success(copy.deleted);
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err.message || copy.deleteError);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      const data = await resetTechNewsFeeds();
      setFeeds(data.feeds || []);
      toast.success(copy.resetSuccess);
      setConfirmReset(false);
    } catch (err) {
      toast.error(err.message || copy.resetError);
    } finally {
      setSaving(false);
    }
  };

  const visibleFeeds = useMemo(() => {
    if (activeTab === "all" || activeTab === "settings") return feeds;
    return feeds.filter(feed => String(feed.category || "") === activeTab);
  }, [activeTab, feeds]);

  const columns = useMemo(
    () => [
      {
        key: "enabled",
        label: adminCopy.activeColumn,
        width: "72px",
        render: row => <Switch checked={row.enabled} onChange={on => toggleEnabled(row, on)} />
      },
      {
        key: "source",
        label: adminCopy.source,
        render: row => (
          <div className={s.sourceCell}>
            <div className={s.sourceName}>{row.source}</div>
            <div className={adminUi.tableSubtext}>{row.url}</div>
          </div>
        )
      },
      {
        key: "locale",
        label: copy.localeColumn,
        width: "120px",
        render: row => {
          const loc = localeMeta(row.locale);
          return <Badge variant="muted">{loc.flag ? `${loc.flag} ${loc.label}` : loc.label}</Badge>;
        }
      },
      ...(activeTab === "all"
        ? [
            {
              key: "category",
              label: adminCopy.category,
              width: "120px",
              render: row => <Badge variant="muted">{categoryLabel(row.category)}</Badge>
            }
          ]
        : []),
      {
        key: "sortOrder",
        label: adminCopy.order,
        width: "72px",
        render: row => row.sortOrder
      },
      {
        key: "actions",
        label: "",
        width: "88px",
        render: row => (
          <div className={s.actionsCell}>
            <BtnIcon icon="mdi:pencil-outline" title={adminCopy.edit} onClick={() => openEdit(row)} />
            <BtnIcon
              icon="mdi:trash-can-outline"
              title={adminCopy.delete}
              variant="danger"
              onClick={() => setConfirmDelete(row)}
            />
          </div>
        )
      }
    ],
    [activeTab, adminCopy, categoryLabel, copy.localeColumn]
  );

  const paneTitle =
    activeTab === "all"
      ? copy.title
      : activeTab === "settings"
        ? copy.settingsTitle || copy.tabs?.settings
        : categoryLabel(activeTab);

  const paneDescription =
    activeTab === "all"
      ? copy.description
      : activeTab === "settings"
        ? copy.settingsDescription
        : interpolate(copy.categoryDescription || "{category}", {
            category: categoryLabel(activeTab)
          });

  return (
    <Page>
      <div className={`${platform.shell} ${s.shell}`} data-page-fill>
        <div
          className={platform.tabs}
          ref={tabsRef}
          role="tablist"
          aria-label={subTabs.map(tab => tab.label).join(" / ")}
        >
          {tabIndicator.ready ? (
            <span
              className={platform.tabIndicator}
              style={{
                transform: `translate3d(${tabIndicator.left}px, 0, 0)`,
                width: tabIndicator.width,
                height: tabIndicator.height
              }}
              aria-hidden
            />
          ) : null}
          {subTabs.map(item => (
            <AdminShellTab
              key={item.key}
              item={item}
              isActive={activeTab === item.key}
              onSelect={setActiveTab}
              disabled={loading && item.key !== "settings"}
            />
          ))}
        </div>

        <div className={platform.shellBody}>
          {activeTab === "settings" ? (
            <div className={platform.shellPane} key="pane-settings">
              <SettingsSection title={copy.settingsTitle || copy.tabs?.settings} description={copy.settingsDescription} icon="mdi:cog-outline">
                <p className={adminUi.adminMutedText} style={{ margin: "0 0 1rem" }}>
                  {copy.resetMessage}
                </p>
                <Btn variant="secondary" icon="mdi:restore" onClick={() => setConfirmReset(true)} disabled={saving}>
                  {adminCopy.reset}
                </Btn>
              </SettingsSection>
            </div>
          ) : (
            <div className={platform.shellPane} key={`pane-${activeTab}`}>
              <div className={s.paneInner}>
                <SettingsSection title={paneTitle} description={paneDescription} icon={CATEGORY_TAB_ICONS[activeTab] || "mdi:rss"} />

                <div className={s.tableWrap}>
                  {loading ? (
                    <AdminGeneralSettingsLoading message={copy.loading} />
                  ) : (
                    <Table columns={columns} rows={visibleFeeds} emptyMessage={copy.empty} />
                  )}
                </div>

                <div className={platform.footerBar}>
                  <Btn variant="secondary" icon="mdi:restore" onClick={() => setConfirmReset(true)} disabled={saving}>
                    {adminCopy.reset}
                  </Btn>
                  <Btn icon="mdi:plus" onClick={() => openCreate(activeTab)} disabled={saving}>
                    {copy.addFeed}
                  </Btn>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <TechNewsFeedFormModal
        open={modalOpen}
        mode={editing ? "edit" : "create"}
        draft={form}
        setDraft={setForm}
        saving={saving}
        categoryOptions={meta.categories}
        categoryLabel={categoryLabel}
        localeOptions={meta.locales?.length ? meta.locales : APP_LOCALES.map(loc => loc.code)}
        onClose={closeModal}
        onSave={saveFeed}
      />

      <ConfirmModal
        open={confirmReset}
        onClose={() => !saving && setConfirmReset(false)}
        onConfirm={handleReset}
        title={copy.resetTitle}
        message={copy.resetMessage}
        confirmLabel={adminCopy.reset}
        icon="mdi:restore"
        confirmVariant="primary"
      />

      <ConfirmModal
        open={Boolean(confirmDelete)}
        onClose={() => !saving && setConfirmDelete(null)}
        onConfirm={handleDelete}
        title={copy.deleteTitle}
        message={interpolate(copy.deleteMessage, {
          source: confirmDelete?.source || ""
        })}
        confirmLabel={adminCopy.delete}
      />
    </Page>
  );
}
