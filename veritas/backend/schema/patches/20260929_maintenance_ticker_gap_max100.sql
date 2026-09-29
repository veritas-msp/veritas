-- Augmenter la plage d'espacement du bandeau maintenance (1–100).

ALTER TABLE v_b_settings_system
  DROP CONSTRAINT IF EXISTS chk_v_b_settings_system_ticker_gap;

ALTER TABLE v_b_settings_system
  ADD CONSTRAINT chk_v_b_settings_system_ticker_gap
  CHECK (ticker_gap BETWEEN 1 AND 100);
