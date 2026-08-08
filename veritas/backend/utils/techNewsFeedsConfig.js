import { pool } from "../database/db.js";
export const ALLOWED_FEED_LOCALES = ["fr", "en", "de", "it", "es"];
export const ALLOWED_FEED_CATEGORIES = ["cve", "security", "news", "tech"];
export const DEFAULT_FEED_LOCALE = "en";
export const DEFAULT_FEEDS = [{
  feed_key: "thn",
  category: "security",
  source: "The Hacker News",
  url: "https://feeds.feedburner.com/TheHackersNews"
}, {
  feed_key: "bleeping",
  category: "security",
  source: "BleepingComputer",
  url: "https://www.bleepingcomputer.com/feed/"
}, {
  feed_key: "cisa",
  category: "cve",
  source: "CISA",
  url: "https://www.cisa.gov/cybersecurity-advisories/all.xml"
}, {
  feed_key: "exploitdb",
  category: "cve",
  source: "Exploit-DB",
  url: "https://www.exploit-db.com/rss.xml"
}, {
  feed_key: "ars",
  category: "tech",
  source: "Ars Technica",
  url: "https://feeds.arstechnica.com/arstechnica/technology"
}, {
  feed_key: "register",
  category: "news",
  source: "The Register",
  url: "https://www.theregister.com/headlines.atom"
}];
let tableReady = false;
function normalizeLocale(locale) {
  const code = String(locale || DEFAULT_FEED_LOCALE).trim().toLowerCase().slice(0, 2);
  return ALLOWED_FEED_LOCALES.includes(code) ? code : DEFAULT_FEED_LOCALE;
}
function normalizeCategory(category) {
  const value = String(category || "news").trim().toLowerCase();
  return ALLOWED_FEED_CATEGORIES.includes(value) ? value : "news";
}
function slugifyFeedKey(value) {
  return String(value || "feed").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "feed";
}
function mapFeedRow(row) {
  return {
    id: row.id,
    locale: row.locale,
    feedKey: row.feed_key,
    source: row.source,
    url: row.url,
    category: row.category,
    enabled: Boolean(row.enabled),
    sortOrder: Number(row.sort_order) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
export async function ensureTechNewsFeedsTable() {
  if (tableReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS v_b_tech_news_feeds (
      id SERIAL PRIMARY KEY,
      locale VARCHAR(5) NOT NULL,
      feed_key VARCHAR(64) NOT NULL,
      source VARCHAR(120) NOT NULL,
      url TEXT NOT NULL,
      category VARCHAR(16) NOT NULL DEFAULT 'news',
      enabled BOOLEAN NOT NULL DEFAULT true,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (locale, feed_key)
    );
    CREATE INDEX IF NOT EXISTS idx_tech_news_feeds_locale_enabled
      ON v_b_tech_news_feeds(locale, enabled, sort_order);
  `);
  await pool.query(`
    DELETE FROM v_b_tech_news_feeds a
    USING v_b_tech_news_feeds b
    WHERE a.ctid < b.ctid
      AND a.locale = b.locale
      AND a.feed_key = b.feed_key
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS v_b_tech_news_feeds_locale_feed_key_uniq
      ON v_b_tech_news_feeds (locale, feed_key)
  `);
  tableReady = true;
}
async function seedEnglishDefaultsIfEmpty() {
  const count = await pool.query(`SELECT COUNT(*)::int AS count FROM v_b_tech_news_feeds`);
  if (Number(count.rows[0]?.count) > 0) return;
  for (let i = 0; i < DEFAULT_FEEDS.length; i += 1) {
    const feed = DEFAULT_FEEDS[i];
    await pool.query(`INSERT INTO v_b_tech_news_feeds (locale, feed_key, source, url, category, enabled, sort_order)
       VALUES ($1, $2, $3, $4, $5, true, $6)
       ON CONFLICT (locale, feed_key) DO NOTHING`, [DEFAULT_FEED_LOCALE, feed.feed_key, feed.source, feed.url, feed.category, i * 10]);
  }
}
export async function listTechNewsFeeds({
  includeDisabled = true,
  localeInput = null
} = {}) {
  await ensureTechNewsFeedsTable();
  await seedEnglishDefaultsIfEmpty();
  const conditions = [];
  const params = [];
  if (localeInput != null && String(localeInput).trim() !== "") {
    params.push(normalizeLocale(localeInput));
    conditions.push(`locale = $${params.length}`);
  }
  if (!includeDisabled) {
    conditions.push("enabled = true");
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query(`SELECT id, locale, feed_key, source, url, category, enabled, sort_order, created_at, updated_at
     FROM v_b_tech_news_feeds
     ${where}
     ORDER BY sort_order ASC, locale ASC, id ASC`, params);
  return result.rows.map(mapFeedRow);
}
export async function getAllEnabledFeeds() {
  const feeds = await listTechNewsFeeds({
    includeDisabled: false
  });
  return feeds.map(feed => ({
    id: `${feed.locale}-${feed.feedKey}`,
    source: feed.source,
    url: feed.url,
    category: feed.category,
    locale: feed.locale
  }));
}
/** @deprecated Prefer getAllEnabledFeeds — kept for compatibility */
export async function getEnabledFeedsForLocale(localeInput) {
  const feeds = await listTechNewsFeeds({
    includeDisabled: false,
    localeInput
  });
  return feeds.map(feed => ({
    id: feed.feedKey,
    source: feed.source,
    url: feed.url,
    category: feed.category
  }));
}
export async function createTechNewsFeed(payload) {
  await ensureTechNewsFeedsTable();
  const locale = normalizeLocale(payload.locale);
  const source = String(payload.source || "").trim();
  const url = String(payload.url || "").trim();
  if (!source || !url) {
    const err = new Error("Feed name and URL are required.");
    err.status = 400;
    throw err;
  }
  if (!/^https?:\/\//i.test(url)) {
    const err = new Error("The feed URL must start with http:// or https://");
    err.status = 400;
    throw err;
  }
  let feedKey = slugifyFeedKey(payload.feedKey || source);
  const exists = await pool.query(`SELECT id FROM v_b_tech_news_feeds WHERE locale = $1 AND feed_key = $2`, [locale, feedKey]);
  if (exists.rows.length > 0) {
    feedKey = `${feedKey}-${Date.now().toString(36)}`;
  }
  const sortOrder = Number.isFinite(Number(payload.sortOrder)) ? Number(payload.sortOrder) : (await pool.query(`SELECT COALESCE(MAX(sort_order), 0) + 10 AS next FROM v_b_tech_news_feeds`)).rows[0].next;
  const result = await pool.query(`INSERT INTO v_b_tech_news_feeds (locale, feed_key, source, url, category, enabled, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, locale, feed_key, source, url, category, enabled, sort_order, created_at, updated_at`, [locale, feedKey, source, url, normalizeCategory(payload.category), payload.enabled !== false, sortOrder]);
  return mapFeedRow(result.rows[0]);
}
export async function updateTechNewsFeed(id, payload) {
  await ensureTechNewsFeedsTable();
  const feedId = Number(id);
  if (!Number.isInteger(feedId) || feedId <= 0) {
    const err = new Error("Feed not found.");
    err.status = 404;
    throw err;
  }
  const existing = await pool.query(`SELECT * FROM v_b_tech_news_feeds WHERE id = $1`, [feedId]);
  if (!existing.rows[0]) {
    const err = new Error("Feed not found.");
    err.status = 404;
    throw err;
  }
  const row = existing.rows[0];
  const source = payload.source !== undefined ? String(payload.source).trim() : row.source;
  const url = payload.url !== undefined ? String(payload.url).trim() : row.url;
  const locale = payload.locale !== undefined ? normalizeLocale(payload.locale) : row.locale;
  if (!source || !url) {
    const err = new Error("Feed name and URL are required.");
    err.status = 400;
    throw err;
  }
  if (!/^https?:\/\//i.test(url)) {
    const err = new Error("The feed URL must start with http:// or https://");
    err.status = 400;
    throw err;
  }
  if (locale !== row.locale) {
    const conflict = await pool.query(`SELECT id FROM v_b_tech_news_feeds WHERE locale = $1 AND feed_key = $2 AND id <> $3`, [locale, row.feed_key, feedId]);
    if (conflict.rows[0]) {
      const err = new Error("A feed with this key already exists for that language.");
      err.status = 409;
      throw err;
    }
  }
  const result = await pool.query(`UPDATE v_b_tech_news_feeds
     SET locale = $1,
         source = $2,
         url = $3,
         category = $4,
         enabled = $5,
         sort_order = $6,
         updated_at = NOW()
     WHERE id = $7
     RETURNING id, locale, feed_key, source, url, category, enabled, sort_order, created_at, updated_at`, [locale, source, url, payload.category !== undefined ? normalizeCategory(payload.category) : row.category, payload.enabled !== undefined ? Boolean(payload.enabled) : row.enabled, payload.sortOrder !== undefined ? Number(payload.sortOrder) : row.sort_order, feedId]);
  return mapFeedRow(result.rows[0]);
}
export async function deleteTechNewsFeed(id) {
  await ensureTechNewsFeedsTable();
  const feedId = Number(id);
  const result = await pool.query(`DELETE FROM v_b_tech_news_feeds WHERE id = $1 RETURNING id`, [feedId]);
  if (!result.rows[0]) {
    const err = new Error("Feed not found.");
    err.status = 404;
    throw err;
  }
  return {
    success: true
  };
}
export async function resetTechNewsFeeds() {
  await ensureTechNewsFeedsTable();
  await pool.query(`DELETE FROM v_b_tech_news_feeds`);
  await seedEnglishDefaultsIfEmpty();
  return listTechNewsFeeds();
}
/** @deprecated Prefer resetTechNewsFeeds — resets all feeds to English defaults */
export async function resetTechNewsFeedsForLocale(_localeInput) {
  return resetTechNewsFeeds();
}
export function getTechNewsFeedsMeta() {
  return {
    locales: ALLOWED_FEED_LOCALES,
    defaultLocale: DEFAULT_FEED_LOCALE,
    categories: ALLOWED_FEED_CATEGORIES,
    categoryLabels: {
      cve: "CVE",
      security: "Security",
      news: "News",
      tech: "Technology"
    }
  };
}
