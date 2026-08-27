import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import { Icon } from "@iconify/react";
import { resolveKnowledgeAssetUrl, uploadKnowledgeAsset } from "../../api/knowledgeBase";
import styles from "./knowledgeBase.module.css";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

function slashCommands(copy) {
  return [
    { id: "heading1", label: copy.slash.heading1, icon: "mdi:format-header-1", run: editor => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { id: "heading2", label: copy.slash.heading2, icon: "mdi:format-header-2", run: editor => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { id: "heading3", label: copy.slash.heading3, icon: "mdi:format-header-3", run: editor => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { id: "paragraph", label: copy.slash.paragraph, icon: "mdi:format-paragraph", run: editor => editor.chain().focus().setParagraph().run() },
    { id: "bullet", label: copy.slash.bullet, icon: "mdi:format-list-bulleted", run: editor => editor.chain().focus().toggleBulletList().run() },
    { id: "numbered", label: copy.slash.numbered, icon: "mdi:format-list-numbered", run: editor => editor.chain().focus().toggleOrderedList().run() },
    { id: "todo", label: copy.slash.todo, icon: "mdi:checkbox-marked-outline", run: editor => editor.chain().focus().toggleTaskList().run() },
    { id: "quote", label: copy.slash.quote, icon: "mdi:format-quote-close", run: editor => editor.chain().focus().toggleBlockquote().run() },
    { id: "code", label: copy.slash.code, icon: "mdi:code-braces", run: editor => editor.chain().focus().toggleCodeBlock().run() },
    { id: "table", label: copy.slash.table, icon: "mdi:table", run: editor => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { id: "image", label: copy.slash.image, icon: "mdi:image-outline", run: "image" },
    { id: "divider", label: copy.slash.divider, icon: "mdi:minus", run: editor => editor.chain().focus().setHorizontalRule().run() }
  ];
}

function getSlashQuery(editor) {
  if (!editor) return null;
  const { $from } = editor.state.selection;
  const text = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc");
  const match = text.match(/(?:^|\s)\/([^\s]*)$/);
  if (!match) return null;
  return match[1] || "";
}

function deleteSlashToken(editor) {
  const { state } = editor;
  const { $from } = state.selection;
  const text = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc");
  const match = text.match(/(?:^|\s)(\/[^\s]*)$/);
  if (!match) return;
  const from = $from.pos - match[1].length;
  editor.chain().focus().deleteRange({ from, to: $from.pos }).run();
}

export default function KnowledgeBaseEditor({
  articleId,
  contentJson,
  editable,
  copy,
  onChange
}) {
  const fileRef = useRef(null);
  const [slash, setSlash] = useState(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const commands = useMemo(() => slashCommands(copy), [copy]);
  const filtered = useMemo(() => {
    const q = String(slash?.query || "").toLowerCase();
    return commands.filter(item => !q || item.label.toLowerCase().includes(q) || item.id.includes(q));
  }, [commands, slash]);

  const editor = useEditor({
    editable,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: copy.editorPlaceholder }),
      Underline,
      Highlight,
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false, allowBase64: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true })
    ],
    content: contentJson && typeof contentJson === "object" ? contentJson : EMPTY_DOC,
    onUpdate: ({ editor: current }) => {
      onChange?.({
        json: current.getJSON(),
        html: current.getHTML()
      });
      const query = getSlashQuery(current);
      if (query == null) {
        setSlash(null);
        return;
      }
      const coords = current.view.coordsAtPos(current.state.selection.from);
      setSlash({
        query,
        top: coords.bottom + 8,
        left: coords.left
      });
      setSlashIndex(0);
    }
  }, [articleId]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(Boolean(editable));
  }, [editor, editable]);

  useEffect(() => {
    if (!editor || !contentJson) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(contentJson);
    if (current !== next) editor.commands.setContent(contentJson, false);
  }, [editor, articleId]);

  const pickImage = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const applyCommand = useCallback(async item => {
    if (!editor || !item) return;
    deleteSlashToken(editor);
    setSlash(null);
    if (item.run === "image") {
      pickImage();
      return;
    }
    item.run(editor);
  }, [editor, pickImage]);

  const onFile = useCallback(async event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !articleId || !editor) return;
    try {
      const asset = await uploadKnowledgeAsset(articleId, file);
      if (asset?.url) editor.chain().focus().setImage({ src: resolveKnowledgeAssetUrl(asset.url), alt: file.name }).run();
    } catch {
      /* toast handled by caller if needed */
    }
  }, [articleId, editor]);

  useEffect(() => {
    if (!slash) return undefined;
    const onKey = event => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSlashIndex(index => (index + 1) % Math.max(filtered.length, 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSlashIndex(index => (index - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
      } else if (event.key === "Enter") {
        if (!filtered[slashIndex]) return;
        event.preventDefault();
        applyCommand(filtered[slashIndex]);
      } else if (event.key === "Escape") {
        setSlash(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [slash, filtered, slashIndex, applyCommand]);

  if (!editor) return null;

  const tool = (isActive, icon, action, label) => (
    <button type="button" className={`${styles.toolBtn} ${isActive ? styles.toolBtnActive : ""}`} onClick={action} disabled={!editable} title={label}>
      <Icon icon={icon} />
    </button>
  );

  return (
    <div>
      <div className={styles.editorBar}>
        {tool(editor.isActive("bold"), "mdi:format-bold", () => editor.chain().focus().toggleBold().run(), "Bold")}
        {tool(editor.isActive("italic"), "mdi:format-italic", () => editor.chain().focus().toggleItalic().run(), "Italic")}
        {tool(editor.isActive("underline"), "mdi:format-underline", () => editor.chain().focus().toggleUnderline().run(), "Underline")}
        {tool(editor.isActive("highlight"), "mdi:format-color-highlight", () => editor.chain().focus().toggleHighlight().run(), "Highlight")}
        {tool(editor.isActive("bulletList"), "mdi:format-list-bulleted", () => editor.chain().focus().toggleBulletList().run(), copy.slash.bullet)}
        {tool(editor.isActive("orderedList"), "mdi:format-list-numbered", () => editor.chain().focus().toggleOrderedList().run(), copy.slash.numbered)}
        {tool(editor.isActive("taskList"), "mdi:checkbox-marked-outline", () => editor.chain().focus().toggleTaskList().run(), copy.slash.todo)}
        {tool(false, "mdi:image-outline", pickImage, copy.insertImage)}
        {tool(false, "mdi:undo", () => editor.chain().focus().undo().run(), "Undo")}
        {tool(false, "mdi:redo", () => editor.chain().focus().redo().run(), "Redo")}
      </div>
      <div className={styles.editorArea}>
        <EditorContent editor={editor} />
      </div>
      <input ref={fileRef} className={styles.hiddenFile} type="file" accept="image/*" onChange={onFile} />
      {slash && filtered.length > 0 ? (
        <div className={styles.slashMenu} style={{ top: slash.top, left: slash.left }} role="listbox">
          {filtered.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.slashItem} ${index === slashIndex ? styles.slashItemActive : ""}`}
              onMouseDown={event => {
                event.preventDefault();
                applyCommand(item);
              }}
            >
              <Icon icon={item.icon} />
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
