import { useState } from 'react'
import { useDebouncedValue, useDisclosure, useHotkeys, useLocalStorage, useMediaQuery } from '@mantine/hooks'
import { useRouterState } from '@tanstack/react-router'
import { NAV_SECTIONS, type NavTarget } from './navigationModel'

export const RAIL_WIDTH = 64
export const RAIL_EXPANDED_WIDTH = 268

const PIN_BREAKPOINT = 1280
const HOVER_DELAY = 120

export function useNavigation() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const canPin = useMediaQuery(`(min-width: ${PIN_BREAKPOINT}px)`) ?? false
  const [pinnedSetting, setPinned] = useLocalStorage({
    key: 'ebics-mock-nav-rail-pinned',
    defaultValue: false,
    getInitialValueInEffect: false,
  })
  const [hovered, setHovered] = useState(false)
  const [hover] = useDebouncedValue(hovered, HOVER_DELAY)
  const [drawerOpened, drawer] = useDisclosure(false)

  const railPinned = canPin && pinnedSetting
  const railExpanded = railPinned || hover

  const toggleRailPin = () => {
    setPinned((pinned) => !pinned)
    setHovered(false)
  }

  useHotkeys([
    ['[', () => canPin && toggleRailPin()],
    ['Escape', () => setHovered(false)],
  ])

  return {
    sections: NAV_SECTIONS,
    isActive: (target: NavTarget) => pathname === target.to,
    railExpanded,
    railPinned,
    canPin,
    navbarWidth: railPinned ? RAIL_EXPANDED_WIDTH : RAIL_WIDTH,
    setRailHovered: setHovered,
    toggleRailPin,
    drawerOpened,
    drawer,
  }
}

export type NavigationState = ReturnType<typeof useNavigation>
