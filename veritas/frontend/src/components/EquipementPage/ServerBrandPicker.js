import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { FIREWALL_MODEL_OTHER, buildServerBrandTiles } from "./constants/equipmentCatalog";
import ServerBrandIcon from "./constants/serverBrandIconMap";
import formStyles from "../EnterprisesPage/EnterpriseFormModal.module.css";
export default function ServerBrandPicker({
  catalog,
  manufacturer = "",
  model = "",
  onManufacturerChange,
  onManufacturerInputChange,
  onModelChange,
  required = false,
  brandLabel = "Brand",
  modelLabel = "Model",
  otherBrandNameLabel = "Brand name",
  otherModelOptionLabel = "Other (manual entry)",
  otherTileLabel = "Other",
  formatCustomModelAria = label => `${label} custom`,
  modelPlaceholder = "ProLiant DL360 Gen11"
}) {
  const brandTiles = useMemo(() => {
    const tiles = buildServerBrandTiles(catalog);
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
  return <div className={formStyles.fieldFull} style={{
    gridColumn: "1 / -1"
  }}>
      <span className={`${formStyles.label} ${required ? formStyles.labelRequired : ""}`}>
        {brandLabel}
      </span>
      <div className={formStyles.modulesGrid} style={{
      marginTop: "0.45rem"
    }}>
        {brandTiles.map(({
        id,
        label
      }) => <button key={id} type="button" className={`${formStyles.moduleTile} ${activeTile === id ? formStyles.moduleTileActive : ""}`} onClick={() => handleBrandSelect(id)} aria-pressed={activeTile === id}>
            {activeTile === id && <Icon icon="mdi:check-circle" className={formStyles.moduleCheck} aria-hidden />}
            {id === "__other__" ? <Icon icon="mdi:dots-horizontal" className={`${formStyles.moduleTileIcon} ${formStyles.moduleTileBrandLogo}`} aria-hidden /> : <ServerBrandIcon brand={id} className={`${formStyles.moduleTileIcon} ${formStyles.moduleTileBrandLogo}`} />}
            <span className={formStyles.moduleTileLabel}>{label}</span>
          </button>)}
      </div>

      {activeTile === "__other__" && <div className={formStyles.field} style={{
      marginTop: "0.85rem"
    }}>
          <label className={formStyles.label} htmlFor="server-brand-other">
            {otherBrandNameLabel}
          </label>
          <input id="server-brand-other" type="text" className={formStyles.input} value={manufacturer ?? ""} onChange={e => handleManufacturerInput(e.target.value)} placeholder="Supermicro" autoFocus />
        </div>}

      {normalizedManufacturer && <div className={formStyles.field} style={{
      marginTop: "0.85rem"
    }}>
          <label className={formStyles.label} htmlFor="server-model">
            {modelLabel}
          </label>
          {isKnownBrand ? <>
              <select id="server-model" className={formStyles.input} value={modelSelectValue} onChange={e => handleModelSelect(e.target.value)}>
                <option value="">-</option>
                {catalogModels.map(item => <option key={item} value={item}>
                    {item}
                  </option>)}
                <option value={FIREWALL_MODEL_OTHER}>{otherModelOptionLabel}</option>
              </select>
              {isCustomModel && <input id="server-model-custom" type="text" className={formStyles.input} style={{
          marginTop: "0.55rem"
        }} value={model ?? ""} onChange={e => onModelChange(e.target.value)} placeholder={modelPlaceholder} aria-label={formatCustomModelAria(modelLabel)} />}
            </> : <input id="server-model" type="text" className={formStyles.input} value={model ?? ""} onChange={e => onModelChange(e.target.value)} placeholder={modelPlaceholder} />}
        </div>}
    </div>;
}
