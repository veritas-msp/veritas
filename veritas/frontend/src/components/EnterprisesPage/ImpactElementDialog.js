import React, { useRef } from "react";
import { Icon } from "@iconify/react";
import { GROUP_COLORS } from "./impactMapModel";
import styles from "./ImpactElementDialog.module.css";

const PHOTO_LIMIT = 180000;

function compressRackPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !String(file.type || "").startsWith("image/")) {
      reject(new Error("type"));
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      reject(new Error("size"));
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const maxSide = 720;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height, 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      let quality = 0.72;
      let data = canvas.toDataURL("image/jpeg", quality);
      while (data.length > PHOTO_LIMIT && quality > 0.42) {
        quality -= 0.08;
        data = canvas.toDataURL("image/jpeg", quality);
      }
      if (data.length > PHOTO_LIMIT) {
        reject(new Error("size"));
        return;
      }
      resolve(data);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("read"));
    };
    image.src = url;
  });
}

export default function ImpactElementDialog({ draft, copy, sites = [], onChange, onCancel, onConfirm }) {
  const fileRef = useRef(null);
  if (!draft) return null;
  const type = draft.nodeType;
  const title = copy.dialogTitles?.[type] || copy.manualTypes?.[type] || type;
  const needsName = type !== "site";
  const canSave = type === "site"
    ? Boolean(draft.siteId)
    : Boolean(String(draft.name || "").trim());

  const patch = fields => onChange({ ...draft, ...fields });

  const onPhoto = async event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      patch({ photo: await compressRackPhoto(file) });
    } catch {
      onChange({ ...draft, photoError: true });
    }
  };

  return (
    <div className={styles.backdrop} onMouseDown={onCancel}>
      <form
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={event => event.stopPropagation()}
        onSubmit={event => {
          event.preventDefault();
          if (canSave) onConfirm();
        }}
      >
        <header className={styles.head}>
          <h2>{title}</h2>
          <button type="button" className={styles.close} onClick={onCancel} aria-label={copy.dialogCancel}>
            <Icon icon="mdi:close" />
          </button>
        </header>
        {needsName ? (
          <label className={styles.field}>
            <span>{copy.dialogName}</span>
            <input
              autoFocus
              value={draft.name || ""}
              maxLength={240}
              onChange={event => patch({ name: event.target.value })}
            />
          </label>
        ) : null}
        {type === "group" ? (
          <div className={styles.field}>
            <span>{copy.dialogColor}</span>
            <div className={styles.swatches}>
              {GROUP_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`${styles.swatch} ${draft.color === color ? styles.swatchOn : ""}`.trim()}
                  style={{ background: color }}
                  aria-label={color}
                  aria-pressed={draft.color === color}
                  onClick={() => patch({ color })}
                />
              ))}
              <input
                className={styles.colorInput}
                type="color"
                value={draft.color || "#5b7cfa"}
                aria-label={copy.dialogColor}
                onChange={event => patch({ color: event.target.value })}
              />
            </div>
          </div>
        ) : null}
        {type === "application" ? (
          <label className={styles.field}>
            <span>{copy.dialogDescription}</span>
            <textarea
              rows={3}
              maxLength={800}
              value={draft.description || ""}
              onChange={event => patch({ description: event.target.value })}
            />
          </label>
        ) : null}
        {type === "site" ? (
          sites.length ? (
            <div className={styles.siteList} role="listbox" aria-label={title}>
              {sites.map(site => (
                <button
                  key={site.id}
                  type="button"
                  role="option"
                  aria-selected={draft.siteId === site.id}
                  className={`${styles.site} ${draft.siteId === site.id ? styles.siteOn : ""}`.trim()}
                  onClick={() => patch({ siteId: site.id })}
                >
                  <strong>{site.name}</strong>
                  {site.address ? <span>{site.address}</span> : null}
                </button>
              ))}
            </div>
          ) : <p className={styles.empty}>{copy.dialogSiteEmpty}</p>
        ) : null}
        {type === "rack" ? (
          <div className={styles.field}>
            <span>{copy.dialogPhoto}</span>
            {draft.photo ? <img className={styles.preview} src={draft.photo} alt="" /> : null}
            <button type="button" className={styles.fileBtn} onClick={() => fileRef.current?.click()}>
              <Icon icon="mdi:image-plus-outline" />
              {draft.photo ? copy.dialogPhotoChange : copy.dialogPhoto}
            </button>
            <input ref={fileRef} className={styles.file} type="file" accept="image/*" onChange={onPhoto} />
            <p className={styles.hint}>{draft.photoError ? copy.dialogPhotoError : copy.dialogPhotoHint}</p>
          </div>
        ) : null}
        <footer className={styles.foot}>
          <button type="button" className={styles.cancel} onClick={onCancel}>{copy.dialogCancel}</button>
          <button type="submit" className={styles.save} disabled={!canSave}>{copy.dialogSave}</button>
        </footer>
      </form>
    </div>
  );
}
