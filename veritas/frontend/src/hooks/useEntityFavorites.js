import { useCallback, useEffect, useRef, useState } from "react";
import { getUserSetting, saveUserSetting } from "../api/userSettings";
import { useAuthContext } from "../contexts/AuthContext";

function normalizeFavoriteIds(value) {
  const raw = Array.isArray(value?.ids) ? value.ids : Array.isArray(value) ? value : [];
  return [...new Set(raw.map(id => String(id)).filter(Boolean))];
}

export function useEntityFavorites(settingKey) {
  const {
    user
  } = useAuthContext();
  const userId = user?.id != null ? String(user.id) : "";
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [loaded, setLoaded] = useState(false);
  const skipSaveRef = useRef(true);

  useEffect(() => {
    if (!userId || !settingKey) {
      setFavoriteIds(new Set());
      setLoaded(false);
      skipSaveRef.current = true;
      return undefined;
    }
    let cancelled = false;
    setLoaded(false);
    skipSaveRef.current = true;
    (async () => {
      try {
        const {
          value
        } = await getUserSetting(settingKey);
        if (cancelled) return;
        setFavoriteIds(new Set(normalizeFavoriteIds(value)));
      } catch (error) {
        console.error("Error loading favorites:", error);
        if (!cancelled) setFavoriteIds(new Set());
      } finally {
        if (!cancelled) {
          setLoaded(true);
          skipSaveRef.current = false;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settingKey, userId]);

  useEffect(() => {
    if (!userId || !settingKey || !loaded || skipSaveRef.current) return undefined;
    const timer = setTimeout(() => {
      saveUserSetting(settingKey, {
        ids: [...favoriteIds]
      }).catch(error => {
        console.error("Error saving favorites:", error);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [favoriteIds, loaded, settingKey, userId]);

  const isFavorite = useCallback(id => favoriteIds.has(String(id)), [favoriteIds]);

  const toggleFavorite = useCallback(id => {
    const key = String(id);
    if (!key) return;
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);else next.add(key);
      return next;
    });
  }, []);

  return {
    favoriteIds,
    isFavorite,
    toggleFavorite,
    favoritesLoaded: loaded
  };
}
