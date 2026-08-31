import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { DistributionPanel, HeroKpi, Panel, PiePanel, formatNumber, formatPercent } from "./dashboardWidgets";
import { buildDistributionItems } from "./DashboardCharts";
import styles from "./DashboardPage.module.css";

const NAV = [{
  key: "overview",
  icon: "mdi:view-dashboard-outline"
}, {
  key: "articles",
  icon: "mdi:book-open-page-variant-outline"
}, {
  key: "usage",
  icon: "mdi:eye-outline"
}, {
  key: "quality",
  icon: "mdi:star-outline"
}];

function DataTable({
  columns,
  rows,
  emptyLabel
}) {
  if (!rows?.length) return <p className={styles.emptyHint}>{emptyLabel}</p>;
  return <div className={styles.tableWrap}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            {columns.map(col => <th key={col.key}>{col.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => <tr key={row.id || row.label || index}>
              {columns.map(col => <td key={col.key} className={col.warn && col.warn(row) ? styles.cellWarn : undefined}>
                  {col.render(row, index)}
                </td>)}
            </tr>)}
        </tbody>
      </table>
    </div>;
}

function ScoreBar({
  label,
  value
}) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return <div className={styles.scoreBarRow}>
      <span>{label}</span>
      <span className={styles.scoreBarTrack}>
        <span className={styles.scoreBarFill} style={{
        width: `${pct}%`
      }} />
      </span>
      <strong>{pct}</strong>
    </div>;
}

function starLabel(copy, value) {
  if (value == null || !Number.isFinite(Number(value))) return copy.units.none;
  return copy.knowledgeCockpit.starValue.replace("{value}", String(value).replace(".", ","));
}

