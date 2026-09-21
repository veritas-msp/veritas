-- Catalogue d'étiquettes propre aux périphériques (séparé de v_b_client_tags)

CREATE TABLE IF NOT EXISTS v_b_equipment_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label VARCHAR(64) NOT NULL UNIQUE,
  color VARCHAR(16) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrer les tags déjà liés à des périphériques depuis le catalogue client
INSERT INTO v_b_equipment_tags (id, label, color, created_at)
SELECT DISTINCT ON (lower(btrim(t.label)))
  t.id,
  btrim(t.label),
  t.color,
  COALESCE(t.created_at, NOW())
FROM v_b_client_tags t
JOIN v_b_equipment_tag_links l ON l.tag_id = t.id
WHERE btrim(COALESCE(t.label, '')) <> ''
ORDER BY lower(btrim(t.label)), t.created_at ASC NULLS LAST
ON CONFLICT (label) DO NOTHING;

-- Remapper les liens dont le label existe déjà sous un autre id
UPDATE v_b_equipment_tag_links l
SET tag_id = et.id
FROM v_b_client_tags ct
JOIN v_b_equipment_tags et ON lower(btrim(et.label)) = lower(btrim(ct.label))
WHERE l.tag_id = ct.id
  AND l.tag_id <> et.id
  AND NOT EXISTS (
    SELECT 1
    FROM v_b_equipment_tag_links x
    WHERE x.equipment_id = l.equipment_id
      AND x.tag_id = et.id
  );

-- Supprimer les liens orphelins qui ne pointent plus vers le catalogue équipement
DELETE FROM v_b_equipment_tag_links l
WHERE NOT EXISTS (
  SELECT 1 FROM v_b_equipment_tags et WHERE et.id = l.tag_id
);

-- Remplacer la FK client_tags → equipment_tags
DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT con.conname INTO fk_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'v_b_equipment_tag_links'
    AND con.contype = 'f'
    AND pg_get_constraintdef(con.oid) ILIKE '%v_b_client_tags%';

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE v_b_equipment_tag_links DROP CONSTRAINT %I', fk_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'v_b_equipment_tag_links'
      AND con.contype = 'f'
      AND pg_get_constraintdef(con.oid) ILIKE '%v_b_equipment_tags%'
  ) THEN
    ALTER TABLE v_b_equipment_tag_links
      ADD CONSTRAINT v_b_equipment_tag_links_tag_id_fkey
      FOREIGN KEY (tag_id) REFERENCES v_b_equipment_tags(id) ON DELETE CASCADE;
  END IF;
END $$;
