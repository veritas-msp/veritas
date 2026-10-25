import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { FIREWALL_MODEL_OTHER, buildAlimentationBrandTiles } from "./constants/equipmentCatalog";
import { getAlimentationBrandIconDef } from "./constants/alimentationBrandIconMap";
import EquipmentHoverIcon, { ALIMENTATION_BRAND_ANIMATED } from "./EquipmentHoverIcon";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";

function AlimentationBrandTile({ id, label, active, onSelect }) {
  const animRef = useRef(null);
  const Animated = ALIMENTATION_BRAND_ANIMATED[id] || null;
  const iconDef = id === "__other__" ? null : getAlimentationBrandIconDef(id);
  const iconify = id === "__other__"
    ? "mdi:dots-horizontal"
    : iconDef?.type === "iconify"
      ? iconDef.icon
      : "mdi:power-plug";

  return (
    <button
      type="button"
      className={`${formStyles.moduleTile} ${active ? formStyles.moduleTileActive : ""}`}
      onClick={() => onSelect(id)}
      onMouseEnter={() => animRef.current?.startAnimation?.()}
      onMouseLeave={() => animRef.current?.stopAnimation?.()}
      aria-pressed={active}
    >
      {active ? <Icon icon="mdi:check-circle" className={formStyles.moduleCheck} aria-hidden /> : null}
      <span className={`${formStyles.moduleTileIcon} ${formStyles.moduleTileBrandLogo}`} aria-hidden style={{ display: "inline-flex" }}>
        <EquipmentHoverIcon
          Animated={Animated}
          iconify={iconify}
          size={22}
          animRef={animRef}
        />
      </span>
      <span className={formStyles.moduleTileLabel}>{label}</span>
    </button>
  );
}

export default function AlimentationBrandPicker({
  catalog,
  manufacturer = "",
  model = "",
  onManufacturerChange,
  onManufacturerInputChange,
  onModelChange,
  required = false,
  showModel = true,
  brandLabel = "Brand",
  modelLabel = "Model",
  otherBrandNameLabel = "Brand name",
  otherModelOptionLabel = "Other (manual entry)",
  otherTileLabel = "Other",
  formatCustomModelAria = label => `${label} custom`,
  modelPlaceholder = "Smart-UPS 1500"
}) {
  const brandTiles = useMemo(() => {
    const tiles = buildAlimentationBrandTiles(catalog);
    return tiles.map(tile => tile.id === "__other__" ? {
      ...tile,
      label: otherTileLabel
    } : tile);
  }, [catalog, otherTileLabel]);
  const catalogBrands = Object.keys(catalog || {});
  const normalizedManufacturer = String(manufacturer || "").trim();
  const isKnownBrand = catalogBrands.includes(normalizedManufacturer);
  const isOtherBrand = Boolean(normalizedManufacturer && !isKnownBrand);
  const [otherBrandSelected, setOtherBrandSelected] = useState(isOtherBrand);
  const activeTile = isKnownBrand ? normalizedManufacturer : otherBrandSelected || isOtherBrand ? "__other__" : "";
  const catalogModels = isKnownBrand ? catalog[normalizedManufacturer] || [] : [];
  const normalizedModel = String(model || "").trim();
  const isCatalogModel = catalogModels.includes(normalizedModel);
  const [forceCustomModel, setForceCustomModel] = useState(false);
  useEffect(() => {
    setForceCustomModel(false);
  }, [normalizedManufacturer]);
  useEffect(() => {
    if (isKnownBrand) {
      setOtherBrandSelected(false);
    } else if (isOtherBrand) {
      setOtherBrandSelected(true);
    }
  }, [isKnownBrand, isOtherBrand]);
  const handleManufacturerInput = onManufacturerInputChange || onManufacturerChange;
  const isCustomModel = isKnownBrand && (forceCustomModel || Boolean(normalizedModel) && !isCatalogModel);
  const modelSelectValue = isCustomModel ? FIREWALL_MODEL_OTHER : normalizedModel;
  const handleBrandSelect = brandId => {
    if (brandId === "__other__") {
      setOtherBrandSelected(true);
      if (isKnownBrand) {
        onManufacturerChange("");
      }
      onModelChange("");
      return;
    }
    setOtherBrandSelected(false);
    onManufacturerChange(brandId);
    onModelChange("");
  };
  const handleModelSelect = value => {
    if (value === FIREWALL_MODEL_OTHER) {
      setForceCustomModel(true);
      onModelChange("");
      return;
    }
    setForceCustomModel(false);
    onModelChange(value);
  };
  return (
    <div className={formStyles.fieldFull} style={{ gridColumn: "1 / -1" }}>
      <span className={`${formStyles.label} ${required ? formStyles.labelRequired : ""}`}>
        {brandLabel}
      </span>
      <div className={formStyles.modulesGrid} style={{ marginTop: "0.45rem" }}>
        {brandTiles.map(({ id, label }) => (
          <AlimentationBrandTile
            key={id}
            id={id}
            label={label}
            active={activeTile === id}
            onSelect={handleBrandSelect}
          />
        ))}
      </div>

      {activeTile === "__other__" ? (
        <div className={formStyles.field} style={{ marginTop: "0.85rem" }}>
          <label className={`${formStyles.label} ${required ? formStyles.labelRequired : ""}`} htmlFor="alimentation-brand-other">
            {otherBrandNameLabel}
          </label>
          <input
            id="alimentation-brand-other"
            type="text"
            className={formStyles.input}
            value={manufacturer ?? ""}
            onChange={e => handleManufacturerInput(e.target.value)}
            placeholder="Socomec"
            autoFocus
          />
        </div>
      ) : null}

      {showModel && normalizedManufacturer ? (
        <div className={formStyles.field} style={{ marginTop: "0.85rem" }}>
          <label className={formStyles.label} htmlFor="alimentation-model">
            {modelLabel}
          </label>
          {isKnownBrand ? (
            <>
              <select
                id="alimentation-model"
                className={formStyles.input}
                value={modelSelectValue}
                onChange={e => handleModelSelect(e.target.value)}
              >
                <option value="">-</option>
                {catalogModels.map(item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
                <option value={FIREWALL_MODEL_OTHER}>{otherModelOptionLabel}</option>
              </select>
              {isCustomModel ? (
                <input
                  id="alimentation-model-custom"
                  type="text"
                  className={formStyles.input}
                  style={{ marginTop: "0.55rem" }}
                  value={model ?? ""}
                  onChange={e => onModelChange(e.target.value)}
                  placeholder={modelPlaceholder}
                  aria-label={formatCustomModelAria(modelLabel)}
                />
              ) : null}
            </>
          ) : (
            <input
              id="alimentation-model"
              type="text"
              className={formStyles.input}
              value={model ?? ""}
              onChange={e => onModelChange(e.target.value)}
              placeholder={modelPlaceholder}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
