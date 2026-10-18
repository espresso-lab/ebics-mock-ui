import { createTheme, type MantineColorsTuple, mergeMantineTheme } from "@mantine/core";
import { theme } from "./Theme.tsx";

/**
 * The host theme with green as brand colour, so the mock bank never passes for abrechnung360 itself.
 * Shades 6 (light) and 5 (dark) are the filled ones and stay dark enough for white text.
 */
const green: MantineColorsTuple = [
  "#e8f9ee",
  "#b9eecb",
  "#8fe3ad",
  "#63d68c",
  "#3ec46f",
  "#0f863a",
  "#077a32",
  "#066c2c",
  "#055724",
  "#03431c",
];

export const bankTheme = mergeMantineTheme(theme, createTheme({ colors: { custom: green } }));
