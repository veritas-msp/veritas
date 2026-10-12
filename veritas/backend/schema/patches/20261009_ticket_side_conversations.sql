-- Side conversations ticket : chat email dédié (envoi/réception filés)

CREATE TABLE IF NOT EXISTS v_b_ticket_side_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES v_b_tickets(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT '',
  status VARCHAR(16) NOT NULL DEFAULT 'open',
  recipient_type VARCHAR(32) NOT NULL DEFAULT 'email',
  recipient_ref_id TEXT NULL,
  recipient_label TEXT NULL,
  to_addresses TEXT[] NOT NULL DEFAULT '{}',
  cc_addresses TEXT[] NOT NULL DEFAULT '{}',
  thread_token VARCHAR(16) NOT NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_side_conv_status CHECK (status IN ('open', 'done')),
  CONSTRAINT chk_side_conv_recipient_type CHECK (recipient_type IN ('agent', 'contact', 'prestataire', 'email'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ticket_side_conversations_thread_token
  ON v_b_ticket_side_conversations (thread_token);

CREATE INDEX IF NOT EXISTS idx_ticket_side_conversations_ticket_id
  ON v_b_ticket_side_conversations (ticket_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS v_b_ticket_side_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  side_conversation_id UUID NOT NULL REFERENCES v_b_ticket_side_conversations(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES v_b_tickets(id) ON DELETE CASCADE,
  direction VARCHAR(16) NOT NULL DEFAULT 'outbound',
  author_user_id UUID NULL,
  author_label TEXT NULL,
  body TEXT NOT NULL DEFAULT '',
  email_message_id TEXT NULL,
  send_status VARCHAR(32) NULL,
  send_error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_side_msg_direction CHECK (direction IN ('outbound', 'inbound', 'note'))
);

CREATE INDEX IF NOT EXISTS idx_ticket_side_conv_messages_conv
  ON v_b_ticket_side_conversation_messages (side_conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_ticket_side_conv_messages_email
  ON v_b_ticket_side_conversation_messages (email_message_id)
  WHERE email_message_id IS NOT NULL;

ALTER TABLE v_b_ticket_email_messages
  ADD COLUMN IF NOT EXISTS side_conversation_id UUID NULL
    REFERENCES v_b_ticket_side_conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ticket_email_messages_side_conversation
  ON v_b_ticket_email_messages (side_conversation_id)
  WHERE side_conversation_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_ticket_side_conversations TO veritas_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v_b_ticket_side_conversation_messages TO veritas_user;
