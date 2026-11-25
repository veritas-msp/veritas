import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { interpolate } from "../../i18n/translate";
import { classifyNetworkLink, isRoutingNodeType, resolveImpactIcon } from "./impactMapModel";
import styles from "./ImpactVisualMap.module.css";

const FAMILY_COLOR = {
  Internet: "#38bdf8",
  Firewalls: "#f59e0b",
  Firewall: "#f59e0b",
  Routeur: "#fb7185",
  Serveurs: "#34d399",
  Servers: "#34d399",
  NAS: "#a78bfa",
  Stockage: "#a78bfa",
  Storage: "#a78bfa",
  Switch: "#60a5fa",
  BorneWifi: "#22d3ee",
  Alimentation: "#fbbf24",
  TOIP: "#c084fc",
  Ordinateurs: "#94a3b8",
  site: "#f472b6",
  application: "#818cf8",
  directory: "#2dd4bf",
  vendor: "#fb923c",
  rack: "#94a3b8",
  link: "#38bdf8"
};

function familyColor(nodeType) {
  if (FAMILY_COLOR[nodeType]) return FAMILY_COLOR[nodeType];
  if (String(nodeType || "").startsWith("Custom:")) return "#67e8f9";
  if (/camera|video/i.test(String(nodeType || ""))) return "#f87171";
  return "#93c5fd";
}

function clusterKey(node) {
  if (node.data?.nodeType === "site") return `site:${node.data.label || "site"}`;
  const vlans = [...(node.data?.vlans || [])].sort((a, b) => Number(a) - Number(b));
  if (vlans.length) return `vlan:${vlans.join("-")}`;
  const place = String(node.data?.location || node.data?.containerGroup?.label || "").trim();
  return place ? `place:${place}` : "none";
}

function clusterTitle(key, copy) {
  if (key.startsWith("vlan:")) return `VLAN ${key.slice(5).replace(/-/g, ", ")}`;
  if (key.startsWith("site:")) return key.slice(5);
  if (key.startsWith("place:")) return key.slice(6);
  return copy.visualUnassigned;
}

function isHub(node) {
  return isRoutingNodeType(node.data?.nodeType) || /switch/i.test(String(node.data?.nodeType || ""));
}

function pairKey(left, right) {
  return left < right ? `${left}|${right}` : `${right}|${left}`;
}

function haLayout(list) {
  const groups = new Map();
  list.forEach(node => {
    const key = node.data?.ha?.pairKey;
    if (!key) return;
    const bucket = groups.get(key) || [];
    bucket.push(node);
    groups.set(key, bucket);
  });
  const anchors = new Map();
  groups.forEach(peers => {
    if (peers.length < 2) return;
    const primary = peers.find(peer => peer.data?.ha?.role !== "Secondary") || peers[0];
    peers.forEach(peer => {
      if (peer.id !== primary.id) anchors.set(peer.id, primary.id);
    });
  });
  return anchors;
}

function buildModel(nodes, edges) {
  const list = nodes.filter(node => node.data?.nodeType !== "group");
  const ids = new Set(list.map(node => node.id));
  const byId = new Map(list.map(node => [node.id, node]));
  const anchors = haLayout(list);
  const primaryOf = id => anchors.get(id) || id;
  const links = [];
  const seen = new Set();
  (Array.isArray(edges) ? edges : []).forEach(edge => {
    if (!ids.has(edge.source) || !ids.has(edge.target) || edge.hidden) return;
    const sourceId = primaryOf(edge.source);
    const targetId = primaryOf(edge.target);
    if (sourceId === targetId) return;
    const key = pairKey(sourceId, targetId);
    if (seen.has(key)) return;
    seen.add(key);
    links.push({
      id: edge.id,
      source: sourceId,
      target: targetId,
      soft: false,
      ha: false,
      separated: classifyNetworkLink(byId.get(edge.source), byId.get(edge.target)) === "separated"
    });
  });
  anchors.forEach((primaryId, secondaryId) => {
    const key = pairKey(primaryId, secondaryId);
    if (seen.has(key)) return;
    seen.add(key);
    const primary = byId.get(primaryId);
    links.push({
      id: `ha-${key}`,
      source: primaryId,
      target: secondaryId,
      soft: false,
      ha: true,
      separated: false,
      color: primary?.data?.ha?.color || byId.get(secondaryId)?.data?.ha?.color || "#2dd4bf"
    });
  });
  const grouped = new Map();
  list.forEach(node => {
    const key = clusterKey(node);
    const bucket = grouped.get(key) || [];
    bucket.push(node);
    grouped.set(key, bucket);
  });
  return { list, links, grouped, anchors };
}

