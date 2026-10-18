import {
  Accordion,
  ActionIcon,
  alpha,
  darken,
  Badge,
  Card,
  Combobox,
  Drawer,
  Menu,
  Modal,
  Paper,
  rem,
  ScrollArea,
  SegmentedControl,
  Tooltip,
  createTheme,
  type CSSVariablesResolver,
  DEFAULT_THEME,
  type MantineColorsTuple,
  mergeMantineTheme,
} from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import classes from "./Theme.module.css";

const dark: MantineColorsTuple = [
  "#d6dae0",
  "#b9bfc7",
  "#9aa1ab",
  "#737a85",
  "#3a4048",
  "#2c3138",
  "#23272d",
  "#1b1e23",
  "#15181c",
  "#0f1114",
];

const custom: MantineColorsTuple = [
  "#ecedff",
  "#d4d7ff",
  "#b3b9ff",
  "#8f99ff",
  "#6f7bff",
  "#4a57f0",
  "#0800ff",
  "#0600e0",
  "#0400bd",
  "#03009e",
];

const success: MantineColorsTuple = [
  "#e6f9f1",
  "#c2f0de",
  "#96e6c6",
  "#66dbac",
  "#3ecf95",
  "#20b77c",
  "#0b9a63",
  "#087a4e",
  "#065c3a",
  "#043d26",
];

const warning: MantineColorsTuple = [
  "#fef4e6",
  "#fce3bd",
  "#f9d091",
  "#f5c173",
  "#f0b45c",
  "#dd9a35",
  "#b87d1c",
  "#945f14",
  "#6f470f",
  "#4a2f09",
];

const themeOverride = createTheme({
  colors: {
    custom,
    dark,
    success,
    warning,
  },
  primaryColor: "custom",
  primaryShade: { light: 6, dark: 5 },
  autoContrast: true,
  luminanceThreshold: 0.22,
  black: "#0d0f12",
  headings: { sizes: { h2: { fontSize: rem(24) } } },
  components: {
    Accordion: Accordion.extend({
      defaultProps: {
        variant: "contained",
        radius: "md",
        chevronPosition: "left",
        chevron: <IconChevronRight size={16} />,
      },
      classNames: { chevron: classes.chevron },
      styles: { item: { backgroundColor: "var(--mantine-color-body)" } },
    }),
    ActionIcon: ActionIcon.extend({
      defaultProps: { variant: "subtle", color: "gray" },
    }),
    Badge: Badge.extend({
      defaultProps: { variant: "light" },
      styles: { label: { overflow: "visible" } },
    }),
    Card: Card.extend({
      defaultProps: { withBorder: true, radius: "md" },
      classNames: { root: classes.card },
    }),
    SegmentedControl: SegmentedControl.extend({
      classNames: { root: classes.segmentedRoot },
    }),
    Combobox: Combobox.extend({
      defaultProps: { radius: "md" },
    }),
    Drawer: Drawer.extend({
      defaultProps: { closeButtonProps: { "aria-label": "Schließen" }, scrollAreaComponent: ScrollArea.Autosize },
    }),
    Menu: Menu.extend({
      defaultProps: { radius: "md", shadow: "md", position: "bottom-end" },
      classNames: { item: classes.menuItem },
    }),
    Modal: Modal.extend({
      defaultProps: {
        radius: "md",
        closeButtonProps: { "aria-label": "Schließen" },
        scrollAreaComponent: ScrollArea.Autosize,
      },
    }),
    Paper: Paper.extend({
      defaultProps: { radius: "md" },
    }),
    Tooltip: Tooltip.extend({
      defaultProps: { withArrow: true },
      styles: { tooltip: { fontSize: "var(--mantine-font-size-xs)" } },
    }),
    ScrollArea: ScrollArea.extend({
      defaultProps: { type: "scroll" },
      classNames: { viewport: classes.scrollViewport },
    }),
  },
});

export const theme = mergeMantineTheme(DEFAULT_THEME, themeOverride);

export const cssVariablesResolver: CSSVariablesResolver = (theme) => ({
  variables: {},
  light: {},
  dark: {
    "--mantine-color-error": theme.colors.red[4],
    "--mantine-color-success": theme.colors.success[4],
    "--mantine-color-red-light-color": theme.colors.red[4],
    "--mantine-color-success-light-color": theme.colors.success[4],
    "--mantine-color-warning-light-color": theme.colors.warning[4],
    "--mantine-color-teal-light-color": theme.colors.teal[4],
    "--mantine-color-custom-filled-hover": darken(theme.colors.custom[5], 0.12),
    "--mantine-color-custom-light": alpha(theme.colors.custom[4], 0.16),
    "--mantine-color-custom-light-hover": alpha(theme.colors.custom[4], 0.22),
    "--mantine-color-custom-light-color": theme.colors.custom[1],
  },
});
