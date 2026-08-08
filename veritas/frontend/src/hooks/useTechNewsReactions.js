import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTechNewsReactions, subscribeTechNewsReactionStream, toggleTechNewsReaction } from "../api/techNews";
function applyArticleUpdate(prev, payload) {
  if (!payload?.articleId) return prev;
  return {
    articles: {
      ...prev.articles,
      [payload.articleId]: payload.reactions || prev.articles?.[payload.articleId]
    },
    mine: {
      ...prev.mine,
      [payload.articleId]: payload.mine ?? null
    }
  };
}
export function useTechNewsReactions(articleIds) {
  const [state, setState] = useState({
    articles: {},
    mine: {}
  });
  const [pending, setPending] = useState({});
  const idsKey = Array.isArray(articleIds) ? articleIds.join("|") : "";
  const idsRef = useRef(articleIds);
  useEffect(() => {
    idsRef.current = articleIds;
  }, [articleIds]);
  const loadReactions = useCallback(async signal => {
    const ids = (idsRef.current || []).filter(Boolean);
    if (ids.length === 0) {
      setState({
        articles: {},
        mine: {}
      });
      return;
    }
    try {
      const data = await fetchTechNewsReactions(ids, {
        signal
      });
      setState({
        articles: data.articles || {},
        mine: data.mine || {}
      });
    } catch (err) {
      if (err.name !== "AbortError") {}
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    loadReactions(controller.signal);
    return () => controller.abort();
  }, [idsKey, loadReactions]);
  useEffect(() => {
    const unsubscribe = subscribeTechNewsReactionStream({
      onEvent: payload => {
        if (payload.type === "reaction") {
          setState(prev => applyArticleUpdate(prev, payload));
        }
      }
    });
    return unsubscribe;
  }, []);
  const react = useCallback(async (articleId, emoji) => {
    setPending(prev => ({
      ...prev,
      [articleId]: true
    }));
    try {
      const result = await toggleTechNewsReaction(articleId, emoji);
      setState(prev => applyArticleUpdate(prev, result));
    } finally {
      setPending(prev => {
        const next = {
          ...prev
        };
        delete next[articleId];
        return next;
      });
    }
  }, []);
  return {
    reactions: state.articles,
    mine: state.mine,
    pending,
    react
  };
}
