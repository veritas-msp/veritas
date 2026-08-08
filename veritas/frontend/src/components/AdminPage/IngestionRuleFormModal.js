import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Switch } from "./AdminUi";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import { isCommunityEdition } from "../../config/edition";
import { normalizeIngestionAction } from "./ingestionRuleConstants";
import { describeLocalizedMailCriterionBrief, getLocalizedIngestionRuleFormSections, getLocalizedMailCriterionFields, getLocalizedMailCriterionOperators, getLocalizedRuleActionOptions, interpolate } from "./adminMailCollectI18n";
import { MAIL_CRITERION_FIELD_ICONS, normalizeExclusionFilterRoot } from "../../utils/mailIngestionRules";
import { addGroupToGroup, addRuleToGroup, buildDefaultGroup, buildDefaultRule, countRulesInTree, findFirstRuleId, findNodeWithParent, findParentIdOfNode, moveNodeInGroup, removeNodeFromTree, setNodeConnector, updateNodeInTree } from "../../utils/ticketViewFilterTree";
import TicketViewFilterBuilder from "../TicketPage/TicketViewFilterBuilder";
import layout from "../EnterprisesPage/EnterpriseFormModal.module.css";
import macroModalStyles from "./MacroFormModal.module.css";
import viewStyles from "../TicketPage/TicketViewModal.module.css";
import styles from "./IngestionRuleFormModal.module.css";
function buildDefaultMailFilterRule(options = {}) {
  return {
    ...buildDefaultRule(options),
    field: "subject"
  };
}
export default function IngestionRuleFormModal({
  open,
  copy,
  mode = "create",
  draft,
  setDraft,
  mailCollectors = [],
  saving = false,
  onClose,
  onSave
}) {
  const irf = copy.ingestionRuleForm;
  const mc = copy.mailCriteria;
  const isCreate = mode === "create";
  const isCommunity = isCommunityEdition();
  const [activeSection, setActiveSection] = useState("general");
  const [selectedFilterNodeId, setSelectedFilterNodeId] = useState(null);
  const formSections = useMemo(() => getLocalizedIngestionRuleFormSections(copy), [copy]);
  const ruleActionOptions = useMemo(() => getLocalizedRuleActionOptions(copy), [copy]);
  const mailCriterionFields = useMemo(() => getLocalizedMailCriterionFields(copy), [copy]);
  const mailCriterionOperators = useMemo(() => getLocalizedMailCriterionOperators(copy), [copy]);
  const describeRuleBrief = useCallback(criterion => describeLocalizedMailCriterionBrief(criterion, copy), [copy]);
  const filterRoot = useMemo(() => normalizeExclusionFilterRoot(draft || {}), [draft]);
  const ruleCount = useMemo(() => countRulesInTree(filterRoot), [filterRoot]);
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 6
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  useEffect(() => {
    if (!open) return;
    setActiveSection("general");
    setSelectedFilterNodeId(findFirstRuleId(normalizeExclusionFilterRoot(draft || {})));
  }, [open, draft?.id]);
  const patchFilterRoot = useCallback(nextRoot => {
    setDraft(prev => ({
      ...prev,
      filterRoot: nextRoot
    }));
  }, [setDraft]);
  const selectedNode = useMemo(() => {
    if (!selectedFilterNodeId) return null;
    return findNodeWithParent(filterRoot, selectedFilterNodeId)?.node || null;
  }, [filterRoot, selectedFilterNodeId]);
  const selectedRule = selectedNode?.type === "rule" ? selectedNode : null;
  const selectedGroup = selectedNode?.type === "group" && selectedNode.id !== filterRoot.id ? selectedNode : null;
  const sectionMeta = useMemo(() => ({
    general: Boolean(String(draft?.name || "").trim() && draft?.action),
    criteria: true
  }), [draft]);
  const collectorOptions = useMemo(() => (Array.isArray(mailCollectors) ? mailCollectors : []).map(collector => ({
    id: String(collector?.id || ""),
    label: String(collector?.name || "").trim() || String(collector?.username || "").trim() || String(collector?.server || "").trim() || copy.common.collectorFallback
  })), [mailCollectors, copy.common.collectorFallback]);
  if (!open || !draft) return null;
  const patchDraft = patch => setDraft(prev => ({
    ...prev,
    ...patch
  }));
  const addRule = (groupId = filterRoot.id) => {
    const next = addRuleToGroup(filterRoot, groupId, buildDefaultMailFilterRule({
      includeConnector: true
    }));
    patchFilterRoot(next);
    const added = findNodeWithParent(next, groupId);
    const lastChild = added?.node?.children?.[added.node.children.length - 1];
    if (lastChild?.id) setSelectedFilterNodeId(lastChild.id);
  };
  const addGroup = (groupId = filterRoot.id) => {
    const next = addGroupToGroup(filterRoot, groupId, buildDefaultGroup({
      includeConnector: true
    }));
    patchFilterRoot(next);
    const added = findNodeWithParent(next, groupId);
    const lastChild = added?.node?.children?.[added.node.children.length - 1];
    if (lastChild?.id) setSelectedFilterNodeId(lastChild.id);
  };
  const removeFilterNode = nodeId => {
    const next = removeNodeFromTree(filterRoot, nodeId);
    patchFilterRoot(next);
    setSelectedFilterNodeId(findFirstRuleId(next));
  };
  const handleFilterConnectorChange = (nodeId, connector) => {
    patchFilterRoot(setNodeConnector(filterRoot, nodeId, connector));
  };
  const updateFilterRule = (nodeId, patch) => {
    patchFilterRoot(updateNodeInTree(filterRoot, nodeId, patch));
  };
  const handleFilterDragEnd = event => {
    const {
      active,
      over
    } = event;
    if (!over || active.id === over.id) return;
    const parentId = findParentIdOfNode(filterRoot, active.id);
    const overParentId = findParentIdOfNode(filterRoot, over.id);
    if (!parentId || parentId !== overParentId) return;
    patchFilterRoot(moveNodeInGroup(filterRoot, parentId, active.id, over.id));
  };
  const renderCriterionValueField = rule => {
    if (rule.field === "isReply") {
      return <div className={viewStyles.field}>
          <label className={viewStyles.label}>{copy.common.value}</label>
          <select className={viewStyles.input} value={String(rule.value || "yes")} onChange={e => updateFilterRule(rule.id, {
          value: e.target.value
        })}>
            <option value="yes">{mc.isReplyYes}</option>
            <option value="no">{mc.isReplyNo}</option>
          </select>
        </div>;
    }
    if (rule.operator === "is_empty" || rule.operator === "is_not_empty") {
      return null;
    }
    return <div className={viewStyles.field}>
        <label className={viewStyles.label}>{copy.common.value}</label>
        <input className={viewStyles.input} value={rule.value ?? ""} onChange={e => updateFilterRule(rule.id, {
        value: e.target.value
      })} placeholder={rule.operator === "in" || rule.operator === "not_in" ? mc.listPlaceholder : mc.valuePlaceholder} />
      </div>;
  };
  const modalTitle = isCreate ? irf.createTitle : draft.name ? interpolate(irf.editTitle, {
    name: draft.name
  }) : irf.editTitleFallback;
  const modalSubtitle = isCreate ? irf.createSubtitle : irf.editSubtitle;
  const footerHint = ruleCount === 0 ? irf.footerAllEmails : ruleCount === 1 ? irf.footerCriteriaOne : interpolate(irf.footerCriteriaMany, {
    count: ruleCount
  });
  const renderSectionContent = () => {
    const section = formSections.find(item => item.id === activeSection);
    switch (activeSection) {
      case "general":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{section?.label}</h3>
              <p className={layout.sectionDesc}>{section?.description}</p>
            </div>

            <div className={styles.statusRow}>
              <div>
                <div className={styles.statusLabel}>{irf.statusLabel}</div>
                <p className={styles.statusHint}>{irf.statusHint}</p>
              </div>
              <Switch checked={Boolean(draft.enabled)} onChange={on => patchDraft({
              enabled: on
            })} label={draft.enabled ? copy.common.active : copy.common.inactive} />
            </div>

            <div className={layout.fieldGrid2}>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={layout.label} htmlFor="ingestion-rule-collector">
                  {irf.collectorLabel}
                </label>
                <select id="ingestion-rule-collector" className={layout.input} value={draft.collectorId || ""} onChange={e => patchDraft({
                collectorId: e.target.value
              })}>
                  <option value="">{irf.collectorAll}</option>
                  {collectorOptions.map(collector => <option key={collector.id} value={collector.id}>
                      {collector.label}
                    </option>)}
                </select>
                <p className={styles.fieldHint}>{irf.collectorHint}</p>
              </div>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="ingestion-rule-name">
                  {irf.nameLabel}
                </label>
                <input id="ingestion-rule-name" type="text" className={layout.input} value={draft.name || ""} onChange={e => patchDraft({
                name: e.target.value
              })} placeholder={irf.namePlaceholder} />
              </div>
              <div className={`${layout.field} ${layout.fieldFull}`}>
                <label className={`${layout.label} ${layout.labelRequired}`} htmlFor="ingestion-rule-action">
                  {irf.actionLabel}
                </label>
                <select id="ingestion-rule-action" className={layout.input} value={normalizeIngestionAction(draft.action)} onChange={e => patchDraft({
                action: e.target.value
              })}>
                  {ruleActionOptions.map(option => {
                  const disabled = option.proOnly && isCommunity;
                  return <option key={option.value} value={option.value} disabled={disabled}>
                        {option.label}
                        {option.proOnly ? copy.common.proSuffix : ""}
                      </option>;
                })}
                </select>
                {normalizeIngestionAction(draft.action) === "create_ticket_services" && <div className={styles.proActionHint}>
                    <ProFeatureBadge variant="inline" />
                    <span>{irf.proActionHint}</span>
                  </div>}
              </div>
            </div>
          </>;
      case "criteria":
        return <>
            <div className={layout.sectionHead}>
              <h3 className={layout.sectionTitle}>{section?.label}</h3>
              <p className={layout.sectionDesc}>{section?.description}</p>
            </div>
            <p className={styles.criteriaHint}>
              {irf.criteriaHintBefore}
              <strong>{irf.criteriaHintBold}</strong>
              {irf.criteriaHintAfter}
            </p>

            {ruleCount === 0 ? <div className={`${viewStyles.criteriaEmpty} ${viewStyles.filtersBlock}`}>
                <Icon icon="mdi:filter-off-outline" className={viewStyles.criteriaEmptyIcon} aria-hidden />
                <p>{irf.criteriaEmpty}</p>
                <button type="button" className={viewStyles.addRuleBtnSecondary} onClick={() => addRule()}>
                  <Icon icon="mdi:plus" aria-hidden />
                  {irf.addCriterion}
                </button>
              </div> : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFilterDragEnd}>
                <div className={`${macroModalStyles.actionsLayout} ${viewStyles.filtersBlock}`}>
                  <TicketViewFilterBuilder filterRoot={filterRoot} selectedNodeId={selectedFilterNodeId} onSelectNode={setSelectedFilterNodeId} onConnectorChange={handleFilterConnectorChange} onDeleteNode={removeFilterNode} describeRuleBrief={describeRuleBrief} ruleIcons={MAIL_CRITERION_FIELD_ICONS} ruleCount={ruleCount} />

                  <div className={macroModalStyles.actionDetail}>
                    {selectedRule ? <>
                        <div className={macroModalStyles.actionDetailHead}>
                          <span className={macroModalStyles.actionDetailStep}>{copy.common.rule}</span>
                          <span className={macroModalStyles.actionDetailSummary}>
                            {describeRuleBrief(selectedRule)}
                          </span>
                        </div>
                        <div className={viewStyles.criterionEditorGrid}>
                          <div className={viewStyles.field}>
                            <label className={viewStyles.label}>{copy.common.field}</label>
                            <select className={viewStyles.input} value={selectedRule.field} onChange={e => updateFilterRule(selectedRule.id, {
                        field: e.target.value,
                        value: ""
                      })}>
                              {mailCriterionFields.map(opt => <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>)}
                            </select>
                          </div>
                          <div className={viewStyles.field}>
                            <label className={viewStyles.label}>{copy.common.operator}</label>
                            <select className={viewStyles.input} value={selectedRule.operator} onChange={e => updateFilterRule(selectedRule.id, {
                        operator: e.target.value
                      })}>
                              {mailCriterionOperators.map(opt => <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>)}
                            </select>
                          </div>
                          {renderCriterionValueField(selectedRule)}
                        </div>
                      </> : selectedGroup ? <>
                        <div className={macroModalStyles.actionDetailHead}>
                          <span className={macroModalStyles.actionDetailStep}>{copy.common.group}</span>
                          <span className={macroModalStyles.actionDetailSummary}>
                            {interpolate(irf.groupElements, {
                        count: (selectedGroup.children || []).length
                      })}
                          </span>
                        </div>
                        <p className={viewStyles.groupEditorHint}>{irf.groupHint}</p>
                        <div className={viewStyles.groupEditorActions}>
                          <button type="button" className={viewStyles.addRuleBtnSecondary} onClick={() => addRule(selectedGroup.id)}>
                            <Icon icon="mdi:plus" aria-hidden />
                            {irf.addRuleInGroup}
                          </button>
                          <button type="button" className={viewStyles.addRuleBtnSecondary} onClick={() => addGroup(selectedGroup.id)}>
                            <Icon icon="mdi:folder-plus-outline" aria-hidden />
                            {irf.addSubgroup}
                          </button>
                        </div>
                      </> : <p className={macroModalStyles.emptyActions}>{irf.selectNodeHint}</p>}
                  </div>
                </div>
              </DndContext>}

            <div className={viewStyles.filterActionsRow}>
              <button type="button" className={viewStyles.addRuleBtnSecondary} onClick={() => addRule()}>
                <Icon icon="mdi:plus" aria-hidden />
                {irf.addRuleBtn}
              </button>
              <button type="button" className={viewStyles.addRuleBtnSecondary} onClick={() => addGroup()}>
                <Icon icon="mdi:folder-plus-outline" aria-hidden />
                {irf.addGroupBtn}
              </button>
            </div>
          </>;
      default:
        return null;
    }
  };
  return createPortal(<div className={layout.overlay} onClick={onClose} role="presentation">
      <div className={layout.shell} style={{
      maxWidth: "min(920px, 100%)"
    }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ingestion-rule-form-title">
        <div className={layout.accentBar} aria-hidden />
        <header className={layout.header}>
          <div className={layout.headerMain}>
            <div className={layout.headerIconWrap} aria-hidden>
              <Icon icon={isCreate ? "mdi:filter-plus-outline" : "mdi:filter-cog-outline"} />
            </div>
            <div className={layout.headerText}>
              <p className={layout.eyebrow}>{irf.eyebrow}</p>
              <h2 className={layout.title} id="ingestion-rule-form-title">
                {modalTitle}
              </h2>
              <p className={layout.subtitle}>{modalSubtitle}</p>
            </div>
          </div>
          <button type="button" className={layout.closeBtn} onClick={onClose} disabled={saving} aria-label={copy.common.close}>
            <FaTimes />
          </button>
        </header>

        <div className={layout.body}>
          <nav className={layout.nav} aria-label={irf.sectionsAria}>
            {formSections.map(section => <button key={section.id} type="button" className={`${layout.navItem} ${activeSection === section.id ? layout.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                <Icon icon={section.icon} className={layout.navItemIcon} aria-hidden />
                <span className={layout.navItemText}>
                  <span className={layout.navItemLabel}>{section.label}</span>
                  <span className={layout.navItemHint}>{section.description}</span>
                </span>
                {section.id === "criteria" && ruleCount > 0 && <span className={layout.navBadge}>{ruleCount}</span>}
                {section.id !== "criteria" && sectionMeta[section.id] && <span className={layout.navBadge}>✓</span>}
              </button>)}
          </nav>

          <div className={layout.content}>{renderSectionContent()}</div>
        </div>

        <footer className={layout.footer}>
          <span className={layout.footerHint}>{footerHint}</span>
          <div className={layout.footerActions}>
            <button type="button" className={layout.ghostBtn} onClick={onClose} disabled={saving}>
              {copy.common.cancel}
            </button>
            <button type="button" className={layout.primaryBtn} onClick={onSave} disabled={saving}>
              {saving ? <>
                  <Icon icon="mdi:loading" className={layout.spinning} aria-hidden />
                  {copy.common.saving}
                </> : isCreate ? <>
                  <Icon icon="mdi:check" aria-hidden />
                  {irf.createBtn}
                </> : <>
                  <Icon icon="mdi:content-save-outline" aria-hidden />
                  {copy.common.save}
                </>}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