function pinHaPairs(bodies, byId, anchors) {
  const groups = new Map();
  anchors.forEach((primaryId, secondaryId) => {
    const ids = groups.get(primaryId) || [];
    ids.push(secondaryId);
    groups.set(primaryId, ids);
  });
  const place = () => {
    groups.forEach((ids, primaryId) => {
      const primary = byId.get(primaryId);
      if (!primary) return;
      ids.forEach((secondaryId, index) => {
        const secondary = byId.get(secondaryId);
        if (!secondary) return;
        secondary.x = primary.x + 128;
        secondary.y = primary.y + index * 108;
        secondary.vx = 0;
        secondary.vy = 0;
      });
    });
  };
  place();
  const pinned = new Set([...anchors.keys(), ...anchors.values()]);
  const rootOf = id => anchors.get(id) || id;
  const shiftGroup = (rootId, dx, dy) => {
    const primary = byId.get(rootId);
    if (primary) {
      primary.x += dx;
      primary.y += dy;
    }
    anchors.forEach((primaryId, secondaryId) => {
      if (primaryId !== rootId) return;
      const secondary = byId.get(secondaryId);
      if (!secondary) return;
      secondary.x += dx;
      secondary.y += dy;
    });
  };
  for (let pass = 0; pass < 8; pass += 1) {
    for (let i = 0; i < bodies.length; i += 1) {
      for (let j = i + 1; j < bodies.length; j += 1) {
        const dx = bodies[j].x - bodies[i].x;
        const dy = bodies[j].y - bodies[i].y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const min = 150;
        if (dist >= min) continue;
        const shift = min - dist;
        const ux = dx / dist;
        const uy = dy / dist;
        const leftRoot = rootOf(bodies[i].id);
        const rightRoot = rootOf(bodies[j].id);
        const leftPinned = pinned.has(bodies[i].id);
        const rightPinned = pinned.has(bodies[j].id);
        if (leftPinned && rightPinned) {
          if (leftRoot === rightRoot) continue;
          shiftGroup(rightRoot, ux * shift, uy * shift);
          continue;
        }
        if (leftPinned) {
          bodies[j].x += ux * shift;
          bodies[j].y += uy * shift;
        } else if (rightPinned) {
          bodies[i].x -= ux * shift;
          bodies[i].y -= uy * shift;
        }
      }
    }
    place();
  }
}

