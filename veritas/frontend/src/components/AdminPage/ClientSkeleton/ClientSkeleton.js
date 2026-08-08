import { useEffect, useState, useRef } from "react";
import styles from "../AdminPanel.module.css";
import { deleteClient as deleteClientAPI } from "../../../api/clients";
import { loadAdminClientsListCached, ADMIN_CLIENTS_LIST_CACHE_KEY } from "../adminClientsListHelpers";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import ClientModal from "./ClientModal";
const formatDate = dateString => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
};
const INFRA_KEYS = ["Internet", "Firewall", "Firewalls", "Serveurs", "Stockage", "NAS", "Switch", "BorneWifi"];
const CYBER_KEYS = ["Antivirus", "Antispam", "Campaign", "Campagne", "Sauvegarde"];
const SERVICE_KEYS = ["Office365", "NDD"];
const getModulesSnapshot = client => {
  const raw = client?.modules_monitoring || client?.modules || {};
  if (raw && typeof raw === "object") return raw;
  return {};
};
const countEnabledByKeys = (client, keys) => {
  const modules = getModulesSnapshot(client);
  return keys.reduce((total, key) => total + (modules?.[key] ? 1 : 0), 0);
};
const countTotalAssets = client => countEnabledByKeys(client, INFRA_KEYS) + countEnabledByKeys(client, CYBER_KEYS) + countEnabledByKeys(client, SERVICE_KEYS);
export default function ClientSkeleton({
  isLoading
}) {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteIds, setConfirmDeleteIds] = useState([]);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedClientIds, setSelectedClientIds] = useState(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const clientsLoadAbortRef = useRef(null);
  useEffect(() => {
    clientsLoadAbortRef.current?.abort();
    const ac = new AbortController();
    clientsLoadAbortRef.current = ac;
    loadAdminClientsListCached({
      signal: ac.signal,
      cacheKey: ADMIN_CLIENTS_LIST_CACHE_KEY
    }).then(rows => {
      if (!ac.signal.aborted) setClients(rows);
    }).catch(err => {
      if (err?.name !== "AbortError") console.error(err);
    });
    return () => ac.abort();
  }, []);
  useEffect(() => {
    let filtered = clients;
    if (searchTerm.trim()) {
      filtered = clients.filter(client => client.name?.toLowerCase().includes(searchTerm.toLowerCase()) || client.email?.toLowerCase().includes(searchTerm.toLowerCase()) || client.phone?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (sortKey) {
      filtered = [...filtered].sort((a, b) => {
        let aVal = a[sortKey];
        let bVal = b[sortKey];
        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';
        if (sortKey === "infra_count") {
          aVal = countEnabledByKeys(a, INFRA_KEYS);
          bVal = countEnabledByKeys(b, INFRA_KEYS);
        }
        if (sortKey === "cyber_count") {
          aVal = countEnabledByKeys(a, CYBER_KEYS);
          bVal = countEnabledByKeys(b, CYBER_KEYS);
        }
        if (sortKey === "service_count") {
          aVal = countEnabledByKeys(a, SERVICE_KEYS);
          bVal = countEnabledByKeys(b, SERVICE_KEYS);
        }
        if (sortKey === 'contrat_debut') {
          aVal = a.contrat?.debut || '';
          bVal = b.contrat?.debut || '';
        }
        if (sortKey === 'contrat_fin') {
          aVal = a.contrat?.expiration || '';
          bVal = b.contrat?.expiration || '';
        }
        if (sortKey === 'sites') {
          aVal = a.sites?.length || 0;
          bVal = b.sites?.length || 0;
        }
        if (typeof aVal !== 'string') aVal = String(aVal);
        if (typeof bVal !== 'string') bVal = String(bVal);
        const comparison = aVal.localeCompare(bVal, 'fr', {
          numeric: true
        });
        return sortDir === 'asc' ? comparison : -comparison;
      });
    }
    setFilteredClients(filtered);
  }, [clients, searchTerm, sortKey, sortDir]);
  useEffect(() => {
    setPage(1);
  }, [searchTerm, sortKey, sortDir, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);
  useEffect(() => {
    setSelectedClientIds(prev => {
      const validIds = new Set(clients.map(client => client.id));
      const next = new Set();
      prev.forEach(id => {
        if (validIds.has(id)) next.add(id);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [clients]);
  const isClientDeletable = client => countTotalAssets(client) === 0;
  const currentPage = Math.min(page, totalPages);
  const pageStartIndex = filteredClients.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEndIndex = Math.min(currentPage * pageSize, filteredClients.length);
  const paginatedClients = filteredClients.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const deletablePaginatedClients = paginatedClients.filter(isClientDeletable);
  const allDeletablePageSelected = deletablePaginatedClients.length > 0 && deletablePaginatedClients.every(client => selectedClientIds.has(client.id));
  const selectedCount = selectedClientIds.size;
  const toggleSort = key => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };
  const toggleSelectClient = clientId => {
    setSelectedClientIds(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);else next.add(clientId);
      return next;
    });
  };
  const toggleSelectAllPage = () => {
    setSelectedClientIds(prev => {
      const next = new Set(prev);
      if (allDeletablePageSelected) {
        deletablePaginatedClients.forEach(client => next.delete(client.id));
      } else {
        deletablePaginatedClients.forEach(client => next.add(client.id));
      }
      return next;
    });
  };
  const clearSelection = () => setSelectedClientIds(new Set());
  const openDeleteConfirmation = ids => {
    const uniqueIds = [...new Set(ids)].filter(Boolean);
    if (uniqueIds.length === 0) return;
    setConfirmDeleteIds(uniqueIds);
  };
  const openBulkDeleteConfirmation = () => {
    const ids = [...selectedClientIds].filter(id => {
      const client = clients.find(item => item.id === id);
      return client && isClientDeletable(client);
    });
    if (ids.length === 0) {
      toast.error("Noe of the selected companies can be deleted (assets detected).");
      return;
    }
    openDeleteConfirmation(ids);
  };
  const closeDeleteConfirmation = () => {
    if (bulkDeleting) return;
    setConfirmDeleteIds([]);
  };
  const removeClientsFromState = deletedIds => {
    const deletedSet = new Set(deletedIds);
    setClients(prev => prev.filter(client => !deletedSet.has(client.id)));
    try {
      const raw = sessionStorage.getItem(ADMIN_CLIENTS_LIST_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.data)) return;
      const nextData = parsed.data.filter(client => !deletedSet.has(client.id));
      sessionStorage.setItem(ADMIN_CLIENTS_LIST_CACHE_KEY, JSON.stringify({
        savedAt: Date.now(),
        data: nextData
      }));
    } catch {}
  };
  const confirmDelete = async () => {
    const idsToDelete = [...confirmDeleteIds];
    if (idsToDelete.length === 0) return;
    setBulkDeleting(true);
    try {
      const results = await Promise.allSettled(idsToDelete.map(id => deleteClientAPI(id)));
      const succeededIds = idsToDelete.filter((_, index) => results[index].status === "fulfilled");
      const failed = results.length - succeededIds.length;
      if (succeededIds.length > 0) {
        removeClientsFromState(succeededIds);
        setSelectedClientIds(prev => {
          const next = new Set(prev);
          succeededIds.forEach(id => next.delete(id));
          return next;
        });
        window.dispatchEvent(new CustomEvent("refreshEnterprises"));
        toast.success(succeededIds.length === 1 ? "Company deleted." : `${succeededIds.length} company${succeededIds.length > 1 ? "s" : ""} deleted${succeededIds.length > 1 ? "s" : ""}.`);
      }
      if (failed > 0) {
        const firstError = results.find(result => result.status === "rejected");
        toast.error(failed === 1 ? firstError?.reason?.message || "Delete failed." : `${failed} deletion${failed > 1 ? "s" : ""} failed.`);
      }
    } catch (error) {
      toast.error(error?.message || "Delete failed");
    } finally {
      setBulkDeleting(false);
      setConfirmDeleteIds([]);
    }
  };
  return <div className={styles.simpleContent}>
      <div style={{
      width: '100%'
    }}>
        <div className={styles.sectionBlock} style={{
        padding: '1.5rem',
        boxShadow: 'none',
        marginBottom: 0
      }}>
          <div className={`${styles.sectionHeader} ${styles.adminTablesHeaderRow}`}>
            <h3 className={styles.sectionTitle} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}>
              <Icon icon="mingcute:building-1-fill" style={{
              fontSize: '1.4rem',
              color: '#13BA8E'
            }} />
              Company management
            </h3>
            <div className={styles.adminHeaderSearchSlot}>
              <div className={`${styles.searchInputWrapper} ${styles.searchInputWrapperCentered}`}>
                <input type="text" className={styles.searchInput} placeholder="Search by name, email or phone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                {searchTerm && <button onClick={() => setSearchTerm('')} className={styles.searchClearButton} title="Clear search">
                    <Icon icon="mingcute:close-circle-fill" style={{
                  fontSize: '1.1rem'
                }} />
                  </button>}
              </div>
            </div>
          </div>
          <div className={styles.searchMeta}>
            {filteredClients.length} company{filteredClients.length > 1 ? "s" : ""} found{filteredClients.length > 1 ? "s" : ""}
          </div>

          {selectedCount > 0 && <div className={styles.bulkActionsBar}>
              <span className={styles.bulkActionsInfo}>
                {selectedCount} company{selectedCount > 1 ? "s" : ""} selected{selectedCount > 1 ? "s" : ""}
              </span>
              <div className={styles.bulkActionsButtons}>
                <button type="button" className={styles.bulkActionButton} onClick={clearSelection}>
                  Deselect all
                </button>
                <button type="button" className={`${styles.bulkActionButton} ${styles.bulkActionButtonDanger}`} onClick={openBulkDeleteConfirmation}>
                  <Icon icon="mingcute:delete-2-fill" />
                  Delete selection
                </button>
              </div>
            </div>}

          {}
          <div className={`${styles.userTableWrapper} ${styles.cleanTableWrapper}`}>
            <table className={`${styles.userTable} ${styles.clientTable}`}>
              <thead>
                <tr>
                  <th className={styles.tableCheckboxCell}>
                    <input type="checkbox" className={styles.tableCheckbox} checked={allDeletablePageSelected} disabled={deletablePaginatedClients.length === 0} onChange={toggleSelectAllPage} title="Select deletable companies on this page" aria-label="Select deletable companies on this page" />
                  </th>
                  <th onClick={() => toggleSort('name')} style={{
                  cursor: 'pointer'
                }}>
                    NAME {sortKey === 'name' ? sortDir === 'asc' ? '▲' : '▼' : ''}
                  </th>
                  <th onClick={() => toggleSort("infra_count")} style={{
                  cursor: 'pointer'
                }}>
                    INFRA {sortKey === "infra_count" ? sortDir === "asc" ? "▲" : "▼" : ""}
                  </th>
                  <th onClick={() => toggleSort("cyber_count")} style={{
                  cursor: 'pointer'
                }}>
                    CYBER {sortKey === "cyber_count" ? sortDir === "asc" ? "▲" : "▼" : ""}
                  </th>
                  <th onClick={() => toggleSort("service_count")} style={{
                  cursor: 'pointer'
                }}>
                    SERVICE {sortKey === "service_count" ? sortDir === "asc" ? "▲" : "▼" : ""}
                  </th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClients.length === 0 && <tr>
                    <td colSpan={6} style={{
                  textAlign: "center",
                  padding: "1.25rem",
                  color: "#64748b"
                }}>
                      No companies to display
                    </td>
                  </tr>}
                {paginatedClients.map(client => {
                const canDelete = isClientDeletable(client);
                return <tr key={client.id} className={styles.userRow}>
                    <td className={styles.tableCheckboxCell}>
                      <input type="checkbox" className={styles.tableCheckbox} checked={selectedClientIds.has(client.id)} disabled={!canDelete} onChange={() => toggleSelectClient(client.id)} onClick={e => e.stopPropagation()} title={canDelete ? "Select for deletion" : "Cannot delete: assets detected"} aria-label={canDelete ? `Select ${client.name || "the company"}` : "Company cannot be deleted"} />
                    </td>
                    <td>{client.name || "-"}</td>
                    <td>{countEnabledByKeys(client, INFRA_KEYS)}</td>
                    <td>{countEnabledByKeys(client, CYBER_KEYS)}</td>
                    <td>{countEnabledByKeys(client, SERVICE_KEYS)}</td>
                    <td className={styles.actionsCell}>
                      <button className={`${styles.actionButton} ${styles.danger}`} disabled={!canDelete} onClick={e => {
                      e.stopPropagation();
                      if (!canDelete) {
                        toast.error("Cannot delete: this company has assets.");
                        return;
                      }
                      openDeleteConfirmation([client.id]);
                    }} title={canDelete ? "Delete" : "Cannot delete: assets detected"}>
                        <Icon icon="mingcute:delete-2-fill" />
                      </button>
                    </td>
                  </tr>;
              })}
              </tbody>
            </table>
          </div>
          {filteredClients.length > 0 && <div className={styles.paginationBar}>
              <div className={styles.paginationLeft}>
                <span className={styles.paginationLabel}>Rows per page</span>
                <select className={styles.paginationSelect} value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className={styles.paginationRange}>
                  {pageStartIndex}-{pageEndIndex} of {filteredClients.length}
                </span>
              </div>
              <div className={styles.paginationRight}>
                <button type="button" className={styles.paginationButton} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} title="Previous page">
                  <FaChevronLeft />
                </button>
                <span className={styles.paginationInfo}>Page {currentPage} / {totalPages}</span>
                <button type="button" className={styles.paginationButton} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} title="Next page">
                  <FaChevronRight />
                </button>
              </div>
            </div>}
        </div>
      </div>

      {}
      {showModal && <ClientModal initialClient={selectedClient} onClose={async () => {
      const refreshed = await loadAdminClientsListCached({
        force: true,
        cacheKey: ADMIN_CLIENTS_LIST_CACHE_KEY
      });
      setClients(refreshed);
      setShowModal(false);
    }} />}

      {}
      {confirmDeleteIds.length > 0 && <div className={styles.modalOverlay} onClick={closeDeleteConfirmation}>
          <div className={styles.modalContent} style={{
        maxWidth: '500px'
      }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
                <Icon icon="mingcute:delete-2-fill" className={styles.modalIcon} />
                <h3>
                  {confirmDeleteIds.length === 1 ? "Delete company" : `Delete ${confirmDeleteIds.length} companies`}
                </h3>
              </div>
              <button className={styles.closeButton} onClick={closeDeleteConfirmation} disabled={bulkDeleting} title="Close">
                <Icon icon="mingcute:close-line" />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{
            margin: 0,
            fontSize: '0.95rem',
            lineHeight: 1.6,
            color: '#1a1a1a'
          }}>
                {confirmDeleteIds.length === 1 ? "Are you sure you want to delete this company? This action cannot be undone." : `Are you sure you want to delete these ${confirmDeleteIds.length} companies? This action cannot be undone.`}
              </p>
            </div>

            <div className={styles.modalActions} style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem'
        }}>
              <button type="button" className={styles.secondaryButton} onClick={closeDeleteConfirmation} disabled={bulkDeleting}>
                Cancel
              </button>
              <button type="button" className={styles.primaryButton} onClick={confirmDelete} disabled={bulkDeleting} style={{
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            boxShadow: '0 10px 20px rgba(220, 38, 38, 0.35)',
            cursor: bulkDeleting ? 'not-allowed' : 'pointer',
            opacity: bulkDeleting ? 0.6 : 1
          }} onMouseEnter={e => {
            if (!bulkDeleting) {
              e.currentTarget.style.backgroundColor = '#b91c1c';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(185, 28, 28, 0.5)';
            }
          }} onMouseLeave={e => {
            if (!bulkDeleting) {
              e.currentTarget.style.backgroundColor = '#dc2626';
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(220, 38, 38, 0.35)';
            }
          }} title="Delete permanently">
                <Icon icon="mingcute:delete-2-fill" style={{
              fontSize: '1.1rem'
            }} />
                {bulkDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>}
    </div>;
}
