import React from "react";
import EquipmentHaCell from "../../EquipementPage/EquipmentHaCell";
import { buildHaPairColorMap } from "../../EquipementPage/equipmentHaUtils";
import equipmentStyles from "../../EquipementPage/EquipmentPage.module.css";

const HA_COPY = {
  primary: "Primaire",
  secondary: "Secondaire"
};

function withHaType(item, familyType) {
  if (!item || typeof item !== "object") return { type: familyType };
  return { ...item, type: familyType };
}

export function buildHaColumn(equipments, familyType) {
  const typed = (Array.isArray(equipments) ? equipments : []).map(item => withHaType(item, familyType));
  const pairColors = buildHaPairColorMap(typed);
  return {
    id: "ha",
    label: "HA",
    render: item => (
      <span className={equipmentStyles.embeddedColHa}>
        <EquipmentHaCell equipment={withHaType(item, familyType)} copy={HA_COPY} pairColors={pairColors} />
      </span>
    )
  };
}
