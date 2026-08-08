-- Separate Services & installations from Support: type becomes prestation|installation
-- (was type=demande + category prefix prestation-/installation-).

UPDATE v_b_tickets
SET type = 'prestation',
    updated_at = NOW()
WHERE LOWER(COALESCE(type, '')) IN ('demande', 'request')
  AND category LIKE 'prestation-%';

UPDATE v_b_tickets
SET type = 'installation',
    updated_at = NOW()
WHERE LOWER(COALESCE(type, '')) IN ('demande', 'request')
  AND category LIKE 'installation-%';

-- Prefer kind from sales_form_data when present (covers mis-prefixed categories).
UPDATE v_b_tickets
SET type = LOWER(sales_form_data->>'kind'),
    updated_at = NOW()
WHERE sales_form_data IS NOT NULL
  AND LOWER(COALESCE(sales_form_data->>'kind', '')) IN ('prestation', 'installation')
  AND LOWER(COALESCE(type, '')) NOT IN ('prestation', 'installation');
