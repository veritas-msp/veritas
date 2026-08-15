import { useState } from "react";
import { Icon } from "@iconify/react";
import { interpolate } from "../../i18n/translate";
import { addVlansToList, parseVlanList, serializeVlanList } from "./vlanUtils";
import styles from "../EnterprisesPage/EnterpriseFormModal.module.css";

export default function VlanChipsInput({
  id,
  value,
  onChange,
  placeholder,
  hint,
  removeAria
}) {
  const [draft, setDraft] = useState("");
  const vlans = parseVlanList(value);

  const commitDraft = () => {
    const next = addVlansToList(vlans, draft);
    onChange?.(serializeVlanList(next));
    setDraft("");
  };

  const removeVlan = vlan => {
    onChange?.(serializeVlanList(vlans.filter(item => item !== vlan)));
  };

  return <div className={styles.vlanField}>
      <div className={styles.vlanChips} onClick={event => {
      if (event.target === event.currentTarget) {
        event.currentTarget.querySelector("input")?.focus();
      }
    }}>
        {vlans.map(vlan => <span key={vlan} className={styles.vlanChip}>
            <span>VLAN {vlan}</span>
            <button type="button" className={styles.vlanChipRemove} onClick={() => removeVlan(vlan)} aria-label={interpolate(removeAria || "Remove VLAN {vlan}", {
          vlan
        })}>
              <Icon icon="mdi:close" aria-hidden />
            </button>
          </span>)}
        <input id={id} type="text" className={styles.vlanChipInput} value={draft} placeholder={vlans.length === 0 ? placeholder : ""} onChange={event => setDraft(event.target.value)} onKeyDown={event => {
        if (event.key === "Enter" || event.key === ",") {
          event.preventDefault();
          commitDraft();
          return;
        }
        if (event.key === "Backspace" && !draft && vlans.length > 0) {
          removeVlan(vlans[vlans.length - 1]);
        }
      }} onBlur={commitDraft} inputMode="numeric" autoComplete="off" />
      </div>
      {hint ? <p className={styles.vlanHint}>{hint}</p> : null}
    </div>;
}
