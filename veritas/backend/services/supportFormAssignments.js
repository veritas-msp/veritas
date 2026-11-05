import { pool } from "../database/db.js";
import { getUserTeamIds, hasAssignmentTargets, mapViewAssignments, userCanAccessAssignedView } from "./ticketViewAssignments.js";
export { getUserTeamIds, hasAssignmentTargets, userCanAccessAssignedView };
function emptyAssignments() {
  return {
    profileNames: [],
    userIds: [],
    teamIds: []
  };
}
function emptyPortalAudience() {
  return {
    portalClientIds: [],
    portalContactIds: [],
    portalClients: [],
    portalContacts: []
  };
}
function normalizeIdList(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).map(value => String(value || "").trim()).filter(Boolean))];
}
export async function loadAssignmentsByFormIds(formIds = []) {
  if (!formIds.length) return {};
  const [profiles, users, teams] = await Promise.all([pool.query(`SELECT form_id, profile_name
       FROM v_b_support_form_profiles
       WHERE form_id = ANY($1::text[])
       ORDER BY profile_name ASC`, [formIds]), pool.query(`SELECT fu.form_id, fu.user_id, u.email, u.username
       FROM v_b_support_form_users fu
       JOIN v_b_users u ON u.id = fu.user_id
       WHERE fu.form_id = ANY($1::text[])
       ORDER BY u.email ASC`, [formIds]), pool.query(`SELECT ft.form_id, ft.team_id, t.name AS team_name
       FROM v_b_support_form_teams ft
       JOIN v_b_teams t ON t.id = ft.team_id
       WHERE ft.form_id = ANY($1::text[])
       ORDER BY t.name ASC`, [formIds])]);
  const map = {};
  for (const id of formIds) {
    map[String(id)] = emptyAssignments();
  }
  for (const row of profiles.rows || []) {
    const key = String(row.form_id);
    map[key].profileNames.push(row.profile_name);
  }
  for (const row of users.rows || []) {
    const key = String(row.form_id);
    map[key].userIds.push(String(row.user_id));
    map[key].users = map[key].users || [];
    map[key].users.push({
      id: row.user_id,
      email: row.email || "",
      username: row.username || ""
    });
  }
  for (const row of teams.rows || []) {
    const key = String(row.form_id);
    map[key].teamIds.push(String(row.team_id));
    map[key].teams = map[key].teams || [];
    map[key].teams.push({
      id: row.team_id,
      name: row.team_name || ""
    });
  }
  return map;
}
export async function loadPortalAudienceByFormIds(formIds = []) {
  if (!formIds.length) return {};
  const map = {};
  for (const id of formIds) {
    map[String(id)] = emptyPortalAudience();
  }
  try {
    const [clients, contacts] = await Promise.all([
      pool.query(
        `SELECT fc.form_id, fc.client_id, COALESCE(c.name, c.nom, '') AS client_name
           FROM v_b_support_form_portal_clients fc
           LEFT JOIN v_b_clients c ON c.id = fc.client_id
          WHERE fc.form_id = ANY($1::text[])
          ORDER BY client_name ASC`,
        [formIds]
      ),
      pool.query(
        `SELECT fc.form_id, fc.contact_id,
                COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ct.prenom, ''), ' ', COALESCE(ct.nom, ''))), ''), ct.email, '') AS contact_label,
                ct.email AS contact_email
           FROM v_b_support_form_portal_contacts fc
           LEFT JOIN v_b_contacts ct ON ct.id = fc.contact_id
          WHERE fc.form_id = ANY($1::text[])
          ORDER BY contact_label ASC`,
        [formIds]
      )
    ]);
    for (const row of clients.rows || []) {
      const key = String(row.form_id);
      const clientId = String(row.client_id);
      map[key].portalClientIds.push(clientId);
      map[key].portalClients.push({
        id: clientId,
        name: row.client_name || `#${clientId}`
      });
    }
    for (const row of contacts.rows || []) {
      const key = String(row.form_id);
      const contactId = String(row.contact_id);
      map[key].portalContactIds.push(contactId);
      map[key].portalContacts.push({
        id: contactId,
        label: row.contact_label || row.contact_email || `#${contactId}`,
        email: row.contact_email || ""
      });
    }
  } catch (err) {
    // Tables may not exist yet during rolling migration.
    if (String(err?.code) !== "42P01") {
      console.warn("loadPortalAudienceByFormIds:", err.message);
    }
  }
  return map;
}
export async function syncFormAssignments(formId, assignments = {}) {
  const profileNames = [...new Set((assignments.profileNames || []).map(n => String(n || "").trim()).filter(Boolean))];
  const userIds = [...new Set((assignments.userIds || []).map(n => String(n || "").trim()).filter(Boolean))];
  const teamIds = [...new Set((assignments.teamIds || []).map(n => String(n || "").trim()).filter(Boolean))];
  await pool.query(`DELETE FROM v_b_support_form_profiles WHERE form_id = $1`, [formId]);
  await pool.query(`DELETE FROM v_b_support_form_users WHERE form_id = $1`, [formId]);
  await pool.query(`DELETE FROM v_b_support_form_teams WHERE form_id = $1`, [formId]);
  for (const profileName of profileNames) {
    await pool.query(`INSERT INTO v_b_support_form_profiles (form_id, profile_name) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [formId, profileName]);
  }
  for (const userId of userIds) {
    await pool.query(`INSERT INTO v_b_support_form_users (form_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [formId, userId]);
  }
  for (const teamId of teamIds) {
    await pool.query(`INSERT INTO v_b_support_form_teams (form_id, team_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [formId, teamId]);
  }
  return {
    profileNames,
    userIds,
    teamIds
  };
}
export async function syncFormPortalAudience(formId, audience = {}) {
  const portalClientIds = normalizeIdList(audience.portalClientIds);
  const portalContactIds = normalizeIdList(audience.portalContactIds);
  await pool.query(`DELETE FROM v_b_support_form_portal_clients WHERE form_id = $1`, [formId]);
  await pool.query(`DELETE FROM v_b_support_form_portal_contacts WHERE form_id = $1`, [formId]);
  for (const clientId of portalClientIds) {
    await pool.query(
      `INSERT INTO v_b_support_form_portal_clients (form_id, client_id)
       VALUES ($1, $2::int)
       ON CONFLICT DO NOTHING`,
      [formId, clientId]
    );
  }
  for (const contactId of portalContactIds) {
    await pool.query(
      `INSERT INTO v_b_support_form_portal_contacts (form_id, contact_id)
       VALUES ($1, $2::int)
       ON CONFLICT DO NOTHING`,
      [formId, contactId]
    );
  }
  return {
    portalClientIds,
    portalContactIds
  };
}
export function mapFormAssignments(assignments = emptyAssignments()) {
  return mapViewAssignments(assignments);
}
export function mapFormPortalAudience(audience = emptyPortalAudience()) {
  return {
    portalClientIds: Array.isArray(audience.portalClientIds) ? audience.portalClientIds.map(String) : [],
    portalContactIds: Array.isArray(audience.portalContactIds) ? audience.portalContactIds.map(String) : [],
    portalClients: Array.isArray(audience.portalClients) ? audience.portalClients : [],
    portalContacts: Array.isArray(audience.portalContacts) ? audience.portalContacts : []
  };
}
export function hasPortalAudienceTargets(audience = {}) {
  return normalizeIdList(audience.portalClientIds).length > 0 || normalizeIdList(audience.portalContactIds).length > 0;
}
export function userCanAccessForm(form, assignments, userId, profileName, userTeamIds = []) {
  if (!form) return false;
  if (form.visibleToAgents === false) return false;
  if (form.visibility !== "assigned") return true;
  return userCanAccessAssignedView(assignments, userId, profileName, userTeamIds);
}
export function portalUserCanAccessForm(form, audience = emptyPortalAudience(), {
  clientId = null,
  contactId = null
} = {}) {
  if (!form || form.visibleToPortal !== true) return false;
  if (form.portalVisibleToAll === true) return true;
  const clientIds = new Set((audience.portalClientIds || []).map(String));
  const contactIds = new Set((audience.portalContactIds || []).map(String));
  if (clientId != null && clientId !== "" && clientIds.has(String(clientId))) return true;
  if (contactId != null && contactId !== "" && contactIds.has(String(contactId))) return true;
  return false;
}
