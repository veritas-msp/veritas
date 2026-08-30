import { useCallback, useEffect, useState } from "react";
import { fetchEquipmentMapStyle, fetchSystemFamilyExtensions } from "../api/equipmentFamilies";
import { canonicalizeSystemFamilyKey } from "../utils/systemFamilyExtensions";
import { DEFAULT_TILE_SHAPE, normalizeTileShape } from "../components/EnterprisesPage/tileShapes";

let cachedMap = null;
let cachedLayouts = null;
let cachedTileShape = DEFAULT_TILE_SHAPE;
let inflight = null;

function applyTileShape(value) {
  cachedTileShape = normalizeTileShape(value);
  return cachedTileShape;
}

async function resolveTileShape(payload) {
  if (payload?.tileShape) return applyTileShape(payload.tileShape);
  try {
    const style = await fetchEquipmentMapStyle();
    return applyTileShape(style?.tileShape);
  } catch {
    return applyTileShape(cachedTileShape);
  }
}

async function loadExtensionsMap(force = false) {
  if (cachedMap && !force) return cachedMap;
  if (inflight && !force) return inflight;
  inflight = fetchSystemFamilyExtensions()
    .then(async payload => {
      cachedMap = payload?.extensions && typeof payload.extensions === "object" ? payload.extensions : {};
      cachedLayouts = payload?.layouts && typeof payload.layouts === "object" ? payload.layouts : {};
      await resolveTileShape(payload);
      return cachedMap;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function getCachedSystemFamilyLayouts() {
  return cachedLayouts || {};
}

export function getCachedMapTileShape() {
  return cachedTileShape || DEFAULT_TILE_SHAPE;
}

export function setCachedMapTileShape(value) {
  applyTileShape(value);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("equipmentFamiliesUpdated", {
      detail: { tileShape: cachedTileShape }
    }));
  }
}

export default function useSystemFamilyExtensions(familyType) {
  const familyKey = canonicalizeSystemFamilyKey(familyType);
  const [byKey, setByKey] = useState(cachedMap || {});
  const [layouts, setLayouts] = useState(cachedLayouts || {});
  const [tileShape, setTileShape] = useState(cachedTileShape || DEFAULT_TILE_SHAPE);
  const [loading, setLoading] = useState(!cachedMap);

  const syncFromCache = useCallback((nextMap) => {
    setByKey(nextMap || {});
    setLayouts(cachedLayouts || {});
    setTileShape(cachedTileShape || DEFAULT_TILE_SHAPE);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const next = await loadExtensionsMap(true);
      syncFromCache(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, [syncFromCache]);

  useEffect(() => {
    let cancelled = false;
    loadExtensionsMap()
      .then(next => {
        if (!cancelled) syncFromCache(next);
      })
      .catch(() => {
        if (!cancelled) {
          setByKey({});
          setLayouts({});
          setTileShape(DEFAULT_TILE_SHAPE);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    const onUpdated = event => {
      const nextShape = event?.detail?.tileShape;
      if (nextShape) applyTileShape(nextShape);
      loadExtensionsMap(true).then(next => {
        if (!cancelled) syncFromCache(next);
      }).catch(() => {
        if (!cancelled && nextShape) setTileShape(normalizeTileShape(nextShape));
      });
    };
    window.addEventListener("equipmentFamiliesUpdated", onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("equipmentFamiliesUpdated", onUpdated);
    };
  }, [syncFromCache]);

  return {
    byKey,
    layouts,
    tileShape,
    layout: familyKey ? layouts[familyKey] || null : null,
    loading,
    fields: familyKey ? byKey[familyKey] || [] : [],
    fieldsFor: type => {
      const key = canonicalizeSystemFamilyKey(type);
      return key ? byKey[key] || [] : [];
    },
    reload
  };
}
