import { getSiteDisplayName, getSiteId, normalizeClientSites } from "../../utils/clientSites";

export function getContactClientOptions(contact, clients = []) {
  const linked = Array.isArray(contact?.clients) ? contact.clients : [];
  if (linked.length > 0) {
    return linked.map(row => {
      const id = row.id ?? row.client_id;
      const listed = clients.find(c => String(c.id) === String(id));
      return {
        id,
        name: row.name || row.client_name || listed?.name || listed?.nom || (id != null ? `Client #${id}` : "")
      };
    }).filter(row => row.id != null);
  }
  if (contact?.client_id) {
    const listed = clients.find(c => String(c.id) === String(contact.client_id));
    return [{
      id: contact.client_id,
      name: contact.client_name || contact.entreprise || listed?.name || listed?.nom || `Client #${contact.client_id}`
    }];
  }
  return [];
}

/**
 * Sites disponibles pour un ticket : lieux de l'entreprise, filtrés par les
 * liens contact↔site lorsqu'ils existent pour cette entreprise.
 */
export function getContactSiteOptions(contact, clientId, clients = []) {
  if (clientId == null || clientId === "") return [];
  const client = (Array.isArray(clients) ? clients : []).find(c => String(c.id) === String(clientId));
  const allSites = normalizeClientSites(client?.sites);
  if (allSites.length === 0) return [];

  const membership = (Array.isArray(contact?.clients) ? contact.clients : []).find(
    m => String(m.client_id ?? m.id) === String(clientId)
  );
  const fromMembership = [
    ...(Array.isArray(membership?.site_ids) ? membership.site_ids : []),
    ...(Array.isArray(membership?.sites) ? membership.sites.map(s => s?.site_id ?? s?.id) : [])
  ].map(id => String(id || "").trim()).filter(Boolean);

  const fromContactSites = (Array.isArray(contact?.sites) ? contact.sites : [])
    .filter(s => String(s?.client_id) === String(clientId))
    .map(s => String(s?.site_id ?? s?.id ?? "").trim())
    .filter(Boolean);

  const linkedIds = [...new Set(fromMembership.length > 0 ? fromMembership : fromContactSites)];
  if (linkedIds.length === 0) {
    return allSites.map(site => ({
      id: getSiteId(site),
      name: getSiteDisplayName(site)
    }));
  }

  const filtered = allSites
    .filter(site => linkedIds.includes(String(getSiteId(site))))
    .map(site => ({
      id: getSiteId(site),
      name: getSiteDisplayName(site)
    }));
  return filtered.length > 0
    ? filtered
    : allSites.map(site => ({
        id: getSiteId(site),
        name: getSiteDisplayName(site)
      }));
}

export function resolveSiteLabel(siteId, siteOptions = [], clients = [], clientId = null) {
  const id = String(siteId || "").trim();
  if (!id) return "";
  const fromOptions = (Array.isArray(siteOptions) ? siteOptions : []).find(s => String(s.id) === id);
  if (fromOptions?.name) return fromOptions.name;
  const client = (Array.isArray(clients) ? clients : []).find(c => String(c.id) === String(clientId));
  const match = normalizeClientSites(client?.sites).find(site => String(getSiteId(site)) === id);
  return match ? getSiteDisplayName(match) : "";
}
