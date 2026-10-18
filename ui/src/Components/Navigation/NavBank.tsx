import { useState } from "react";
import {
  Avatar,
  Box,
  Divider,
  NavLink,
  Switch,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import {
  IconExternalLink,
  IconHeartbeat,
  IconMoon,
  IconServer2,
} from "@tabler/icons-react";
import { useLocation } from "@tanstack/react-router";
import { useApiQuery } from "../../api.ts";
import { API_BASE } from "../../config.ts";
import type { Health } from "../../types.ts";
import { NavCard } from "./NavCard.tsx";
import { ITEM_CLASSNAMES } from "./navigationUi.ts";
import classes from "./Navigation.module.css";

const SWITCH_CLASSNAMES = {
  root: classes.cardSwitch,
  body: classes.cardSwitchBody,
  labelWrapper: classes.cardSwitchLabelWrapper,
  label: classes.cardSwitchLabel,
  input: classes.cardSwitchInput,
};

export function NavBank({ rail }: { rail?: boolean }) {
  const { setColorScheme } = useMantineColorScheme();
  const dark = useComputedColorScheme("light") === "dark";
  const health = useApiQuery<Health>(["health"], "/api/health", 15_000);
  const pathname = useLocation({ select: (location) => location.pathname });
  const [state, setState] = useState({ pathname, opened: false });
  if (state.pathname !== pathname) {
    setState({ pathname, opened: false });
  }

  return (
    <Box className={classes.footer}>
      <NavCard
        avatar={
          <Avatar
            color={health.isError ? "red" : "custom"}
            variant="light"
            radius="xl"
            size={32}
            className={classes.cardAvatar}
          >
            <IconServer2 size={18} stroke={1.75} />
          </Avatar>
        }
        title={health.data?.hostId ?? "Bankrechner"}
        meta={health.isError ? "Nicht erreichbar" : "EBICS-Bankrechner"}
        label="Bankmenü"
        opened={state.opened}
        onChange={(opened) => setState({ pathname, opened })}
        placement="above"
        rail={rail}
      >
        <Switch
          classNames={SWITCH_CLASSNAMES}
          labelPosition="left"
          label={
            <>
              <IconMoon size={16} stroke={1.75} className={classes.itemSection} />
              Dunkler Modus
            </>
          }
          checked={dark}
          onChange={(event) =>
            setColorScheme(event.currentTarget.checked ? "dark" : "light")
          }
        />
        <Divider my={4} mx={-4} color="var(--nav-line)" />
        <NavLink
          classNames={ITEM_CLASSNAMES}
          className={classes.cardItem}
          component="a"
          href={`${API_BASE}/api/health`}
          target="_blank"
          rel="noopener noreferrer"
          label="Health-Endpunkt"
          leftSection={<IconHeartbeat size={16} stroke={1.75} />}
          rightSection={
            <IconExternalLink size={14} stroke={1.75} className={classes.itemSection} />
          }
        />
      </NavCard>
    </Box>
  );
}
