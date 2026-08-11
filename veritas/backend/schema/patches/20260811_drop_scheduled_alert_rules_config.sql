-- Remove unused CRON / scheduled alert rules config (never executed by a runner).
BEGIN;

DROP TABLE IF EXISTS v_b_ticket_scheduled_alert_rules_config;

COMMIT;
