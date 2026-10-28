import React, { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { toast } from "react-toastify";
import { correctTicketTextAi, fetchAiStatus } from "../../../../api/ai";
import { sanitizeTicketCommentHtml } from "../../../../utils/sanitizeHtml";
import { usePermissions } from "../../../../contexts/PermissionsContext";
import TicketAiEnrichMenu from "../../../TicketPage/TicketAiEnrichMenu";
import TicketInsertLinkModal, {
  captureEditorSelection,
  insertLinkHtml,
  restoreEditorSelection
} from "../../../TicketPage/TicketInsertLinkModal";
import { getTicketDetailCopy } from "../../../TicketPage/ticketDetailPageI18n";
import ticketStyles from "../../../TicketPage/TicketDetailPage.module.css";
import styles from "./ReportSynthesisEditor.module.css";

function toEditorHtml(value) {
  const raw = String(value || "");
  if (!raw.trim()) return "";
  if (/<[a-z][\s\S]*>/i.test(raw)) return sanitizeTicketCommentHtml(raw) || raw;
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function htmlToPlain(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

export default function ReportSynthesisEditor({
  value = "",
  onChange,
  locale = "fr",
  placeholder = "Rédigez la synthèse du rapport…"
}) {
  const editorRef = useRef(null);
  const linkSelectionRef = useRef({ range: null, text: "" });
  const lastSyncedRef = useRef("");
  const { can } = usePermissions();
  const canAiSuggest = can("tickets_detail.ai_suggest");
  const detailCopy = getTicketDetailCopy(locale) || {};
  const copy = detailCopy.reply || {};
  const toasts = detailCopy.toasts || {};

  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkModalText, setLinkModalText] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchAiStatus()
      .then(status => {
        if (cancelled) return;
        const configured = Boolean(status?.configured);
        setAiEnabled(configured && status?.features?.suggestReply !== false);
      })
      .catch(() => {
        if (!cancelled) setAiEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextHtml = toEditorHtml(value);
    if (nextHtml === lastSyncedRef.current) return;
    if (document.activeElement === editor) return;
    editor.innerHTML = nextHtml;
    lastSyncedRef.current = nextHtml;
  }, [value]);

  const emitChange = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const html = editor.innerHTML || "";
    lastSyncedRef.current = html;
    onChange?.(html);
  }, [onChange]);

  const runEditorCommand = useCallback(
    (command, commandValue = null) => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();
      document.execCommand(command, false, commandValue);
      emitChange();
    },
    [emitChange]
  );

  const handleCorrectTextAi = useCallback(
    async (mode = "enrich") => {
      if (aiLoading || !aiEnabled || !canAiSuggest) return;
      const html = String(editorRef.current?.innerHTML || value || "").trim();
      if (!htmlToPlain(html)) {
        toast.error(toasts.aiCorrectEmpty || "Saisissez un texte à enrichir");
        return;
      }
      setAiLoading(true);
      try {
        const data = await correctTicketTextAi({
          text: html,
          ticketId: null,
          internal: false,
          locale,
          mode
        });
        const corrected = String(data?.text || "").trim();
        if (!corrected) {
          toast.error(toasts.aiCorrectError || "Impossible d'enrichir le texte");
          return;
        }
        const asHtml = /<[a-z][\s\S]*>/i.test(corrected)
          ? corrected
          : corrected.replace(/\n/g, "<br>");
        const safeHtml = sanitizeTicketCommentHtml(asHtml) || asHtml;
        if (htmlToPlain(safeHtml) === htmlToPlain(html)) {
          toast.info(toasts.aiCorrectUnchanged || "Le texte est déjà optimal");
          return;
        }
        if (editorRef.current) {
          editorRef.current.innerHTML = safeHtml;
          lastSyncedRef.current = safeHtml;
          onChange?.(safeHtml);
          editorRef.current.focus();
        }
        toast.success(toasts.aiCorrectOk || "Texte enrichi");
      } catch (error) {
        toast.error(error?.message || toasts.aiCorrectError || "Impossible d'enrichir le texte");
      } finally {
        setAiLoading(false);
      }
    },
    [aiLoading, aiEnabled, canAiSuggest, value, locale, toasts, onChange]
  );

  return (
    <div className={styles.root}>
      <div className={`${ticketStyles.replyTools} ${styles.tools}`} data-export-hide="true">
        <button
          type="button"
          className={ticketStyles.toolBtn}
          onClick={() => runEditorCommand("bold")}
          title={copy.toolBold || "Gras"}
        >
          <Icon icon="mdi:format-bold" width={18} height={18} aria-hidden />
        </button>
        <button
          type="button"
          className={ticketStyles.toolBtn}
          onClick={() => runEditorCommand("insertUnorderedList")}
          title={copy.toolList || "Liste à puces"}
        >
          <Icon icon="mdi:format-list-bulleted" width={18} height={18} aria-hidden />
        </button>
        <button
          type="button"
          className={ticketStyles.toolBtn}
          onMouseDown={event => event.preventDefault()}
          onClick={() => {
            const captured = captureEditorSelection(editorRef.current);
            linkSelectionRef.current = captured;
            setLinkModalText(captured.text);
            setLinkModalOpen(true);
          }}
          title={copy.toolLink || "Lien"}
        >
          <Icon icon="mdi:link-variant" width={18} height={18} aria-hidden />
        </button>

        {aiEnabled && canAiSuggest ? (
          <>
            <span className={ticketStyles.aiToolSep} aria-hidden />
            <TicketAiEnrichMenu
              copy={copy}
              loading={aiLoading}
              disabled={aiLoading}
              onSelect={handleCorrectTextAi}
            />
          </>
        ) : null}
      </div>

      <div
        ref={editorRef}
        className={`${ticketStyles.editor} ${styles.editor}`}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
        onPaste={event => {
          event.preventDefault();
          const text = event.clipboardData?.getData("text/plain") || "";
          document.execCommand("insertText", false, text);
          emitChange();
        }}
      />

      <TicketInsertLinkModal
        open={linkModalOpen}
        copy={copy}
        initialText={linkModalText}
        onClose={() => setLinkModalOpen(false)}
        onInsert={({ url, text }) => {
          restoreEditorSelection(editorRef.current, linkSelectionRef.current?.range);
          insertLinkHtml(
            editorRef.current,
            url,
            text || linkSelectionRef.current?.text
          );
          emitChange();
          setLinkModalOpen(false);
        }}
      />
    </div>
  );
}
