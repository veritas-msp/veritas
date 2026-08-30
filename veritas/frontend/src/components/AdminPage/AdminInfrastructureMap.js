import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";
import { fetchEquipmentFamilies, fetchSystemFamilyExtensions, updateEquipmentFamily, updateSystemFamilyLayouts } from "../../api/equipmentFamilies";
import { setCachedMapTileShape } from "../../hooks/useSystemFamilyExtensions";
import { useAdminCommonCopy, useAdminModalCopy, useAdminPageCopy } from "../../hooks/useAdminCopy";
import { EQUIPMENT_MODULE_LABELS } from "../EquipementPage/equipmentFormConfig";
import { buildDefaultHoneycombEditorTiles, buildHoneycombEditorTiles, HARDWARE_TYPE_ORDER } from "../EnterprisesPage/infraHoneycombLayout";
import { normalizeTileShape } from "../EnterprisesPage/tileShapes";
import { Btn, Card, Page } from "./AdminUi";
import adminUi from "./AdminUi.module.css";
import HoneycombLayoutEditor from "./HoneycombLayoutEditor";
import styles from "./AdminInfrastructureMap.module.css";

export default function AdminInfrastructureMap() {
  const copy = useAdminPageCopy("infrastructureMap");
  const adminCopy = useAdminCommonCopy();
  const modalCopy = useAdminModalCopy("equipmentFamilyForm");
  const [families, setFamilies] = useState([]);
  const [layoutsByKey, setLayoutsByKey] = useState({});
  const [tiles, setTiles] = useState([]);
  const [tileShape, setTileShape] = useState("hexagon");
  const [selectedKey, setSelectedKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const notifyUpdated = () => {
    window.dispatchEvent(new CustomEvent("equipmentFamiliesUpdated"));
  };

  const rebuildTiles = useCallback((customFamilies, layouts) => {
    const next = buildHoneycombEditorTiles({
      layouts,
      customFamilies
    });
    setTiles(next);
    setSelectedKey(current => next.some(tile => tile.key === current) ? current : next[0]?.key || "");
    setDirty(false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, extensionsPayload] = await Promise.all([
        fetchEquipmentFamilies({
          admin: true
        }),
        fetchSystemFamilyExtensions().catch(() => ({
          layouts: {}
        }))
      ]);
      const layouts = extensionsPayload?.layouts && typeof extensionsPayload.layouts === "object" ? extensionsPayload.layouts : {};
      setFamilies(data);
      setLayoutsByKey(layouts);
      setTileShape(normalizeTileShape(extensionsPayload?.tileShape));
      rebuildTiles(data, layouts);
    } catch (err) {
      toast.error(err.message || copy.loadError);
      setFamilies([]);
      setTiles([]);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, rebuildTiles]);

  useEffect(() => {
    load();
  }, [load]);

  const brickFamilies = useMemo(
    () => (Array.isArray(families) ? families : []).filter(family => family.displayMode === "brick"),
    [families]
  );

  const handleTilesChange = nextTiles => {
    setTiles(nextTiles);
    setDirty(true);
  };

  const handleTileShapeChange = nextShape => {
    setTileShape(normalizeTileShape(nextShape));
    setDirty(true);
  };

  const resetLayout = () => {
    const next = buildDefaultHoneycombEditorTiles(families);
    setTiles(next);
    setSelectedKey(current => next.some(tile => tile.key === current) ? current : next[0]?.key || "");
    setDirty(true);
    toast.info(copy.resetApplied);
  };

  const saveLayout = async () => {
    setSaving(true);
    try {
      const systemLayouts = tiles.filter(tile => tile.isSystem || HARDWARE_TYPE_ORDER.includes(tile.familyKey)).map(tile => ({
        familyKey: tile.familyKey,
        honeycombQ: tile.q,
        honeycombR: tile.r,
        displayMode: "hexagon"
      }));
      const customHexes = tiles.filter(tile => !tile.isSystem && tile.id);
      const { layouts, tileShape: savedShape } = await updateSystemFamilyLayouts(systemLayouts, { tileShape });
      setLayoutsByKey(prev => ({
        ...prev,
        ...(layouts || {})
      }));
      if (savedShape) {
        const nextShape = normalizeTileShape(savedShape);
        setTileShape(nextShape);
        setCachedMapTileShape(nextShape);
      }
      if (customHexes.length) {
        const updated = await Promise.all(customHexes.map(tile => updateEquipmentFamily(tile.id, {
          honeycombQ: tile.q,
          honeycombR: tile.r
        })));
        setFamilies(prev => prev.map(item => {
          const hit = updated.find(entry => entry.family?.id === item.id);
          return hit?.family || item;
        }));
      }
      toast.success(copy.saved);
      notifyUpdated();
      setDirty(false);
    } catch (err) {
      toast.error(err.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  return <Page>
      <Card title={copy.title} description={copy.description} fill action={<div className={styles.actions}>
            <Btn variant="secondary" icon="mdi:backup-restore" onClick={resetLayout} disabled={saving || loading} title={copy.resetHint}>
              {copy.reset}
            </Btn>
            <Btn icon="mdi:content-save-outline" onClick={saveLayout} disabled={saving || loading || !dirty}>
              {saving ? copy.saving : copy.save}
            </Btn>
          </div>}>
        {loading ? <p className={adminUi.adminMutedText}>{adminCopy.loading}</p> : <div className={styles.body}>
            <HoneycombLayoutEditor variant="page" tiles={tiles} tileShape={tileShape} onTileShapeChange={handleTileShapeChange} currentKey={selectedKey} selectedKey={selectedKey} onSelectedKeyChange={setSelectedKey} onTilesChange={handleTilesChange} getTileLabel={tile => tile.label || EQUIPMENT_MODULE_LABELS[tile.familyKey] || tile.familyKey} hint={modalCopy.mapPreviewHint} moveHint={modalCopy.mapMoveHint} selectedLabel={modalCopy.selectedHexLabel} shapeLabel={copy.shapeLabel} shapeHint={copy.shapeHint} shapeLabels={copy.tileShapes || {}} />
            {brickFamilies.length ? <p className={styles.brickNote}>
                <Icon icon="mdi:information-outline" aria-hidden />
                {copy.brickNote}: {brickFamilies.map(family => family.label).join(", ")}
              </p> : null}
          </div>}
      </Card>
    </Page>;
}
