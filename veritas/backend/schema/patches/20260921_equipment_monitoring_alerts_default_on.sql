-- Alertes surveillance activées par défaut sur tous les périphériques
-- (centre de supervision). Les suspensions temporaires/permanentes sont conservées.

ALTER TABLE v_b_equipment_monitoring_alerts
  ALTER COLUMN alerts_enabled SET DEFAULT true;

UPDATE v_b_equipment_monitoring_alerts
SET alerts_enabled = true,
    updated_at = NOW()
WHERE alerts_enabled = false;
