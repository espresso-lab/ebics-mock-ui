import {
  Box,
  CloseButton,
  Drawer,
  Group,
  NativeScrollArea,
  ScrollArea,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { BankLogo } from "../Logo/BankLogo.tsx";
import { NavBank } from "./NavBank.tsx";
import { NavTree } from "./NavTree.tsx";
import type { NavigationState } from "./useNavigation.ts";
import classes from "./Navigation.module.css";

export function NavDrawer({ nav }: { nav: NavigationState }) {
  return (
    <Drawer
      opened={nav.drawerOpened}
      onClose={nav.drawer.close}
      closeOnEscape={false}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.nativeEvent.isComposing) {
          nav.drawer.close();
        }
      }}
      position="left"
      size={336}
      withCloseButton={false}
      padding={0}
      scrollAreaComponent={NativeScrollArea}
      classNames={{ content: classes.sidebar }}
      styles={{
        body: {
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          padding: 0,
        },
      }}
    >
      <Box className={classes.sidebarTop}>
        <Group
          className={classes.sidebarHeader}
          justify="space-between"
          wrap="nowrap"
          pe="sm"
        >
          <BankLogo />
          <CloseButton
            size={40}
            icon={<IconX size={22} stroke={1.75} />}
            onClick={nav.drawer.close}
            aria-label="Menü schließen"
          />
        </Group>
      </Box>

      <ScrollArea className={classes.body}>
        <Box className={classes.bodyInner}>
          <NavTree nav={nav} touch onNavigate={nav.drawer.close} />
        </Box>
      </ScrollArea>

      <Box className={classes.sidebarBottom}>
        <NavBank />
      </Box>
    </Drawer>
  );
}
