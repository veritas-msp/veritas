import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "../AdminPanel.module.css";
import { loadAdminClientsListCached, ADMIN_CLIENTS_LIST_CACHE_KEY } from "../adminClientsListHelpers";
import Icon from "@mdi/react";
import { Icon as IconifyIcon } from "@iconify/react";
import { mdiWeb, mdiWallFire, mdiWifiMarker, mdiBug } from "@mdi/js";
import { FaEthernet } from "react-icons/fa";
import { IoServerSharp } from "react-icons/io5";
import MonitoringClientModal from "./MonitoringClientModal";
import ContentLoader from "react-content-loader";
export default function MonitoringClientSkeleton({
  isLoading,
  searchTerm: externalSearchTerm = "",
  setSearchTerm: externalSetSearchTerm
}) {
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
  const setSearchTerm = externalSetSearchTerm || setInternalSearchTerm;
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [filteredClients, setFilteredClients] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const clientsLoadAbortRef = useRef(null);
  const getModuleColor = moduleKey => {
    const key = String(moduleKey || "").replace(/\s+/g, "").toLowerCase();
    const infraColor = "#2563eb";
    const cyberColor = "#ef4444";
    const serviceColor = "#8b5cf6";
    if (["switch", "bornewifi", "internet", "serveurs", "stockage", "firewall"].includes(key)) return infraColor;
    if (["sauvegarde", "antivirus", "antispam"].includes(key)) return cyberColor;
    if (["ndd", "office365"].includes(key)) return serviceColor;
    return "#1a1a1a";
  };
  const getDeviceCount = (client, moduleKey) => {
    const key = String(moduleKey || "").replace(/\s+/g, "").toLowerCase();
    const equipements = client.equipements || {};
    switch (key) {
      case "internet":
        return Array.isArray(equipements.Internet) ? equipements.Internet.length : 0;
      case "serveurs":
        return Array.isArray(equipements.Serveurs) ? equipements.Serveurs.length : 0;
      case "stockage":
        return Array.isArray(equipements.NAS) ? equipements.NAS.length : 0;
      case "firewall":
        return Array.isArray(equipements.Firewalls) ? equipements.Firewalls.length : 0;
      case "switch":
        return Array.isArray(equipements.Switch) ? equipements.Switch.length : 0;
      case "bornewifi":
        return Array.isArray(equipements.BorneWifi) ? equipements.BorneWifi.length : 0;
      case "sauvegarde":
        return Array.isArray(equipements.Sauvegarde?.jobs) ? equipements.Sauvegarde.jobs.length : 0;
      case "antivirus":
        return null;
      case "antispam":
        return null;
      case "ndd":
        return Array.isArray(equipements.NDD) ? equipements.NDD.length : 0;
      case "office365":
        return null;
      case "toip":
        return Array.isArray(equipements.TOIP) ? equipements.TOIP.length : 0;
      default:
        return null;
    }
  };
  const renderModuleIcon = moduleKey => {
    const raw = String(moduleKey || "");
    const key = raw.replace(/\s+/g, "").toLowerCase();
    const color = getModuleColor(key);
    switch (key) {
      case "internet":
        return <Icon path={mdiWeb} size={1.1} color={color} />;
      case "serveurs":
        return <IconifyIcon icon="mingcute:server-fill" width={26} height={26} color={color} />;
      case "stockage":
        return <IoServerSharp size={26} color={color} />;
      case "firewall":
        return <Icon path={mdiWallFire} size={1.05} color={color} />;
      case "switch":
        return <FaEthernet size={24} color={color} />;
      case "bornewifi":
        return <Icon path={mdiWifiMarker} size={1.05} color={color} />;
      case "sauvegarde":
        return <IconifyIcon icon="material-symbols:backup" width={24} height={24} color={color} />;
      case "antivirus":
        return <Icon path={mdiBug} size={1.05} color={color} />;
      case "antispam":
        return <IconifyIcon icon="material-symbols:mail-shield-outline" width={24} height={24} color={color} />;
      case "ndd":
        return <IconifyIcon icon="stash:domain" width={24} height={24} color={color} />;
      case "office365":
        return <IconifyIcon icon="hugeicons:office-365" width={24} height={24} color={color} />;
      default:
        return null;
    }
  };
  useEffect(() => {
    clientsLoadAbortRef.current?.abort();
    const ac = new AbortController();
    clientsLoadAbortRef.current = ac;
    loadAdminClientsListCached({
      signal: ac.signal,
      cacheKey: ADMIN_CLIENTS_LIST_CACHE_KEY
    }).then(allClients => {
      if (ac.signal.aborted) return;
      const monitoringClients = allClients.filter(client => client.modules && (client.modules.Monitoring === true || client.modules.monitoring === true));
      setClients(monitoringClients);
      setFilteredClients(monitoringClients);
    }).catch(err => {
      if (err?.name !== "AbortError") console.error(err);
    });
    return () => ac.abort();
  }, []);
  const toggleSort = key => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };
  useEffect(() => {
    let filtered = [...clients];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(client => client.name?.toLowerCase().includes(term));
    }
    if (sortKey) {
      filtered = filtered.sort((a, b) => {
        let aVal = a[sortKey];
        let bVal = b[sortKey];
        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';
        if (typeof aVal !== 'string') aVal = String(aVal);
        if (typeof bVal !== 'string') bVal = String(bVal);
        const comparison = aVal.localeCompare(bVal, 'fr', {
          numeric: true
        });
        return sortDir === 'asc' ? comparison : -comparison;
      });
    }
    setFilteredClients(filtered);
  }, [clients, sortKey, sortDir, searchTerm]);
  useEffect(() => {
    setPage(1);
  }, [sortKey, sortDir, clients, searchTerm]);
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedClients = filteredClients.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return <div>
      {}
      {searchTerm && <div style={{
      marginBottom: '1rem',
      textAlign: 'right'
    }}>
          <span className={styles.searchMeta}>
            {filteredClients.length} result{filteredClients.length > 1 ? 's' : ''}
          </span>
        </div>}

      {}
      <div className={`${styles.userTableWrapper} ${styles.clientTableFixedHeight}`}>
        <table className={styles.userTable}>
          <thead>
            <tr>
              <th onClick={() => toggleSort('name')} style={{
              cursor: 'pointer'
            }}>
                NAME {sortKey === 'name' ? sortDir === 'asc' ? '▲' : '▼' : ''}
              </th>
              <th>FREQUENCY</th>
              <th>ENABLED MODULES</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? Array.from({
            length: 6
          }).map((_, i) => <tr key={`skeleton-${i}`} className={styles.userRow} style={{
            opacity: 0.9
          }}>
                    {['40%', '25%', '35%'].map((width, idx) => <td key={idx}>
                        <ContentLoader speed={1.6} width="100%" height={32} viewBox="0 0 100 32" backgroundColor="#2f3136" foregroundColor="#3a3d44" style={{
                width: '100%',
                height: '28px'
              }}>
                          <rect x="0" y="8" rx="6" ry="6" width={width} height="14" />
                        </ContentLoader>
                      </td>)}
                  </tr>) : paginatedClients.map(client => <tr key={client.id} className={styles.userRow} onClick={() => {
            setSelectedClient(client);
            setShowModal(true);
          }} style={{
            cursor: 'pointer'
          }}>
                    <td style={{
              fontSize: '0.9rem',
              fontWeight: 'normal'
            }}>{client.name}</td>
                    <td>
                      <span style={{
                display: 'inline-block',
                padding: '0.25rem 0.5rem',
                background: '#13BA8E',
                color: '#0B3327',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: '500'
              }}>
                        {client.report_frequency || "Not set"}
                      </span>
                    </td>
                    <td>
                      <div style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap'
              }}>
                        {(() => {
                  const moduleOrder = ["Internet", "Serveurs", "Stockage", "Firewall", "Switch", "BorneWifi", "Sauvegarde", "Antivirus", "Antispam", "NDD", "Office365"];
                  return moduleOrder.filter(key => client.modules_monitoring?.[key]).map(key => <span key={key} alt={key} title={key} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px'
                  }}>
                                {renderModuleIcon(key)}
                              </span>);
                })()}
                        {Object.values(client.modules_monitoring || {}).every(v => !v) && <span>-</span>}
                      </div>
                    </td>
                  </tr>)}
          </tbody>
        </table>
      </div>
      <div className={styles.pagination}>
        <button className={styles.paginationButton} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} title="Previous page">
          <IconifyIcon icon="mdi:chevron-left" />
        </button>
        <span className={styles.paginationInfo}>{currentPage} / {totalPages}</span>
        <button className={styles.paginationButton} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} title="Next page">
          <IconifyIcon icon="mdi:chevron-right" />
        </button>
      </div>

      {}
      {showModal && createPortal(<>
            <div className={styles.modalOverlay} onClick={() => setShowModal(false)} />
            <MonitoringClientModal initialClient={selectedClient} onClose={async () => {
        const refreshed = await loadAdminClientsListCached({
          force: true,
          cacheKey: ADMIN_CLIENTS_LIST_CACHE_KEY
        });
        const monitoringClients = refreshed.filter(client => client.modules && (client.modules.Monitoring === true || client.modules.monitoring === true));
        setClients(monitoringClients);
        setShowModal(false);
      }} />
          </>, document.body)}
    </div>;
}
