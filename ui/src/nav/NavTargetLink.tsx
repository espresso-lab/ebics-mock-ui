import { NavLink } from '@mantine/core'
import { Link } from '@tanstack/react-router'
import type { NavTarget } from './navigationModel'
import classes from './Navigation.module.css'

export const ITEM_CLASSNAMES = {
  root: classes.item,
  body: classes.itemBody,
  section: classes.itemSection,
}

type NavTargetLinkProps = {
  target: NavTarget
  active: boolean
  expanded: boolean
  iconSize: number
  className?: string
  onClick?: () => void
}

export function NavTargetLink({ target, active, expanded, iconSize, className, onClick }: NavTargetLinkProps) {
  const TargetIcon = target.icon
  return (
    <NavLink
      component={Link}
      to={target.to}
      activeOptions={{ exact: true }}
      label={target.label}
      aria-label={expanded ? undefined : target.label}
      active={active}
      noWrap
      data-collapsed={!expanded || undefined}
      className={className}
      classNames={ITEM_CLASSNAMES}
      onClick={onClick}
      leftSection={<TargetIcon size={iconSize} stroke={1.7} />}
    />
  )
}
