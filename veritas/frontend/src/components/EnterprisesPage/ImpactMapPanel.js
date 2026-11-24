import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  ConnectionMode,
  SelectionMode,
  addEdge,
  useEdgesState,
  NodeResizer,
  useNodesState,
  useReactFlow
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Icon } from "@iconify/react";
import { useAppLocale } from "../../hooks/useAppLocale";
import { interpolate } from "../../i18n/translate";
import { getClientImpactMap, saveClientImpactMap } from "../../api/impactMap";
import { getEquipmentInventoryList, getClientHardwareEquipment, getEquipmentMonitoringSummaries } from "../../api/equipment";
import { fetchSupervisionAlertsActive } from "../../api/supervisionAlerts";
import { fetchClientCustomEquipment } from "../../api/clients";
import { getInfraMapCopy } from "./infraMapI18n";
import { matchesSiteFilter } from "../../utils/siteFilterUtils";
import { buildSiteAddress, getSiteDisplayName, getSiteId, normalizeClientSites } from "../../utils/clientSites";
import ImpactElementDialog from "./ImpactElementDialog";
import ConfirmModal from "../Misc/ConfirmModal/ConfirmModal";
import { showError } from "../../utils/toast";
import ImpactVisualMap from "./ImpactVisualMap";
import {
  captureAnalysisCanvas,
  captureVisualStage,
  downloadCanvasPdf,
  downloadCanvasPng,
  impactFileSlug
} from "./impactMapExport";
import ImpactHaBadge, { haTitle } from "./ImpactHaBadge";
import ImpactStatusMarks from "./ImpactStatusMarks";
import { rememberSupervisionFocus } from "./supervisionFocus";
import { buildSignalIndex, describeImpact, suggestImpactLinks } from "./impactSignals";
import { getImpactMapCopy } from "./impactMapI18n";
import { arrangeSelection } from "./impactArrange";
import {
  GROUP_COLORS,
  IMPACT_FAMILY_ORDER,
  MANUAL_NODE_TYPES,
  buildHaIndex,
  classifyNetworkLink,
  collectImpactIds,
  flowEdgeFromRecord,
  flowNodeFromRecord,
  inventoryKey,
  isManualNodeType,
  nodesInsideGroup,
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
      <span
        className={styles.nodeIcon}
        aria-hidden
        title={data.serverForm === "virtuel" ? copy.serverVirtual : data.serverForm === "physique" ? copy.serverPhysical : undefined}
      >
        {data.photo ? <img src={data.photo} alt="" className={styles.nodePhoto} /> : <Icon icon={data.icon || "mdi:devices"} />}
        {data.agent ? <ImpactStatusMarks agent={data.agent} copy={copy} pinAgent /> : null}
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
      <ImpactStatusMarks
        supervision={data.supervision}
        backups={data.backups}
        copy={copy}
        onOpenAlert={data.onOpenAlert}
      />
      {data.ha ? <ImpactHaBadge ha={data.ha} copy={copy} /> : null}
      {!data.readOnly ? <Handle type="source" position={Position.Right} className={styles.handle} isConnectable /> : null}
    </div>
  );
});

function groupFill(color) {
  const hex = String(color || "#5b7cfa").replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return "rgba(91, 124, 250, 0.16)";
  return `rgba(${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(hex.slice(4, 6), 16)}, 0.16)`;
}

const ImpactGroupNode = memo(function ImpactGroupNode({ data, selected }) {
  const color = data.color || "#5b7cfa";
  return (
    <div
      className={`${styles.groupBox} ${selected ? styles.groupBoxSelected : ""}`.trim()}
      style={{ background: groupFill(color), borderColor: color }}
    >
      <NodeResizer
        isVisible={selected && !data.readOnly}
        minWidth={160}
        minHeight={110}
        lineClassName={styles.groupResizeLine}
        handleClassName={styles.groupResizeHandle}
        onResizeEnd={(_, params) => data.onResize?.(params)}
      />
      <div className={styles.groupLabel}>
        <Icon icon="mdi:folder-multiple-outline" />
        <span>{data.label}</span>
      </div>
    </div>
  );
});

const nodeTypes = { impact: ImpactNode, impactGroup: ImpactGroupNode };

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

function enrichNode(node, catalog, inventoryReady, haIndex, signals) {
  if (node.data?.kind === "manual") {
    const description = node.data.description || "";
    return {
      ...node,
      data: {
        ...node.data,
        icon: resolveImpactIcon(node.data.nodeType),
        missing: node.data.missing === true,
        inactive: false,
        subtitle: node.data.nodeType === "application" ? description : (node.data.subtitle || ""),
        description,
        vlans: [],
        ha: null,
        location: node.data.nodeType === "site" ? (node.data.label || "") : "",
        hostServerName: "",
        gateway: "",
        supervision: null,
        agent: null,
        backups: []
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
        ha: null,
        location: "",
        supervision: null,
        agent: null,
        backups: [],
        serverForm: ""
      }
    };
  }
  return {
    ...node,
    data: {
      ...node.data,
      label: item.name || node.data.label,
      subtitle: item.subtitle || "",
      icon: resolveImpactIcon(node.data.nodeType, item.icon, item.serverForm),
      serverForm: item.serverForm || "",
      missing: false,
      inactive: item.isActive === false,
      groupLabel: item.groupLabel || node.data.groupLabel || "",
      vlans: item.vlans || [],
      location: item.location || "",
      hostServerName: item.hostServerName || "",
      gateway: item.gateway || "",
      ha: haIndex?.get(inventoryKey(node.data?.kind, node.data?.refId)) || null,
      supervision: signals?.get(inventoryKey(node.data?.kind, node.data?.refId))?.supervision || null,
      agent: signals?.get(inventoryKey(node.data?.kind, node.data?.refId))?.agent || null,
      backups: signals?.get(inventoryKey(node.data?.kind, node.data?.refId))?.backups || []
    }
  };
}

