-- Progress tracking for Services & installations tickets
ALTER TABLE v_b_tickets
  ADD COLUMN IF NOT EXISTS progress_percent INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'v_b_tickets_progress_percent_check'
  ) THEN
    ALTER TABLE v_b_tickets
      ADD CONSTRAINT v_b_tickets_progress_percent_check
      CHECK (progress_percent IS NULL OR (progress_percent >= 0 AND progress_percent <= 100));
  END IF;
END $$;
