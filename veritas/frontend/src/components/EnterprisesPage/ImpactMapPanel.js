import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  ConnectionMode,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppLocale";
import { interpolate } from "../../i18n/translate";
import { getClientImpactMap, saveClientImpactMap } from "../../api/impactMap";
import { getEquipmentInventoryList, getClientHardwareEquipment } from "../../api/equipment";
import { fetchClientCustomEquipment } from "../../api/clients";
import { getInfraMapCopy } from "./infraMapI18n";
import { matchesSiteFilter } from "../../utils/siteFilterUtils";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { showError } from "../../utils/toast";
import { exportBrandedReportPdfFromElement } from "../RapportPage/exportBrandedReportPdfFromElement";
import ImpactVisualMap from "./ImpactVisualMap";
import ImpactHaBadge, { haTitle } from "./ImpactHaBadge";
import { getImpactMapCopy } from "./impactMapI18n";
import {
  IMPACT_FAMILY_ORDER,
  MANUAL_NODE_TYPES,
  buildHaIndex,
  classifyNetworkLink,
  collectImpactIds,
  flowEdgeFromRecord,
  flowNodeFromRecord,
  inventoryKey,
  isManualNodeType,
  normalizeInventoryRow,
  placeWithoutOverlap,
  resolveFamilyLabel,
  resolveImpactIcon,
  serializeImpactGraph,
  vlansOverlap
} from "./impactMapModel";
import styles from "./ImpactMapPanel.module.css";

const SAVE_DELAY_MS = 400;

function vlanChipStyle(id) {
  const hue = (Number(id) * 47) % 360;
  return {
    color: `hsl(${hue} 48% 28%)`,
    background: `hsl(${hue} 70% 93%)`
  };
}

const ImpactNode = memo(function ImpactNode({ data, selected }) {
  const locale = useAppLocale();
  const copy = useMemo(() => getImpactMapCopy(locale), [locale]);
  const vlans = Array.isArray(data.vlans) ? data.vlans : [];
  return (
    <div
      className={`${styles.node} ${selected ? styles.nodeSelected : ""} ${data.missing ? styles.nodeMissing : ""} ${data.separated ? styles.nodeSeparated : ""} ${data.ha ? styles.nodeHa : ""}`.trim()}
      style={data.ha?.color ? { "--ha": data.ha.color } : undefined}
    >
      {!data.readOnly ? <Handle type="target" position={Position.Left} className={styles.handle} isConnectable /> : null}
      <span className={styles.nodeIcon} aria-hidden>
        <Icon icon={data.icon || "mdi:devices"} />
      </span>
      <span className={styles.nodeText}>
        <span className={styles.nodeLabel}>{data.label}</span>
        {data.subtitle ? <span className={styles.nodeSub}>{data.subtitle}</span> : null}
        {vlans.length ? (
          <span className={styles.vlanRow}>
            {vlans.slice(0, 3).map(id => (
              <span key={id} className={styles.vlanChip} style={vlanChipStyle(id)}>{id}</span>
            ))}
            {vlans.length > 3 ? <span className={styles.vlanChip}>+{vlans.length - 3}</span> : null}
          </span>
        ) : null}
      </span>
      {data.ha ? <ImpactHaBadge ha={data.ha} copy={copy} /> : null}
      {!data.readOnly ? <Handle type="source" position={Position.Right} className={styles.handle} isConnectable /> : null}
    </div>
  );
});

const nodeTypes = { impact: ImpactNode };

function dedupeInventory(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = inventoryKey(item.kind, item.refId);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, char => {
    const rand = (Math.random() * 16) | 0;
    const value = char === "x" ? rand : ((rand & 0x3) | 0x8);
    return value.toString(16);
  });
}

function enrichNode(node, catalog, inventoryReady, haIndex) {
  if (node.data?.kind === "manual") {
    return {
      ...node,
      data: {
        ...node.data,
        icon: resolveImpactIcon(node.data.nodeType),
        missing: false,
        inactive: false,
        subtitle: "",
        vlans: [],
        ha: null
      }
    };
  }
  const item = catalog.get(inventoryKey(node.data?.kind, node.data?.refId));
  if (!item) {
    return {
      ...node,
      data: {
        ...node.data,
        icon: resolveImpactIcon(node.data?.nodeType, node.data?.icon),
        missing: inventoryReady,
        inactive: false,
        vlans: [],
        ha: null
      }
    };
  }
  return {
    ...node,
    data: {
      ...node.data,
      label: item.name || node.data.label,
      subtitle: item.subtitle || "",
      icon: resolveImpactIcon(node.data.nodeType, item.icon),
      missing: false,
      inactive: item.isActive === false,
      groupLabel: item.groupLabel || node.data.groupLabel || "",
      vlans: item.vlans || [],
      ha: haIndex?.get(inventoryKey(node.data?.kind, node.data?.refId)) || null
    }
  };
}