function ImpactMapCanvas({
  clientId,
  clientName = "",
  active = true,
  canEdit = false,
  siteFilter = null,
  backupJobs = [],
  sites = [],
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
  const [alerts, setAlerts] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [dismissedSuggestions, setDismissedSuggestions] = useState(() => new Set());
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
  const [drawing, setDrawing] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const hostRef = useRef(null);
  const [drawBox, setDrawBox] = useState(null);
  const [composer, setComposer] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const drawRef = useRef(null);
  const siteOptions = useMemo(() => normalizeClientSites(sites).map(site => ({
    id: String(getSiteId(site)),
    name: getSiteDisplayName(site),
    address: buildSiteAddress(site)
  })), [sites]);

  useEffect(() => {
    if (!composer?.photoError) return;
    showError(copy.dialogPhotoError);
    setComposer(current => (current ? { ...current, photoError: false } : current));
  }, [composer, copy.dialogPhotoError]);

  useEffect(() => {
    if (viewMode === "analysis") return;
    setDrawing(false);
    setDrawBox(null);
    drawRef.current = null;
    setComposer(null);
    setContextMenu(null);
  }, [viewMode]);

  useEffect(() => {
    if (!contextMenu) return undefined;
    const close = event => {
      if (event.target?.closest?.(`.${styles.contextMenu}`)) return;
      setContextMenu(null);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [contextMenu]);

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
    if (!active || !clientId) return undefined;
    const controller = new AbortController();
    fetchSupervisionAlertsActive({ signal: controller.signal })
      .then(rows => {
        if (!controller.signal.aborted) setAlerts(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setAlerts([]);
      });
    getEquipmentMonitoringSummaries({ clientId }, { signal: controller.signal })
      .then(data => {
        if (!controller.signal.aborted) setSummaries(data?.summaries || {});
      })
      .catch(() => {
        if (!controller.signal.aborted) setSummaries({});
      });
    return () => controller.abort();
  }, [active, clientId]);

  const openSupervision = useCallback(supervision => {
    rememberSupervisionFocus({
      query: supervision?.equipmentName || supervision?.title || "",
      alertId: supervision?.alertId || ""
    });
    if (typeof onNavigate === "function") onNavigate("Equipment");
  }, [onNavigate]);

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
    const sync = () => {
      if (document.fullscreenElement === hostRef.current) setFullscreen(true);
    };
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggleFullscreen = () => {
    const node = hostRef.current;
    const active = fullscreen || document.fullscreenElement === node;
    if (active) {
      setFullscreen(false);
      if (document.fullscreenElement === node) document.exitFullscreen?.().catch(() => {});
      return;
    }
    setFullscreen(true);
    node?.requestFullscreen?.().catch(() => {});
  };

  const skipFullscreenFit = useRef(true);
  useEffect(() => {
    if (skipFullscreenFit.current) {
      skipFullscreenFit.current = false;
      return undefined;
    }
    const timer = window.setTimeout(() => fitViewRef.current?.({ padding: 0.2, duration: 200 }), 80);
    return () => window.clearTimeout(timer);
  }, [fullscreen]);

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
        setFullscreen(false);
        if (document.fullscreenElement === hostRef.current) document.exitFullscreen?.().catch(() => {});
        setDrawing(false);
        setDrawBox(null);
        drawRef.current = null;
        setComposer(null);
        setPendingDelete(null);
        setContextMenu(null);
        setNodes(current => current.map(node => (node.selected ? { ...node, selected: false } : node)));
        setEdges(current => current.map(edge => (edge.selected ? { ...edge, selected: false } : edge)));
        return;
      }
      if (!canEdit || pendingDelete) return;
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable) return;
      const selectedEdgeIds = edgesRef.current.filter(edge => edge.selected).map(edge => edge.id);
      const selectedNode = nodesRef.current.find(node => node.selected);
      if (selectedEdgeIds.length) {
        event.preventDefault();
        const drop = new Set(selectedEdgeIds);
        setEdges(current => {
          const next = current.filter(edge => !drop.has(edge.id));
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
    const onModifier = event => {
      if (event.key !== "Control") return;
      wrapperRef.current?.classList.toggle(styles.multiKey, event.type === "keydown");
    };
    const clearModifier = () => wrapperRef.current?.classList.remove(styles.multiKey);
    window.addEventListener("keydown", onModifier);
    window.addEventListener("keyup", onModifier);
    window.addEventListener("blur", clearModifier);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keydown", onModifier);
      window.removeEventListener("keyup", onModifier);
      window.removeEventListener("blur", clearModifier);
    };
  }, [active, canEdit, flushSave, pendingDelete, scheduleSave, setEdges, setNodes]);

  const selectedCount = nodes.reduce((count, node) => count + (node.selected ? 1 : 0), 0);
  const focusId = selectedCount === 1 ? nodes.find(node => node.selected)?.id || null : null;
  const selectedEdges = edges.filter(edge => edge.selected);
  const haIndex = useMemo(() => buildHaIndex(inventory), [inventory]);
  const signalIndex = useMemo(
    () => buildSignalIndex(inventory, alerts, summaries, backupJobs),
    [alerts, backupJobs, inventory, summaries]
  );
  const enrichedNodes = useMemo(
    () => nodes.map(node => {
      const enriched = enrichNode(node, catalog, inventoryReady, haIndex, signalIndex);
      if (enriched.data?.nodeType !== "site" || !enriched.data.siteId) return enriched;
      const site = siteOptions.find(entry => entry.id === String(enriched.data.siteId));
      if (!site) return { ...enriched, data: { ...enriched.data, missing: true } };
      return {
        ...enriched,
        data: { ...enriched.data, label: site.name, subtitle: site.address, missing: false }
      };
    }),
    [catalog, haIndex, inventoryReady, nodes, signalIndex, siteOptions]
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
    if (focusNode.data?.nodeType === "group") {
      nodesInsideGroup(focusNode, enrichedNodes).forEach(node => ids.add(node.id));
    } else {
      enrichedNodes.forEach(node => {
        if (node.data?.nodeType === "group" && nodesInsideGroup(node, [focusNode]).length) ids.add(node.id);
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
      if (siteFilter && node.data?.nodeType === "site" && node.data.label && node.data.label !== siteFilter) {
        hidden.add(node.id);
        return;
      }
      if (siteFilter && node.data?.kind !== "manual" && item && !matchesSiteFilter(item.source, siteFilter)) {
        hidden.add(node.id);
        return;
      }
      const vlans = node.data?.vlans || [];
      if (vlanFilter && vlans.length && !vlans.includes(vlanFilter)) hidden.add(node.id);
    });
    return hidden;
  }, [catalog, enrichedNodes, siteFilter, vlanFilter]);

  const resizeGroup = useCallback((id, params) => {
    if (!params) return;
    setNodes(current => {
      const next = current.map(node => (
        node.id === id
          ? {
            ...node,
            position: { x: params.x, y: params.y },
            width: params.width,
            height: params.height,
            style: { ...(node.style || {}), width: params.width, height: params.height },
            data: { ...node.data, width: params.width, height: params.height }
          }
          : node
      ));
      nodesRef.current = next;
      return next;
    });
    scheduleSave();
  }, [scheduleSave, setNodes]);

  const openEditor = useCallback(node => {
    if (!canEdit || node?.data?.kind !== "manual") return;
    setDrawing(false);
    setComposer({
      mode: "edit",
      nodeId: node.id,
      nodeType: node.data.nodeType,
      name: node.data.label || "",
      color: node.data.color || "#5b7cfa",
      description: node.data.description || "",
      siteId: node.data.siteId || "",
      photo: node.data.photo || "",
      geometry: null
    });
  }, [canEdit]);

  const viewNodes = useMemo(() => {
    const groups = enrichedNodes.filter(node => node.data?.nodeType === "group");
    return enrichedNodes.map(node => {
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
      const container = node.data?.nodeType === "group"
        ? null
        : groups.find(group => nodesInsideGroup(group, [node]).length) || null;
      return {
        ...node,
        className: className ? `${className} nokey` : "nokey",
        zIndex: node.data?.nodeType === "group" ? 0 : 2,
        hidden: hiddenIds.has(node.id),
        ariaLabel: node.data?.label || "",
        data: {
          ...node.data,
          readOnly: !canEdit,
          separated,
          onOpenAlert: openSupervision,
          onResize: params => resizeGroup(node.id, params),
          containerGroup: container ? { label: container.data?.label || "", color: container.data?.color || "" } : null
        }
      };
    });
  }, [canEdit, edges, enrichedNodes, focusId, focusNode, hiddenIds, impactIds, openSupervision, resizeGroup]);

  const viewEdges = useMemo(() => {
    const byId = new Map(enrichedNodes.map(node => [node.id, node]));
    return edges.map(edge => {
      const hidden = hiddenIds.has(edge.source) || hiddenIds.has(edge.target);
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      const separated = classifyNetworkLink(source, target) === "separated";
      const touches = !focusId || edge.source === focusId || edge.target === focusId;
      let className = "";
      let style = { fill: "none", stroke: "#b1b1b7", strokeWidth: 1.5 };
      if (separated) {
        className = "impactEdgeSeparated";
        style = { fill: "none", stroke: "#b45309", strokeWidth: 1.8, strokeDasharray: "5 4" };
      } else if (focusId && touches) {
        className = "impactEdgeFocus";
        style = { fill: "none", stroke: "#2b5fab", strokeWidth: 2.2 };
      } else if (focusId) {
        style = { fill: "none", stroke: "#b1b1b7", strokeWidth: 1.5, opacity: 0.16 };
      }
      return { ...edge, hidden, className: className ? `${className} nokey` : "nokey", style };
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
        icon: resolveImpactIcon(item.nodeType, item.icon, item.serverForm),
        serverForm: item.serverForm || "",
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

  const beginManual = useCallback((typeId, position) => {
    if (!canEdit || !isManualNodeType(typeId)) return;
    if (typeId === "group" && !position) {
      setComposer(null);
      setDrawing(current => !current);
      return;
    }
    const same = nodesRef.current.filter(node => node.data?.nodeType === typeId).length;
    const base = copy.manualTypes[typeId] || typeId;
    const spot = position || placeWithoutOverlap(
      screenToFlowPosition(centerOf(wrapperRef.current)),
      nodesRef.current
    );
    setDrawing(false);
    setComposer({
      mode: "create",
      nodeId: null,
      nodeType: typeId,
      name: typeId === "group" || typeId === "application" ? "" : (same ? `${base} ${same + 1}` : base),
      color: GROUP_COLORS[same % GROUP_COLORS.length],
      description: "",
      siteId: typeId === "site" && siteOptions.length === 1 ? siteOptions[0].id : "",
      photo: "",
      geometry: { x: spot.x, y: spot.y, width: 420, height: 240 }
    });
  }, [canEdit, copy.manualTypes, screenToFlowPosition, siteOptions]);

  const commitComposer = useCallback(() => {
    const draft = composer;
    if (!draft) return;
    let fields = null;
    if (draft.nodeType === "site") {
      const site = siteOptions.find(entry => entry.id === draft.siteId);
      if (!site) return;
      fields = { label: site.name, subtitle: site.address, description: "", siteId: site.id, photo: "", color: "" };
    } else {
      const label = String(draft.name || "").trim();
      if (!label) return;
      const description = draft.nodeType === "application" ? String(draft.description || "").trim() : "";
      fields = {
        label,
        subtitle: description,
        description,
        siteId: "",
        photo: draft.nodeType === "rack" ? (draft.photo || "") : "",
        color: draft.nodeType === "group" ? (draft.color || "#5b7cfa") : ""
      };
    }
    if (draft.mode === "edit" && draft.nodeId) {
      setNodes(current => {
        const next = current.map(node => (
          node.id === draft.nodeId ? { ...node, data: { ...node.data, ...fields } } : node
        ));
        nodesRef.current = next;
        return next;
      });
    } else {
      const isGroup = draft.nodeType === "group";
      const width = Math.max(160, Number(draft.geometry?.width) || 420);
      const height = Math.max(110, Number(draft.geometry?.height) || 240);
      const node = {
        id: newId(),
        type: isGroup ? "impactGroup" : "impact",
        position: { x: Number(draft.geometry?.x) || 80, y: Number(draft.geometry?.y) || 80 },
        selected: true,
        ...(isGroup ? { width, height, style: { width, height }, zIndex: 0, connectable: false } : {}),
        data: {
          kind: "manual",
          refId: null,
          nodeType: draft.nodeType,
          icon: resolveImpactIcon(draft.nodeType),
          missing: false,
          inactive: false,
          width: isGroup ? width : undefined,
          height: isGroup ? height : undefined,
          ...fields
        }
      };
      setNodes(current => {
        const next = [...current.map(entry => ({ ...entry, selected: false })), node];
        nodesRef.current = next;
        return next;
      });
    }
    setComposer(null);
    scheduleSave();
  }, [composer, scheduleSave, setNodes, siteOptions]);

  const onDrawDown = event => {
    if (event.button !== 0) return;
    const bounds = wrapperRef.current?.getBoundingClientRect();
    if (!bounds) return;
    drawRef.current = { startX: event.clientX, startY: event.clientY, bounds };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrawBox({
      left: event.clientX - bounds.left,
      top: event.clientY - bounds.top,
      width: 0,
      height: 0
    });
  };

  const onDrawMove = event => {
    const drag = drawRef.current;
    if (!drag) return;
    setDrawBox({
      left: Math.min(drag.startX, event.clientX) - drag.bounds.left,
      top: Math.min(drag.startY, event.clientY) - drag.bounds.top,
      width: Math.abs(event.clientX - drag.startX),
      height: Math.abs(event.clientY - drag.startY)
    });
  };

  const onDrawUp = event => {
    const drag = drawRef.current;
    drawRef.current = null;
    setDrawBox(null);
    if (!drag) return;
    if (Math.abs(event.clientX - drag.startX) < 36 || Math.abs(event.clientY - drag.startY) < 36) return;
    const origin = screenToFlowPosition({
      x: Math.min(drag.startX, event.clientX),
      y: Math.min(drag.startY, event.clientY)
    });
    const end = screenToFlowPosition({
      x: Math.max(drag.startX, event.clientX),
      y: Math.max(drag.startY, event.clientY)
    });
    const same = nodesRef.current.filter(node => node.data?.nodeType === "group").length;
    const color = GROUP_COLORS[same % GROUP_COLORS.length];
    const width = Math.max(160, end.x - origin.x);
    const height = Math.max(110, end.y - origin.y);
    const id = newId();
    const label = same ? `${copy.manualTypes.group} ${same + 1}` : copy.manualTypes.group;
    const node = {
      id,
      type: "impactGroup",
      position: { x: origin.x, y: origin.y },
      selected: true,
      width,
      height,
      style: { width, height },
      zIndex: 0,
      connectable: false,
      data: {
        kind: "manual",
        refId: null,
        nodeType: "group",
        label,
        subtitle: "",
        description: "",
        color,
        siteId: "",
        photo: "",
        icon: resolveImpactIcon("group"),
        missing: false,
        inactive: false,
        width,
        height
      }
    };
    setNodes(current => {
      const next = [...current.map(entry => ({ ...entry, selected: false })), node];
      nodesRef.current = next;
      return next;
    });
    setDrawing(false);
    setComposer({
      mode: "edit",
      nodeId: id,
      nodeType: "group",
      name: "",
      color,
      description: "",
      siteId: "",
      photo: "",
      geometry: null
    });
    scheduleSave();
  };

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
      beginManual(payload.id, placeWithoutOverlap(position, nodesRef.current));
      return;
    }
    const item = catalog.get(inventoryKey(payload.kind, payload.refId));
    if (item) addEquipment(item, placeWithoutOverlap(position, nodesRef.current));
  }, [addEquipment, beginManual, canEdit, catalog, screenToFlowPosition]);

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
  const groupMembers = focused?.data?.nodeType === "group"
    ? nodesInsideGroup(focused, viewNodes.filter(node => !node.hidden && node.data?.nodeType !== "group"))
    : [];
  const groupAlerts = groupMembers.filter(node => node.data?.supervision && node.data.supervision.level !== "ok").length;
  const groupImpactText = focused?.data?.nodeType === "group"
    ? [
      groupMembers.length > 1
        ? interpolate(copy.groupMembersMany, { count: groupMembers.length })
        : interpolate(copy.groupMembersOne, { count: groupMembers.length }),
      groupAlerts ? interpolate(copy.groupAlerts, { count: groupAlerts }) : ""
    ].filter(Boolean).join(" · ")
    : "";
  const typeLabel = focused
    ? (focused.data.kind === "manual"
      ? (copy.manualTypes[focused.data.nodeType] || focused.data.nodeType)
      : resolveFamilyLabel(focused.data.nodeType, focused.data.groupLabel, infraCopy.honeycombTypes))
    : "";
  const visibleNodes = viewNodes.filter(node => !node.hidden);
  const visibleCount = visibleNodes.length;
  const impactInfo = describeImpact(focused, viewNodes, impactIds);
  const suggestions = useMemo(() => {
    if (!canEdit) return [];
    return suggestImpactLinks(viewNodes, edges).filter(item => !dismissedSuggestions.has(item.id));
  }, [canEdit, dismissedSuggestions, edges, viewNodes]);
  const suggestionText = item => {
    const values = { source: item.sourceLabel, target: item.targetLabel };
    if (item.kind === "host") return interpolate(copy.suggestHost, values);
    if (item.kind === "gateway") return interpolate(copy.suggestGateway, values);
    return interpolate(copy.suggestHa, values);
  };
  const impactText = (() => {
    if (!impactInfo) return "";
    let base = copy.impactSummaryNone;
    if (impactInfo.count) {
      const key = impactInfo.vlan
        ? (impactInfo.count > 1 ? copy.impactSummaryVlanMany : copy.impactSummaryVlanOne)
        : (impactInfo.count > 1 ? copy.impactSummaryPlainMany : copy.impactSummaryPlainOne);
      base = interpolate(key, { count: impactInfo.count, vlan: impactInfo.vlan });
    }
    if (impactInfo.backup === "safe") return `${base}, ${copy.impactBackupSafe}`;
    if (impactInfo.backup === "hit") return `${base}, ${copy.impactBackupHit}`;
    return base;
  })();
  const typeLabelFor = node => (
    node?.data?.kind === "manual"
      ? (copy.manualTypes[node.data.nodeType] || node.data.nodeType)
      : resolveFamilyLabel(node?.data?.nodeType, node?.data?.groupLabel, infraCopy.honeycombTypes)
  );
  const exportableCount = viewMode === "visual"
    ? visibleNodes.filter(node => node.data?.nodeType !== "group").length
    : visibleCount;
  const exportView = async format => {
    if (exporting || !exportableCount) return;
    setExporting(format);
    try {
      const slug = impactFileSlug(clientName);
      const kind = viewMode === "visual" ? "cartographie" : "analyse-impact";
      const canvas = viewMode === "visual"
        ? await captureVisualStage(sheetRef.current)
        : await captureAnalysisCanvas(wrapperRef.current, viewNodes);
      const fileBase = `${kind}-${slug}`;
      if (format === "pdf") {
        downloadCanvasPdf(canvas, {
          fileName: `${fileBase}.pdf`,
          title: viewMode === "visual" ? copy.visualKicker : copy.viewAnalysis,
          subtitle: [clientName, new Date().toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" })].filter(Boolean).join(" · ")
        });
      } else {
        downloadCanvasPng(canvas, `${fileBase}.png`);
      }
    } catch {
      showError(copy.exportError);
    } finally {
      setExporting(false);
    }
  };
  const arrangeCount = viewNodes.filter(node => node.selected && !node.hidden).length;
  const openContextMenu = (event, node) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canEdit || drawing) return;
    if (node && !node.selected) {
      setNodes(current => {
        const next = current.map(entry => ({ ...entry, selected: entry.id === node.id }));
        nodesRef.current = next;
        return next;
      });
    }
    const width = 248;
    const height = 268;
    setContextMenu({
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - width - 8)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - height - 8)),
      edgeId: ""
    });
  };
  const openEdgeMenu = (event, edge) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canEdit || drawing || !edge) return;
    setEdges(current => {
      const next = current.map(entry => ({ ...entry, selected: entry.id === edge.id }));
      edgesRef.current = next;
      return next;
    });
    setContextMenu({
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 248 - 8)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 120 - 8)),
      edgeId: edge.id
    });
  };
  const removeEdges = ids => {
    const drop = new Set(ids);
    if (!drop.size) return;
    setEdges(current => {
      const next = current.filter(edge => !drop.has(edge.id));
      edgesRef.current = next;
      return next;
    });
    scheduleSave();
    setContextMenu(null);
  };
  const selectionIds = new Set(viewNodes.filter(node => node.selected && !node.hidden).map(node => node.id));
  viewNodes.forEach(node => {
    if (node.data?.nodeType !== "group" || !selectionIds.has(node.id)) return;
    nodesInsideGroup(node, viewNodes.filter(entry => !entry.hidden && entry.data?.nodeType !== "group"))
      .forEach(entry => selectionIds.add(entry.id));
  });
  const selectionEdgeIds = edges
    .filter(edge => !edge.hidden && (selectionIds.has(edge.source) || selectionIds.has(edge.target)))
    .map(edge => edge.id);
  const arrangeSelected = mode => {
    const selected = viewNodes.filter(node => node.selected && !node.hidden);
    const positions = arrangeSelection(selected, mode);
    if (!positions.size) return;
    setNodes(current => {
      const next = current.map(node => (
        positions.has(node.id) ? { ...node, position: positions.get(node.id) } : node
      ));
      nodesRef.current = next;
      return next;
    });
    scheduleSave();
    setContextMenu(null);
  };
  const showEmpty = !loading && !loadError && nodes.length === 0;
  const showFilteredEmpty = !loading && !loadError && nodes.length > 0 && visibleCount === 0;

  const workspace = (
    <div className={`${styles.host} ${fullscreen ? styles.hostFullscreen : ""}`.trim()} ref={hostRef}>
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
            <Icon icon="mdi:hub" />
            {copy.viewVisual}
          </button>
        </div>
        <div className={styles.exportGroup} role="group" aria-label={copy.exportAria}>
          <button
            type="button"
            className={styles.exportBtn}
            title={copy.exportPngTitle}
            onClick={() => exportView("png")}
            disabled={Boolean(exporting) || !exportableCount}
          >
            <Icon icon={exporting === "png" ? "mdi:loading" : "mdi:file-png-box"} />
            {exporting === "png" ? copy.exporting : copy.exportPng}
          </button>
          <button
            type="button"
            className={`${styles.exportBtn} ${styles.exportBtnPdf}`.trim()}
            title={copy.exportPdfTitle}
            onClick={() => exportView("pdf")}
            disabled={Boolean(exporting) || !exportableCount}
          >
            <Icon icon={exporting === "pdf" ? "mdi:loading" : "mdi:file-pdf-box"} />
            {exporting === "pdf" ? copy.exporting : copy.exportPdf}
          </button>
        </div>
      </div>
      {viewMode === "analysis" && suggestions.length ? (
        <div className={styles.suggestBar}>
          <p className={styles.suggestTitle}>{copy.suggestTitle}</p>
          <ul className={styles.suggestList}>
            {suggestions.slice(0, 4).map(item => (
              <li key={item.id}>
                <span>{suggestionText(item)}</span>
                <button type="button" className={styles.suggestAccept} onClick={() => onConnect({ source: item.sourceId, target: item.targetId })}>
                  {copy.suggestAccept}
                </button>
                <button
                  type="button"
                  className={styles.suggestDismiss}
                  onClick={() => setDismissedSuggestions(current => {
                    const next = new Set(current);
                    next.add(item.id);
                    return next;
                  })}
                >
                  {copy.suggestDismiss}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {viewMode === "visual" ? (
        <ImpactVisualMap
          nodes={visibleNodes}
          edges={viewEdges}
          clientName={clientName}
          copy={copy}
          locale={locale}
          typeLabelFor={typeLabelFor}
          onOpenAlert={openSupervision}
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
          <button
            type="button"
            className={`${styles.toolBtn} ${fullscreen ? styles.toolBtnActive : ""}`.trim()}
            aria-label={fullscreen ? copy.fullscreenExit : copy.fullscreen}
            aria-pressed={fullscreen}
            title={fullscreen ? copy.fullscreenExit : copy.fullscreen}
            onClick={toggleFullscreen}
          >
            <Icon icon={fullscreen ? "mdi:fullscreen-exit" : "mdi:fullscreen"} />
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
          onNodeDoubleClick={(_, node) => openEditor(node)}
          onNodeContextMenu={(event, node) => openContextMenu(event, node)}
          onEdgeContextMenu={(event, edge) => openEdgeMenu(event, edge)}
          onPaneContextMenu={event => openContextMenu(event)}
          onPaneClick={event => {
            if (event?.button === 2) return;
            setContextMenu(null);
          }}
          onMoveStart={() => setContextMenu(null)}
          onNodeDragStop={(_, __, dragged) => {
            const moved = new Map((Array.isArray(dragged) ? dragged : []).map(node => [node.id, node.position]));
            if (!moved.size) return;
            nodesRef.current = nodesRef.current.map(entry => (
              moved.has(entry.id) ? { ...entry, position: moved.get(entry.id) } : entry
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
          selectionKeyCode="Control"
          multiSelectionKeyCode="Control"
          selectionMode={SelectionMode.Partial}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ style: { stroke: "#8aa0bd", strokeWidth: 1.6 }, interactionWidth: 18 }}
          aria-label={copy.canvasAria}
        />
        {contextMenu && canEdit ? (
          <div
            className={styles.contextMenu}
            style={{ left: contextMenu.x, top: contextMenu.y }}
            role="menu"
            aria-label={copy.contextAria}
            onContextMenu={event => event.preventDefault()}
          >
            {contextMenu.edgeId ? null : (
              <>
                <p className={styles.contextLabel}>{copy.arrangeAlign}</p>
                <button type="button" role="menuitem" className={styles.contextItem} disabled={arrangeCount < 2} onClick={() => arrangeSelected("horizontal")}>
                  <Icon icon="mdi:align-horizontal-center" />
                  {copy.arrangeHorizontal}
                </button>
                <button type="button" role="menuitem" className={styles.contextItem} disabled={arrangeCount < 2} onClick={() => arrangeSelected("vertical")}>
                  <Icon icon="mdi:align-vertical-center" />
                  {copy.arrangeVertical}
                </button>
                <p className={styles.contextLabel}>{copy.arrangePatterns}</p>
                <button type="button" role="menuitem" className={styles.contextItem} disabled={arrangeCount < 2} onClick={() => arrangeSelected("grid")}>
                  <Icon icon="mdi:grid" />
                  {copy.arrangeGrid}
                </button>
                <button type="button" role="menuitem" className={styles.contextItem} disabled={arrangeCount < 2} onClick={() => arrangeSelected("circle")}>
                  <Icon icon="mdi:circle-outline" />
                  {copy.arrangeCircle}
                </button>
                <button type="button" role="menuitem" className={styles.contextItem} disabled={arrangeCount < 2} onClick={() => arrangeSelected("oval")}>
                  <Icon icon="mdi:ellipse-outline" />
                  {copy.arrangeOval}
                </button>
                {arrangeCount < 2 ? <p className={styles.contextHint}>{copy.arrangeNeedTwo}</p> : null}
              </>
            )}
            {contextMenu.edgeId ? (
              <button type="button" role="menuitem" className={styles.contextItem} onClick={() => removeEdges([contextMenu.edgeId])}>
                <Icon icon="mdi:link-variant-off" />
                {copy.deleteEdge}
              </button>
            ) : null}
            {!contextMenu.edgeId && selectionEdgeIds.length ? (
              <button type="button" role="menuitem" className={styles.contextItem} onClick={() => removeEdges(selectionEdgeIds)}>
                <Icon icon="mdi:link-variant-off" />
                {copy.deleteSelectionEdges}
              </button>
            ) : null}
          </div>
        ) : null}
        {drawing ? (
          <div
            className={styles.drawLayer}
            onPointerDown={onDrawDown}
            onPointerMove={onDrawMove}
            onPointerUp={onDrawUp}
          >
            <p className={styles.drawHint}>{copy.drawGroupHint}</p>
            {drawBox ? (
              <div
                className={styles.drawPreview}
                style={{ left: drawBox.left, top: drawBox.top, width: drawBox.width, height: drawBox.height }}
              />
            ) : null}
          </div>
        ) : null}
        {focused ? (
          <aside className={styles.inspector} aria-label={focused.data.label}>
            <div className={styles.inspectorHead}>
              <div>
                <h3 className={styles.inspectorTitle}>{focused.data.label || "—"}</h3>
                <p className={styles.inspectorType}>{typeLabel}</p>
              </div>
              {focused.data.nodeType === "site" && focused.data.missing ? <span className={`${styles.badge} ${styles.badgeMissing}`}>{copy.siteRemoved}</span> : null}
              {focused.data.nodeType !== "site" && focused.data.missing ? <span className={`${styles.badge} ${styles.badgeMissing}`}>{copy.missing}</span> : null}
              {!focused.data.missing && focused.data.inactive ? <span className={styles.badge}>{copy.inactive}</span> : null}
            </div>
            {focused.data.containerGroup ? <p className={styles.muted}>{interpolate(copy.inGroup, { name: focused.data.containerGroup.label })}</p> : null}
            {focused.data.nodeType === "application" && focused.data.description ? <p className={styles.meta}>{focused.data.description}</p> : null}
            {focused.data.photo ? <img className={styles.inspectorPhoto} src={focused.data.photo} alt="" /> : null}
            {focused.data.nodeType === "site" && focused.data.subtitle ? <p className={styles.muted}>{focused.data.subtitle}</p> : null}
            {focused.data.ha ? (
              <p className={styles.haLine}>
                <ImpactHaBadge ha={focused.data.ha} copy={copy} />
                <span>{haTitle(focused.data.ha, copy)}</span>
              </p>
            ) : null}
            {(groupImpactText || impactText) ? <p className={styles.impactSummary}>{groupImpactText || impactText}</p> : null}
            {focused.data.supervision && focused.data.supervision.level !== "ok" ? (
              <p className={styles.alertLine}>
                <span>{focused.data.supervision.title || (focused.data.supervision.level === "critical" ? copy.supervisionCritical : copy.supervisionWarning)}</span>
                <button type="button" className={styles.linkBtn} onClick={() => openSupervision(focused.data.supervision)}>
                  {copy.openAlert}
                </button>
              </p>
            ) : null}
            {focused.data.backups?.length ? (
              <div className={styles.sameNetwork}>
                <p className={styles.listTitle}>{focused.data.backups.length > 1 ? interpolate(copy.backupJobsMany, { count: focused.data.backups.length }) : interpolate(copy.backupJobsOne, { count: focused.data.backups.length })}</p>
                <ul className={styles.list}>
                  {focused.data.backups.slice(0, 6).map(job => <li key={job.id || job.name}>{job.name}</li>)}
                </ul>
              </div>
            ) : null}
            {focused.data.nodeType === "group" ? null : (
              <p className={styles.meta}>{linkCount > 1 ? interpolate(copy.linksMany, { count: linkCount }) : interpolate(copy.linksOne, { count: linkCount })}</p>
            )}
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
            {groupMembers.length ? (
              <div className={styles.sameNetwork}>
                <p className={styles.listTitle}>{copy.manualTypes.group}</p>
                <ul className={styles.list}>
                  {groupMembers.slice(0, 8).map(node => (
                    <li key={node.id}>
                      <button type="button" className={styles.linkBtn} onClick={() => selectNode(node.id)}>{node.data.label}</button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {canEdit && focused.data.kind === "manual" && focused.data.nodeType !== "group" && focused.data.nodeType !== "site" ? (
              <label className={styles.rename}>
                {copy.renameLabel}
                <input value={focused.data.label || ""} onChange={renameFocused} />
              </label>
            ) : null}
            {focused.data.nodeType === "group" ? null : <div className={styles.lists}>
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
            </div>}
            <div className={styles.actions}>
              {canEdit && focused.data.kind === "manual" ? (
                <button type="button" className={styles.textBtn} onClick={() => openEditor(focused)}>
                  {copy.editElement}
                </button>
              ) : null}
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
        {selectedEdges.length && canEdit ? (
          <button
            type="button"
            className={styles.edgeDelete}
            style={{ position: "absolute", zIndex: 5, left: 12, bottom: 12 }}
            onClick={() => removeEdges(selectedEdges.map(edge => edge.id))}
          >
            <Icon icon="mdi:link-variant-off" />
            {selectedEdges.length > 1 ? copy.deleteSelectionEdges : copy.deleteEdge}
          </button>
        ) : null}
      </div>
      {canEdit ? (
        <aside className={`${styles.palette} ${paletteOpen ? "" : styles.paletteCollapsed}`.trim()} aria-label={copy.addTitle}>
          <div className={styles.paletteHead}>
            <div className={styles.paletteTitleRow}>
              {paletteOpen ? <h2>{copy.addTitle}</h2> : null}
              <button
                type="button"
                className={styles.paletteToggle}
                aria-expanded={paletteOpen}
                title={paletteOpen ? copy.collapsePalette : copy.expandPalette}
                aria-label={paletteOpen ? copy.collapsePalette : copy.expandPalette}
                onClick={() => setPaletteOpen(open => !open)}
              >
                <Icon icon={paletteOpen ? "mdi:chevron-right" : "mdi:chevron-left"} />
              </button>
            </div>
            {paletteOpen ? (
              <input
                className={styles.search}
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={copy.searchPlaceholder}
                aria-label={copy.searchAria}
              />
            ) : null}
          </div>
          {paletteOpen ? <div className={styles.paletteBody}>
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
                      <Icon icon={resolveImpactIcon(item.nodeType, item.icon, item.serverForm)} className={styles.itemIcon} />
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
                  className={`${styles.item} ${drawing && type.id === "group" ? styles.itemActive : ""}`.trim()}
                  draggable
                  onClick={() => beginManual(type.id)}
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
          </div> : null}
        </aside>
      ) : null}
      </div>
      <ImpactElementDialog
        draft={composer}
        copy={copy}
        sites={siteOptions}
        onChange={setComposer}
        onCancel={() => setComposer(null)}
        onConfirm={commitComposer}
      />
      <ConfirmModal
        open={Boolean(pendingDelete)}
        title={copy.confirmDeleteTitle}
        message={interpolate(copy.confirmDeleteMessage, { name: pendingDelete?.data?.label || "" })}
        confirmLabel={copy.deleteNode}
        variant="danger"
        icon="mdi:delete-outline"
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        container={fullscreen ? hostRef.current : undefined}
      />
    </div>
  );
  return fullscreen ? createPortal(workspace, document.body) : workspace;
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