function simulate(list, links, anchors = new Map()) {
  const width = 1100;
  const height = 700;
  const keys = [...new Set(list.map(clusterKey))];
  const centers = new Map();
  keys.forEach((key, index) => {
    const angle = (index / Math.max(keys.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const radius = keys.length <= 1 ? 0 : 230;
    centers.set(key, {
      x: width / 2 + Math.cos(angle) * radius,
      y: height / 2 + Math.sin(angle) * radius * 0.68
    });
  });
  const bodies = list.map((node, index) => {
    const center = centers.get(clusterKey(node));
    const angle = index * 1.15;
    return {
      id: node.id,
      cluster: clusterKey(node),
      hub: isHub(node),
      x: center.x + Math.cos(angle) * 28,
      y: center.y + Math.sin(angle) * 28,
      vx: 0,
      vy: 0
    };
  });
  const byId = new Map(bodies.map(body => [body.id, body]));
  const springs = links
    .map(link => ({ ...link, a: byId.get(link.source), b: byId.get(link.target) }))
    .filter(link => link.a && link.b);
  const ticks = Math.min(180, 70 + list.length * 4);
  for (let tick = 0; tick < ticks; tick += 1) {
    for (let i = 0; i < bodies.length; i += 1) {
      for (let j = i + 1; j < bodies.length; j += 1) {
        const dx = bodies[j].x - bodies[i].x;
        const dy = bodies[j].y - bodies[i].y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const push = 1400 / (dist * dist);
        const ux = dx / dist;
        const uy = dy / dist;
        bodies[i].vx -= ux * push;
        bodies[i].vy -= uy * push;
        bodies[j].vx += ux * push;
        bodies[j].vy += uy * push;
      }
    }
    springs.forEach(link => {
      if (link.ha) return;
      const dx = link.b.x - link.a.x;
      const dy = link.b.y - link.a.y;
      const dist = Math.hypot(dx, dy) || 0.01;
      const desired = 168;
      const pull = ((dist - desired) / dist) * 0.028;
      link.a.vx += dx * pull;
      link.a.vy += dy * pull;
      link.b.vx -= dx * pull;
      link.b.vy -= dy * pull;
    });
    bodies.forEach(body => {
      const center = centers.get(body.cluster);
      body.vx += (center.x - body.x) * 0.035;
      body.vy += (center.y - body.y) * 0.035;
      body.vx += (width / 2 - body.x) * 0.003;
      body.vy += (height / 2 - body.y) * 0.003;
      body.vx *= 0.7;
      body.vy *= 0.7;
      body.x += Math.max(-18, Math.min(18, body.vx));
      body.y += Math.max(-18, Math.min(18, body.vy));
    });
    for (let i = 0; i < bodies.length; i += 1) {
      for (let j = i + 1; j < bodies.length; j += 1) {
        const dx = bodies[j].x - bodies[i].x;
        const dy = bodies[j].y - bodies[i].y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const min = 86;
        if (dist >= min) continue;
        const shift = (min - dist) / 2;
        const ux = dx / dist;
        const uy = dy / dist;
        bodies[i].x -= ux * shift;
        bodies[i].y -= uy * shift;
        bodies[j].x += ux * shift;
        bodies[j].y += uy * shift;
      }
    }
    pinHaPairs(bodies, byId, anchors);
  }
  pinHaPairs(bodies, byId, anchors);
  return new Map(bodies.map(body => [body.id, body]));
}

function hull(points) {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (sorted.length < 3) return sorted;
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  sorted.forEach(point => {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  });
  const upper = [];
  [...sorted].reverse().forEach(point => {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  });
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function inflate(points) {
  if (!points.length) return points;
  const cx = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const cy = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  return points.map(point => {
    const dx = point.x - cx;
    const dy = point.y - cy;
    const dist = Math.hypot(dx, dy) || 1;
    return { x: point.x + (dx / dist) * 46, y: point.y + (dy / dist) * 42 };
  });
}

function curve(a, b) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return `M ${a.x} ${a.y} Q ${mx + (-dy / len) * 22} ${my + (dx / len) * 22} ${b.x} ${b.y}`;
}

function fitViewBox(bodies, width, height) {
  if (!bodies.length || !width || !height) return { x: 40, y: 40, zoom: 1 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  bodies.forEach(body => {
    minX = Math.min(minX, body.x - 80);
    maxX = Math.max(maxX, body.x + 80);
    minY = Math.min(minY, body.y - 48);
    maxY = Math.max(maxY, body.y + 64);
  });
  const boundsW = Math.max(1, maxX - minX);
  const boundsH = Math.max(1, maxY - minY);
  const zoom = Math.max(0.45, Math.min(width / boundsW, height / boundsH, 1.35));
  return {
    zoom,
    x: (width - boundsW * zoom) / 2 - minX * zoom,
    y: (height - boundsH * zoom) / 2 - minY * zoom
  };
}

export default function ImpactVisualMap({
  nodes,
  edges = [],
  clientName,
  copy,
  locale,
  typeLabelFor,
  onOpenAlert,
  sheetRef
}) {
  const viewportRef = useRef(null);
  const dragRef = useRef(null);
  const selectedRef = useRef(new Set());
  const skipClickRef = useRef(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [focusId, setFocusId] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [marquee, setMarquee] = useState(null);
  const [panKey, setPanKey] = useState(false);
  const [view, setView] = useState({ x: 40, y: 40, zoom: 1 });
  selectedRef.current = selectedIds;
  const model = useMemo(() => buildModel(nodes, edges), [edges, nodes]);
  const signature = `${model.list.map(node => node.id).join("|")}::${model.links.map(link => link.id).join("|")}`;
  const laidOut = useMemo(
    () => simulate(model.list, model.links, model.anchors),
    // Relancer la simulation seulement quand le graphe change, pas à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature]
  );
  const [positions, setPositions] = useState(laidOut);

  useEffect(() => {
    setPositions(laidOut);
    setFocusId("");
    setSelectedIds(new Set());
  }, [laidOut]);

  useEffect(() => {
    const sync = event => {
      if (event.key !== "Control") return;
      setPanKey(event.type === "keydown");
    };
    const clear = () => setPanKey(false);
    window.addEventListener("keydown", sync);
    window.addEventListener("keyup", sync);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", sync);
      window.removeEventListener("keyup", sync);
      window.removeEventListener("blur", clear);
    };
  }, []);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return undefined;
    const measure = () => setBox({ w: element.clientWidth, h: element.clientHeight });
    const onWheelNative = event => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      setView(current => {
        const nextZoom = Math.max(0.35, Math.min(2.2, current.zoom * (event.deltaY > 0 ? 0.92 : 1.08)));
        const scale = nextZoom / current.zoom;
        return {
          zoom: nextZoom,
          x: px - (px - current.x) * scale,
          y: py - (py - current.y) * scale
        };
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.addEventListener("wheel", onWheelNative, { passive: false });
    return () => {
      observer.disconnect();
      element.removeEventListener("wheel", onWheelNative);
    };
  }, [model.list.length]);

  useEffect(() => {
    setView(fitViewBox([...laidOut.values()], box.w, box.h));
  }, [box.h, box.w, laidOut]);

  const byId = positions;
  const focusLinks = focusId
    ? new Set(model.links.filter(link => link.source === focusId || link.target === focusId).map(link => link.id))
    : null;
  const focusNodes = focusId
    ? new Set(model.links.flatMap(link => (
      link.source === focusId || link.target === focusId ? [link.source, link.target] : []
    )).concat(focusId))
    : null;

  const clusters = [...model.grouped.entries()].map(([key, items]) => {
    const points = inflate(items.map(node => byId.get(node.id)).filter(Boolean));
    const ring = hull(points);
    if (ring.length < 3) return null;
    const label = ring.reduce((best, point) => (point.y < best.y ? point : best), ring[0]);
    return {
      key,
      title: clusterTitle(key, copy),
      d: `M ${ring.map(point => `${point.x} ${point.y}`).join(" L ")} Z`,
      label
    };
  }).filter(Boolean);

  const families = [];
  const seenFamilies = new Set();
  model.list.forEach(node => {
    const label = typeLabelFor(node);
    if (!label || seenFamilies.has(label)) return;
    seenFamilies.add(label);
    families.push({ label, color: familyColor(node.data?.nodeType) });
  });

  const onPointerDown = event => {
    if (event.button !== 0) return;
    if (event.ctrlKey) {
      dragRef.current = { kind: "pan", x: event.clientX, y: event.clientY, view };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (event.target.closest?.(`.${styles.node}`)) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const left = event.clientX - bounds.left;
    const top = event.clientY - bounds.top;
    dragRef.current = { kind: "select", x: event.clientX, y: event.clientY, left, top, rect: { x: left, y: top, w: 0, h: 0 } };
    setMarquee({ x: left, y: top, w: 0, h: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = event => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.kind === "pan") {
      setView({
        ...drag.view,
        x: drag.view.x + event.clientX - drag.x,
        y: drag.view.y + event.clientY - drag.y
      });
      return;
    }
    if (drag.kind !== "select" || !viewportRef.current) return;
    const bounds = viewportRef.current.getBoundingClientRect();
    const x2 = event.clientX - bounds.left;
    const y2 = event.clientY - bounds.top;
    const rect = {
      x: Math.min(drag.left, x2),
      y: Math.min(drag.top, y2),
      w: Math.abs(x2 - drag.left),
      h: Math.abs(y2 - drag.top)
    };
    drag.rect = rect;
    setMarquee(rect);
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.kind !== "select") return;
    const rect = drag.rect || { x: drag.left, y: drag.top, w: 0, h: 0 };
    setMarquee(null);
    if (rect.w < 4 && rect.h < 4) {
      setSelectedIds(new Set());
      setFocusId("");
      return;
    }
    const viewport = viewportRef.current;
    if (!viewport) return;
    const bounds = viewport.getBoundingClientRect();
    const ids = [];
    viewport.querySelectorAll(`.${styles.node}`).forEach(element => {
      const box = element.getBoundingClientRect();
      const left = box.left - bounds.left;
      const top = box.top - bounds.top;
      const right = left + box.width;
      const bottom = top + box.height;
      const hit = right >= rect.x && left <= rect.x + rect.w && bottom >= rect.y && top <= rect.y + rect.h;
      if (hit) ids.push(element.getAttribute("data-id"));
    });
    setSelectedIds(new Set(ids.filter(Boolean)));
    setFocusId(ids.length === 1 ? ids[0] : "");
  };

  const onNodePointerDown = (event, node) => {
    if (event.button !== 0 || event.ctrlKey) return;
    event.stopPropagation();
    const currentSelected = selectedRef.current;
    const keepGroup = currentSelected.has(node.id);
    const ids = keepGroup ? [...currentSelected] : [node.id];
    if (!keepGroup) {
      setSelectedIds(new Set(ids));
      setFocusId(node.id);
    }
    const origins = new Map();
    ids.forEach(id => {
      const point = byId.get(id);
      if (point) origins.set(id, { x: point.x, y: point.y });
    });
    dragRef.current = {
      kind: "nodes",
      id: node.id,
      ids,
      x: event.clientX,
      y: event.clientY,
      origins,
      moved: false
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onNodePointerMove = (event, node) => {
    const drag = dragRef.current;
    if (!drag || drag.kind !== "nodes" || drag.id !== node.id) return;
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 3) drag.moved = true;
    const dx = (event.clientX - drag.x) / view.zoom;
    const dy = (event.clientY - drag.y) / view.zoom;
    setPositions(current => {
      const next = new Map(current);
      drag.origins.forEach((origin, id) => {
        const body = next.get(id);
        if (!body) return;
        next.set(id, { ...body, x: origin.x + dx, y: origin.y + dy });
      });
      return next;
    });
  };

  const onNodePointerUp = node => {
    const drag = dragRef.current;
    if (!drag || drag.kind !== "nodes" || drag.id !== node.id) return;
    skipClickRef.current = drag.moved;
    dragRef.current = null;
  };

  const printedAt = new Date().toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className={styles.stage} ref={sheetRef}>
      <header className={styles.head}>
        <div>
          <p className={styles.kicker}>{copy.visualKicker}</p>
          <h2 className={styles.title}>{clientName || copy.visualKicker}</h2>
        </div>
        <p className={styles.date}>
          {model.list.length
            ? `${model.list.length > 1 ? interpolate(copy.visualCountMany, { count: model.list.length }) : interpolate(copy.visualCountOne, { count: model.list.length })} · ${printedAt}`
            : printedAt}
        </p>
      </header>
      {model.list.length ? (
        <div
          className={`${styles.viewport} ${panKey ? styles.viewportPan : ""}`.trim()}
          data-impact-export="viewport"
          ref={viewportRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div
            className={styles.world}
            data-impact-export="world"
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
          >
            <svg className={styles.canvas} viewBox="0 0 1100 700" overflow="visible">
              {clusters.map(cluster => (
                <g key={cluster.key}>
                  <path
                    className={styles.hull}
                    d={cluster.d}
                    fill="rgba(125, 211, 252, 0.05)"
                    stroke="rgba(148, 163, 184, 0.35)"
                    strokeWidth="1.2"
                    strokeDasharray="5 6"
                  />
                  <text
                    className={styles.hullLabel}
                    x={cluster.label.x}
                    y={cluster.label.y - 8}
                    fill="#94a3b8"
                    fontSize="12"
                    fontWeight="700"
                  >
                    {cluster.title.toLocaleUpperCase(locale)}
                  </text>
                </g>
              ))}
              {model.links.map(link => {
                const a = byId.get(link.source);
                const b = byId.get(link.target);
                if (!a || !b) return null;
                const dim = focusLinks && !focusLinks.has(link.id);
                const paint = link.ha
                  ? { stroke: link.color || "#2dd4bf", strokeWidth: 2.4, strokeDasharray: "1 7" }
                  : link.separated
                    ? { stroke: "#fbbf24", strokeWidth: 1.7, strokeDasharray: "5 4" }
                    : { stroke: "#7dd3fc", strokeWidth: 1.7 };
                return (
                  <path
                    key={link.id}
                    d={link.ha ? `M ${a.x} ${a.y} L ${b.x} ${b.y}` : curve(a, b)}
                    fill="none"
                    strokeLinecap="round"
                    opacity={dim ? 0.22 : 1}
                    className={`${styles.link} ${link.ha ? styles.linkHa : ""} ${link.separated ? styles.linkSeparated : ""}`.trim()}
                    {...paint}
                  />
                );
              })}
            </svg>
            {model.list.map(node => {
              const body = byId.get(node.id);
              if (!body) return null;
              const color = familyColor(node.data?.nodeType);
              const level = node.data?.supervision?.level;
              const dim = focusNodes && !focusNodes.has(node.id);
              return (
                <button
                  key={node.id}
                  type="button"
                  data-id={node.id}
                  className={`${styles.node} ${body.hub ? styles.nodeHub : ""} ${selectedIds.has(node.id) ? styles.nodeSelected : ""} ${focusId === node.id ? styles.nodeFocus : ""} ${dim ? styles.dim : ""}`.trim()}
                  style={{ left: body.x, top: body.y, "--node": color }}
                  title={[
                    node.data?.label,
                    node.data?.serverForm === "virtuel" ? copy.serverVirtual : node.data?.serverForm === "physique" ? copy.serverPhysical : ""
                  ].filter(Boolean).join(" · ")}
                  onPointerDown={event => onNodePointerDown(event, node)}
                  onPointerMove={event => onNodePointerMove(event, node)}
                  onPointerUp={() => onNodePointerUp(node)}
                  onClick={() => {
                    if (skipClickRef.current) {
                      skipClickRef.current = false;
                      return;
                    }
                    if (selectedRef.current.size > 1) return;
                    setFocusId(node.id);
                  }}
                >
                  <span className={styles.orb}>
                    {node.data?.photo ? <img src={node.data.photo} alt="" /> : <Icon icon={node.data?.icon || resolveImpactIcon(node.data?.nodeType)} />}
                    {level && level !== "ok" ? (
                      <span
                        className={`${styles.alert} ${level === "critical" ? styles.alertCritical : styles.alertWarning}`.trim()}
                        onClick={event => {
                          event.stopPropagation();
                          onOpenAlert?.(node.data.supervision);
                        }}
                      />
                    ) : null}
                  </span>
                  <span className={styles.label}>{node.data?.label || "—"}</span>
                  <span className={styles.meta}>{[typeLabelFor(node), node.data?.subtitle].filter(Boolean).join(" · ")}</span>
                </button>
              );
            })}
          </div>
          {marquee ? (
            <div
              className={styles.marquee}
              style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }}
            />
          ) : null}
        </div>
      ) : <p className={styles.empty}>{copy.visualEmpty}</p>}
      <p className={styles.gestureHint} data-impact-no-export>{copy.panHint}</p>
      {families.length ? (
        <ul className={styles.legend} data-impact-export="legend">
          {families.slice(0, 8).map(item => (
            <li key={item.label}>
              <i style={{ background: item.color }} />
              {item.label}
            </li>
          ))}
          <li><i className={styles.legendLink} />{copy.visualLink}</li>
          {model.links.some(link => link.ha) ? <li><i className={styles.legendHa} />{copy.visualHaLink}</li> : null}
        </ul>
      ) : null}
    </div>
  );
}
