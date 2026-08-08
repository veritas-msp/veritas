import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";
import { FaTimes } from "react-icons/fa";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { createTicketView, updateTicketView } from "../../api/tickets";
import { fetchUsers } from "../../api/users";
import { fetchTeams } from "../../api/teams";
import API_BASE_URL from "../../config";
import { getTicketViewFieldOptions, getTicketViewFormSections, getTicketViewVisibilityOptions, getTicketViewStatusOptions, getTicketViewOperatorOptions, buildDefaultTicketView, normalizeTicketViewRules } from "../../utils/ticketViewConstants";
import { getTicketViewConstantsCopy } from "../../i18n/ticketViewConstantsI18n";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { useCommonCopy } from "../../hooks/useCommonCopy";
import { getTicketViewModalCopy } from "./ticketViewModalI18n";
import { addGroupToGroup, addRuleToGroup, buildDefaultGroup, buildDefaultRule, buildEmptyFilterRoot, countRulesInTree, findFirstRuleId, findNodeWithParent, findParentIdOfNode, moveNodeInGroup, normalizeFilterRoot, removeNodeFromTree, setNodeConnector, updateNodeInTree } from "../../utils/ticketViewFilterTree";
import TicketViewFilterBuilder from "./TicketViewFilterBuilder";
import macroModalStyles from "../AdminPage/MacroFormModal.module.css";
import styles from "./TicketViewModal.module.css";
const EMPTY_ARRAY = [];
const CRITERION_FIELD_ICONS = {
  title: "mdi:text-short",
  description: "mdi:text-long",
  type: "mdi:shape-outline",
  category: "mdi:folder-outline",
  status: "mdi:traffic-light",
  priority: "mdi:flag-outline",
  channel: "mdi:message-outline",
  ticket_number: "mdi:pound",
  client_id: "mdi:office-building-outline",
  assigned: "mdi:account-outline",
  assigned_user_id: "mdi:account-key-outline",
  requester_contact_id: "mdi:card-account-details-outline"
};
function describeCriterionBrief(criterion, locale) {
  const copy = getTicketViewConstantsCopy(locale);
  const field = copy.getFieldLabel(criterion.field);
  const operator = copy.getOperatorLabel(criterion.operator);
  if (criterion.operator === "is_empty" || criterion.operator === "is_not_empty") {
    return `${field} ${operator}`;
  }
  const value = String(criterion.value || "").trim();
  return value ? `${field} ${operator} « ${value} »` : `${field} ${operator}…`;
}
function normalizeVisibility(value) {
  return value === "profile" ? "assigned" : value;
}
function toggleId(list, id) {
  const key = String(id);
  return list.includes(key) ? list.filter(item => item !== key) : [...list, key];
}
function getAgentFilterLabel(user) {
  if (!user) return "";
  return user.ticket_helpdesk_display_name || user.name || user.nom || user.username || user.email || String(user.id || "");
}
export default function TicketViewModal({
  open,
  onClose,
  onSaved,
  initialView,
  isAdmin = false,
  pageScope = "ticket",
  lockVisibility = null,
  defaultProfileNames = EMPTY_ARRAY,
  defaultUserIds = EMPTY_ARRAY,
  defaultTeamIds = EMPTY_ARRAY,
  allProfiles = EMPTY_ARRAY,
  allUsers = EMPTY_ARRAY,
  allTeams = EMPTY_ARRAY
}) {
  const locale = useAppLocale();
  const commonCopy = useCommonCopy();
  const modalCopy = useMemo(() => getTicketViewModalCopy(locale), [locale]);
  const viewConstants = useMemo(() => getTicketViewConstantsCopy(locale), [locale]);
  const formSections = useMemo(() => getTicketViewFormSections(locale), [locale]);
  const visibilityOptions = useMemo(() => getTicketViewVisibilityOptions(locale), [locale]);
  const fieldOptions = useMemo(() => getTicketViewFieldOptions(locale), [locale]);
  const statusOptions = useMemo(() => getTicketViewStatusOptions(locale), [locale]);
  const operatorOptions = useMemo(() => getTicketViewOperatorOptions(locale), [locale]);
  const describeRuleBrief = useCallback(criterion => describeCriterionBrief(criterion, locale), [locale]);
  const resolvedPageScope = pageScope === "ticket_sales" ? "ticket_sales" : "ticket";
  const [activeSection, setActiveSection] = useState("general");
  const [form, setForm] = useState(() => buildDefaultTicketView({
    pageScope: resolvedPageScope,
    visibility: lockVisibility ? normalizeVisibility(lockVisibility) : "private"
  }));
  const [profileNames, setProfileNames] = useState([]);
  const [userIds, setUserIds] = useState([]);
  const [teamIds, setTeamIds] = useState([]);
  const [profilesLocal, setProfilesLocal] = useState([]);
  const [usersLocal, setUsersLocal] = useState([]);
  const [teamsLocal, setTeamsLocal] = useState([]);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [profileSearch, setProfileSearch] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedFilterNodeId, setSelectedFilterNodeId] = useState(null);
  const isEdit = Boolean(initialView?.id);
  const forcedVisibility = lockVisibility ? normalizeVisibility(lockVisibility) : null;
  const profiles = allProfiles.length > 0 ? allProfiles : profilesLocal;
  const users = allUsers.length > 0 ? allUsers : usersLocal;
  const teams = allTeams.length > 0 ? allTeams : teamsLocal;
  const resetForm = useCallback(() => {
    if (initialView) {
      setForm({
        name: initialView.name || "",
        description: initialView.description || "",
        pageScope: initialView.pageScope || resolvedPageScope,
        visibility: forcedVisibility || normalizeVisibility(initialView.visibility || "private"),
        icon: initialView.icon || "mdi:view-list",
        rules: normalizeTicketViewRules(initialView.rules || {}),
        sortBy: initialView.sortBy || "updated_at",
        sortDirection: initialView.sortDirection || "desc",
        displayOrder: initialView.displayOrder ?? 0
      });
      setProfileNames(Array.isArray(initialView.profileNames) ? [...initialView.profileNames] : []);
      setUserIds(Array.isArray(initialView.userIds) ? initialView.userIds.map(String) : []);
      setTeamIds(Array.isArray(initialView.teamIds) ? initialView.teamIds.map(String) : []);
    } else {
      setForm(buildDefaultTicketView({
        pageScope: resolvedPageScope,
        visibility: forcedVisibility || "private",
        rules: normalizeTicketViewRules({
          viewMode: "active",
          filterRoot: buildEmptyFilterRoot()
        })
      }));
      setProfileNames(Array.isArray(defaultProfileNames) ? [...defaultProfileNames] : []);
      setUserIds(Array.isArray(defaultUserIds) ? defaultUserIds.map(String) : []);
      setTeamIds(Array.isArray(defaultTeamIds) ? defaultTeamIds.map(String) : []);
    }
    setUserSearch("");
    setProfileSearch("");
    setTeamSearch("");
    setError("");
    setSelectedFilterNodeId(null);
  }, [initialView, forcedVisibility, defaultProfileNames, defaultUserIds, defaultTeamIds, resolvedPageScope]);
  useEffect(() => {
    if (!open) return;
    setActiveSection("general");
    resetForm();
  }, [open, initialView?.id]);
  useEffect(() => {
    if (!open) return;
    if (allUsers.length > 0 && (!isAdmin || allProfiles.length > 0 && allTeams.length > 0)) {
      return;
    }
    let cancelled = false;
    const loadRefs = async () => {
      setLoadingRefs(true);
      try {
        const tasks = [];
        if (isAdmin && allProfiles.length === 0) {
          tasks.push(fetch(`${API_BASE_URL}/profiles`, {
            credentials: "include"
          }).then(r => r.ok ? r.json() : []).then(rows => {
            if (!cancelled) setProfilesLocal(Array.isArray(rows) ? rows : []);
          }));
        }
        if (allUsers.length === 0) {
          tasks.push(fetchUsers().then(rows => {
            if (!cancelled) setUsersLocal(Array.isArray(rows) ? rows : []);
          }).catch(() => {
            if (!cancelled) setUsersLocal([]);
          }));
        }
        if (isAdmin && allTeams.length === 0) {
          tasks.push(fetchTeams().then(rows => {
            if (!cancelled) setTeamsLocal(Array.isArray(rows) ? rows : []);
          }).catch(() => {
            if (!cancelled) setTeamsLocal([]);
          }));
        }
        await Promise.all(tasks);
      } finally {
        if (!cancelled) setLoadingRefs(false);
      }
    };
    loadRefs();
    return () => {
      cancelled = true;
    };
  }, [open, isAdmin, allProfiles.length, allUsers.length, allTeams.length]);
  const filteredVisibilityOptions = useMemo(() => visibilityOptions.filter(opt => {
    if (forcedVisibility) return opt.value === forcedVisibility;
    if (opt.value === "public" || opt.value === "assigned") return isAdmin;
    return true;
  }), [isAdmin, forcedVisibility, visibilityOptions]);
  const currentVisibility = forcedVisibility || normalizeVisibility(form.visibility);
  const showAssignmentPickers = currentVisibility === "assigned";
  const filterRoot = form.rules?.filterRoot || buildEmptyFilterRoot();
  const ruleCount = countRulesInTree(filterRoot);
  useEffect(() => {
    if (ruleCount === 0) {
      setSelectedFilterNodeId(null);
      return;
    }
    if (!selectedFilterNodeId) {
      setSelectedFilterNodeId(findFirstRuleId(filterRoot) || filterRoot.children?.[0]?.id || null);
      return;
    }
    const located = findNodeWithParent(filterRoot, selectedFilterNodeId);
    if (!located) {
      setSelectedFilterNodeId(findFirstRuleId(filterRoot) || filterRoot.children?.[0]?.id || null);
    }
  }, [filterRoot, ruleCount, selectedFilterNodeId]);
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 6
    }
  }), useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates
  }));
  const selectedFilterNode = findNodeWithParent(filterRoot, selectedFilterNodeId)?.node || null;
  const selectedRule = selectedFilterNode?.type === "rule" ? selectedFilterNode : null;
  const selectedGroup = selectedFilterNode?.type === "group" ? selectedFilterNode : null;
  const sectionMeta = useMemo(() => ({
    general: Boolean(form.name?.trim()),
    visibility: currentVisibility !== "assigned" || profileNames.length > 0 || userIds.length > 0 || teamIds.length > 0,
    filters: ruleCount > 0
  }), [form.name, currentVisibility, profileNames, userIds, teamIds, ruleCount]);
  const sectionRequiredMissing = useMemo(() => ({
    general: !form.name?.trim(),
    visibility: showAssignmentPickers && profileNames.length === 0 && userIds.length === 0 && teamIds.length === 0,
    filters: false
  }), [form.name, showAssignmentPickers, profileNames, userIds, teamIds]);
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const rows = users.filter(u => u?.id);
    if (!q) return rows.slice(0, 24);
    return rows.filter(u => `${u.email || ""} ${u.username || ""} ${u.profile || ""}`.toLowerCase().includes(q)).slice(0, 24);
  }, [users, userSearch]);
  const filteredProfiles = useMemo(() => {
    const q = profileSearch.trim().toLowerCase();
    const rows = profiles.filter(p => p?.name);
    if (!q) return rows;
    return rows.filter(p => `${p.name || ""} ${p.label || ""}`.toLowerCase().includes(q));
  }, [profiles, profileSearch]);
  const filteredTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    const rows = teams.filter(t => t?.id);
    if (!q) return rows;
    return rows.filter(t => `${t.name || ""} ${t.description || ""}`.toLowerCase().includes(q));
  }, [teams, teamSearch]);
  const agentFilterOptions = useMemo(() => users.filter(u => u?.id && String(u.role || "").toLowerCase() !== "client").sort((a, b) => getAgentFilterLabel(a).localeCompare(getAgentFilterLabel(b), locale)), [users, locale]);
  const getValuePlaceholder = criterion => {
    if (["in", "not_in"].includes(criterion.operator)) {
      if (criterion.field === "assigned") return modalCopy.placeholderAssignedList;
      if (criterion.field === "assigned_user_id") return modalCopy.placeholderUuidList;
      if (criterion.field === "tags") return modalCopy.placeholderTagsList;
      return modalCopy.placeholderGenericList;
    }
    if (criterion.field === "assigned") return modalCopy.placeholderAssignedSingle;
    if (criterion.field === "tags") return modalCopy.placeholderTagName;
    return modalCopy.placeholderCompareValue;
  };
  const renderCriterionValueField = criterion => {
    if (["is_empty", "is_not_empty"].includes(criterion.operator)) return null;
    const useAgentPicker = (criterion.field === "assigned" || criterion.field === "assigned_user_id") && !["in", "not_in"].includes(criterion.operator);
    if (criterion.field === "status" && !["in", "not_in"].includes(criterion.operator)) {
      return <div className={`${styles.field} ${styles.fieldFull}`}>
          <label className={styles.label}>{modalCopy.valueLabel}</label>
          <select className={styles.input} value={criterion.value || ""} onChange={e => updateFilterRule(criterion.id, {
          value: e.target.value
        })}>
            <option value="">{modalCopy.chooseStatus}</option>
            {statusOptions.map(option => <option key={option.value} value={option.value}>
                {option.label}
              </option>)}
          </select>
        </div>;
    }
    if (useAgentPicker) {
      const selectedValue = criterion.value || "";
      return <div className={`${styles.field} ${styles.fieldFull}`}>
          <label className={styles.label}>{modalCopy.valueLabel}</label>
          <select className={styles.input} value={selectedValue} onChange={e => updateFilterRule(criterion.id, {
          field: "assigned_user_id",
          value: e.target.value
        })} disabled={loadingRefs && agentFilterOptions.length === 0}>
            <option value="">
              {loadingRefs ? modalCopy.loadingAgents : modalCopy.chooseAgent}
            </option>
            {agentFilterOptions.map(agent => {
            const label = getAgentFilterLabel(agent);
            return <option key={agent.id} value={String(agent.id)}>
                  {label}
                  {agent.email && label !== agent.email ? ` (${agent.email})` : ""}
                </option>;
          })}
          </select>
        </div>;
    }
    return <div className={`${styles.field} ${styles.fieldFull}`}>
        <label className={styles.label}>{modalCopy.valueLabel}</label>
        <input className={styles.input} value={criterion.value || ""} onChange={e => updateFilterRule(criterion.id, {
        value: e.target.value
      })} placeholder={getValuePlaceholder(criterion)} />
      </div>;
  };
  const patchForm = useCallback(patch => {
    setForm(prev => ({
      ...prev,
      ...patch
    }));
  }, []);
  const patchRules = useCallback(patch => {
    setForm(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        ...patch
      }
    }));
  }, []);
  const patchFilterRoot = useCallback(nextRoot => {
    patchRules({
      filterRoot: normalizeFilterRoot(nextRoot)
    });
  }, [patchRules]);
  const addRule = (groupId = filterRoot.id) => {
    const rule = buildDefaultRule({
      includeConnector: true
    });
    patchFilterRoot(addRuleToGroup(filterRoot, groupId, rule));
    setSelectedFilterNodeId(rule.id);
  };
  const addGroup = (groupId = filterRoot.id) => {
    const group = buildDefaultGroup({
      includeConnector: true
    });
    patchFilterRoot(addGroupToGroup(filterRoot, groupId, group));
    setSelectedFilterNodeId(group.children?.[0]?.id || group.id);
  };
  const updateFilterRule = (ruleId, patch) => {
    patchFilterRoot(updateNodeInTree(filterRoot, ruleId, patch));
  };
  const removeFilterNode = nodeId => {
    if (nodeId === filterRoot.id) return;
    patchFilterRoot(removeNodeFromTree(filterRoot, nodeId));
  };
  const handleFilterConnectorChange = (nodeId, connector) => {
    patchFilterRoot(setNodeConnector(filterRoot, nodeId, connector));
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
  const handleSave = async () => {
    setError("");
    if (!form.name.trim()) {
      setError(modalCopy.nameRequired);
      setActiveSection("general");
      return;
    }
    if ((currentVisibility === "public" || currentVisibility === "assigned") && !isAdmin) {
      setError(modalCopy.adminOnlyError);
      setActiveSection("visibility");
      return;
    }
    if (showAssignmentPickers && profileNames.length === 0 && userIds.length === 0 && teamIds.length === 0) {
      setError(modalCopy.assignmentRequired);
      setActiveSection("visibility");
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description?.trim() || "",
      pageScope: form.pageScope || resolvedPageScope,
      visibility: currentVisibility,
      icon: form.icon || "mdi:view-list",
      rules: {
        viewMode: form.rules.viewMode,
        filterRoot: normalizeFilterRoot(filterRoot)
      },
      sortBy: form.sortBy,
      sortDirection: form.sortDirection,
      displayOrder: form.displayOrder,
      profileNames: showAssignmentPickers ? profileNames : [],
      userIds: showAssignmentPickers ? userIds : [],
      teamIds: showAssignmentPickers ? teamIds : []
    };
    setSaving(true);
    try {
      const saved = isEdit ? await updateTicketView(initialView.id, payload) : await createTicketView(payload);
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err.message || modalCopy.saveError);
    } finally {
      setSaving(false);
    }
  };
  const renderGeneralSection = () => <>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>{modalCopy.generalTitle}</h3>
        <p className={styles.sectionDesc}>{modalCopy.generalDesc}</p>
      </div>
      <div className={styles.fieldGrid2}>
        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label className={`${styles.label} ${styles.labelRequired}`} htmlFor="ticket-view-name">
            {modalCopy.nameLabel}
          </label>
          <input id="ticket-view-name" type="text" className={styles.input} value={form.name} onChange={e => patchForm({
          name: e.target.value
        })} placeholder={modalCopy.namePlaceholder} autoFocus />
        </div>
        <div className={`${styles.field} ${styles.fieldFull}`}>
          <label className={styles.label} htmlFor="ticket-view-desc">
            {modalCopy.descriptionLabel}
          </label>
          <textarea id="ticket-view-desc" className={styles.textarea} value={form.description} onChange={e => patchForm({
          description: e.target.value
        })} placeholder={modalCopy.descriptionPlaceholder} rows={3} />
        </div>
      </div>
    </>;
  const renderVisibilitySection = () => <>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>{modalCopy.visibilityTitle}</h3>
        <p className={styles.sectionDesc}>{modalCopy.visibilityDesc}</p>
      </div>

      {!forcedVisibility && <div className={styles.visibilityGrid}>
          {filteredVisibilityOptions.map(opt => <button key={opt.value} type="button" className={`${styles.visibilityTile} ${currentVisibility === opt.value ? styles.visibilityTileActive : ""}`} onClick={() => patchForm({
        visibility: opt.value
      })} aria-pressed={currentVisibility === opt.value}>
              <Icon icon={opt.icon} className={styles.visibilityTileIcon} aria-hidden />
              <span className={styles.visibilityTileLabel}>{opt.label}</span>
              <span className={styles.visibilityTileHint}>{opt.hint}</span>
            </button>)}
        </div>}

      {showAssignmentPickers && <div className={styles.assignmentPanel}>
          <p className={styles.assignmentIntro}>{modalCopy.assignmentIntro}</p>

          {loadingRefs && <div className={styles.loadingHint}>
              <Icon icon="mdi:loading" className={styles.spinning} />
              {modalCopy.loading}
            </div>}

          <div className={styles.assignmentGrid}>
          <div className={styles.assignmentBlock}>
            <div className={styles.assignmentHead}>
              <span className={styles.assignmentLabel}>{modalCopy.usersLabel}</span>
              <span className={styles.assignmentCount}>
                {modalCopy.formatSelectedCount(userIds.length)}
              </span>
            </div>
            <input type="search" className={`${styles.input} ${styles.assignmentSearch}`} placeholder={modalCopy.searchAgent} value={userSearch} onChange={e => setUserSearch(e.target.value)} />
            <div className={styles.chipGrid}>
              {filteredUsers.length === 0 ? <span className={styles.emptyHint}>{modalCopy.noAgentsAvailable}</span> : filteredUsers.map(user => {
              const active = userIds.includes(String(user.id));
              return <button key={user.id} type="button" className={`${styles.chip} ${active ? styles.chipActive : ""}`} onClick={() => setUserIds(prev => toggleId(prev, user.id))} aria-pressed={active}>
                      {active && <Icon icon="mdi:check" className={styles.chipCheck} aria-hidden />}
                      {user.email || user.username}
                    </button>;
            })}
            </div>
          </div>

          <div className={styles.assignmentBlock}>
            <div className={styles.assignmentHead}>
              <span className={styles.assignmentLabel}>{modalCopy.profilesLabel}</span>
              <span className={styles.assignmentCount}>
                {modalCopy.formatSelectedCount(profileNames.length)}
              </span>
            </div>
            <input type="search" className={`${styles.input} ${styles.assignmentSearch}`} placeholder={modalCopy.searchProfiles} value={profileSearch} onChange={e => setProfileSearch(e.target.value)} />
            <div className={styles.chipGrid}>
              {filteredProfiles.length === 0 ? <span className={styles.emptyHint}>{modalCopy.noProfilesAvailable}</span> : filteredProfiles.map(profile => {
              const active = profileNames.includes(profile.name);
              return <button key={profile.name} type="button" className={`${styles.chip} ${active ? styles.chipActive : ""}`} onClick={() => setProfileNames(prev => prev.includes(profile.name) ? prev.filter(n => n !== profile.name) : [...prev, profile.name])} aria-pressed={active}>
                      {active && <Icon icon="mdi:check" className={styles.chipCheck} aria-hidden />}
                      {profile.name}
                    </button>;
            })}
            </div>
          </div>

          <div className={styles.assignmentBlock}>
            <div className={styles.assignmentHead}>
              <span className={styles.assignmentLabel}>{modalCopy.teamsLabel}</span>
              <span className={styles.assignmentCount}>
                {modalCopy.formatSelectedCount(teamIds.length)}
              </span>
            </div>
            <input type="search" className={`${styles.input} ${styles.assignmentSearch}`} placeholder={modalCopy.searchTeams} value={teamSearch} onChange={e => setTeamSearch(e.target.value)} />
            <div className={styles.chipGrid}>
              {filteredTeams.length === 0 ? <span className={styles.emptyHint}>{modalCopy.noTeamsAvailable}</span> : filteredTeams.map(team => {
              const active = teamIds.includes(String(team.id));
              return <button key={team.id} type="button" className={`${styles.chip} ${active ? styles.chipActive : ""}`} onClick={() => setTeamIds(prev => toggleId(prev, team.id))} aria-pressed={active}>
                      {active && <Icon icon="mdi:check" className={styles.chipCheck} aria-hidden />}
                      {team.name}
                    </button>;
            })}
            </div>
          </div>
          </div>
        </div>}
    </>;
  const renderFiltersSection = () => <>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>{modalCopy.filtersTitle}</h3>
        <p className={styles.sectionDesc}>{modalCopy.filtersDesc}</p>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="ticket-view-source">
          {modalCopy.sourceLabel}
        </label>
        <select id="ticket-view-source" className={styles.input} value={form.rules.viewMode} onChange={e => patchRules({
        viewMode: e.target.value
      })}>
          <option value="active">{modalCopy.sourceActive}</option>
          <option value="trash">{modalCopy.sourceTrash}</option>
        </select>
      </div>

      {ruleCount === 0 ? <div className={`${styles.criteriaEmpty} ${styles.filtersBlock}`}>
          <Icon icon="mdi:filter-off-outline" className={styles.criteriaEmptyIcon} aria-hidden />
          <p>{modalCopy.noRulesEmpty}</p>
          <button type="button" className={styles.addRuleBtnSecondary} onClick={() => addRule()}>
            <Icon icon="mdi:plus" aria-hidden />
            {modalCopy.addFirstRule}
          </button>
        </div> : <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFilterDragEnd}>
          <div className={`${macroModalStyles.actionsLayout} ${styles.filtersBlock}`}>
            <TicketViewFilterBuilder filterRoot={filterRoot} selectedNodeId={selectedFilterNodeId} onSelectNode={setSelectedFilterNodeId} onConnectorChange={handleFilterConnectorChange} onDeleteNode={removeFilterNode} describeRuleBrief={describeRuleBrief} ruleIcons={CRITERION_FIELD_ICONS} ruleCount={ruleCount} />

            <div className={macroModalStyles.actionDetail}>
              {selectedRule ? <>
                  <div className={macroModalStyles.actionDetailHead}>
                    <span className={macroModalStyles.actionDetailStep}>{modalCopy.ruleLabel}</span>
                    <span className={macroModalStyles.actionDetailSummary}>
                      {describeCriterionBrief(selectedRule, locale)}
                    </span>
                  </div>
                  <div className={styles.criterionEditorGrid}>
                    <div className={styles.field}>
                      <label className={styles.label}>{modalCopy.fieldLabel}</label>
                      <select className={styles.input} value={selectedRule.field} onChange={e => updateFilterRule(selectedRule.id, {
                  field: e.target.value,
                  value: ""
                })}>
                        {fieldOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>{modalCopy.operatorLabel}</label>
                      <select className={styles.input} value={selectedRule.operator} onChange={e => updateFilterRule(selectedRule.id, {
                  operator: e.target.value
                })}>
                        {operatorOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                    {renderCriterionValueField(selectedRule)}
                  </div>
                </> : selectedGroup ? <>
                  <div className={macroModalStyles.actionDetailHead}>
                    <span className={macroModalStyles.actionDetailStep}>{modalCopy.groupLabel}</span>
                    <span className={macroModalStyles.actionDetailSummary}>
                      {modalCopy.formatGroupSummary((selectedGroup.children || []).length)}
                    </span>
                  </div>
                  <p className={styles.groupEditorHint}>{modalCopy.groupEditorHint}</p>
                  <div className={styles.groupEditorActions}>
                    <button type="button" className={styles.addRuleBtnSecondary} onClick={() => addRule(selectedGroup.id)}>
                      <Icon icon="mdi:plus" aria-hidden />
                      {modalCopy.addRuleInGroup}
                    </button>
                    <button type="button" className={styles.addRuleBtnSecondary} onClick={() => addGroup(selectedGroup.id)}>
                      <Icon icon="mdi:folder-plus-outline" aria-hidden />
                      {modalCopy.addSubGroup}
                    </button>
                  </div>
                </> : <p className={macroModalStyles.emptyActions}>{modalCopy.selectRuleOrGroup}</p>}
            </div>
          </div>
        </DndContext>}

      <div className={styles.filterActionsRow}>
        <button type="button" className={macroModalStyles.addActionBtn} onClick={() => addRule()}>
          <Icon icon="mdi:plus" aria-hidden />
          {modalCopy.addRule}
        </button>
        <button type="button" className={macroModalStyles.addActionBtn} onClick={() => addGroup()}>
          <Icon icon="mdi:folder-plus-outline" aria-hidden />
          {modalCopy.addGroup}
        </button>
      </div>
    </>;
  const renderSectionContent = () => {
    switch (activeSection) {
      case "general":
        return renderGeneralSection();
      case "visibility":
        return renderVisibilitySection();
      case "filters":
        return renderFiltersSection();
      default:
        return null;
    }
  };
  if (!open) return null;
  const modalTitle = isEdit ? modalCopy.editTitle : modalCopy.createTitle;
  const modalSubtitle = isEdit ? modalCopy.editSubtitle : modalCopy.createSubtitle;
  return createPortal(<div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={`${styles.shell} ${styles.viewShell}`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ticket-view-modal-title">
        <div className={styles.accentBar} aria-hidden />

        <header className={styles.header}>
          <div className={styles.headerMain}>
            <div className={styles.headerIconWrap} aria-hidden>
              <Icon icon={isEdit ? "mdi:view-list" : "mdi:view-grid-plus-outline"} />
            </div>
            <div className={styles.headerText}>
              <p className={styles.eyebrow}>{modalCopy.eyebrow}</p>
              <h2 className={styles.title} id="ticket-view-modal-title">
                {modalTitle}
              </h2>
              <p className={styles.subtitle}>{modalSubtitle}</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} disabled={saving} aria-label={commonCopy.close}>
            <FaTimes />
          </button>
        </header>

        <div className={styles.body}>
          <nav className={styles.nav} aria-label={modalCopy.navAria}>
            {formSections.map(section => <button key={section.id} type="button" className={`${styles.navItem} ${activeSection === section.id ? styles.navItemActive : ""}`} onClick={() => setActiveSection(section.id)} aria-current={activeSection === section.id ? "step" : undefined}>
                <Icon icon={section.icon} className={styles.navItemIcon} aria-hidden />
                <span className={styles.navItemText}>
                  <span className={styles.navItemLabel}>
                    {section.label}
                    {sectionRequiredMissing[section.id] && <span className={styles.navRequiredMark} aria-hidden="true">
                        *
                      </span>}
                  </span>
                  <span className={styles.navItemHint}>{section.description}</span>
                </span>
                {section.id === "filters" && ruleCount > 0 && <span className={styles.navBadge}>{ruleCount}</span>}
                {section.id !== "filters" && sectionMeta[section.id] && !sectionRequiredMissing[section.id] && <span className={styles.navBadge}>✓</span>}
              </button>)}
          </nav>

          <div className={styles.content}>
            {renderSectionContent()}
            {error && <div className={styles.errorBox} role="alert">
                <Icon icon="mdi:alert-circle-outline" aria-hidden />
                {error}
              </div>}
          </div>
        </div>

        <footer className={styles.footer}>
          <span className={styles.footerHint}>
            {showAssignmentPickers ? modalCopy.formatFooterAssignments(userIds.length + profileNames.length + teamIds.length, ruleCount) : modalCopy.formatFooterRules(ruleCount)}
          </span>
          <div className={styles.footerActions}>
            <button type="button" className={styles.ghostBtn} onClick={onClose} disabled={saving}>
              {commonCopy.cancel}
            </button>
            <button type="button" className={styles.primaryBtn} onClick={handleSave} disabled={saving}>
              {saving ? <>
                  <Icon icon="mdi:loading" className={styles.spinning} aria-hidden />
                  {commonCopy.saving}
                </> : isEdit ? <>
                  <Icon icon="mdi:content-save-outline" aria-hidden />
                  {commonCopy.save}
                </> : <>
                  <Icon icon="mdi:check" aria-hidden />
                  {modalCopy.createView}
                </>}
            </button>
          </div>
        </footer>
      </div>
    </div>, document.getElementById("modal-root") || document.body);
}
