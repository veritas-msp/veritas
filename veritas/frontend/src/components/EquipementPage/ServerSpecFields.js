import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { interpolate } from "../../i18n/translate";
import { CPU_MODEL_PRESETS, MEMORY_PRESETS, MEMORY_UNITS, STORAGE_CAPACITY_PRESETS, STORAGE_MEDIA_TYPES, VCPU_PRESETS, formatCpu, formatMemory, formatStorageHint, formatStorageVolumes, parseCpu, parseMemory, parseStorageVolumes, sanitizeDecimalInput } from "./serverSpecUtils";
import styles from "./ServerSpecFields.module.css";
function useSyncedState(value, parser) {
  const [state, setState] = useState(() => parser(value));
  useEffect(() => {
    setState(parser(value));
  }, [value, parser]);
  return [state, setState];
}
function CpuField({
  label,
  value,
  isVirtual,
  onChange,
  widgetsCopy = {}
}) {
  const parser = useMemo(() => raw => parseCpu(raw, {
    isVirtual
  }), [isVirtual]);
  const [cpu, setCpu] = useSyncedState(value, parser);
  const emit = next => {
    setCpu(next);
    onChange(formatCpu(next, {
      isVirtual
    }));
  };
  if (isVirtual) {
    return <div className={styles.fieldBlock}>
        <label className={styles.label}>{label}</label>
        <div className={styles.inlineRow}>
          <input type="text" inputMode="numeric" className={styles.numberInput} value={cpu.count} placeholder="4" onChange={e => emit({
          ...cpu,
          count: e.target.value.replace(/[^0-9]/g, "")
        })} />
          <span className={styles.unitSuffix}>{widgetsCopy.vcpuSuffix || "vCPU"}</span>
        </div>
        <div className={styles.presets}>
          {VCPU_PRESETS.map(preset => <button key={preset} type="button" className={styles.presetBtn} onClick={() => emit({
          count: preset,
          model: ""
        })}>
              {preset} {widgetsCopy.vcpuSuffix || "vCPU"}
            </button>)}
        </div>
      </div>;
  }
  return <div className={styles.fieldBlock}>
      <label className={styles.label}>{label}</label>
      <div className={styles.inlineRow}>
        <input type="text" inputMode="numeric" className={styles.countInput} value={cpu.count} min="1" aria-label={widgetsCopy.processorCountAria || "Number of processors"} onChange={e => emit({
        ...cpu,
        count: e.target.value.replace(/[^0-9]/g, "") || "1"
      })} />
        <span className={styles.timesLabel} aria-hidden>
          ×
        </span>
        <input type="text" className={styles.textInput} list="server-cpu-model-presets" value={cpu.model} placeholder="Xeon Silver 4314" onChange={e => emit({
        ...cpu,
        model: e.target.value
      })} />
      </div>
      <datalist id="server-cpu-model-presets">
        {CPU_MODEL_PRESETS.map(preset => <option key={preset} value={preset} />)}
      </datalist>
      <div className={styles.presets}>
        {CPU_MODEL_PRESETS.slice(0, 4).map(preset => <button key={preset} type="button" className={styles.presetBtn} onClick={() => emit({
        ...cpu,
        model: preset
      })}>
            {preset.replace("Intel ", "").replace("AMD ", "")}
          </button>)}
      </div>
    </div>;
}
function MemoryField({
  value,
  onChange,
  widgetsCopy = {}
}) {
  const parser = useMemo(() => raw => parseMemory(raw), []);
  const [memory, setMemory] = useSyncedState(value, parser);
  const emit = next => {
    setMemory(next);
    onChange(formatMemory(next));
  };
  return <div className={styles.fieldBlock}>
      <label className={styles.label}>{widgetsCopy.ram || "RAM"}</label>
      <div className={styles.inlineRow}>
        <input type="text" inputMode="decimal" className={styles.numberInput} style={{
        width: "5rem",
        flex: "1 1 auto"
      }} value={memory.amount} placeholder="64" onChange={e => emit({
        ...memory,
        amount: sanitizeDecimalInput(e.target.value)
      })} />
        <select className={styles.selectInput} style={{
        flex: "0 0 5rem"
      }} value={memory.unit} onChange={e => emit({
        ...memory,
        unit: e.target.value
      })} aria-label={widgetsCopy.ramUnitAria || "RAM unit"}>
          {MEMORY_UNITS.map(unit => <option key={unit.value} value={unit.value}>
              {unit.label}
            </option>)}
        </select>
      </div>
      <div className={styles.presets}>
        {MEMORY_PRESETS.map(preset => <button key={`${preset.amount}-${preset.unit}`} type="button" className={styles.presetBtn} onClick={() => emit(preset)}>
            {preset.amount} {preset.unit}
          </button>)}
      </div>
    </div>;
}
function StorageField({
  value,
  isVirtual,
  onChange,
  widgetsCopy = {}
}) {
  const parser = useMemo(() => raw => parseStorageVolumes(raw), []);
  const [volumes, setVolumes] = useSyncedState(value, parser);
  const emit = nextVolumes => {
    setVolumes(nextVolumes);
    onChange(formatStorageVolumes(nextVolumes));
  };
  const updateVolume = (index, patch) => {
    const nextVolumes = volumes.map((volume, volumeIndex) => volumeIndex === index ? {
      ...volume,
      ...patch
    } : volume);
    emit(nextVolumes);
  };
  const addVolume = () => {
    emit([...volumes, {
      count: "1",
      capacity: "",
      unit: "Go",
      media: "SSD"
    }]);
  };
  const removeVolume = index => {
    const nextVolumes = volumes.filter((_, volumeIndex) => volumeIndex !== index);
    emit(nextVolumes.length > 0 ? nextVolumes : [{
      count: "1",
      capacity: "",
      unit: "Go",
      media: "SSD"
    }]);
  };
  const preview = formatStorageVolumes(volumes);
  const hint = formatStorageHint(volumes);
  return <div className={`${styles.fieldBlock} ${styles.fieldBlockFull}`}>
      <label className={styles.label}>{widgetsCopy.storage || "Storage"}</label>
      <div className={styles.volumeList}>
        {volumes.map((volume, index) => <div key={`storage-volume-${index}`} className={isVirtual ? styles.volumeRowVirtual : styles.volumeRow}>
            {!isVirtual ? <>
                <input type="text" inputMode="numeric" className={styles.countInput} value={volume.count} aria-label={interpolate(widgetsCopy.diskCountAria || "Number of disks {index}", {
            index: index + 1
          })} onChange={e => updateVolume(index, {
            count: e.target.value.replace(/[^0-9]/g, "") || "1"
          })} />
                <span className={styles.timesLabel} aria-hidden>
                  ×
                </span>
              </> : null}
            <input type="text" inputMode="decimal" className={styles.numberInput} style={{
          width: "auto"
        }} value={volume.capacity} placeholder="480" aria-label={interpolate(widgetsCopy.diskCapacityAria || "Disk capacity {index}", {
          index: index + 1
        })} onChange={e => updateVolume(index, {
          capacity: sanitizeDecimalInput(e.target.value)
        })} />
            <select className={styles.selectInput} value={volume.unit} onChange={e => updateVolume(index, {
          unit: e.target.value
        })} aria-label={interpolate(widgetsCopy.diskUnitAria || "Disk unit {index}", {
          index: index + 1
        })}>
              {MEMORY_UNITS.map(unit => <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>)}
            </select>
            <select className={styles.selectInput} value={volume.media} onChange={e => updateVolume(index, {
          media: e.target.value
        })} aria-label={interpolate(widgetsCopy.diskTypeAria || "Disk type {index}", {
          index: index + 1
        })}>
              {STORAGE_MEDIA_TYPES.map(media => <option key={media.value} value={media.value}>
                  {media.label}
                </option>)}
            </select>
            {volumes.length > 1 ? <button type="button" className={styles.removeBtn} onClick={() => removeVolume(index)} aria-label={interpolate(widgetsCopy.removeVolumeAria || "Remove volume {index}", {
          index: index + 1
        })}>
                <Icon icon="mdi:close" />
              </button> : <span aria-hidden />}
          </div>)}
      </div>
      {!isVirtual ? <button type="button" className={styles.addBtn} onClick={addVolume}>
          <Icon icon="mdi:plus" />
          {widgetsCopy.addVolume || "Add volume"}
        </button> : null}
      <div className={styles.presets}>
        {STORAGE_CAPACITY_PRESETS.map(preset => <button key={`${preset.capacity}-${preset.unit}`} type="button" className={styles.presetBtn} onClick={() => emit([{
        count: "1",
        capacity: preset.capacity,
        unit: preset.unit,
        media: "SSD"
      }])}>
            {preset.capacity} {preset.unit}
          </button>)}
      </div>
      {preview ? <p className={styles.preview}>{preview}</p> : null}
      {hint ? <p className={styles.hint}>
          {interpolate(widgetsCopy.totalCapacityApprox || "Total capacity ≈ {hint}", {
        hint
      })}
        </p> : null}
    </div>;
}
export default function ServerSpecFields({
  isVirtual = false,
  cpuLabel = "Processor",
  processeur = "",
  memoire = "",
  stockage = "",
  onProcesseurChange,
  onMemoireChange,
  onStorageChange,
  widgetsCopy = {}
}) {
  return <div className={styles.wrap}>
      <CpuField label={cpuLabel} value={processeur} isVirtual={isVirtual} onChange={onProcesseurChange} widgetsCopy={widgetsCopy} />
      <MemoryField value={memoire} onChange={onMemoireChange} widgetsCopy={widgetsCopy} />
      <StorageField value={stockage} isVirtual={isVirtual} onChange={onStorageChange} widgetsCopy={widgetsCopy} />
    </div>;
}
