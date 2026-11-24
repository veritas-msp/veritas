BEGIN;

CREATE TABLE IF NOT EXISTS v_b_client_impact_nodes (
  id UUID PRIMARY KEY,
  client_id INTEGER NOT NULL,
  kind VARCHAR(32) NOT NULL,
  ref_id TEXT,
  node_type VARCHAR(80) NOT NULL,
  label TEXT NOT NULL,
  x DOUBLE PRECISION NOT NULL,
  y DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v_b_client_impact_nodes_kind_check
    CHECK (kind IN ('equipment', 'custom_equipment', 'manual')),
  CONSTRAINT v_b_client_impact_nodes_ref_check
    CHECK (
      (kind = 'manual' AND ref_id IS NULL)
      OR (
        kind IN ('equipment', 'custom_equipment')
        AND ref_id IS NOT NULL
        AND length(btrim(ref_id)) > 0
      )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_impact_nodes_ref
  ON v_b_client_impact_nodes (client_id, kind, ref_id)
  WHERE ref_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_client_impact_nodes_client
  ON v_b_client_impact_nodes (client_id);

CREATE TABLE IF NOT EXISTS v_b_client_impact_edges (
  id UUID PRIMARY KEY,
  client_id INTEGER NOT NULL,
  source_node_id UUID NOT NULL,
  target_node_id UUID NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v_b_client_impact_edges_no_self
    CHECK (source_node_id <> target_node_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_impact_edges_pair
  ON v_b_client_impact_edges (client_id, source_node_id, target_node_id);

CREATE INDEX IF NOT EXISTS idx_client_impact_edges_client
  ON v_b_client_impact_edges (client_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_client_impact_nodes TO veritas_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_client_impact_edges TO veritas_user;

COMMIT;
