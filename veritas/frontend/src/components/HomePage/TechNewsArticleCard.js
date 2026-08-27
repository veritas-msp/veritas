import { Icon } from "@iconify/react";
import { ActionIcon, Avatar, Badge, Card, Group, Text, UnstyledButton } from "@mantine/core";
import TechNewsReactions from "./TechNewsReactions";
import classes from "./TechNewsArticleCard.module.css";

const CATEGORY_META = {
  cve: { icon: "mdi:bug-outline", color: "red" },
  security: { icon: "mdi:shield-alert-outline", color: "orange" },
  news: { icon: "mdi:newspaper-variant-outline", color: "blue" },
  tech: { icon: "mdi:chip", color: "teal" }
};

function sourceInitials(source) {
  const words = String(source || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "IT";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

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
        <Icon icon={meta.icon} className={classes.coverIcon} aria-hidden />
      </Card.Section>

      <Badge className={classes.badge} variant="light" color={meta.color} size="sm" leftSection={<Icon icon={meta.icon} width={12} height={12} />}>
        {categoryLabel}
      </Badge>

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

      <Group justify="space-between" wrap="nowrap" className={classes.footer}>
        <Group gap={8} wrap="nowrap" className={classes.sourceGroup}>
          <Avatar size={28} radius="xl" color={meta.color} variant="light">
            {sourceInitials(item.source)}
          </Avatar>
          <div className={classes.sourceMeta}>
            <Text fz="xs" fw={600} lineClamp={1}>
              {item.source}
            </Text>
            {relativeTime ? (
              <Text fz="xs" c="dimmed" component="time" dateTime={item.publishedAt} title={absoluteDate || undefined}>
                {relativeTime}
              </Text>
            ) : null}
          </div>
        </Group>
        {item.link ? (
          <ActionIcon
            className={classes.action}
            variant="subtle"
            color="gray"
            component="a"
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t.openSource}
            title={t.openSource}
            onClick={event => event.stopPropagation()}
          >
            <Icon icon="mdi:open-in-new" width={16} height={16} />
          </ActionIcon>
        ) : null}
      </Group>

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
