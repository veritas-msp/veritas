-- Espacement entre deux occurrences du message défilant (bandeau maintenance).

ALTER TABLE v_b_settings_system
  ADD COLUMN IF NOT EXISTS ticker_gap INTEGER NOT NULL DEFAULT 3;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_v_b_settings_system_ticker_gap'
  ) THEN
    ALTER TABLE v_b_settings_system
      ADD CONSTRAINT chk_v_b_settings_system_ticker_gap
      CHECK (ticker_gap BETWEEN 1 AND 20);
  END IF;
END $$;
