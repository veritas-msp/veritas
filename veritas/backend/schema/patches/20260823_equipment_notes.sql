-- Notes par périphérique (publiques = portail client, privées = agents uniquement)

CREATE TABLE IF NOT EXISTS v_b_equipment_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL,
  client_id BIGINT NOT NULL,
  user_id UUID NULL REFERENCES v_b_users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  visibility VARCHAR(16) NOT NULL DEFAULT 'private',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v_b_equipment_notes_visibility_check CHECK (visibility IN ('public', 'private'))
);

CREATE INDEX IF NOT EXISTS idx_v_b_equipment_notes_equipment_id
  ON v_b_equipment_notes(equipment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_v_b_equipment_notes_client_id
  ON v_b_equipment_notes(client_id, equipment_id);
