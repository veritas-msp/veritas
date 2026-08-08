import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchMyPermissions, fetchProfilePermissions } from "../api/permissions";
import { useAuthContext } from "./AuthContext";
import { setHasPermission } from "../utils/permissionKeys";
import { isSuperAdminProtectedProfile } from "../utils/profileProtection";

const PermissionsContext = createContext(null);
const PREVIEW_STORAGE_KEY = "veritas_profile_preview";

function readStoredPreview() {
  try {
    const raw = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
    const name = String(raw || "").trim();
    return name || null;
  } catch {
    return null;
  }
}

function writeStoredPreview(name) {
  try {
    if (name) sessionStorage.setItem(PREVIEW_STORAGE_KEY, name);
    else sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error("usePermissions must be used within PermissionsProvider");
  }
  return ctx;
}

/** Safe hook: returns false when provider is missing or still loading. */
export function useCan(permissionKey) {
  const ctx = useContext(PermissionsContext);
  if (!ctx) return false;
  return ctx.can(permissionKey);
}

export function PermissionsProvider({
  children
}) {
  const {
    user,
    userRole,
    loading: authLoading
  } = useAuthContext();
  const [permissionSet, setPermissionSet] = useState(() => new Set());
  const [previewPermissionSet, setPreviewPermissionSet] = useState(() => new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewProfile, setPreviewProfileState] = useState(() => readStoredPreview());
  const [previewLoading, setPreviewLoading] = useState(false);

  const realIsAdmin = isAdmin || String(userRole || "").toLowerCase() === "admin";
  const canUseProfilePreview = realIsAdmin;

  const refresh = useCallback(async () => {
    if (!user) {
      setPermissionSet(new Set());
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchMyPermissions();
      const list = Array.isArray(data?.permissions) ? data.permissions : [];
      setPermissionSet(new Set(list));
      setIsAdmin(Boolean(data?.isAdmin) || String(userRole || "").toLowerCase() === "admin");
    } catch (err) {
      console.warn("[permissions] Failed to load /me:", err?.message || err);
      setPermissionSet(new Set());
      setIsAdmin(String(userRole || "").toLowerCase() === "admin");
    } finally {
      setLoading(false);
    }
  }, [user, userRole]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  // Clear preview if user is not admin or logged out
  useEffect(() => {
    if (authLoading) return;
    if (!user || !canUseProfilePreview) {
      if (previewProfile) {
        setPreviewProfileState(null);
        writeStoredPreview(null);
        setPreviewPermissionSet(new Set());
      }
    }
  }, [authLoading, user, canUseProfilePreview, previewProfile]);

  // Load preview profile permissions
  useEffect(() => {
    if (!previewProfile || !canUseProfilePreview) {
      setPreviewPermissionSet(new Set());
      setPreviewLoading(false);
      return;
    }
    if (isSuperAdminProtectedProfile(previewProfile)) {
      setPreviewProfileState(null);
      writeStoredPreview(null);
      setPreviewPermissionSet(new Set());
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    fetchProfilePermissions(previewProfile).then(data => {
      if (cancelled) return;
      const perms = data?.permissions && typeof data.permissions === "object" ? data.permissions : {};
      const granted = new Set(Object.entries(perms).filter(([, v]) => Boolean(v)).map(([k]) => k));
      setPreviewPermissionSet(granted);
    }).catch(err => {
      if (cancelled) return;
      console.warn("[permissions] Preview load failed:", err?.message || err);
      setPreviewPermissionSet(new Set());
    }).finally(() => {
      if (!cancelled) setPreviewLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [previewProfile, canUseProfilePreview]);

  const isPreviewing = Boolean(previewProfile && canUseProfilePreview);
  const activePermissionSet = isPreviewing ? previewPermissionSet : permissionSet;
  // During UI preview, do not treat user as admin for feature gates
  const effectiveAdmin = realIsAdmin && !isPreviewing;

  const startProfilePreview = useCallback(profileName => {
    if (!canUseProfilePreview) return false;
    const name = String(profileName || "").trim();
    if (!name || isSuperAdminProtectedProfile(name)) return false;
    setPreviewProfileState(name);
    writeStoredPreview(name);
    return true;
  }, [canUseProfilePreview]);

  const stopProfilePreview = useCallback(() => {
    setPreviewProfileState(null);
    writeStoredPreview(null);
    setPreviewPermissionSet(new Set());
  }, []);

  const can = useCallback(key => {
    if (!key) return false;
    if (effectiveAdmin) return true;
    return setHasPermission(activePermissionSet, key);
  }, [effectiveAdmin, activePermissionSet]);

  const canAny = useCallback(keys => {
    if (!Array.isArray(keys) || keys.length === 0) return false;
    if (effectiveAdmin) return true;
    return keys.some(k => setHasPermission(activePermissionSet, k));
  }, [effectiveAdmin, activePermissionSet]);

  const canAll = useCallback(keys => {
    if (!Array.isArray(keys) || keys.length === 0) return false;
    if (effectiveAdmin) return true;
    return keys.every(k => setHasPermission(activePermissionSet, k));
  }, [effectiveAdmin, activePermissionSet]);

  const value = useMemo(() => ({
    permissions: activePermissionSet,
    isAdmin: effectiveAdmin,
    realIsAdmin,
    canUseProfilePreview,
    isPreviewing,
    previewProfile,
    previewLoading,
    loading: loading || previewLoading && isPreviewing,
    can,
    canAny,
    canAll,
    refresh,
    startProfilePreview,
    stopProfilePreview
  }), [activePermissionSet, effectiveAdmin, realIsAdmin, canUseProfilePreview, isPreviewing, previewProfile, previewLoading, loading, can, canAny, canAll, refresh, startProfilePreview, stopProfilePreview]);

  return <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>;
}
