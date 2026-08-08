import React from "react";
import { buildBrandOptions, buildModelOptions } from "./equipmentCatalog";
export default function BrandModelFields({
  catalog,
  manufacturer,
  model,
  onManufacturerChange,
  onModelChange,
  manufacturerId = "equipment-manufacturer",
  modelId = "equipment-model",
  fieldClassName,
  labelClassName,
  inputClassName,
  fieldStyle,
  inputStyle,
  labelStyle
}) {
  const brandOptions = buildBrandOptions(catalog, manufacturer);
  const modelOptions = buildModelOptions(catalog, manufacturer, model);
  const Field = ({
    id,
    label,
    children
  }) => <div className={fieldClassName} style={fieldStyle}>
      <label className={labelClassName} style={labelStyle} htmlFor={id}>{label}</label>
      {children}
    </div>;
  return <>
      <Field id={manufacturerId} label="Brand">
        <select id={manufacturerId} className={inputClassName} style={inputStyle} value={manufacturer ?? ""} onChange={e => onManufacturerChange(e.target.value)}>
          <option value="">-</option>
          {brandOptions.map(brand => <option key={brand} value={brand}>{brand}</option>)}
        </select>
      </Field>
      <Field id={modelId} label="Model">
        <select id={modelId} className={inputClassName} style={inputStyle} value={model ?? ""} onChange={e => onModelChange(e.target.value)} disabled={!manufacturer}>
          <option value="">-</option>
          {modelOptions.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </Field>
    </>;
}