function ImpactMapCanvas({
  clientId,
  clientName = "",
  active = true,
  canEdit = false,
  siteFilter = null,
  onNavigate
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getImpactMapCopy(locale), [locale]);
  const infraCopy = useMemo(() => getInfraMapCopy(locale), [locale]);
  const { screenToFlowPosition, zoomIn, zoomOut, fitView } = useReactFlow();
  const wrapperRef = useRef(null);
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const saveTimer = useRef(null);
  const saveQueue = useRef(Promise.resolve());
  const dirtyRef = useRef(false);
  const readyRef = useRef(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [inventory, setInventory] = useState([]);
  const [inventoryReady, setInventoryReady] = useState(false);
  const [inventoryError, setInventoryError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [vlanFilter, setVlanFilter] = useState("");
  const [viewMode, setViewMode] = useState("analysis");
  const [exporting, setExporting] = useState(false);
  const sheetRef = useRef(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const catalog = useMemo(() => {
    const map = new Map();
    inventory.forEach(item => map.set(inventoryKey(item.kind, item.refId), item));
    return map;
  }, [inventory]);
  const catalogRef = useRef(catalog);
  const inventoryReadyRef = useRef(false);
  const canEditRef = useRef(canEdit);
  const fitViewRef = useRef(fitView);
  const copyRef = useRef(copy);
  catalogRef.current = catalog;
  inventoryReadyRef.current = inventoryReady;
  canEditRef.current = canEdit;
  fitViewRef.current = fitView;
  copyRef.current = copy;

  const flushSave = useCallback(() => {
    if (!readyRef.current || !dirtyRef.current || !canEdit || !clientId) return;
    const payload = serializeImpactGraph(
      nodesRef.current.map(node => enrichNode(node, catalogRef.current, inventoryReadyRef.current)),
      edgesRef.current
    );
    dirtyRef.current = false;
    saveQueue.current = saveQueue.current
      .catch(() => {})
      .then(async () => {
        try {
          await saveClientImpactMap(clientId, payload);
        } catch (err) {
          dirtyRef.current = true;
          if (err?.name !== "AbortError") showError(copy.saveError);
        }
      });
  }, [canEdit, clientId, copy.saveError]);

  const scheduleSave = useCallback(() => {
    if (!readyRef.current || !canEdit) return;
    dirtyRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      flushSave();
    }, SAVE_DELAY_MS);
  }, [canEdit, flushSave]);

  useEffect(() => {
    if (!clientId) return undefined;
    const controller = new AbortController();
    let fitTimer = 0;
    readyRef.current = false;
    dirtyRef.current = false;
    nodesRef.current = [];
    edgesRef.current = [];
    setNodes([]);
    setEdges([]);
    setLoading(true);
    setLoadError("");

    getClientImpactMap(clientId, { signal: controller.signal })
      .then(graph => {
        if (controller.signal.aborted) return;
        const nextNodes = (graph.nodes || []).map(flowNodeFromRecord);
        const nextEdges = (graph.edges || []).map(flowEdgeFromRecord);
        nodesRef.current = nextNodes;
        edgesRef.current = nextEdges;
        setNodes(nextNodes);
        setEdges(nextEdges);
        readyRef.current = true;
        setLoading(false);
        if (nextNodes.length) {
          fitTimer = window.setTimeout(() => fitViewRef.current?.({ padding: 0.2, duration: 200 }), 40);
        }
      })
      .catch(err => {
        if (err?.name === "AbortError" || controller.signal.aborted) return;
        readyRef.current = false;
        setLoading(false);
        setLoadError(err?.status === 503 ? copyRef.current.unavailable : copyRef.current.loadError);
      });

    return () => {
      controller.abort();
      if (fitTimer) window.clearTimeout(fitTimer);
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      if (readyRef.current && dirtyRef.current && canEditRef.current) {
        const payload = serializeImpactGraph(
          nodesRef.current.map(node => enrichNode(node, catalogRef.current, inventoryReadyRef.current)),
          edgesRef.current
        );
        dirtyRef.current = false;
        saveClientImpactMap(clientId, payload).catch(() => {});
      }
      readyRef.current = false;
    };
  }, [clientId, setEdges, setNodes]);

  useEffect(() => {
    if (!clientId) return undefined;
    const controller = new AbortController();
    setInventory([]);
    setInventoryReady(false);
    setInventoryError(false);
    const load = async () => {
      try {
        const rows = await getEquipmentInventoryList({ signal: controller.signal });
        const normalized = dedupeInventory((Array.isArray(rows) ? rows : [])
          .filter(row => String(row.clientId) === String(clientId))
          .map(normalizeInventoryRow)
          .filter(Boolean));
        if (!controller.signal.aborted) {
          setInventory(normalized);
          setInventoryReady(true);
        }
        return;
      } catch (err) {
        if (err?.name === "AbortError" || controller.signal.aborted) return;
      }
      try {
        const [hardware, customRows] = await Promise.all([
          getClientHardwareEquipment(clientId, { signal: controller.signal }).catch(() => []),
          fetchClientCustomEquipment(clientId, null, { signal: controller.signal }).catch(() => [])
        ]);
        const unique = dedupeInventory([...(hardware || []), ...(customRows || [])]
          .map(normalizeInventoryRow)
          .filter(Boolean));
        if (!controller.signal.aborted) {
          setInventory(unique);
          setInventoryReady(true);
          setInventoryError(false);
        }
      } catch (err) {
        if (err?.name === "AbortError" || controller.signal.aborted) return;
        if (!controller.signal.aborted) {
          setInventory([]);
          setInventoryReady(true);
          setInventoryError(true);
        }
      }
    };
    load();
    return () => controller.abort();
  }, [clientId]);

  useEffect(() => {
    if (!active) {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      flushSave();
      return undefined;
    }
    const onKey = event => {
      if (event.key === "Escape") {
        setPendingDelete(null);
        setNodes(current => current.map(node => (node.selected ? { ...node, selected: false } : node)));
        setEdges(current => current.map(edge => (edge.selected ? { ...edge, selected: false } : edge)));
        return;
      }
      if (!canEdit || pendingDelete) return;
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable) return;
      const selectedEdge = edgesRef.current.find(edge => edge.selected);
      const selectedNode = nodesRef.current.find(node => node.selected);
      if (selectedEdge && !selectedNode) {
        event.preventDefault();
        setEdges(current => {
          const next = current.filter(edge => edge.id !== selectedEdge.id);
          edgesRef.current = next;
          return next;
        });
        scheduleSave();
        return;
      }
      if (selectedNode) {
        event.preventDefault();
        setPendingDelete(selectedNode);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, canEdit, flushSave, pendingDelete, scheduleSave, setEdges, setNodes]);

  const focusId = nodes.find(node => node.selected)?.id || null;
  const selectedEdge = !focusId ? edges.find(edge => edge.selected) : null;
  const haIndex = useMemo(() => buildHaIndex(inventory), [inventory]);
  const enrichedNodes = useMemo(
    () => nodes.map(node => enrichNode(node, catalog, inventoryReady, haIndex)),
    [catalog, haIndex, inventoryReady, nodes]
  );
  const focusNode = enrichedNodes.find(node => node.id === focusId) || null;
  const impactIds = useMemo(() => {
    if (!focusNode) return null;
    const ids = collectImpactIds(focusNode, enrichedNodes, edges);
    const pairKey = focusNode.data?.ha?.pairKey;
    if (pairKey) {
      enrichedNodes.forEach(node => {
        if (node.data?.ha?.pairKey === pairKey) ids.add(node.id);
      });
    }
    return ids;
  }, [edges, enrichedNodes, focusNode]);
  const mapVlans = useMemo(() => {
    const ids = new Set();
    enrichedNodes.forEach(node => (node.data?.vlans || []).forEach(id => ids.add(id)));
    return [...ids].sort((left, right) => Number(left) - Number(right));
  }, [enrichedNodes]);

  useEffect(() => {
    if (vlanFilter && !mapVlans.includes(vlanFilter)) setVlanFilter("");
  }, [mapVlans, vlanFilter]);

  const hiddenIds = useMemo(() => {
    const hidden = new Set();
    enrichedNodes.forEach(node => {
      const item = catalog.get(inventoryKey(node.data?.kind, node.data?.refId));
      if (siteFilter && node.data?.kind !== "manual" && item && !matchesSiteFilter(item.source, siteFilter)) {
        hidden.add(node.id);
        return;
      }
      const vlans = node.data?.vlans || [];
      if (vlanFilter && vlans.length && !vlans.includes(vlanFilter)) hidden.add(node.id);
    });
    return hidden;
  }, [catalog, enrichedNodes, siteFilter, vlanFilter]);

  const viewNodes = useMemo(() => enrichedNodes.map(node => {
    let className = "";
    if (focusId && impactIds) {
      if (node.id === focusId) className = "impactFocus";
      else if (impactIds.has(node.id)) className = "impactNeighbor";
      else className = "impactDim";
    }
    const separated = Boolean(
      focusNode
      && node.id !== focusId
      && edges.some(edge => (
        (edge.source === focusId && edge.target === node.id) || (edge.target === focusId && edge.source === node.id)
      ))
      && classifyNetworkLink(focusNode, node) === "separated"
    );
    return {
      ...node,
      className,
      hidden: hiddenIds.has(node.id),
      ariaLabel: node.data?.label || "",
      data: { ...node.data, readOnly: !canEdit, separated }
    };
  }), [canEdit, edges, enrichedNodes, focusId, focusNode, hiddenIds, impactIds]);

  const viewEdges = useMemo(() => {
    const byId = new Map(enrichedNodes.map(node => [node.id, node]));
    return edges.map(edge => {
      const hidden = hiddenIds.has(edge.source) || hiddenIds.has(edge.target);
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      const separated = classifyNetworkLink(source, target) === "separated";
      const touches = !focusId || edge.source === focusId || edge.target === focusId;
      let className = "";
      if (separated) className = "impactEdgeSeparated";
      else if (focusId) className = touches ? "impactEdgeFocus" : "impactEdgeDim";
      return { ...edge, hidden, className };
    });
  }, [edges, enrichedNodes, focusId, hiddenIds]);

  const placedKeys = useMemo(() => {
    const keys = new Set();
    nodes.forEach(node => {
      if (node.data?.refId) keys.add(inventoryKey(node.data.kind, node.data.refId));
    });
    return keys;
  }, [nodes]);

  const visibleInventory = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return inventory.filter(item => {
      if (siteFilter && !matchesSiteFilter(item.source, siteFilter)) return false;
      if (!needle) return true;
      const family = resolveFamilyLabel(item.nodeType, item.groupLabel, infraCopy.honeycombTypes);
      return [item.name, item.subtitle, item.location, family, ...(item.vlans || [])].some(value => String(value || "").toLowerCase().includes(needle));
    });
  }, [infraCopy.honeycombTypes, inventory, query, siteFilter]);

  const inventoryGroups = useMemo(() => {
    const groups = new Map();
    visibleInventory.forEach(item => {
      const current = groups.get(item.nodeType) || [];
      current.push(item);
      groups.set(item.nodeType, current);
    });
    const keys = [...groups.keys()].sort((a, b) => {
      const ai = IMPACT_FAMILY_ORDER.indexOf(a);
      const bi = IMPACT_FAMILY_ORDER.indexOf(b);
      const as = ai === -1 ? 999 : ai;
      const bs = bi === -1 ? 999 : bi;
      if (as !== bs) return as - bs;
      const al = resolveFamilyLabel(a, groups.get(a)?.[0]?.groupLabel, infraCopy.honeycombTypes);
      const bl = resolveFamilyLabel(b, groups.get(b)?.[0]?.groupLabel, infraCopy.honeycombTypes);
      return al.localeCompare(bl, locale);
    });
    return keys.map(key => ({
      key,
      label: resolveFamilyLabel(key, groups.get(key)?.[0]?.groupLabel, infraCopy.honeycombTypes),
      items: groups.get(key)
    }));
  }, [infraCopy.honeycombTypes, locale, visibleInventory]);

  const addEquipment = useCallback((item, position) => {
    if (!canEdit || !item) return;
    const key = inventoryKey(item.kind, item.refId);
    if (nodesRef.current.some(node => inventoryKey(node.data?.kind, node.data?.refId) === key)) return;
    const spot = position || placeWithoutOverlap(
      screenToFlowPosition(centerOf(wrapperRef.current)),
      nodesRef.current
    );
    const node = {
      id: newId(),
      type: "impact",
      position: spot,
      data: {
        kind: item.kind,
        refId: item.refId,
        nodeType: item.nodeType,
        label: item.name,
        subtitle: item.subtitle || "",
        icon: resolveImpactIcon(item.nodeType, item.icon),
        missing: false,
        inactive: item.isActive === false,
        groupLabel: item.groupLabel || ""
      }
    };
    setNodes(current => {
      const next = [...current, node];
      nodesRef.current = next;
      return next;
    });
    scheduleSave();
  }, [canEdit, scheduleSave, screenToFlowPosition, setNodes]);

  const addManual = useCallback(typeId => {
    if (!canEdit || !isManualNodeType(typeId)) return;
    const label = copy.manualTypes[typeId] || typeId;
    const same = nodesRef.current.filter(node => node.data?.nodeType === typeId).length;
    const node = {
      id: newId(),
      type: "impact",
      position: placeWithoutOverlap(screenToFlowPosition(centerOf(wrapperRef.current)), nodesRef.current),
      data: {
        kind: "manual",
        refId: null,
        nodeType: typeId,
        label: same ? `${label} ${same + 1}` : label,
        subtitle: "",
        icon: resolveImpactIcon(typeId),
        missing: false,
        inactive: false
      }
    };
    setNodes(current => {
      const next = [...current, node];
      nodesRef.current = next;
      return next;
    });
    scheduleSave();
  }, [canEdit, copy.manualTypes, scheduleSave, screenToFlowPosition, setNodes]);

  const onConnect = useCallback(connection => {
    if (!canEdit || !connection?.source || !connection?.target || connection.source === connection.target) return;
    setEdges(current => {
      if (current.some(edge => edge.source === connection.source && edge.target === connection.target)) return current;
      const next = addEdge({ ...connection, id: newId() }, current);
      edgesRef.current = next;
      return next;
    });
    scheduleSave();
  }, [canEdit, scheduleSave, setEdges]);

  const onDragOver = useCallback(event => {
    if (!canEdit) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, [canEdit]);

  const onDrop = useCallback(event => {
    if (!canEdit) return;
    event.preventDefault();
    const raw = event.dataTransfer.getData("application/veritas-impact") || event.dataTransfer.getData("text/plain");
    if (!raw) return;
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    if (payload.manual) {
      const label = copy.manualTypes[payload.id] || payload.id;
      const same = nodesRef.current.filter(node => node.data?.nodeType === payload.id).length;
      const node = {
        id: newId(),
        type: "impact",
        position: placeWithoutOverlap(position, nodesRef.current),
        data: {
          kind: "manual",
          refId: null,
          nodeType: payload.id,
          label: same ? `${label} ${same + 1}` : label,
          subtitle: "",
          icon: resolveImpactIcon(payload.id),
          missing: false,
          inactive: false
        }
      };
      setNodes(current => {
        const next = [...current, node];
        nodesRef.current = next;
        return next;
      });
      scheduleSave();
      return;
    }
    const item = catalog.get(inventoryKey(payload.kind, payload.refId));
    if (item) addEquipment(item, placeWithoutOverlap(position, nodesRef.current));
  }, [addEquipment, canEdit, catalog, copy.manualTypes, scheduleSave, screenToFlowPosition, setNodes]);

  const renameFocused = event => {
    const value = event.target.value;
    if (!focusId) return;
    setNodes(current => {
      const next = current.map(node => (
        node.id === focusId ? { ...node, data: { ...node.data, label: value } } : node
      ));
      nodesRef.current = next;
      return next;
    });
    scheduleSave();
  };

  const confirmDelete = () => {
    const node = pendingDelete;
    setPendingDelete(null);
    if (!node) return;
    setNodes(current => {
      const next = current.filter(entry => entry.id !== node.id);
      nodesRef.current = next;
      return next;
    });
    setEdges(current => {
      const next = current.filter(edge => edge.source !== node.id && edge.target !== node.id);
      edgesRef.current = next;
      return next;
    });
    scheduleSave();
  };

  const selectNode = id => {
    setNodes(current => current.map(node => ({ ...node, selected: node.id === id })));
    setEdges(current => current.map(edge => ({ ...edge, selected: false })));
  };

  const focused = viewNodes.find(node => node.id === focusId) || null;
  const sameNetwork = focused?.data?.vlans?.length
    ? viewNodes.filter(node => (
      node.id !== focused.id
      && !node.hidden
      && vlansOverlap(focused.data.vlans, node.data?.vlans || [])
    ))
    : [];
  const focusedItem = focused?.data?.refId
    ? catalog.get(inventoryKey(focused.data.kind, focused.data.refId))
    : null;
  const upstream = focused
    ? edges.filter(edge => edge.target === focused.id).map(edge => viewNodes.find(node => node.id === edge.source)).filter(Boolean)
    : [];
  const downstream = focused
    ? edges.filter(edge => edge.source === focused.id).map(edge => viewNodes.find(node => node.id === edge.target)).filter(Boolean)
    : [];
  const linkCount = upstream.length + downstream.length;
  const typeLabel = focused
    ? (focused.data.kind === "manual"
      ? (copy.manualTypes[focused.data.nodeType] || focused.data.nodeType)
      : resolveFamilyLabel(focused.data.nodeType, focused.data.groupLabel, infraCopy.honeycombTypes))
    : "";
  const visibleNodes = viewNodes.filter(node => !node.hidden);
  const visibleCount = visibleNodes.length;
  const typeLabelFor = node => (
    node?.data?.kind === "manual"
      ? (copy.manualTypes[node.data.nodeType] || node.data.nodeType)
      : resolveFamilyLabel(node?.data?.nodeType, node?.data?.groupLabel, infraCopy.honeycombTypes)
  );
  const exportPdf = async () => {
    if (!sheetRef.current || exporting) return;
    setExporting(true);
    try {
      const safeName = String(clientName || "client").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "client";
      await exportBrandedReportPdfFromElement(sheetRef.current, {
        fileName: `cartographie-${safeName}.pdf`,
        orientation: "landscape"
      });
    } catch {
      showError(copy.exportError);
    } finally {
      setExporting(false);
    }
  };
  const showEmpty = !loading && !loadError && nodes.length === 0;
  const showFilteredEmpty = !loading && !loadError && nodes.length > 0 && visibleCount === 0;

  return (
    <div className={styles.host}>
      <div className={styles.viewBar}>
        <div className={styles.viewSwitch} role="tablist" aria-label={copy.viewSwitchAria}>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "analysis"}
            className={`${styles.viewBtn} ${viewMode === "analysis" ? styles.viewBtnActive : ""}`.trim()}
            onClick={() => setViewMode("analysis")}
          >
            <Icon icon="mdi:graph-outline" />
            {copy.viewAnalysis}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "visual"}
            className={`${styles.viewBtn} ${viewMode === "visual" ? styles.viewBtnActive : ""}`.trim()}
            onClick={() => setViewMode("visual")}
          >
            <Icon icon="mdi:view-grid-outline" />
            {copy.viewVisual}
          </button>
        </div>
        {viewMode === "visual" ? (
          <button type="button" className={styles.exportBtn} onClick={exportPdf} disabled={exporting || !visibleCount}>
            <Icon icon={exporting ? "mdi:loading" : "mdi:file-pdf-box"} />
            {exporting ? copy.exportingPdf : copy.exportPdf}
          </button>
        ) : null}
      </div>
      {viewMode === "visual" ? (
        <ImpactVisualMap
          nodes={visibleNodes}
          clientName={clientName}
          copy={copy}
          locale={locale}
          typeLabelFor={typeLabelFor}
          sheetRef={sheetRef}
        />
      ) : null}
      <div className={`${styles.hostBody} ${viewMode === "visual" ? styles.hostBodyHidden : ""}`.trim()}>
      <div className={styles.canvasWrap} ref={wrapperRef} role="application" aria-label={copy.canvasAria}>
        <div className={styles.toolbar}>
          <button type="button" className={styles.toolBtn} aria-label={copy.zoomIn} onClick={() => zoomIn({ duration: 150 })}>
            <Icon icon="mdi:plus" />
          </button>
          <button type="button" className={styles.toolBtn} aria-label={copy.zoomOut} onClick={() => zoomOut({ duration: 150 })}>
            <Icon icon="mdi:minus" />
          </button>
          <button type="button" className={styles.toolBtn} aria-label={copy.fit} onClick={() => fitView({ padding: 0.2, duration: 200 })}>
            <Icon icon="mdi:fit-to-screen-outline" />
          </button>
        </div>
        {!canEdit ? <span className={styles.readOnlyChip}>{copy.readOnly}</span> : null}
        {mapVlans.length ? (
          <div className={styles.vlanBar} role="toolbar" aria-label={copy.vlanFilterAria}>
            <button
              type="button"
              className={`${styles.vlanFilter} ${vlanFilter ? "" : styles.vlanFilterActive}`.trim()}
              onClick={() => setVlanFilter("")}
            >
              {copy.vlanAll}
            </button>
            {mapVlans.map(id => (
              <button
                key={id}
                type="button"
                className={`${styles.vlanFilter} ${vlanFilter === id ? styles.vlanFilterActive : ""}`.trim()}
                style={vlanChipStyle(id)}
                aria-pressed={vlanFilter === id}
                onClick={() => setVlanFilter(current => current === id ? "" : id)}
              >
                VLAN {id}
              </button>
            ))}
          </div>
        ) : null}
        {loading ? <p className={styles.status}>{copy.loading}</p> : null}
        {loadError ? <p className={styles.status}>{loadError}</p> : null}
        {showEmpty ? (
          <div className={styles.empty}>
            <h2>{copy.emptyTitle}</h2>
            <p>{canEdit ? copy.emptyHint : copy.emptyHintReadOnly}</p>
          </div>
        ) : null}
        {showFilteredEmpty ? <p className={styles.status}>{vlanFilter ? interpolate(copy.vlanFilteredEmpty, { vlan: vlanFilter }) : copy.filteredEmpty}</p> : null}
        <ReactFlow
          className={styles.canvas}
          nodes={viewNodes}
          edges={viewEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeDragStop={(_, node) => {
            nodesRef.current = nodesRef.current.map(entry => (
              entry.id === node.id ? { ...entry, position: node.position } : entry
            ));
            scheduleSave();
          }}
          minZoom={0.25}
          maxZoom={1.8}
          connectionMode={ConnectionMode.Loose}
          nodesDraggable={canEdit}
          nodesConnectable={canEdit}
          elementsSelectable
          nodesFocusable
          edgesFocusable
          deleteKeyCode={null}
          selectionKeyCode={null}
          multiSelectionKeyCode={null}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ style: { stroke: "#8aa0bd", strokeWidth: 1.6 }, interactionWidth: 18 }}
          aria-label={copy.canvasAria}
        />
        {focused ? (
          <aside className={styles.inspector} aria-label={focused.data.label}>
            <div className={styles.inspectorHead}>
              <div>
                <h3 className={styles.inspectorTitle}>{focused.data.label || "—"}</h3>
                <p className={styles.inspectorType}>{typeLabel}</p>
              </div>
              {focused.data.missing ? <span className={`${styles.badge} ${styles.badgeMissing}`}>{copy.missing}</span> : null}
              {!focused.data.missing && focused.data.inactive ? <span className={styles.badge}>{copy.inactive}</span> : null}
            </div>
            {focused.data.ha ? (
              <p className={styles.haLine}>
                <ImpactHaBadge ha={focused.data.ha} copy={copy} />
                <span>{haTitle(focused.data.ha, copy)}</span>
              </p>
            ) : null}
            <p className={styles.meta}>{linkCount > 1 ? interpolate(copy.linksMany, { count: linkCount }) : interpolate(copy.linksOne, { count: linkCount })}</p>
            {focused.data.vlans?.length ? (
              <div className={styles.vlanRow}>
                {focused.data.vlans.map(id => (
                  <button key={id} type="button" className={styles.vlanChip} style={vlanChipStyle(id)} onClick={() => setVlanFilter(id)}>
                    VLAN {id}
                  </button>
                ))}
              </div>
            ) : focused.data.kind !== "manual" ? <p className={styles.muted}>{copy.noVlan}</p> : null}
            {sameNetwork.length ? (
              <div className={styles.sameNetwork}>
                <p className={styles.listTitle}>{copy.sameNetwork}</p>
                <p className={styles.muted}>{sameNetwork.length > 1 ? interpolate(copy.sameNetworkMany, { count: sameNetwork.length }) : interpolate(copy.sameNetworkOne, { count: sameNetwork.length })}</p>
                <ul className={styles.list}>
                  {sameNetwork.slice(0, 6).map(node => (
                    <li key={node.id}>
                      <button type="button" className={styles.linkBtn} onClick={() => selectNode(node.id)}>{node.data.label}</button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {canEdit && focused.data.kind === "manual" ? (
              <label className={styles.rename}>
                {copy.renameLabel}
                <input value={focused.data.label || ""} onChange={renameFocused} />
              </label>
            ) : null}
            <div className={styles.lists}>
              <div>
                <p className={styles.listTitle}>{copy.upstream}</p>
                {upstream.length ? (
                  <ul className={styles.list}>
                    {upstream.map(node => (
                      <li key={node.id}>
                        <button type="button" className={styles.linkBtn} onClick={() => selectNode(node.id)}>
                          {node.data.label}
                          {classifyNetworkLink(focused, node) === "separated" ? <span className={styles.separatedMark}>{copy.separated}</span> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : <p className={styles.muted}>{copy.noLinks}</p>}
              </div>
              <div>
                <p className={styles.listTitle}>{copy.downstream}</p>
                {downstream.length ? (
                  <ul className={styles.list}>
                    {downstream.map(node => (
                      <li key={node.id}>
                        <button type="button" className={styles.linkBtn} onClick={() => selectNode(node.id)}>
                          {node.data.label}
                          {classifyNetworkLink(focused, node) === "separated" ? <span className={styles.separatedMark}>{copy.separated}</span> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : <p className={styles.muted}>{copy.noLinks}</p>}
              </div>
            </div>
            <div className={styles.actions}>
              {focusedItem && !focused.data.missing ? (
                <button type="button" className={styles.textBtn} onClick={() => onNavigate?.("EquipmentDetail", focusedItem.source)}>
                  {copy.openEquipment}
                </button>
              ) : null}
              {canEdit ? (
                <button type="button" className={styles.dangerBtn} onClick={() => setPendingDelete(focused)}>
                  {copy.deleteNode}
                </button>
              ) : null}
            </div>
          </aside>
        ) : null}
        {selectedEdge && canEdit ? (
          <button
            type="button"
            className={styles.edgeDelete}
            style={{ position: "absolute", zIndex: 5, left: 12, bottom: 12 }}
            onClick={() => {
              setEdges(current => {
                const next = current.filter(edge => edge.id !== selectedEdge.id);
                edgesRef.current = next;
                return next;
              });
              scheduleSave();
            }}
          >
            <Icon icon="mdi:link-variant-off" />
            {copy.deleteEdge}
          </button>
        ) : null}
      </div>
      {canEdit ? (
        <aside className={styles.palette} aria-label={copy.addTitle}>
          <div className={styles.paletteHead}>
            <h2>{copy.addTitle}</h2>
            <input
              className={styles.search}
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              aria-label={copy.searchAria}
            />
          </div>
          <div className={styles.paletteBody}>
            {inventoryError ? <p className={styles.paletteHint}>{copy.inventoryError}</p> : null}
            <p className={styles.groupTitle}>{copy.inventory}</p>
            {inventoryGroups.map(group => (
              <section key={group.key} className={styles.group} aria-label={group.label}>
                <h3 className={styles.groupTitle}>{group.label}</h3>
                {group.items.map(item => {
                  const placed = placedKeys.has(inventoryKey(item.kind, item.refId));
                  const ha = haIndex.get(inventoryKey(item.kind, item.refId));
                  return (
                    <button
                      key={inventoryKey(item.kind, item.refId)}
                      type="button"
                      className={styles.item}
                      draggable={!placed}
                      disabled={placed}
                      title={placed ? copy.placed : item.name}
                      onClick={() => addEquipment(item)}
                      onDragStart={event => {
                        const payload = JSON.stringify({ kind: item.kind, refId: item.refId });
                        event.dataTransfer.setData("application/veritas-impact", payload);
                        event.dataTransfer.setData("text/plain", payload);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                    >
                      <Icon icon={resolveImpactIcon(item.nodeType, item.icon)} className={styles.itemIcon} />
                      <span className={styles.itemText}>
                        <span className={styles.itemName}>{item.name}</span>
                        <span className={styles.itemMeta}>
                          {placed ? copy.placed : [item.subtitle, item.vlans?.length ? `VLAN ${item.vlans.join(", ")}` : "", item.subtitle || item.vlans?.length ? "" : (item.location || group.label)].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      {ha ? <ImpactHaBadge ha={ha} copy={copy} /> : null}
                    </button>
                  );
                })}
              </section>
            ))}
            <section className={styles.group}>
              <h3 className={styles.groupTitle}>{copy.manual}</h3>
              {MANUAL_NODE_TYPES.map(type => (
                <button
                  key={type.id}
                  type="button"
                  className={styles.item}
                  draggable
                  onClick={() => addManual(type.id)}
                  onDragStart={event => {
                    const payload = JSON.stringify({ manual: true, id: type.id });
                    event.dataTransfer.setData("application/veritas-impact", payload);
                    event.dataTransfer.setData("text/plain", payload);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                >
                  <Icon icon={type.icon} className={styles.itemIcon} />
                  <span className={styles.itemName}>{copy.manualTypes[type.id]}</span>
                </button>
              ))}
            </section>
          </div>
        </aside>
      ) : null}
      </div>
      <ConfirmModal
        open={Boolean(pendingDelete)}
        title={copy.confirmDeleteTitle}
        message={interpolate(copy.confirmDeleteMessage, { name: pendingDelete?.data?.label || "" })}
        confirmLabel={copy.deleteNode}
        variant="danger"
        icon="mdi:delete-outline"
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function centerOf(element) {
  const bounds = element?.getBoundingClientRect();
  if (!bounds) return { x: 320, y: 220 };
  return {
    x: bounds.left + Math.min(bounds.width * 0.38, bounds.width - 40),
    y: bounds.top + bounds.height * 0.42
  };
}

export default function ImpactMapPanel(props) {
  return (
    <ReactFlowProvider>
      <ImpactMapCanvas {...props} />
    </ReactFlowProvider>
  );
}
