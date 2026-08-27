import API_BASE_URL from "../config";

const BASE = `${API_BASE_URL}/knowledge-articles`;

async function handleJsonResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || fallbackMessage);
  }
  return data;
}

export async function fetchKnowledgeArticles({ search, status } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  const query = params.toString();
  const response = await fetch(`${BASE}${query ? `?${query}` : ""}`, { credentials: "include" });
  const data = await handleJsonResponse(response, "Error loading articles.");
  return Array.isArray(data?.articles) ? data.articles : [];
}

export async function fetchKnowledgeArticle(id) {
  const response = await fetch(`${BASE}/${id}`, { credentials: "include" });
  const data = await handleJsonResponse(response, "Error loading article.");
  return data.article;
}

export async function createKnowledgeArticle(payload = {}) {
  const response = await fetch(BASE, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await handleJsonResponse(response, "Error creating article.");
  return data.article;
}

export async function updateKnowledgeArticle(id, payload) {
  const response = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await handleJsonResponse(response, "Error saving article.");
  return data.article;
}

export async function publishKnowledgeArticle(id, payload = {}) {
  const response = await fetch(`${BASE}/${id}/publish`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await handleJsonResponse(response, "Error publishing article.");
  return data.article;
}

export async function unpublishKnowledgeArticle(id) {
  const response = await fetch(`${BASE}/${id}/unpublish`, {
    method: "POST",
    credentials: "include"
  });
  const data = await handleJsonResponse(response, "Error reverting article.");
  return data.article;
}

export async function deleteKnowledgeArticle(id) {
  const response = await fetch(`${BASE}/${id}`, {
    method: "DELETE",
    credentials: "include"
  });
  await handleJsonResponse(response, "Error deleting article.");
}

export async function uploadKnowledgeAsset(articleId, file) {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${BASE}/${articleId}/assets`, {
    method: "POST",
    credentials: "include",
    body: form
  });
  const data = await handleJsonResponse(response, "Error uploading image.");
  return data.asset;
}

const PORTAL_BASE = `${API_BASE_URL}/client-portal/knowledge-base`;

export function resolveKnowledgeAssetUrl(url) {
  const value = String(url || "");
  if (!value || /^https?:/i.test(value) || value.startsWith("data:")) return value;
  const path = value.startsWith("/api") ? value.slice(4) : value.startsWith("/") ? value : `/${value}`;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function resolveKnowledgeHtml(html) {
  return String(html || "").replace(/(src=")(\/api\/[^"]+)/g, (_match, prefix, path) => `${prefix}${resolveKnowledgeAssetUrl(path)}`);
}

export function toStoredKnowledgeHtml(html) {
  return String(html || "").replace(/https?:\/\/[^/"'\s]+\/api\//g, "/api/");
}

export function resolveKnowledgeJson(json) {
  try {
    return JSON.parse(JSON.stringify(json || {}).replace(/"src":"(\/api\/[^"]+)"/g, (_match, path) => `"src":"${resolveKnowledgeAssetUrl(path)}"`));
  } catch {
    return json;
  }
}

export function toStoredKnowledgeJson(json) {
  try {
    return JSON.parse(toStoredKnowledgeHtml(JSON.stringify(json || {})));
  } catch {
    return json;
  }
}

export async function fetchPortalKnowledgeArticles({ search } = {}) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const query = params.toString();
  const response = await fetch(`${PORTAL_BASE}${query ? `?${query}` : ""}`, { credentials: "include" });
  const data = await handleJsonResponse(response, "Error loading knowledge base.");
  return {
    articles: Array.isArray(data?.articles) ? data.articles : [],
    total: Number(data?.total) || 0
  };
}

export async function fetchPortalKnowledgeArticle(id) {
  const response = await fetch(`${PORTAL_BASE}/${id}`, { credentials: "include" });
  const data = await handleJsonResponse(response, "Error loading article.");
  return data.article;
}
