-- Assignations d'équipes sur les tickets (équipe entière, sans éclater les membres).

CREATE TABLE IF NOT EXISTS v_b_ticket_assignee_teams (
  ticket_id UUID NOT NULL REFERENCES v_b_tickets(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES v_b_teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ticket_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_v_b_ticket_assignee_teams_ticket_id
  ON v_b_ticket_assignee_teams(ticket_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_v_b_ticket_assignee_teams_team_id
  ON v_b_ticket_assignee_teams(team_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_ticket_assignee_teams TO veritas_user;
