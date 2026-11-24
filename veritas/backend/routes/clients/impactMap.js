import { pool } from "../../database/db.js";
import { requireAnyPermission } from "../../middleware/permissions.js";
import { hasClientImpactMapTable } from "../../services/ensureClientImpactMapSchema.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = new Set(["equipment", "custom_equipment", "manual"]);
const MANUAL_TYPES = new Set(["site", "link", "application", "directory", "group", "vendor", "rack"]);
const MAX_NODES = 400;
const MAX_EDGES = 800;
const MAX_LABEL = 240;
const MAX_COORD = 1e6;

const viewImpact = requireAnyPermission("infrastructure.view", "clients.view");
const editImpact = requireAnyPermission("infrastructure.edit", "clients_detail.devices");

function unavailable(res) {
  return res.status(503).json({
    error: "Impact map module unavailable (migration required)"
  });
}

function badRequest(res, error) {
  return res.status(400).json({ error });
}

function mapNodeRow(row) {
  return {
    id: row.id,
    kind: row.kind,
    refId: row.ref_id,
    nodeType: row.node_type,
    label: row.label,
    x: Number(row.x),
    y: Number(row.y)
  };
}

function mapEdgeRow(row) {
  return {
    id: row.id,
    sourceId: row.source_node_id,
    targetId: row.target_node_id,
    label: row.label
  };
}

function asTrimmed(value, max) {
  if (value == null) return "";
  return String(value).trim().slice(0, max);
}

function parseGraph(body) {
  const rawNodes = Array.isArray(body?.nodes) ? body.nodes : null;
  const rawEdges = Array.isArray(body?.edges) ? body.edges : null;
  if (!rawNodes || !rawEdges) {
    return { error: "nodes and edges arrays are required" };
  }
  if (rawNodes.length > MAX_NODES || rawEdges.length > MAX_EDGES) {
    return { error: "Graph is too large" };
  }

  const nodes = [];
  const seenIds = new Set();
  const seenRefs = new Set();

  for (const raw of rawNodes) {
    const id = asTrimmed(raw?.id, 40);
    const kind = asTrimmed(raw?.kind, 32);
    const nodeType = asTrimmed(raw?.nodeType, 80);
    const label = asTrimmed(raw?.label, MAX_LABEL);
    const x = Number(raw?.x);
    const y = Number(raw?.y);
    const refId = raw?.refId == null || raw?.refId === "" ? null : asTrimmed(raw.refId, 80);

    if (!UUID_RE.test(id) || seenIds.has(id)) {
      return { error: "Invalid node id" };
    }
    if (!KINDS.has(kind) || !nodeType || !label) {
      return { error: "Invalid node" };
    }
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > MAX_COORD || Math.abs(y) > MAX_COORD) {
      return { error: "Invalid node position" };
    }
    if (kind === "manual") {
      if (refId || !MANUAL_TYPES.has(nodeType)) return { error: "Invalid manual node" };
    } else if (!refId) {
      return { error: "Equipment node requires refId" };
    } else {
      const refKey = `${kind}:${refId}`;
      if (seenRefs.has(refKey)) return { error: "Duplicate equipment node" };
      seenRefs.add(refKey);
    }

    seenIds.add(id);
    nodes.push({ id, kind, refId, nodeType, label, x, y });
  }

  const edges = [];
  const seenPairs = new Set();
  for (const raw of rawEdges) {
    const id = asTrimmed(raw?.id, 40);
    const sourceId = asTrimmed(raw?.sourceId, 40);
    const targetId = asTrimmed(raw?.targetId, 40);
    const label = raw?.label == null || raw?.label === "" ? null : asTrimmed(raw.label, MAX_LABEL);
    if (!UUID_RE.test(id) || !UUID_RE.test(sourceId) || !UUID_RE.test(targetId)) {
      return { error: "Invalid edge" };
    }
    if (sourceId === targetId || !seenIds.has(sourceId) || !seenIds.has(targetId)) {
      return { error: "Edge must link two nodes of this client" };
    }
    const pair = `${sourceId}->${targetId}`;
    if (seenPairs.has(pair) || seenIds.has(`edge:${id}`)) return { error: "Duplicate edge" };
    seenPairs.add(pair);
    seenIds.add(`edge:${id}`);
    edges.push({ id, sourceId, targetId, label });
  }

  return { nodes, edges };
}

async function loadGraph(clientId) {
  const [nodesResult, edgesResult] = await Promise.all([
    pool.query(
      `SELECT id, kind, ref_id, node_type, label, x, y
       FROM v_b_client_impact_nodes
       WHERE client_id = $1
       ORDER BY created_at ASC`,
      [clientId]
    ),
    pool.query(
      `SELECT id, source_node_id, target_node_id, label
       FROM v_b_client_impact_edges
       WHERE client_id = $1
       ORDER BY created_at ASC`,
      [clientId]
    )
  ]);
  return {
    nodes: nodesResult.rows.map(mapNodeRow),
    edges: edgesResult.rows.map(mapEdgeRow)
  };
}

export function registerImpactMapRoutes(router, resolveNumericClientId) {
  router.get("/:id/impact-map", viewImpact, async (req, res) => {
    try {
      if (!(await hasClientImpactMapTable())) return unavailable(res);
      const clientId = await resolveNumericClientId(req.params.id);
      if (!clientId) return res.status(404).json({ error: "Client not found" });
      res.json(await loadGraph(clientId));
    } catch (err) {
      if (err.code === "42P01") return unavailable(res);
      console.error("Error GET impact-map:", err);
      res.status(500).json({ error: "Error retrieving impact map" });
    }
  });

  router.put("/:id/impact-map", editImpact, async (req, res) => {
    const parsed = parseGraph(req.body || {});
    if (parsed.error) return badRequest(res, parsed.error);
    if (!(await hasClientImpactMapTable())) return unavailable(res);

    const db = await pool.connect();
    try {
      const clientId = await resolveNumericClientId(req.params.id);
      if (!clientId) return res.status(404).json({ error: "Client not found" });

      await db.query("BEGIN");
      await db.query("DELETE FROM v_b_client_impact_edges WHERE client_id = $1", [clientId]);
      await db.query("DELETE FROM v_b_client_impact_nodes WHERE client_id = $1", [clientId]);

      for (const node of parsed.nodes) {
        await db.query(
          `INSERT INTO v_b_client_impact_nodes
            (id, client_id, kind, ref_id, node_type, label, x, y)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [node.id, clientId, node.kind, node.refId, node.nodeType, node.label, node.x, node.y]
        );
      }
      for (const edge of parsed.edges) {
        await db.query(
          `INSERT INTO v_b_client_impact_edges
            (id, client_id, source_node_id, target_node_id, label)
           VALUES ($1, $2, $3, $4, $5)`,
          [edge.id, clientId, edge.sourceId, edge.targetId, edge.label]
        );
      }
      await db.query("COMMIT");
      res.json({ nodes: parsed.nodes, edges: parsed.edges });
    } catch (err) {
      try {
        await db.query("ROLLBACK");
      } catch {
        /* ignore */
      }
      if (err.code === "42P01") return unavailable(res);
      console.error("Error PUT impact-map:", err);
      res.status(500).json({ error: "Error saving impact map" });
    } finally {
      db.release();
    }
  });
}
