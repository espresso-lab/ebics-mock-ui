import { Badge, createTheme, DEFAULT_THEME, type MantineColorsTuple, mergeMantineTheme } from '@mantine/core'

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
  '#c3c5f0',
  '#a3a6e0',
  '#4e5190',
  '#2a2d60',
  '#151845',
  '#0e1035',
  '#080a24',
  '#050718',
  '#030510',
  '#02030a',
]

const override = createTheme({
  colors: { brand, dark },
  primaryColor: 'brand',
  primaryShade: { light: 6, dark: 4 },
  defaultRadius: 'md',
  components: {
    Badge: Badge.extend({ styles: { label: { overflow: 'visible' } } }),
  },
})

export const theme = mergeMantineTheme(DEFAULT_THEME, override)
