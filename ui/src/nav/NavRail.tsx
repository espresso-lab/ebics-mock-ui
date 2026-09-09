import { Fragment, useRef } from 'react'
import { ActionIcon, Box, Divider, Group, ScrollArea, Text, Tooltip } from '@mantine/core'
import { IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand } from '@tabler/icons-react'
import { BankLogo } from './BankLogo'
import { NavFooter } from './NavFooter'
import { NavTargetLink } from './NavTargetLink'
import { RAIL_EXPANDED_WIDTH, RAIL_WIDTH, type NavigationState } from './useNavigation'
import classes from './Navigation.module.css'

function hasVisibleFocus(container: HTMLElement | null): boolean {
  const active = document.activeElement
  return !!container && active instanceof Element && container.contains(active) && active.matches(':focus-visible')
}

export function NavRail({ nav }: { nav: NavigationState }) {
  const column = useRef<HTMLDivElement>(null)
  const expanded = nav.railExpanded

  return (
    <Box
      ref={column}
      className={classes.column}
      data-floating={(expanded && !nav.railPinned) || undefined}
      style={{ left: 0, width: expanded ? RAIL_EXPANDED_WIDTH : RAIL_WIDTH, zIndex: 2 }}
      onMouseEnter={() => nav.setRailHovered(true)}
      onMouseLeave={() => nav.setRailHovered(hasVisibleFocus(column.current))}
      onFocus={() => nav.setRailHovered(true)}
      onBlur={() => nav.setRailHovered(!!column.current?.matches(':hover'))}
    >
      <Group className={classes.header} gap={10} wrap="nowrap">
        <BankLogo expanded={expanded} />
        {expanded && nav.canPin && <PinButton pinned={nav.railPinned} onClick={nav.toggleRailPin} />}
      </Group>

      <ScrollArea className={classes.body} type="hover">
        <Box className={classes.bodyInner}>
          {nav.sections.map((section, index) => (
            <Fragment key={section.id}>
              {expanded ? (
                <Text className={classes.sectionLabel}>{section.label}</Text>
              ) : (
                index > 0 && <Divider className={classes.sectionDivider} />
              )}
              {section.items.map((item) => (
                <NavTargetLink key={item.id} target={item} active={nav.isActive(item)} expanded={expanded} iconSize={19} />
              ))}
            </Fragment>
          ))}
        </Box>
      </ScrollArea>

      <NavFooter collapsed={!expanded} />
    </Box>
  )
}

function PinButton({ pinned, onClick }: { pinned: boolean; onClick: () => void }) {
  const PinIcon = pinned ? IconLayoutSidebarLeftCollapse : IconLayoutSidebarLeftExpand
  const action = pinned ? 'Fixierung lösen' : 'Menü fixieren'

  return (
    <Tooltip label={`${action} ([)`} position="right" offset={10}>
      <ActionIcon
        variant={pinned ? 'light' : 'subtle'}
        color={pinned ? 'brand' : 'gray'}
        size={30}
        radius={8}
        ml="auto"
        onClick={onClick}
        aria-label={action}
        aria-pressed={pinned}
      >
        <PinIcon size={19} stroke={1.7} />
      </ActionIcon>
    </Tooltip>
  )
}
