-- Overrides admin des vues tickets système (__builtin_*__)
CREATE TABLE IF NOT EXISTS v_b_ticket_view_builtin_overrides (
  builtin_id TEXT NOT NULL,
  page_scope TEXT NOT NULL DEFAULT 'ticket'
    CHECK (page_scope IN ('ticket', 'ticket_sales')),
  name VARCHAR(120),
  description TEXT,
  icon TEXT,
  rules JSONB,
  sort_by TEXT,
  sort_direction TEXT
    CHECK (sort_direction IS NULL OR sort_direction IN ('asc', 'desc')),
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (builtin_id, page_scope)
);

CREATE INDEX IF NOT EXISTS idx_ticket_view_builtin_overrides_scope
  ON v_b_ticket_view_builtin_overrides (page_scope);
