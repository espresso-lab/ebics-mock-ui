import { alpha, Badge, createTheme, type CSSVariablesResolver, DEFAULT_THEME, type MantineColorsTuple, mergeMantineTheme } from '@mantine/core'

const brand: MantineColorsTuple = [
  '#e6ffee',
  '#d3f9e0',
  '#a8f2c0',
  '#7aea9f',
  '#54e382',
  '#3bdf70',
  '#2bdd66',
  '#1bc455',
  '#0bae4a',
  '#00973c',
]

const dark: MantineColorsTuple = [
  '#e7e9ec',
  '#c3c9d1',
  '#a2a8b0',
  '#767d86',
  '#2a3038',
  '#22272d',
  '#1b1f24',
  '#14171b',
  '#0d0f12',
  '#08090b',
]

const override = createTheme({
  colors: { brand, dark },
  primaryColor: 'brand',
  primaryShade: { light: 8, dark: 5 },
  autoContrast: true,
  luminanceThreshold: 0.22,
  black: '#0d0f12',
  defaultRadius: 'md',
  components: {
    Badge: Badge.extend({ defaultProps: { variant: 'light' }, styles: { label: { overflow: 'visible' } } }),
  },
})

export const theme = mergeMantineTheme(DEFAULT_THEME, override)

export const cssVariablesResolver: CSSVariablesResolver = (theme) => ({
  variables: {},
  light: {},
  dark: {
    '--mantine-color-error': theme.colors.red[4],
    '--mantine-color-brand-light': alpha(theme.colors.brand[5], 0.16),
    '--mantine-color-brand-light-hover': alpha(theme.colors.brand[5], 0.22),
    '--mantine-color-brand-light-color': theme.colors.brand[2],
  },
})