export default function DashboardKnowledgeCockpit({
  data,
  copy
}) {
  const [view, setView] = useState("overview");
  const [ageKey, setAgeKey] = useState(null);
  const t = copy.knowledgeCockpit;
  const cockpit = data?.knowledge?.cockpit || {};
  const overview = cockpit.overview || {};
  const articles = cockpit.articles || {};
  const usage = cockpit.usage || {};
  const quality = cockpit.quality || {};
  const age = cockpit.age || {};

  const statusItems = useMemo(() => buildDistributionItems((cockpit.byStatus || []).map(row => ({
    name: t.status[row.key] || row.key,
    count: Number(row.value) || 0
  }))).items, [cockpit.byStatus, t.status]);
  const categoryItems = useMemo(() => buildDistributionItems((cockpit.byCategory || []).map(row => ({
    name: row.key === "Uncategorized" ? t.uncategorized : row.key,
    count: Number(row.value) || 0
  }))).items, [cockpit.byCategory, t.uncategorized]);
  const authorItems = useMemo(() => buildDistributionItems((cockpit.byAuthor || []).map(row => ({
    name: row.label,
    count: Number(row.count) || 0
  }))).items, [cockpit.byAuthor]);

  const ageBuckets = [{
    key: "m3",
    tone: styles.renewalToneGreen,
    label: t.ageM3,
    bucket: age.m3
  }, {
    key: "m6",
    tone: styles.renewalToneGreen,
    label: t.ageM6,
    bucket: age.m6
  }, {
    key: "m12",
    tone: styles.renewalToneYellow,
    label: t.ageM12,
    bucket: age.m12
  }, {
    key: "y2",
    tone: styles.renewalToneOrange,
    label: t.ageY2,
    bucket: age.y2
  }, {
    key: "old",
    tone: styles.renewalToneRed,
    label: t.ageOld,
    bucket: age.old
  }];
  const selectedAge = ageBuckets.find(item => item.key === ageKey);

  const articleCols = [{
    key: "title",
    label: t.cols.article,
    render: row => row.title || row.label
  }, {
    key: "views",
    label: t.cols.views,
    render: row => formatNumber(row.views ?? row.count)
  }, {
    key: "rating",
    label: t.cols.rating,
    warn: row => row.avgRating != null && row.avgRating < 3,
    render: row => starLabel(copy, row.avgRating)
  }];

  const overviewView = <>
      <div className={styles.spotlightGrid}>
        <button type="button" className={styles.spotlightCard} onClick={() => setView("articles")}>
          <span className={styles.spotlightLabel}>{t.spotlight.articles}</span>
          <span className={styles.spotlightValue}>{formatNumber(overview.articlesTotal)}</span>
        </button>
        <button type="button" className={styles.spotlightCard} onClick={() => setView("usage")}>
          <span className={styles.spotlightLabel}>{t.spotlight.views}</span>
          <span className={styles.spotlightValue}>{formatNumber(overview.viewsPerMonth)}</span>
        </button>
        <button type="button" className={styles.spotlightCard} onClick={() => setView("quality")}>
          <span className={styles.spotlightLabel}>{t.spotlight.rating}</span>
          <span className={styles.spotlightValue}>{starLabel(copy, overview.avgRating)}</span>
        </button>
        <button type="button" className={styles.spotlightCard} onClick={() => setView("quality")}>
          <span className={styles.spotlightLabel}>{t.spotlight.satisfaction}</span>
          <span className={styles.spotlightValue}>{formatPercent(copy, overview.satisfactionPct)}</span>
        </button>
      </div>
      {overview.needsUpdate ? <button type="button" className={`${styles.riskBanner} ${styles.riskBannerActive}`} onClick={() => {
      setView("articles");
      setAgeKey("old");
    }}>
          {t.staleBanner.replace("{value}", formatNumber(overview.needsUpdate))}
        </button> : null}
      <div className={styles.heroKpiGrid}>
        <HeroKpi helpAria={copy.helpAria} icon="mdi:book-multiple-outline" value={formatNumber(overview.articlesTotal)} label={t.kpis.articles} hint={t.hints.articles} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:book-check-outline" value={formatNumber(overview.published)} label={t.kpis.published} hint={t.hints.published} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:file-edit-outline" value={formatNumber(overview.drafts)} label={t.kpis.drafts} hint={t.hints.drafts} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:archive-outline" value={formatNumber(overview.archived)} label={t.kpis.archived} hint={t.hints.archived} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:eye-outline" value={formatNumber(overview.viewsTotal)} label={t.kpis.viewsTotal} hint={t.hints.viewsTotal} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:account-eye-outline" value={copy.units.none} label={t.kpis.uniqueViews} hint={t.hints.uniqueViews} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:star-outline" value={starLabel(copy, overview.avgRating)} label={t.kpis.avgRating} hint={t.hints.avgRating} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:thumb-up-outline" value={formatPercent(copy, overview.satisfactionPct)} label={t.kpis.satisfaction} hint={t.hints.satisfaction} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:update" value={formatNumber(overview.needsUpdate)} label={t.kpis.needsUpdate} hint={t.hints.needsUpdate} help />
      </div>
      <div className={styles.grid2}>
        <PiePanel title={t.byStatusTitle} icon="mdi:file-document-outline" items={statusItems} emptyLabel={copy.empty} />
        <Panel title={t.topArticlesTitle} icon="mdi:chart-box-outline">
          <DataTable emptyLabel={copy.empty} columns={articleCols} rows={cockpit.topArticles || []} />
        </Panel>
      </div>
    </>;

  const articlesView = <>
      <div className={styles.heroKpiGrid}>
        <HeroKpi helpAria={copy.helpAria} icon="mdi:book-check-outline" value={formatNumber(articles.published)} label={t.kpis.published} hint={t.hints.published} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:plus-circle-outline" value={formatNumber(articles.createdRecent)} label={t.kpis.createdRecent} hint={t.hints.createdRecent} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:pencil-outline" value={formatNumber(articles.modifiedRecent)} label={t.kpis.modifiedRecent} hint={t.hints.modifiedRecent} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:eye-off-outline" value={formatNumber(articles.neverViewed)} label={t.kpis.neverViewed} hint={t.hints.neverViewed} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:comment-off-outline" value={formatNumber(articles.withoutFeedback)} label={t.kpis.withoutFeedback} hint={t.hints.withoutFeedback} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:star-off-outline" value={formatNumber(articles.lowRating)} label={t.kpis.lowRating} hint={t.hints.lowRating} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:clock-alert-outline" value={formatNumber(articles.old)} label={t.kpis.old} hint={t.hints.old} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:file-refresh-outline" value={formatNumber(articles.toReview)} label={t.kpis.toReview} hint={t.hints.toReview} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:calendar-remove-outline" value={formatNumber(articles.expired)} label={t.kpis.expired} hint={t.hints.expired} help />
      </div>
      <Panel title={t.ageTitle} icon="mdi:clock-outline" note={t.ageHint}>
        <div className={styles.ageGrid}>
          {ageBuckets.map(item => <button key={item.key} type="button" className={`${styles.renewalCard} ${item.tone} ${ageKey === item.key ? styles.renewalCardActive : ""}`} onClick={() => setAgeKey(current => current === item.key ? null : item.key)}>
              <span className={styles.renewalValue}>{item.bucket?.pct != null ? `${item.bucket.pct} %` : copy.units.none}</span>
              <span className={styles.renewalLabel}>{item.label}</span>
              <span className={styles.ageCount}>{formatNumber(item.bucket?.count)}</span>
            </button>)}
        </div>
      </Panel>
      {selectedAge ? <Panel title={t.ageListTitle.replace("{label}", selectedAge.label)} icon="mdi:book-open-outline">
          <DataTable emptyLabel={copy.empty} columns={[{
        key: "title",
        label: t.cols.article,
        render: row => row.title
      }, {
        key: "updated",
        label: t.cols.updated,
        render: row => row.updatedAt || copy.units.none
      }, {
        key: "views",
        label: t.cols.views,
        render: row => formatNumber(row.views)
      }]} rows={selectedAge.bucket?.articles || []} />
        </Panel> : null}
      <div className={styles.grid2}>
        <DistributionPanel title={t.byCategoryTitle} icon="mdi:tag-outline" items={categoryItems} emptyLabel={copy.empty} />
        <DistributionPanel title={t.byAuthorTitle} icon="mdi:account-edit-outline" items={authorItems} emptyLabel={copy.empty} />
      </div>
    </>;

  const usageView = <>
      <div className={styles.heroKpiGrid}>
        <HeroKpi helpAria={copy.helpAria} icon="mdi:eye-outline" value={formatNumber(usage.views)} label={t.kpis.viewsTotal} hint={t.hints.viewsTotal} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:account-group-outline" value={copy.units.none} label={t.kpis.uniqueVisitors} hint={t.hints.uniqueVisitors} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:magnify" value={copy.units.none} label={t.kpis.searches} hint={t.hints.searches} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:magnify-close" value={formatNumber(usage.searchMisses)} label={t.kpis.searchMisses} hint={t.hints.searchMisses} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:book-check-outline" value={formatNumber(usage.articlesViewed)} label={t.kpis.articlesViewed} hint={t.hints.articlesViewed} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:eye-off-outline" value={formatNumber(usage.neverViewed)} label={t.kpis.neverViewed} hint={t.hints.neverViewed} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:timer-outline" value={copy.units.none} label={t.kpis.avgReadTime} hint={t.hints.avgReadTime} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:ticket-outline" value={copy.units.none} label={t.kpis.beforeTicket} hint={t.hints.beforeTicket} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:shield-check-outline" value={formatNumber(usage.ticketsAvoided)} label={t.kpis.ticketsAvoided} hint={t.hints.ticketsAvoided} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:percent-outline" value={formatPercent(copy, usage.deflectionPct)} label={t.kpis.deflection} hint={t.hints.deflection} help />
      </div>
      <div className={styles.deflectionBanner}>
        <div>
          <span>{t.deflectionViews.replace("{value}", formatNumber(usage.views))}</span>
          <span>{t.deflectionTickets.replace("{value}", formatNumber(usage.ticketsAvoided))}</span>
        </div>
        <strong>{t.deflectionRate.replace("{value}", usage.deflectionPct != null ? String(usage.deflectionPct) : copy.units.none)}</strong>
      </div>
      <div className={styles.grid2}>
        <Panel title={t.topArticlesTitle} icon="mdi:chart-box-outline">
          <DataTable emptyLabel={copy.empty} columns={articleCols} rows={cockpit.topArticles || []} />
        </Panel>
        <Panel title={t.neverViewedTitle} icon="mdi:eye-off-outline">
          <DataTable emptyLabel={copy.empty} columns={[{
          key: "title",
          label: t.cols.article,
          render: row => row.title
        }, {
          key: "updated",
          label: t.cols.updated,
          render: row => row.updatedAt || copy.units.none
        }]} rows={cockpit.neverViewedArticles || []} />
        </Panel>
      </div>
      <Panel title={t.missTitle} icon="mdi:text-search" note={t.missHint.replace("{total}", formatNumber(usage.searchMisses))}>
        <DataTable emptyLabel={copy.empty} columns={[{
        key: "rank",
        label: "#",
        render: (_row, index) => index + 1
      }, {
        key: "query",
        label: t.cols.query,
        render: row => row.label
      }, {
        key: "count",
        label: t.cols.hits,
        render: row => formatNumber(row.count)
      }]} rows={cockpit.searchMisses || []} />
      </Panel>
    </>;

  const qualityView = <>
      <div className={styles.heroKpiGrid}>
        <HeroKpi helpAria={copy.helpAria} icon="mdi:star-outline" value={starLabel(copy, quality.avgRating)} label={t.kpis.avgRating} hint={t.hints.avgRating} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:star-plus-outline" value={formatNumber(quality.ratingCount)} label={t.kpis.ratingCount} hint={t.hints.ratingCount} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:thumb-up-outline" value={formatPercent(copy, quality.upPct)} label={t.kpis.upPct} hint={t.hints.upPct} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:thumb-down-outline" value={formatPercent(copy, quality.downPct)} label={t.kpis.downPct} hint={t.hints.downPct} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:star" value={formatPercent(copy, quality.star1Pct)} label={t.kpis.star1} hint={t.hints.stars} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:star" value={formatPercent(copy, quality.star2Pct)} label={t.kpis.star2} hint={t.hints.stars} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:star" value={formatPercent(copy, quality.star3Pct)} label={t.kpis.star3} hint={t.hints.stars} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:star" value={formatPercent(copy, quality.star4Pct)} label={t.kpis.star4} hint={t.hints.stars} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:star" value={formatPercent(copy, quality.star5Pct)} label={t.kpis.star5} hint={t.hints.stars} />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:emoticon-happy-outline" value={formatPercent(copy, quality.satisfactionPct)} label={t.kpis.satisfaction} hint={t.hints.satisfaction} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:alert-outline" value={formatNumber(quality.below3)} label={t.kpis.below3} hint={t.hints.below3} help />
        <HeroKpi helpAria={copy.helpAria} icon="mdi:thumb-down-outline" value={formatNumber(quality.negativeFeedback)} label={t.kpis.negative} hint={t.hints.negative} help />
      </div>
      <Panel title={t.qualityTableTitle} icon="mdi:table" note={t.qualityTableHint}>
        <DataTable emptyLabel={copy.empty} columns={[{
        key: "title",
        label: t.cols.article,
        render: row => row.title
      }, {
        key: "views",
        label: t.cols.views,
        render: row => formatNumber(row.views)
      }, {
        key: "rating",
        label: t.cols.rating,
        warn: row => row.avgRating != null && row.avgRating < 3,
        render: row => starLabel(copy, row.avgRating)
      }, {
        key: "up",
        label: t.cols.up,
        render: row => row.upPct != null ? `${row.upPct} %` : copy.units.none
      }, {
        key: "down",
        label: t.cols.down,
        warn: row => row.downPct != null && row.downPct >= 40,
        render: row => row.downPct != null ? `${row.downPct} %` : copy.units.none
      }]} rows={cockpit.qualityArticles || []} />
      </Panel>
      <Panel title={t.scoreTitle} icon="mdi:star-circle-outline" note={t.scoreHint}>
        {(cockpit.scores || []).length ? <div className={styles.scoreGrid}>
            {(cockpit.scores || []).map(row => <article key={row.id} className={styles.scoreCard}>
                <strong className={styles.scoreTitle}>{row.title}</strong>
                <span className={styles.scoreValue}>{t.scoreValue.replace("{value}", String(row.score))}</span>
                <ScoreBar label={t.scoreUtilization} value={row.utilization} />
                <ScoreBar label={t.scoreSatisfaction} value={row.satisfaction} />
                <ScoreBar label={t.scoreFreshness} value={row.freshness} />
                <ScoreBar label={t.scoreUsefulness} value={row.usefulness} />
              </article>)}
          </div> : <p className={styles.emptyHint}>{copy.empty}</p>}
      </Panel>
    </>;

  const views = {
    overview: overviewView,
    articles: articlesView,
    usage: usageView,
    quality: qualityView
  };

  return <div className={styles.cockpitLayout}>
      <aside className={styles.cockpitNav} aria-label={t.navAria}>
        {NAV.map(item => <button key={item.key} type="button" className={`${styles.cockpitNavItem} ${view === item.key ? styles.cockpitNavItemActive : ""}`} onClick={() => setView(item.key)}>
            <Icon icon={item.icon} aria-hidden />
            {t.nav[item.key]}
          </button>)}
      </aside>
      <div className={styles.cockpitMain}>
        {views[view]}
      </div>
    </div>;
}
