import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../database/db.js";
import { ensureVisibleToClientColumn, hasVisibleToClientColumn } from "../utils/clientFilesVisibility.js";
import { repairStoredFilename } from "../utils/multerFilename.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CLIENT_FILES_UPLOAD_DIR = path.join(__dirname, "..", "uploads", "client-files");
function mapPortalVaultFile(row) {
  return {
    id: row.id,
    file_name: repairStoredFilename(row.file_name),
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    category: row.category,
    description: row.description || "",
    created_at: row.created_at
  };
}
export async function listPortalVaultFiles(clientId, {
  category,
  search,
  limit,
  offset
} = {}) {
  const ready = await ensureVisibleToClientColumn();
  if (!ready || !(await hasVisibleToClientColumn())) return [];
  const conditions = ["cf.client_id = $1", "cf.is_deleted = FALSE", "cf.visible_to_client = TRUE"];
  const values = [Number(clientId)];
  if (category && category !== "all") {
    values.push(String(category));
    conditions.push(`cf.category = $${values.length}`);
  }
  const trimmedSearch = String(search || "").trim();
  if (trimmedSearch) {
    values.push(`%${trimmedSearch}%`);
    conditions.push(`(cf.file_name ILIKE $${values.length} OR COALESCE(cf.description, '') ILIKE $${values.length} OR cf.category ILIKE $${values.length})`);
  }
  // Hide files whose folder (or any ancestor folder) is not portal-visible.
  const folderVisibilitySql = `AND (
    cf.folder_id IS NULL
    OR NOT EXISTS (
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_id, COALESCE(visible_to_client, FALSE) AS visible_to_client, is_deleted
          FROM v_b_client_file_folders
         WHERE id = cf.folder_id
        UNION ALL
        SELECT f.id, f.parent_id, COALESCE(f.visible_to_client, FALSE), f.is_deleted
          FROM v_b_client_file_folders f
          JOIN ancestors a ON f.id = a.parent_id
      )
      SELECT 1 FROM ancestors
       WHERE is_deleted = TRUE OR visible_to_client = FALSE
    )
  )`;
  const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 500);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  values.push(safeLimit, safeOffset);
  const {
    rows
  } = await pool.query(`SELECT cf.id, cf.file_name, cf.mime_type, cf.size_bytes, cf.category, cf.description, cf.created_at
     FROM v_b_client_files cf
     WHERE ${conditions.join(" AND ")}
     ${folderVisibilitySql}
     ORDER BY cf.created_at DESC
     LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
  return rows.map(mapPortalVaultFile);
}
export async function countPortalVaultFiles(clientId, {
  category,
  search
} = {}) {
  const ready = await ensureVisibleToClientColumn();
  if (!ready || !(await hasVisibleToClientColumn())) return 0;
  const conditions = ["cf.client_id = $1", "cf.is_deleted = FALSE", "cf.visible_to_client = TRUE"];
  const values = [Number(clientId)];
  if (category && category !== "all") {
    values.push(String(category));
    conditions.push(`cf.category = $${values.length}`);
  }
  const trimmedSearch = String(search || "").trim();
  if (trimmedSearch) {
    values.push(`%${trimmedSearch}%`);
    conditions.push(`(cf.file_name ILIKE $${values.length} OR COALESCE(cf.description, '') ILIKE $${values.length} OR cf.category ILIKE $${values.length})`);
  }
  const folderVisibilitySql = `AND (
    cf.folder_id IS NULL
    OR NOT EXISTS (
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_id, COALESCE(visible_to_client, FALSE) AS visible_to_client, is_deleted
          FROM v_b_client_file_folders
         WHERE id = cf.folder_id
        UNION ALL
        SELECT f.id, f.parent_id, COALESCE(f.visible_to_client, FALSE), f.is_deleted
          FROM v_b_client_file_folders f
          JOIN ancestors a ON f.id = a.parent_id
      )
      SELECT 1 FROM ancestors
       WHERE is_deleted = TRUE OR visible_to_client = FALSE
    )
  )`;
  const {
    rows
  } = await pool.query(`SELECT COUNT(*)::int AS total
     FROM v_b_client_files cf
     WHERE ${conditions.join(" AND ")}
     ${folderVisibilitySql}`, values);
  return rows[0]?.total || 0;
}
export async function getPortalVaultFileRecord(clientId, fileId) {
  const ready = await ensureVisibleToClientColumn();
  if (!ready || !(await hasVisibleToClientColumn())) return null;
  const {
    rows
  } = await pool.query(`SELECT cf.id, cf.client_id, cf.file_name, cf.file_path, cf.mime_type, cf.size_bytes, cf.category, cf.description, cf.created_at, cf.folder_id
     FROM v_b_client_files cf
     WHERE cf.id = $1 AND cf.client_id = $2 AND cf.is_deleted = FALSE AND cf.visible_to_client = TRUE
       AND (
         cf.folder_id IS NULL
         OR NOT EXISTS (
           WITH RECURSIVE ancestors AS (
             SELECT id, parent_id, COALESCE(visible_to_client, FALSE) AS visible_to_client, is_deleted
               FROM v_b_client_file_folders
              WHERE id = cf.folder_id
             UNION ALL
             SELECT f.id, f.parent_id, COALESCE(f.visible_to_client, FALSE), f.is_deleted
               FROM v_b_client_file_folders f
               JOIN ancestors a ON f.id = a.parent_id
           )
           SELECT 1 FROM ancestors
            WHERE is_deleted = TRUE OR visible_to_client = FALSE
         )
       )
     LIMIT 1`, [fileId, Number(clientId)]);
  return rows[0] || null;
}
export function resolveClientFileDiskPath(filePath) {
  const fileName = path.basename(String(filePath || ""));
  if (!fileName) return null;
  const fullPath = path.join(CLIENT_FILES_UPLOAD_DIR, fileName);
  if (!fs.existsSync(fullPath)) return null;
  return fullPath;
}
