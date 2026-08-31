import { Icon } from "@iconify/react";
import { Card, Text, UnstyledButton } from "@mantine/core";
import TechNewsReactions from "./TechNewsReactions";
import classes from "./TechNewsArticleCard.module.css";

const CATEGORY_META = {
  cve: { icon: "mdi:bug-outline", color: "red" },
  security: { icon: "mdi:shield-alert-outline", color: "orange" },
  news: { icon: "mdi:newspaper-variant-outline", color: "blue" },
  tech: { icon: "mdi:chip", color: "teal" }
};

export default function TechNewsArticleCard({
  item,
  categoryLabel,
  relativeTime,
  localeTag,
  onOpen,
  reactions,
  myReaction,
  pending,
  onReact,
  t
}) {
  const cat = item.category || "news";
  const meta = CATEGORY_META[cat] || CATEGORY_META.news;
  const absoluteDate = item.publishedAt
    ? (() => {
        try {
          return new Date(item.publishedAt).toLocaleString(localeTag, {
            dateStyle: "medium",
            timeStyle: "short"
          });
        } catch {
          return "";
        }
      })()
    : "";

  return (
    <Card withBorder radius="md" padding="md" shadow="sm" className={classes.card}>
      <Card.Section className={classes.cover} data-category={cat} onClick={onOpen}>
        <div className={classes.coverRow}>
          <span className={classes.badge}>
            <Icon icon={meta.icon} width={13} height={13} aria-hidden />
            {categoryLabel}
          </span>
          {relativeTime ? (
            <time className={classes.coverTime} dateTime={item.publishedAt} title={absoluteDate || undefined}>
              {relativeTime}
            </time>
          ) : null}
        </div>
        <div className={classes.coverRow}>
          {item.source ? <span className={classes.coverSource}>{item.source}</span> : <span />}
          {item.link ? (
            <a
              className={classes.coverLink}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t.openSource}
              title={t.openSource}
              onClick={event => event.stopPropagation()}
            >
              <Icon icon="mdi:open-in-new" width={14} height={14} />
            </a>
          ) : null}
        </div>
      </Card.Section>

      <UnstyledButton className={classes.body} onClick={onOpen} aria-label={t.openArticle}>
        <Text className={classes.title} fw={600} lineClamp={2}>
          {item.title}
        </Text>
        {item.snippet ? (
          <Text fz="sm" c="dimmed" lineClamp={2} mt={4}>
            {item.snippet}
          </Text>
        ) : null}
      </UnstyledButton>

      <div className={classes.reactions}>
        <TechNewsReactions
          articleId={item.id}
          reactions={reactions}
          myReaction={myReaction}
          pending={pending}
          onReact={onReact}
          t={t}
        />
      </div>
    </Card>
  );
}
