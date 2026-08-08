import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import {
  createSalesTicketCategory,
  createSalesTicketCategorySection,
  deleteSalesTicketCategory,
  deleteSalesTicketCategorySection,
  fetchSalesTicketCategories,
  fetchSalesTicketCategorySections,
  updateSalesTicketCategory,
  updateSalesTicketCategorySection
} from "../../api/tickets";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { interpolate } from "../../i18n/translate";
import { formatSupportSettingsCount, formatSupportSettingsRange } from "./adminSupportSettingsI18n";
import { getServiceCategoriesCopy } from "./adminServiceCategoriesI18n";
import { useAdminSupportSettingsCopy } from "../../hooks/useAdminCopy";
import { Card, Btn, ConfirmModal, EntityStatus, Pagination } from "./AdminUi";
import { useTablePagination } from "./useTablePagination";
import ItilCategoryFormModal from "./ItilCategoryFormModal";
import ItilCategorySectionFormModal from "./ItilCategorySectionFormModal";
import styles from "./AdminTickets.module.css";
import s from "./AdminUsers.module.css";
import ui from "./AdminUi.module.css";

export default function SalesCategoriesAdmin() {
  const locale = useAppLocale();
  const common = useCommonCopy();
  const ss = useAdminSupportSettingsCopy();
  const copy = useMemo(() => getServiceCategoriesCopy(locale), [locale]);
  const entityStatusLabels = useMemo(
    () => ({
      activeLabel: ss.common.statusActive,
      inactiveLabel: ss.common.statusInactive
    }),
    [ss.common.statusActive, ss.common.statusInactive]
  );
  const formatTableRange = useCallback(
    (start, end, total) => formatSupportSettingsRange(locale, start, end, total),
    [locale]
  );

  const [categories, setCategories] = useState([]);
  const [sections, setSections] = useState([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [sectionSearch, setSectionSearch] = useState("");

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState("create");
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryDraft, setCategoryDraft] = useState({
    section: "",
    name: "",
    description: "",
    enabled: true
  });
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryDeleteTarget, setCategoryDeleteTarget] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(false);

  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionModalMode, setSectionModalMode] = useState("create");
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [sectionDraft, setSectionDraft] = useState({
    name: "",
    description: "",
    enabled: true
  });
  const [savingSection, setSavingSection] = useState(false);
  const [sectionDeleteTarget, setSectionDeleteTarget] = useState(null);
  const [deletingSection, setDeletingSection] = useState(false);

  const filteredSections = useMemo(() => {
    const q = sectionSearch.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter(section => `${section.name || ""} ${section.description || ""}`.toLowerCase().includes(q));
  }, [sections, sectionSearch]);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(category =>
      `${category.section || ""} ${category.name || ""} ${category.description || ""}`.toLowerCase().includes(q)
    );
  }, [categories, categorySearch]);

  const sectionsPagination = useTablePagination(filteredSections, {
    formatRange: formatTableRange
  });
  const categoriesPagination = useTablePagination(filteredCategories, {
    formatRange: formatTableRange
  });

  const loadCategories = useCallback(async () => {
    try {
      const rows = await fetchSalesTicketCategories();
      setCategories(Array.isArray(rows) ? rows : []);
    } catch (error) {
      toast.error(error?.message || copy.toast.categoriesLoadError);
      setCategories([]);
    }
  }, [copy.toast.categoriesLoadError]);

  const loadSections = useCallback(async () => {
    try {
      const rows = await fetchSalesTicketCategorySections();
      setSections(Array.isArray(rows) ? rows : []);
    } catch (error) {
      toast.error(error?.message || copy.toast.sectionsLoadError);
      setSections([]);
    }
  }, [copy.toast.sectionsLoadError]);

  useEffect(() => {
    loadCategories();
    loadSections();
  }, [loadCategories, loadSections]);

  const countCategoriesForSection = section => {
    const name = String(section?.name || "").trim();
    if (!name) return 0;
    return categories.filter(category => String(category?.section || "").trim() === name).length;
  };

  const openCreateCategoryModal = () => {
    setCategoryModalMode("create");
    setEditingCategoryId(null);
    setCategoryDraft({
      section: String(sections?.[0]?.name || copy.uncategorized),
      name: "",
      description: "",
      enabled: true
    });
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = category => {
    setCategoryModalMode("edit");
    setEditingCategoryId(String(category?.id || ""));
    setCategoryDraft({
      section: String(category?.section || ""),
      name: String(category?.name || ""),
      description: String(category?.description || ""),
      enabled: category?.enabled !== false
    });
    setShowCategoryModal(true);
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategoryId(null);
    setCategoryDraft({
      section: "",
      name: "",
      description: "",
      enabled: true
    });
  };

  const saveCategoryFromModal = async () => {
    const name = String(categoryDraft?.name || "").trim();
    if (!name) {
      toast.error(copy.toast.categoryNameRequired);
      return;
    }
    setSavingCategory(true);
    try {
      const payload = {
        section: String(categoryDraft?.section || "").trim() || copy.uncategorized,
        name,
        description: String(categoryDraft?.description || "").trim(),
        enabled: categoryDraft?.enabled !== false
      };
      if (categoryModalMode === "create") {
        await createSalesTicketCategory(payload);
        toast.success(copy.toast.categoryAdded);
      } else {
        await updateSalesTicketCategory(editingCategoryId, payload);
        toast.success(copy.toast.categoryUpdated);
      }
      await loadCategories();
      closeCategoryModal();
    } catch (error) {
      toast.error(error?.message || copy.toast.categorySaveError);
    } finally {
      setSavingCategory(false);
    }
  };

  const confirmRemoveCategory = async () => {
    if (!categoryDeleteTarget?.id) return;
    setDeletingCategory(true);
    try {
      await deleteSalesTicketCategory(categoryDeleteTarget.id);
      toast.success(copy.toast.categoryDeleted);
      setCategoryDeleteTarget(null);
      await loadCategories();
    } catch (error) {
      toast.error(error?.message || copy.toast.categoryDeleteError);
    } finally {
      setDeletingCategory(false);
    }
  };

  const openCreateSectionModal = () => {
    setSectionModalMode("create");
    setEditingSectionId(null);
    setSectionDraft({
      name: "",
      description: "",
      enabled: true
    });
    setShowSectionModal(true);
  };

  const openEditSectionModal = section => {
    setSectionModalMode("edit");
    setEditingSectionId(String(section?.id || ""));
    setSectionDraft({
      name: String(section?.name || ""),
      description: String(section?.description || ""),
      enabled: section?.enabled !== false
    });
    setShowSectionModal(true);
  };

  const closeSectionModal = () => {
    setShowSectionModal(false);
    setEditingSectionId(null);
    setSectionDraft({
      name: "",
      description: "",
      enabled: true
    });
  };

  const saveSectionFromModal = async () => {
    const name = String(sectionDraft?.name || "").trim();
    if (!name) {
      toast.error(copy.toast.sectionNameRequired);
      return;
    }
    setSavingSection(true);
    try {
      const payload = {
        name,
        description: String(sectionDraft?.description || "").trim(),
        enabled: sectionDraft?.enabled !== false
      };
      if (sectionModalMode === "create") {
        await createSalesTicketCategorySection(payload);
        toast.success(copy.toast.sectionAdded);
      } else {
        await updateSalesTicketCategorySection(editingSectionId, payload);
        toast.success(copy.toast.sectionUpdated);
      }
      await Promise.all([loadSections(), loadCategories()]);
      closeSectionModal();
    } catch (error) {
      toast.error(error?.message || copy.toast.sectionSaveError);
    } finally {
      setSavingSection(false);
    }
  };

  const requestRemoveSection = section => {
    const linkedCount = countCategoriesForSection(section);
    if (linkedCount > 0) {
      toast.warn(
        linkedCount === 1
          ? interpolate(copy.sectionDeleteWarnOne, {
              name: section?.name || copy.thisSection
            })
          : interpolate(copy.sectionDeleteWarnMany, {
              name: section?.name || copy.thisSection,
              count: linkedCount
            })
      );
      return;
    }
    setSectionDeleteTarget(section);
  };

  const confirmRemoveSection = async () => {
    if (!sectionDeleteTarget?.id) return;
    setDeletingSection(true);
    try {
      await deleteSalesTicketCategorySection(sectionDeleteTarget.id);
      toast.success(copy.toast.sectionDeleted);
      setSectionDeleteTarget(null);
      await loadSections();
    } catch (error) {
      toast.error(error?.message || copy.toast.sectionDeleteError);
    } finally {
      setDeletingSection(false);
    }
  };

  const sectionOptions = useMemo(
    () => [...new Set([copy.uncategorized, ...sections.map(section => String(section?.name || "").trim())])].filter(Boolean),
    [copy.uncategorized, sections]
  );

  return (
    <>
      <Card
        title={copy.title}
        description={copy.description}
        fill
        action={
          <Btn icon="mdi:plus" onClick={openCreateSectionModal}>
            {copy.newSectionBtn}
          </Btn>
        }
      >
        <div className={s.tableSplitLayout}>
          <div className={ui.toolRow}>
            <div className={ui.toolLeft}>
              <input
                type="search"
                className={ui.fieldSearch}
                placeholder={copy.searchSection}
                value={sectionSearch}
                onChange={e => setSectionSearch(e.target.value)}
              />
              <span className={ui.count}>{formatSupportSettingsCount(locale, "section", filteredSections.length)}</span>
            </div>
          </div>

          <div className={s.tableSectionPinned}>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>{ss.common.columns.name}</th>
                    <th>{ss.common.columns.description}</th>
                    <th>{ss.common.columns.status}</th>
                    <th style={{ width: 88 }} aria-label={ss.common.actions.actionsAria} />
                  </tr>
                </thead>
                <tbody>
                  {filteredSections.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={s.empty}>
                        {sections.length === 0 ? copy.emptySections : copy.emptySectionsSearch}
                      </td>
                    </tr>
                  ) : (
                    sectionsPagination.paginatedItems.map(section => {
                      const linkedCategoryCount = countCategoriesForSection(section);
                      const sectionDeleteBlocked = linkedCategoryCount > 0;
                      return (
                        <tr key={String(section.id)}>
                          <td>{section.name || ss.common.emptyDash}</td>
                          <td>{section.description || ss.common.emptyDash}</td>
                          <td>
                            <EntityStatus active={section.enabled !== false} {...entityStatusLabels} />
                          </td>
                          <td>
                            <div className={s.actions}>
                              <button type="button" className={s.actionBtn} title={ss.common.actions.edit} onClick={() => openEditSectionModal(section)}>
                                <Icon icon="mdi:pencil-outline" aria-hidden />
                              </button>
                              <button
                                type="button"
                                className={`${s.actionBtn} ${s.actionBtnDanger}`}
                                title={
                                  sectionDeleteBlocked
                                    ? linkedCategoryCount === 1
                                      ? copy.sectionDeleteBlockedOne
                                      : interpolate(copy.sectionDeleteBlockedMany, { count: linkedCategoryCount })
                                    : ss.common.actions.delete
                                }
                                disabled={sectionDeleteBlocked}
                                onClick={() => requestRemoveSection(section)}
                              >
                                <Icon icon="mdi:delete-outline" aria-hidden />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {filteredSections.length > 0 ? (
              <Pagination
                page={sectionsPagination.page}
                totalPages={sectionsPagination.totalPages}
                onPageChange={sectionsPagination.setPage}
                pageSize={sectionsPagination.pageSize}
                onPageSizeChange={sectionsPagination.setPageSize}
                rangeLabel={sectionsPagination.rangeLabel}
              />
            ) : null}
          </div>

          <div className={styles.subSectionHead}>
            <h4 className={styles.subSectionTitle}>{copy.categoriesTitle}</h4>
            <Btn icon="mdi:plus" size="sm" onClick={openCreateCategoryModal}>
              {ss.common.actions.add}
            </Btn>
          </div>

          <div className={ui.toolRow}>
            <div className={ui.toolLeft}>
              <input
                type="search"
                className={ui.fieldSearch}
                placeholder={copy.searchCategory}
                value={categorySearch}
                onChange={e => setCategorySearch(e.target.value)}
              />
              <span className={ui.count}>{formatSupportSettingsCount(locale, "category", filteredCategories.length)}</span>
            </div>
          </div>

          <div className={s.tableSection}>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>{ss.common.columns.section}</th>
                    <th>{ss.common.columns.name}</th>
                    <th>{ss.common.columns.description}</th>
                    <th>{ss.common.columns.status}</th>
                    <th style={{ width: 88 }} aria-label={ss.common.actions.actionsAria} />
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={s.empty}>
                        {categories.length === 0 ? copy.emptyCategories : copy.emptyCategoriesSearch}
                      </td>
                    </tr>
                  ) : (
                    categoriesPagination.paginatedItems.map(category => (
                      <tr key={String(category.id)}>
                        <td>{category.section || copy.uncategorized}</td>
                        <td>{category.name || ss.common.emptyDash}</td>
                        <td>{category.description || ss.common.emptyDash}</td>
                        <td>
                          <EntityStatus active={category.enabled !== false} {...entityStatusLabels} />
                        </td>
                        <td>
                          <div className={s.actions}>
                            <button type="button" className={s.actionBtn} title={ss.common.actions.edit} onClick={() => openEditCategoryModal(category)}>
                              <Icon icon="mdi:pencil-outline" aria-hidden />
                            </button>
                            <button
                              type="button"
                              className={`${s.actionBtn} ${s.actionBtnDanger}`}
                              title={ss.common.actions.delete}
                              onClick={() => setCategoryDeleteTarget(category)}
                            >
                              <Icon icon="mdi:delete-outline" aria-hidden />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredCategories.length > 0 ? (
              <Pagination
                page={categoriesPagination.page}
                totalPages={categoriesPagination.totalPages}
                onPageChange={categoriesPagination.setPage}
                pageSize={categoriesPagination.pageSize}
                onPageSizeChange={categoriesPagination.setPageSize}
                rangeLabel={categoriesPagination.rangeLabel}
              />
            ) : null}
          </div>
        </div>
      </Card>

      <ConfirmModal
        open={Boolean(sectionDeleteTarget)}
        title={copy.deleteSectionTitle}
        icon="mdi:delete-alert-outline"
        message={interpolate(copy.deleteSectionMessage, {
          name: sectionDeleteTarget?.name || ss.common.emptyDash
        })}
        confirmLabel={common.delete}
        confirmVariant="dangerSolid"
        confirmLoading={deletingSection}
        onClose={() => !deletingSection && setSectionDeleteTarget(null)}
        onConfirm={confirmRemoveSection}
      />

      <ConfirmModal
        open={Boolean(categoryDeleteTarget)}
        title={copy.deleteCategoryTitle}
        icon="mdi:delete-alert-outline"
        message={interpolate(copy.deleteCategoryMessage, {
          name: categoryDeleteTarget?.name || ss.common.emptyDash
        })}
        confirmLabel={common.delete}
        confirmVariant="dangerSolid"
        confirmLoading={deletingCategory}
        onClose={() => !deletingCategory && setCategoryDeleteTarget(null)}
        onConfirm={confirmRemoveCategory}
      />

      <ItilCategoryFormModal
        open={showCategoryModal}
        mode={categoryModalMode}
        draft={categoryDraft}
        setDraft={setCategoryDraft}
        saving={savingCategory}
        sectionOptions={sectionOptions}
        messages={copy.categoryModal}
        navSections={copy.formNav.category}
        onClose={() => !savingCategory && closeCategoryModal()}
        onSave={saveCategoryFromModal}
      />

      <ItilCategorySectionFormModal
        open={showSectionModal}
        mode={sectionModalMode}
        draft={sectionDraft}
        setDraft={setSectionDraft}
        saving={savingSection}
        messages={copy.sectionModal}
        navSections={copy.formNav.section}
        onClose={() => !savingSection && closeSectionModal()}
        onSave={saveSectionFromModal}
      />
    </>
  );
}
