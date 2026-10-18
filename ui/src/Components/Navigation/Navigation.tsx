import { Box, NavLink, ScrollArea, Tooltip } from "@mantine/core";
import {
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { BankLogo, BankMark } from "../Logo/BankLogo.tsx";
import { NavBank } from "./NavBank.tsx";
import { NavTree } from "./NavTree.tsx";
import { ITEM_CLASSNAMES, railTooltip } from "./navigationUi.ts";
import type { NavigationState } from "./useNavigation.ts";
import classes from "./Navigation.module.css";

export function NavSidebar({ nav }: { nav: NavigationState }) {
  const { rail } = nav;
  const toggleLabel = rail ? "Menü ausklappen" : "Menü einklappen";
  const ToggleIcon = rail
    ? IconLayoutSidebarLeftExpand
    : IconLayoutSidebarLeftCollapse;

  return (
    <Tooltip.Group openDelay={300} closeDelay={100}>
      <Box className={classes.sidebar} data-rail={rail || undefined}>
        <Box className={classes.sidebarTop}>
          <Box className={classes.sidebarHeader}>
            <Link to="/" className={classes.logo} aria-label="Zur Übersicht">
              <BankLogo className={classes.logoFull} />
              <BankMark className={classes.logoMark} />
            </Link>
          </Box>
        </Box>

        <ScrollArea className={classes.body} scrollbars="y">
          <Box className={classes.bodyInner}>
            <NavTree nav={nav} rail={rail} />
          </Box>
        </ScrollArea>

        <Box className={classes.sidebarBottom}>
          <Box className={classes.toggleRow}>
            <Tooltip label={toggleLabel} {...railTooltip(rail)}>
              <NavLink
                component="button"
                label={toggleLabel}
                noWrap
                classNames={ITEM_CLASSNAMES}
                className={classes.toggleItem}
                onClick={nav.toggleRail}
                leftSection={<ToggleIcon size={18} stroke={1.75} />}
              />
            </Tooltip>
          </Box>

          <NavBank rail={rail} />
        </Box>
      </Box>
    </Tooltip.Group>
  );
}
