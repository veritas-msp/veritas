import "@mantine/core/styles.layer.css";
import { useContext, useMemo } from "react";
import { Icon } from "@iconify/react";
import { Avatar, Box, Group, MantineProvider, Text, createTheme } from "@mantine/core";
import { ThemeContext } from "../../ThemeProvider";
import { getUserInitials, resolveUserAvatarSrc } from "../../../utils/userAvatarUtils";
import classes from "./UserInfoIcons.module.css";

const accountTheme = createTheme({
  primaryColor: "blue",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  defaultRadius: "md"
});

export default function UserInfoIcons({
  user,
  name,
  job,
  email,
  detail,
  detailIcon = "tabler:clock"
}) {
  const { theme } = useContext(ThemeContext) || {};
  const colorScheme = theme === "dark" ? "dark" : "light";
  const displayName = name || user?.ticket_helpdesk_display_name || user?.username || user?.email || "";
  const src = resolveUserAvatarSrc({
    avatar: user?.avatar
  });
  const initials = useMemo(() => getUserInitials(displayName), [displayName]);

  return <MantineProvider theme={accountTheme} forceColorScheme={colorScheme} cssVariablesSelector=".veritas-account-userinfo">
      <Box className="veritas-account-userinfo">
        <Group wrap="nowrap" gap="md">
          <Avatar src={src || undefined} size={94} radius="md" alt={displayName} color="blue">
            {initials}
          </Avatar>
          <div>
            {job ? <Text fz="xs" tt="uppercase" fw={700} c="dimmed">
                {job}
              </Text> : null}
            <Text fz="lg" fw={500} className={classes.name}>
              {displayName}
            </Text>
            {email ? <Group wrap="nowrap" gap={10} mt={3}>
                <Icon icon="tabler:at" width={16} height={16} className={classes.icon} />
                <Text fz="xs" c="dimmed">
                  {email}
                </Text>
              </Group> : null}
            {detail ? <Group wrap="nowrap" gap={10} mt={5}>
                <Icon icon={detailIcon} width={16} height={16} className={classes.icon} />
                <Text fz="xs" c="dimmed">
                  {detail}
                </Text>
              </Group> : null}
          </div>
        </Group>
      </Box>
    </MantineProvider>;
}
