-- Allow recording processed inbound emails that did not attach to a ticket
-- (orphan replies ignored/refused) so the same Message-ID is not re-logged every poll.

ALTER TABLE v_b_ticket_email_messages
  ALTER COLUMN ticket_id DROP NOT NULL;
