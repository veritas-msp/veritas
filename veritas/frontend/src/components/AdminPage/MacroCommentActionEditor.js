import { useEffect, useRef } from "react";
import styles from "./MacroFormModal.module.css";
export default function MacroCommentActionEditor({
  actionId,
  comment = "",
  commentTemplateId = "",
  isInternal = false,
  templates = [],
  selectClassName = "",
  onChange
}) {
  const editorRef = useRef(null);
  const lastSyncedComment = useRef(comment);
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextHtml = String(comment || "");
    if (nextHtml === editor.innerHTML) {
      lastSyncedComment.current = nextHtml;
      return;
    }
    if (nextHtml !== lastSyncedComment.current) {
      editor.innerHTML = nextHtml;
      lastSyncedComment.current = nextHtml;
    }
  }, [actionId, comment]);
  const handleTemplateChange = event => {
    const templateId = event.target.value;
    if (!templateId) return;
    const template = templates.find(row => String(row.id) === String(templateId));
    if (!template) return;
    const html = String(template.content || "");
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }
    lastSyncedComment.current = html;
    onChange?.({
      comment: html,
      commentTemplateId: templateId
    });
  };
  return <div className={styles.commentActionWrap}>
      <select className={selectClassName} value={commentTemplateId || ""} onChange={handleTemplateChange}>
        <option value="">Free-form message (no template)</option>
        {templates.map(template => <option key={template.id} value={template.id}>
            {template.name}
          </option>)}
      </select>
      <label className={styles.internalToggle}>
        <input type="checkbox" checked={Boolean(isInternal)} onChange={event => onChange?.({
        isInternal: event.target.checked
      })} />
        <span>Internal note (not visible to the client)</span>
      </label>
      <div ref={editorRef} className={styles.commentEditor} contentEditable suppressContentEditableWarning onInput={event => {
      const html = String(event.currentTarget?.innerHTML || "");
      lastSyncedComment.current = html;
      onChange?.({
        comment: html
      });
    }} data-placeholder="Comment to add" />
    </div>;
}
