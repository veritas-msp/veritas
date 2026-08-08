import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { toast } from "react-toastify";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getSitesModalCopy } from "./sitesModalI18n";
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import SiteMapPreview from "./SiteMapPreview";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { getCommunitySitesLimit } from "../../config/edition";
import { buildSiteAddress, buildSiteGeocodeQuery, createEmptySite, geocodeSiteAddress, getSiteDisplayName, getSiteId, normalizeClientSites, enforceSinglePrimarySite, sortClientSites, assignClientSitesOrder } from "../../utils/clientSites";
import styles from "./SitesModal.module.css";
function SiteEditor({
  site,
  onChange,
  onLocate,
  locating,
  copy
}) {
  const patch = fields => onChange({
    ...site,
    ...fields
  });
  const editor = copy.editor;
  return <div className={styles.editorForm}>
      <div className={styles.fieldGrid}>
        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label className={`${styles.label} ${styles.labelRequired}`} htmlFor="site-name">
            {editor.nameLabel}
          </label>
          <input id="site-name" type="text" className={styles.input} value={site.name} onChange={e => patch({
          name: e.target.value
        })} placeholder={editor.namePlaceholder} required />
        </div>
        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label className={styles.label} htmlFor="site-street">
            {editor.addressLabel}
          </label>
          <input id="site-street" type="text" className={styles.input} value={site.addressStreet} onChange={e => patch({
          addressStreet: e.target.value,
          latitude: null,
          longitude: null
        })} placeholder={editor.addressPlaceholder} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="site-postal">
            {editor.postalCodeLabel}
          </label>
          <input id="site-postal" type="text" className={styles.input} value={site.addressPostalCode} onChange={e => patch({
          addressPostalCode: e.target.value,
          latitude: null,
          longitude: null
        })} placeholder={editor.postalCodePlaceholder} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="site-city">
            {editor.cityLabel}
          </label>
          <input id="site-city" type="text" className={styles.input} value={site.addressCity} onChange={e => patch({
          addressCity: e.target.value,
          latitude: null,
          longitude: null
        })} placeholder={editor.cityPlaceholder} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="site-country">
            {editor.countryLabel}
          </label>
          <input id="site-country" type="text" className={styles.input} value={site.addressCountry} onChange={e => patch({
          addressCountry: e.target.value,
          latitude: null,
          longitude: null
        })} placeholder={editor.countryPlaceholder} />
        </div>
        <div className={`${styles.field} ${styles.fieldSwitch}`}>
          <label className={styles.primaryToggle} htmlFor="site-primary">
            <span className={styles.primaryToggleLabel}>{editor.primaryLabel}</span>
            <span className={styles.switchWrap}>
              <input id="site-primary" type="checkbox" className={styles.switchInput} checked={Boolean(site.isPrimary)} onChange={e => patch({
              isPrimary: e.target.checked
            })} role="switch" aria-checked={Boolean(site.isPrimary)} />
              <span className={styles.switchTrack} aria-hidden="true">
                <span className={styles.switchThumb} />
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className={styles.mapPanel}>
        <div className={styles.mapPanelHead}>
          <span className={styles.mapPanelTitle}>{editor.mapPreview}</span>
          <button type="button" className={styles.locateAction} onClick={onLocate} disabled={locating}>
            <Icon icon={locating ? "mdi:loading" : "mdi:crosshairs-gps"} aria-hidden />
            {locating ? editor.locating : editor.refreshPosition}
          </button>
        </div>
        <SiteMapPreview latitude={site.latitude} longitude={site.longitude} label={getSiteDisplayName(site)} address={buildSiteAddress(site)} onLocate={onLocate} locating={locating} className={styles.mapPreviewCondensed} />
      </div>
    </div>;
}
function SiteListCard({
  site,
  isActive,
  onEdit,
  dragHandleProps = null,
  dragHandleDisabled = false,
  copy
}) {
  const address = buildSiteAddress(site);
  return <>
      {dragHandleProps ? <button type="button" className={`${styles.dragHandle} ${dragHandleDisabled ? styles.dragHandleDisabled : ""}`} aria-label={copy.formatReorderAria(getSiteDisplayName(site))} title={dragHandleDisabled ? copy.drag.finishEditing : copy.drag.dragToReorder} disabled={dragHandleDisabled} {...dragHandleProps}>
          <Icon icon="mdi:drag-vertical" aria-hidden />
        </button> : <span className={`${styles.dragHandle} ${styles.dragHandleDisabled}`} aria-hidden>
          <Icon icon="mdi:drag-vertical" />
        </span>}
      <div className={`${styles.siteCard} ${isActive ? styles.siteCardActive : ""}`} onClick={() => onEdit?.(site)} onKeyDown={event => {
      if (!onEdit) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onEdit(site);
      }
    }} role={onEdit ? "button" : undefined} tabIndex={onEdit ? 0 : -1}>
        <div className={styles.siteCardMain}>
          <div className={styles.siteCardHead}>
            <strong>{getSiteDisplayName(site)}</strong>
            {site.isPrimary ? <span className={styles.primaryBadge}>{copy.primary}</span> : null}
          </div>
          {address ? <p className={styles.siteCardAddress}>{address}</p> : null}
        </div>
        <div className={styles.siteCardMap} onClick={event => event.stopPropagation()}>
          <SiteMapPreview latitude={site.latitude} longitude={site.longitude} label={getSiteDisplayName(site)} address={address} compact />
        </div>
      </div>
    </>;
}
function SortableSiteRow({
  site,
  isActive,
  canReorder,
  onEdit,
  copy
}) {
  const siteId = site.id;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: siteId,
    disabled: !canReorder
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };
  return <li ref={setNodeRef} style={style} className={[styles.siteListItem, isDragging ? styles.siteListItemDragging : "", isActive ? styles.siteListItemActive : ""].filter(Boolean).join(" ")}>
      <SiteListCard site={site} isActive={isActive} onEdit={onEdit} dragHandleDisabled={!canReorder} dragHandleProps={{
      ...attributes,
      ...listeners
    }} copy={copy} />
    </li>;
}
export default function SitesModal({
  sites = [],
  onSave,
  onClose
}) {
  const locale = useAppLocale();
  const common = useCommonCopy();
  const copy = useMemo(() => getSitesModalCopy(locale), [locale]);
  const {
    isCommunity,
    limits
  } = useVeritasEdition();
  const maxSites = isCommunity ? getCommunitySitesLimit(limits) : null;
  const [currentSites, setCurrentSites] = useState(() => normalizeClientSites(sites));
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sitesSnapshot, setSitesSnapshot] = useState(null);
  const [activeDragId, setActiveDragId] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 6
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const isCreating = selectedId === "__new__";
  const activeSite = draft;
  const committedSites = useMemo(() => {
    if (!isCreating || !draft?.id) return currentSites;
    return currentSites.filter(site => site.id !== draft.id);
  }, [currentSites, isCreating, draft?.id]);
  const canAddSite = maxSites == null || committedSites.length < maxSites;
  const atSiteLimit = maxSites != null && committedSites.length >= maxSites && !isCreating;
  const warnSiteLimit = () => {
    toast.warn(copy.formatLimitWarn(maxSites));
  };
  useEffect(() => {
    setCurrentSites(normalizeClientSites(sites));
    setSelectedId(null);
    setDraft(null);
    setSitesSnapshot(null);
  }, [sites]);
  const orderedSites = useMemo(() => sortClientSites(committedSites), [committedSites]);
  const sortableSiteIds = useMemo(() => orderedSites.map(site => site.id), [orderedSites]);
  const activeDragSite = useMemo(() => orderedSites.find(site => site.id === activeDragId) || null, [orderedSites, activeDragId]);
  const canReorder = !draft;
  const handleDragStart = event => {
    setActiveDragId(event.active.id);
  };
  const handleDragEnd = event => {
    const {
      active,
      over
    } = event;
    setActiveDragId(null);
    if (!canReorder || !over || active.id === over.id) return;
    setCurrentSites(prev => {
      const base = isCreating && draft?.id ? prev.filter(site => site.id !== draft.id) : prev;
      const ordered = sortClientSites(base);
      const oldIndex = ordered.findIndex(site => site.id === active.id);
      const newIndex = ordered.findIndex(site => site.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      const reordered = arrayMove(ordered, oldIndex, newIndex);
      return assignClientSitesOrder(reordered);
    });
  };
  const handleDragCancel = () => {
    setActiveDragId(null);
  };
  const handleDraftChange = updatedDraft => {
    setDraft(updatedDraft);
    if (isCreating) {
      if (updatedDraft.isPrimary) {
        setCurrentSites(prev => prev.map(site => ({
          ...site,
          isPrimary: false
        })));
      } else if (sitesSnapshot) {
        setCurrentSites(enforceSinglePrimarySite(sitesSnapshot));
      }
      return;
    }
    setCurrentSites(prev => {
      const merged = prev.map(site => site.id === updatedDraft.id ? updatedDraft : site);
      return updatedDraft.isPrimary ? enforceSinglePrimarySite(merged, updatedDraft.id) : enforceSinglePrimarySite(merged);
    });
  };
  const startCreate = () => {
    if (!canAddSite) {
      warnSiteLimit();
      return;
    }
    setSitesSnapshot(currentSites);
    const next = createEmptySite({
      isPrimary: currentSites.length === 0,
      addressCountry: copy.defaultSiteCountry
    });
    setSelectedId("__new__");
    setDraft(next);
  };
  const startEdit = site => {
    setSitesSnapshot(currentSites);
    setSelectedId(site.id);
    setDraft({
      ...site
    });
  };
  const cancelEdit = () => {
    if (sitesSnapshot) {
      setCurrentSites(sitesSnapshot);
    }
    setSitesSnapshot(null);
    setSelectedId(null);
    setDraft(null);
  };
  const upsertDraft = async () => {
    if (!draft) return;
    if (isCreating && maxSites != null && committedSites.length >= maxSites) {
      warnSiteLimit();
      return;
    }
    const name = draft.name.trim();
    if (!name) {
      toast.warn(copy.toasts.nameRequired);
      return;
    }
    let normalized = {
      ...draft,
      name
    };
    if (!normalized.latitude && buildSiteGeocodeQuery(normalized)) {
      try {
        const coords = await geocodeSiteAddress(normalized);
        normalized = {
          ...normalized,
          ...coords
        };
      } catch {}
    }
    if (normalized.isPrimary) {
      setCurrentSites(prev => {
        const next = isCreating ? [...prev.filter(site => site.id !== normalized.id), normalized] : prev.map(site => site.id === normalized.id ? normalized : site);
        return assignClientSitesOrder(next);
      });
    } else if (isCreating) {
      setCurrentSites(prev => assignClientSitesOrder([...prev.filter(site => site.id !== normalized.id), normalized]));
    } else {
      setCurrentSites(prev => assignClientSitesOrder(prev.map(site => site.id === normalized.id ? normalized : site)));
    }
    setSitesSnapshot(null);
    setSelectedId(null);
    setDraft(null);
  };
  const removeSite = siteId => {
    setCurrentSites(prev => assignClientSitesOrder(prev.filter(site => site.id !== siteId)));
    if (selectedId === siteId) {
      setSitesSnapshot(null);
      setSelectedId(null);
      setDraft(null);
    }
  };
  const handleLocate = async () => {
    if (!draft) return;
    setLocating(true);
    try {
      const coords = await geocodeSiteAddress(draft);
      handleDraftChange({
        ...draft,
        ...coords
      });
      toast.success(copy.toasts.positionUpdated);
    } catch (error) {
      toast.error(error.message || copy.toasts.geocodeFailed);
    } finally {
      setLocating(false);
    }
  };
  const handleSave = async () => {
    if (draft) {
      toast.warn(copy.toasts.finishEditFirst);
      return;
    }
    if (maxSites != null && committedSites.length > maxSites) {
      warnSiteLimit();
      return;
    }
    setSaving(true);
    try {
      await onSave(assignClientSitesOrder(currentSites));
      onClose();
    } catch (error) {
      toast.error(error.message || copy.toasts.saveFailed);
    } finally {
      setSaving(false);
    }
  };
  return createPortal(<div className={styles.overlay} onClick={onClose}>
      <div className={styles.shell} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="sites-modal-title">
        <div className={styles.accentBar} />
        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.headerIconWrap}>
              <Icon icon="mdi:map-marker-radius" aria-hidden />
            </div>
            <div>
              <h2 id="sites-modal-title" className={styles.title}>
                {copy.title}
              </h2>
              <p className={styles.subtitle}>
                {copy.subtitle}
              </p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={common.close}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.layout}>
            <div className={styles.listPanel}>
              <div className={styles.listHead}>
                <span className={styles.listTitle}>
                  {copy.formatSiteCount(orderedSites.length, maxSites)}
                </span>
                <button type="button" className={styles.addBtn} onClick={startCreate} disabled={!canAddSite} title={atSiteLimit ? copy.formatLimitTooltip(maxSites) : undefined}>
                  <Icon icon="mdi:plus" aria-hidden />
                  {copy.add}
                </button>
              </div>

              {atSiteLimit ? <div className={styles.sitesLimitHint} role="note">
                  <span className={styles.sitesLimitProBadge}>Pro</span>
                  <p className={styles.sitesLimitHintText}>
                    {copy.formatLimitReached(maxSites)}
                  </p>
                </div> : null}

              {orderedSites.length === 0 ? <div className={styles.emptyState}>
                  <Icon icon="mdi:map-marker-off-outline" className={styles.emptyIcon} aria-hidden />
                  <p>{copy.emptyState}</p>
                </div> : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
                  <SortableContext items={sortableSiteIds} strategy={verticalListSortingStrategy}>
                    <ul className={styles.siteList}>
                      {orderedSites.map(site => <SortableSiteRow key={getSiteId(site)} site={site} isActive={selectedId === site.id} canReorder={canReorder} onEdit={startEdit} copy={copy} />)}
                    </ul>
                  </SortableContext>
                  <DragOverlay dropAnimation={{
                duration: 180,
                easing: "ease-out"
              }}>
                    {activeDragSite ? <div className={styles.siteDragOverlay}>
                        <div className={styles.siteListItem}>
                          <SiteListCard site={activeDragSite} isActive={false} copy={copy} />
                        </div>
                      </div> : null}
                  </DragOverlay>
                </DndContext>}
            </div>

            {draft ? <div className={styles.editorPanel}>
                <div className={styles.editorHead}>
                  <h3>{isCreating ? copy.newSite : copy.editSite}</h3>
                  <button type="button" className={styles.ghostBtn} onClick={cancelEdit}>
                    {common.cancel}
                  </button>
                </div>
                <SiteEditor site={draft} onChange={handleDraftChange} onLocate={handleLocate} locating={locating} copy={copy} />
                <div className={styles.editorActions}>
                  {!isCreating ? <button type="button" className={styles.deleteSiteBtn} onClick={() => removeSite(draft.id)}>
                      {common.delete}
                    </button> : null}
                  <button type="button" className={styles.primaryBtn} onClick={upsertDraft}>
                    {isCreating ? copy.addSite : copy.applyChanges}
                  </button>
                </div>
              </div> : <div className={styles.editorPlaceholder}>
                <Icon icon="mdi:map-search-outline" className={styles.editorPlaceholderIcon} aria-hidden />
                <p>{copy.placeholder}</p>
              </div>}
          </div>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>
            {common.cancel}
          </button>
          <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving || Boolean(draft)} title={draft ? copy.saveBlockedTitle : undefined}>
            {saving ? common.saving : common.save}
          </button>
        </footer>
      </div>
    </div>, document.body);
}
