import { useEffect, useState, useMemo } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { fetchClientPortalUsers, setClientPortalUserActive, resetClientPortalUserPassword, deleteClientPortalUser } from "../../api/contactPortal";
import { useVeritasEdition } from "../../hooks/useVeritasEdition";
import { getCommunityClientPortalLimit } from "../../config/edition";
import ProFeatureBadge from "../Misc/ProFeature/ProFeatureBadge";
import CommunityFeatureBadge from "../Misc/ProFeature/CommunityFeatureBadge";
import ClientPortalDeleteModal from "./ClientPortalDeleteModal";
import { Modal, ModalFooter, ModalForm, ModalFormSection, IconField, Input, Page, Card } from "./AdminUi";
import ui from "./AdminUi.module.css";
import s from "./AdminUsers.module.css";
import { useAdminClientPortalCopy } from "../../hooks/useAdminCopy";
import { formatAccountCount, interpolate } from "./adminClientPortalI18n";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
export default function AdminClientPortal({
  isCommunity = false
}) {
  const locale = useAppLocale();
  const copy = useAdminClientPortalCopy();
  const {
    limits
  } = useVeritasEdition();
  const maxPortalUsers = isCommunity ? getCommunityClientPortalLimit(limits) : null;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [resetUserId, setResetUserId] = useState(null);
  const [resetPwd1, setResetPwd1] = useState("");
  const [resetPwd2, setResetPwd2] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortKey, setSortKey] = useState("contact");
  const [sortDir, setSortDir] = useState("asc");
  const getContactSortName = user => [user.contact_prenom, user.contact_nom].filter(Boolean).join(" ").toLowerCase() || String(user.contact_id || "").toLowerCase();
  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchClientPortalUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || copy.toast.loadError);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => [u.email, u.username, u.client_name, u.contact_nom, u.contact_prenom].filter(Boolean).some(v => String(v).toLowerCase().includes(q)));
  }, [users, search]);
  const sortedUsers = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const val = (user, key) => {
      switch (key) {
        case "contact":
          return getContactSortName(user);
        case "client_name":
          return String(user.client_name || "").toLowerCase();
        case "email":
          return String(user.email || "").toLowerCase();
        case "is_active":
          return user.is_active !== false ? 1 : 0;
        case "last_login_at":
          return user.last_login_at ? new Date(user.last_login_at).getTime() : 0;
        default:
          return "";
      }
    };
    return [...filtered].sort((a, b) => {
      const va = val(a, sortKey);
      const vb = val(b, sortKey);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);
  const activePortalCount = useMemo(() => users.filter(user => user.is_active !== false).length, [users]);
  const portalAtLimit = maxPortalUsers != null && activePortalCount >= maxPortalUsers;
  useEffect(() => {
    setPage(1);
  }, [search, pageSize, sortKey, sortDir]);
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStartIndex = sortedUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEndIndex = Math.min(currentPage * pageSize, sortedUsers.length);
  const paginatedUsers = sortedUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);
  const toggleSort = key => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };
  const sortIndicator = key => sortKey === key ? sortDir === "asc" ? " ▲" : " ▼" : "";
  const ThSort = ({
    label,
    col
  }) => <button type="button" className={s.thBtn} onClick={() => toggleSort(col)}>
      {label}
      {sortIndicator(col)}
    </button>;
  const Pager = ({
    page: p,
    totalPages: tp,
    onPageChange,
    rangeLabel
  }) => <div className={s.pager}>
      <div className={s.pagerLeft}>
        <span className={s.pagerLabel}>{copy.pager.perPage}</span>
        <select className={s.pagerSelect} value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
          {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        {rangeLabel && <span className={s.pagerInfo}>{rangeLabel}</span>}
      </div>
      <div className={s.pagerRight}>
        <button type="button" className={s.pagerBtn} onClick={() => onPageChange(p - 1)} disabled={p <= 1} title={copy.pager.prevTitle}>
          <Icon icon="mdi:chevron-left" />
        </button>
        <span className={s.pagerInfo}>
          {interpolate(copy.pager.page, {
          current: p,
          total: tp
        })}
        </span>
        <button type="button" className={s.pagerBtn} onClick={() => onPageChange(p + 1)} disabled={p >= tp} title={copy.pager.nextTitle}>
          <Icon icon="mdi:chevron-right" />
        </button>
      </div>
    </div>;
  const warnPortalLimit = () => {
    toast.warn(interpolate(copy.limitWarn, {
      max: maxPortalUsers
    }));
  };
  const handleToggle = async (user, next) => {
    if (next && portalAtLimit && !user.is_active) {
      warnPortalLimit();
      return;
    }
    setBusy(true);
    try {
      await setClientPortalUserActive(user.id, next);
      setUsers(prev => prev.map(u => u.id === user.id ? {
        ...u,
        is_active: next
      } : u));
      toast.success(next ? copy.toast.accessEnabled : copy.toast.accessDisabled);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const handleReset = async () => {
    if (resetPwd1.length < 6) return toast.error(copy.toast.passwordTooShort);
    if (resetPwd1 !== resetPwd2) return toast.error(copy.toast.passwordMismatch);
    setBusy(true);
    try {
      await resetClientPortalUserPassword(resetUserId, resetPwd1);
      toast.success(copy.toast.passwordUpdated);
      closeResetModal();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const closeResetModal = () => {
    setResetUserId(null);
    setResetPwd1("");
    setResetPwd2("");
  };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteClientPortalUser(deleteTarget.id);
      toast.success(copy.toast.accountDeleted);
      setDeleteTarget(null);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return <Page>
      <Card title={copy.page.title} description={copy.page.description} fill>
          <div className={ui.toolRow}>
            <div className={ui.toolLeft}>
              <input type="search" className={ui.fieldSearch} placeholder={copy.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)} autoComplete="off" name="client-portal-filter" id="client-portal-filter" data-lpignore="true" data-1p-ignore aria-label={copy.searchAria} />
              <span className={ui.count}>{formatAccountCount(locale, filtered.length)}</span>
            </div>
          </div>

          {maxPortalUsers != null && <p className={s.limitHint}>
              <CommunityFeatureBadge variant="inline" className={s.proBadgeInline} />
              {portalAtLimit ? <>
                  {interpolate(copy.limitReached, {
            current: activePortalCount,
            max: maxPortalUsers
          })}{" "}
                  <ProFeatureBadge variant="inline" className={s.proBadgeInline} />
                </> : <>
                  {interpolate(copy.quota, {
            current: activePortalCount,
            max: maxPortalUsers
          })}
                </>}
            </p>}

          <div className={s.tableSection}>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th><ThSort label={copy.columns.contact} col="contact" /></th>
                  <th><ThSort label={copy.columns.enterprise} col="client_name" /></th>
                  <th><ThSort label={copy.columns.email} col="email" /></th>
                  <th><ThSort label={copy.columns.status} col="is_active" /></th>
                  <th><ThSort label={copy.columns.lastLogin} col="last_login_at" /></th>
                  <th style={{
                  width: 120
                }} />
                </tr>
              </thead>
              <tbody>
                {loading ? <tr>
                    <td colSpan={6} className={s.empty}>{copy.emptyLoading}</td>
                  </tr> : sortedUsers.length === 0 ? <tr>
                    <td colSpan={6} className={s.empty}>
                      {users.length === 0 ? copy.empty : copy.emptySearch}
                    </td>
                  </tr> : paginatedUsers.map(user => {
                const contactName = [user.contact_prenom, user.contact_nom].filter(Boolean).join(" ") || "-";
                return <tr key={user.id}>
                        <td>
                          <div className={s.userEmail}>{contactName}</div>
                          {user.contact_id && <div className={s.userName}>
                              {interpolate(copy.contactRef, {
                        id: user.contact_id
                      })}
                            </div>}
                        </td>
                        <td>{user.client_name || "-"}</td>
                        <td className={s.dateCell}>{user.email}</td>
                        <td>
                          <span className={`${s.status} ${user.is_active ? s.statusActive : s.statusInactive}`}>
                            <span className={s.statusDot} />
                            {user.is_active ? copy.statusActive : copy.statusInactive}
                          </span>
                        </td>
                        <td className={s.dateCell}>
                          {user.last_login_at ? new Date(user.last_login_at).toLocaleString(copy.bcp47) : "-"}
                        </td>
                        <td>
                          <div className={s.actions}>
                            <button type="button" className={s.actionBtn} title={!user.is_active && portalAtLimit ? interpolate(copy.limitTitle, {
                        max: maxPortalUsers
                      }) : user.is_active ? copy.actions.disable : copy.actions.enable} disabled={busy || !user.is_active && portalAtLimit} onClick={() => handleToggle(user, !user.is_active)}>
                              <Icon icon={user.is_active ? "mdi:pause-circle-outline" : "mdi:play-circle-outline"} />
                            </button>
                            <button type="button" className={s.actionBtn} title={copy.actions.resetPassword} disabled={busy} onClick={() => {
                        setResetPwd1("");
                        setResetPwd2("");
                        setResetUserId(user.id);
                      }}>
                              <Icon icon="mdi:key-outline" />
                            </button>
                            <button type="button" className={`${s.actionBtn} ${s.actionBtnDanger}`} title={copy.actions.deleteAccount} disabled={busy} onClick={() => setDeleteTarget(user)}>
                              <Icon icon="mdi:trash-can-outline" />
                            </button>
                          </div>
                        </td>
                      </tr>;
              })}
              </tbody>
            </table>
          </div>
          {!loading && sortedUsers.length > 0 && <Pager page={currentPage} totalPages={totalPages} onPageChange={setPage} rangeLabel={interpolate(copy.pager.range, {
          start: pageStartIndex,
          end: pageEndIndex,
          total: sortedUsers.length
        })} />}
          </div>
      </Card>

      <Modal open={!!resetUserId} onClose={closeResetModal} title={copy.resetModal.title} icon="mdi:key-outline" width="440px" footer={<ModalFooter onCancel={closeResetModal} onConfirm={handleReset} confirmLabel={copy.resetModal.confirmBtn} confirmLoading={busy} />}>
        <form autoComplete="off" onSubmit={e => e.preventDefault()}>
          <ModalForm>
            <ModalFormSection title={copy.resetModal.sectionTitle} icon="mdi:lock-outline">
              <IconField icon="mdi:lock-outline" label={copy.resetModal.passwordLabel}>
                <Input type="password" placeholder={copy.resetModal.passwordPlaceholder} value={resetPwd1} onChange={e => setResetPwd1(e.target.value)} autoComplete="new-password" name="portal-reset-password" />
              </IconField>
              <IconField icon="mdi:lock-check-outline" label={copy.resetModal.confirmLabel}>
                <Input type="password" placeholder={copy.resetModal.confirmPlaceholder} value={resetPwd2} onChange={e => setResetPwd2(e.target.value)} autoComplete="new-password" name="portal-reset-password-confirm" />
              </IconField>
            </ModalFormSection>
          </ModalForm>
        </form>
      </Modal>

      <ClientPortalDeleteModal open={!!deleteTarget} user={deleteTarget} saving={busy} onClose={() => !busy && setDeleteTarget(null)} onConfirm={handleDelete} />
    </Page>;
}
