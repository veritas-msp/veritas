-- Ensure ON CONFLICT (message_id) works for mail collect dedupe / thread tracking.
-- Older installs may have the table without the unique constraint (CREATE TABLE IF NOT EXISTS).

DELETE FROM v_b_ticket_email_messages a
USING v_b_ticket_email_messages b
WHERE a.message_id = b.message_id
  AND a.ctid < b.ctid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_ticket_email_messages_message_id'
      AND conrelid = 'public.v_b_ticket_email_messages'::regclass
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'v_b_ticket_email_messages'
      AND indexname = 'uq_ticket_email_messages_message_id'
  ) THEN
    ALTER TABLE v_b_ticket_email_messages
      ADD CONSTRAINT uq_ticket_email_messages_message_id UNIQUE (message_id);
  END IF;
END $$;
