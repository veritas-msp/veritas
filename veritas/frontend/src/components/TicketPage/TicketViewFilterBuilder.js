import { Fragment, useMemo } from "react";
import { Icon } from "@iconify/react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import { getTicketViewConstantsCopy } from "../../i18n/ticketViewConstantsI18n";
import { getTicketViewModalCopy } from "./ticketViewModalI18n";
import macroModalStyles from "../AdminPage/MacroFormModal.module.css";
import styles from "./TicketViewModal.module.css";
function ConnectorToggle({
  value,
  onChange,
  connectors,
  ariaLabel
}) {
  return <div className={styles.filterConnectorRow} role="group" aria-label={ariaLabel}>
      {connectors.map(opt => <button key={opt.value} type="button" className={`${styles.filterConnectorBtn} ${value === opt.value ? styles.filterConnectorBtnActive : ""}`} onClick={() => onChange(opt.value)} aria-pressed={value === opt.value}>
          {opt.label}
        </button>)}
    </div>;
}
function SortableFilterRow({
  id,
  connector,
  showConnector,
  onConnectorChange,
  isSelected,
  onSelect,
  onDelete,
  icon,
  title,
  subtitle,
  isGroup,
  depth,
  connectors,
  reorderAria,
  deleteTitle,
  logicalConnectorAria
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: `${depth * 14}px`
  };
  return <Fragment>
      {showConnector && <div className={styles.filterConnectorWrap} style={{
      marginLeft: `${depth * 14 + 24}px`
    }}>
          <ConnectorToggle value={connector || "and"} onChange={onConnectorChange} connectors={connectors} ariaLabel={logicalConnectorAria} />
        </div>}
      <li ref={setNodeRef} style={style} className={`${macroModalStyles.actionsListRow} ${isDragging ? macroModalStyles.actionsListRowDragging : ""} ${isGroup ? styles.filterGroupRow : ""}`}>
        <button type="button" className={macroModalStyles.actionDragHandle} aria-label={reorderAria} {...attributes} {...listeners}>
          <Icon icon="mdi:drag-vertical" aria-hidden />
        </button>
        <button type="button" className={`${macroModalStyles.actionListItem} ${isSelected ? macroModalStyles.actionListItemActive : ""}`} onClick={onSelect}>
          <Icon icon={icon} className={macroModalStyles.actionListIcon} aria-hidden />
          <span className={macroModalStyles.actionListText}>
            <span className={macroModalStyles.actionListTitle}>{title}</span>
            <span className={macroModalStyles.actionListSubtitle}>{subtitle}</span>
          </span>
        </button>
        <div className={macroModalStyles.actionListTools}>
          <button type="button" className={`${macroModalStyles.listToolBtn} ${macroModalStyles.listToolBtnDanger}`} title={deleteTitle} onClick={onDelete}>
            <Icon icon="mdi:delete-outline" aria-hidden />
          </button>
        </div>
      </li>
    </Fragment>;
}
function FilterGroupList({
  group,
  depth,
  selectedNodeId,
  onSelectNode,
  onConnectorChange,
  onDeleteNode,
  describeRuleBrief,
  ruleIcons,
  copy,
  connectors
}) {
  const children = group.children || [];
  const sortableIds = children.map(child => child.id);
  const renderChild = (child, index) => {
    const showConnector = index > 0;
    const commonProps = {
      id: child.id,
      connector: child.connector,
      showConnector,
      onConnectorChange: value => onConnectorChange(child.id, value),
      isSelected: child.id === selectedNodeId,
      onSelect: () => onSelectNode(child.id),
      onDelete: () => onDeleteNode(child.id),
      depth,
      connectors,
      reorderAria: copy.reorderAria,
      deleteTitle: copy.deleteTitle,
      logicalConnectorAria: copy.logicalConnectorAria
    };
    if (child.type === "group") {
      const ruleCount = (child.children || []).filter(n => n.type === "rule").length;
      return <Fragment key={child.id}>
          <SortableFilterRow {...commonProps} isGroup icon="mdi:folder-filter-outline" title={copy.filterGroupTitle} subtitle={copy.formatFilterGroupSubtitle(ruleCount)} />
          <FilterGroupList group={child} depth={depth + 1} selectedNodeId={selectedNodeId} onSelectNode={onSelectNode} onConnectorChange={onConnectorChange} onDeleteNode={onDeleteNode} describeRuleBrief={describeRuleBrief} ruleIcons={ruleIcons} copy={copy} connectors={connectors} />
        </Fragment>;
    }
    return <SortableFilterRow key={child.id} {...commonProps} icon={ruleIcons[child.field] || "mdi:filter-variant"} title={copy.ruleLabel} subtitle={describeRuleBrief(child)} />;
  };
  return <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
      <ol className={macroModalStyles.actionsList}>
        {children.map((child, index) => renderChild(child, index))}
      </ol>
    </SortableContext>;
}
export default function TicketViewFilterBuilder({
  filterRoot,
  selectedNodeId,
  onSelectNode,
  onConnectorChange,
  onDeleteNode,
  describeRuleBrief,
  ruleIcons = {},
  ruleCount
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getTicketViewModalCopy(locale), [locale]);
  const viewConstants = useMemo(() => getTicketViewConstantsCopy(locale), [locale]);
  const connectors = useMemo(() => [{
    value: "and",
    label: viewConstants.describe.connectorAnd
  }, {
    value: "or",
    label: viewConstants.describe.connectorOr
  }], [viewConstants]);
  if (!filterRoot?.children?.length) {
    return null;
  }
  return <div className={macroModalStyles.actionsListPanel}>
      <div className={macroModalStyles.actionsListHeader}>
        <span>{copy.formatRuleCountLabel(ruleCount)}</span>
      </div>
      <FilterGroupList group={filterRoot} depth={0} selectedNodeId={selectedNodeId} onSelectNode={onSelectNode} onConnectorChange={onConnectorChange} onDeleteNode={onDeleteNode} describeRuleBrief={describeRuleBrief} ruleIcons={ruleIcons} copy={copy} connectors={connectors} />
    </div>;
}
