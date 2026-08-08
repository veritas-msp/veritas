import { useEffect, useState, useCallback } from "react";
const API_URL = process.env.REACT_APP_API_BASE_URL;
export function useDrafts() {
  const [drafts, setDrafts] = useState({
    Mon: false
  });
  const loadDrafts = useCallback(async () => {
    const userId = localStorage.getItem("id");
    if (!userId) return;
    try {
      const res = await fetch(`${API_URL}/api/drafts/status?user_id=${userId}`);
      const data = await res.json();
      setDrafts({
        Mon: !!data.monitoring
      });
    } catch (err) {
      console.warn("Error loadDrafts:", err);
      setDrafts({
        Mon: false
      });
    }
  }, []);
  useEffect(() => {
    loadDrafts();
    const handleRefresh = () => loadDrafts();
    window.addEventListener("draftCreated", handleRefresh);
    window.addEventListener("draftDeleted", handleRefresh);
    return () => {
      window.removeEventListener("draftCreated", handleRefresh);
      window.removeEventListener("draftDeleted", handleRefresh);
    };
  }, [loadDrafts]);
  return {
    drafts,
    refreshDraftStatus: loadDrafts
  };
}
