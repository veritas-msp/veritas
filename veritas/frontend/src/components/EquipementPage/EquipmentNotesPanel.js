import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { FaPencilAlt, FaPlus } from "react-icons/fa";
import { toast } from "react-toastify";
import { addEquipmentNote, deleteEquipmentNote, getEquipmentNotes, updateEquipmentNote } from "../../api/equipment";
import { getEquipmentDbId } from "../../utils/equipmentIdentity";
import { useAuthContext } from "../../contexts/AuthContext";
import { useAppLocale } from "../../hooks/useAppGeneralSettings";
import SmartTooltip from "../SmartTooltip";
import enterpriseStyles from "../EnterprisesPage/EnterpriseDetailPage.module.css";
import { formatEquipmentDetailRelative, getEquipmentDetailCopy, interpolate } from "./equipmentDetailPageI18n";
import EquipmentNoteModal from "./EquipmentNoteModal";
import styles from "./EquipmentNotesPanel.module.css";

function formatNoteDate(value, locale) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const localeCode = locale === "en" ? "en-GB" : locale === "de" ? "de-DE" : locale === "it" ? "it-IT" : locale === "es" ? "es-ES" : "fr-FR";
  return date.toLocaleString(localeCode, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function EquipmentNotesPanel({
  equipment,
  embedded = false
}) {
  const locale = useAppLocale();
  const copy = useMemo(() => getEquipmentDetailCopy(locale), [locale]);
  const notesCopy = copy.notes;
  const {
    user: currentUser,
    userRole
  } = useAuthContext();
  const equipmentId = getEquipmentDbId(equipment);
  const clientId = equipment?.clientId;
  const equipmentName = equipment?.name || equipment?.nom || "";
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [modalNoteId, setModalNoteId] = useState(null);
  const [modalInitialContent, setModalInitialContent] = useState("");
  const [modalInitialVisibility, setModalInitialVisibility] = useState("private");
  const loadNotes = useCallback(async () => {
    if (!equipmentId || !clientId) {
      setNotes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await getEquipmentNotes(equipmentId, {
        clientId
      });
      setNotes(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error("Error loading equipment notes:", error);
      setNotes([]);
      toast.error(notesCopy.toasts.loadError);
    } finally {
      setLoading(false);
    }
  }, [equipmentId, clientId, notesCopy.toasts.loadError]);
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);
  const canEditNote = note => {
    if (!note?.user_id || !currentUser?.id) return userRole === "admin";
    if (userRole === "admin") return true;
    return note.user_id === currentUser.id;
  };
  const openCreateModal = () => {
    setModalMode("create");
    setModalNoteId(null);
    setModalInitialContent("");
    setModalInitialVisibility("private");
    setModalOpen(true);
  };
  const openEditModal = note => {
    setModalMode("edit");
    setModalNoteId(note.id);
    setModalInitialContent(note.content || "");
    setModalInitialVisibility(note.visibility === "public" ? "public" : "private");
    setModalOpen(true);
  };
  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setModalNoteId(null);
    setModalInitialContent("");
    setModalInitialVisibility("private");
  };
  const handleModalSubmit = async ({
    content,
    visibility
  }) => {
    if (!equipmentId || !clientId || saving) return;
    setSaving(true);
    try {
      if (modalMode === "create") {
        const note = await addEquipmentNote(equipmentId, {
          content,
          visibility,
          clientId
        });
        setNotes(prev => [note, ...prev]);
        toast.success(notesCopy.toasts.added);
      } else {
        const updated = await updateEquipmentNote(equipmentId, modalNoteId, {
          content,
          visibility,
          clientId
        });
        setNotes(prev => prev.map(note => note.id === modalNoteId ? updated : note));
        toast.success(notesCopy.toasts.updated);
      }
      closeModal();
    } catch (error) {
      console.error("Error saving equipment note:", error);
      toast.error(error.message || notesCopy.toasts.saveError);
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteNote = async noteId => {
    if (!equipmentId || !clientId) return;
    try {
      await deleteEquipmentNote(equipmentId, noteId, {
        clientId
      });
      setNotes(prev => prev.filter(note => note.id !== noteId));
      if (modalNoteId === noteId) closeModal();
      toast.success(notesCopy.toasts.deleted);
    } catch (error) {
      console.error("Error deleting equipment note:", error);
      toast.error(error.message || notesCopy.toasts.deleteError);
    }
  };
  if (!equipmentId) {
    return <div className={embedded ? styles.embeddedRoot : styles.panel}>
        <p className={styles.hint}>{notesCopy.saveFirst}</p>
      </div>;
  }
  return <div className={embedded ? styles.embeddedRoot : styles.panel}>
      <div className={styles.toolbar}>
        <p className={styles.toolbarHint}>{notesCopy.hint}</p>
        <button type="button" className={styles.addBtn} onClick={openCreateModal}>
          <FaPlus aria-hidden />
          {notesCopy.addNote}
        </button>
      </div>

      {loading ? <div className={styles.loading}>{notesCopy.loading}</div> : notes.length === 0 ? <div className={enterpriseStyles.clientNotesEmpty}>
          <button type="button" className={enterpriseStyles.clientNotesAddButton} onClick={openCreateModal}>
            {notesCopy.addNote}
          </button>
        </div> : <ul className={enterpriseStyles.clientNotesList}>
          {notes.map(note => {
        const visibilityLabel = note.visibility === "public" ? notesCopy.visibilityPublic : notesCopy.visibilityPrivate;
        return <li key={note.id} className={enterpriseStyles.clientNoteItem}>
                <div className={enterpriseStyles.clientNoteHeader}>
                  <div className={enterpriseStyles.clientNoteMeta}>
                    <span className={enterpriseStyles.clientNoteAuthor}>
                      {note.username || note.email || notesCopy.authorFallback}
                    </span>
                    <span className={`${styles.visibilityBadge} ${note.visibility === "public" ? styles.visibilityPublic : styles.visibilityPrivate}`}>
                      {visibilityLabel}
                    </span>
                    <span className={enterpriseStyles.clientNoteDate}>
                      {formatNoteDate(note.created_at, locale)}
                      {note.updated_at && note.updated_at !== note.created_at ? interpolate(notesCopy.edited, {
                date: formatEquipmentDetailRelative(note.updated_at, locale)
              }) : ""}
                    </span>
                  </div>
                  {canEditNote(note) ? <div className={enterpriseStyles.clientNoteActions}>
                      <SmartTooltip content={notesCopy.editNote}>
                        <button type="button" className={`${enterpriseStyles.editInfoButton} ${enterpriseStyles.clientNoteActionBtn}`} onClick={() => openEditModal(note)} aria-label={notesCopy.editNoteAria}>
                          <FaPencilAlt />
                        </button>
                      </SmartTooltip>
                      <SmartTooltip content={notesCopy.deleteNote}>
                        <button type="button" className={`${enterpriseStyles.cancelInfoButton} ${enterpriseStyles.clientNoteActionBtn}`} onClick={() => handleDeleteNote(note.id)} aria-label={notesCopy.deleteNoteAria}>
                          <Icon icon="mdi:trash-can-outline" aria-hidden />
                        </button>
                      </SmartTooltip>
                    </div> : null}
                </div>
                <p className={enterpriseStyles.clientNoteContent}>{note.content}</p>
              </li>;
      })}
        </ul>}

      <EquipmentNoteModal open={modalOpen} mode={modalMode} initialContent={modalInitialContent} initialVisibility={modalInitialVisibility} equipmentName={equipmentName} copy={notesCopy} saving={saving} onClose={closeModal} onSubmit={handleModalSubmit} />
    </div>;
}
