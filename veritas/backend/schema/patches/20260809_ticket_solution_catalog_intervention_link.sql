-- Lie les types d'action aux types d'intervention (comme catégories ↔ sections ITIL)
BEGIN;

ALTER TABLE v_b_ticket_solution_catalog
  ADD COLUMN IF NOT EXISTS intervention VARCHAR(120) NULL;

CREATE INDEX IF NOT EXISTS idx_v_b_ticket_solution_catalog_intervention
  ON v_b_ticket_solution_catalog (category, lower(trim(intervention)))
  WHERE category = 'action' AND intervention IS NOT NULL AND trim(intervention) <> '';

-- Rattache les actions existantes sans lien au premier type d'intervention
UPDATE v_b_ticket_solution_catalog AS a
SET intervention = (
  SELECT i.label
  FROM v_b_ticket_solution_catalog AS i
  WHERE i.category = 'intervention'
  ORDER BY i.display_order ASC, i.label ASC
  LIMIT 1
),
updated_at = NOW()
WHERE a.category = 'action'
  AND (a.intervention IS NULL OR trim(a.intervention) = '')
  AND EXISTS (
    SELECT 1 FROM v_b_ticket_solution_catalog AS i WHERE i.category = 'intervention'
  );

COMMIT;
