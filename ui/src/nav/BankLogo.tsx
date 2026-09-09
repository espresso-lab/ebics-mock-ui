import { Badge, ThemeIcon } from '@mantine/core'
import { IconBuildingBank } from '@tabler/icons-react'
import { Link } from '@tanstack/react-router'
import classes from './Navigation.module.css'

export function BankLogo({ expanded = true }: { expanded?: boolean }) {
  return (
    <Link to="/" className={classes.logo} aria-label="Zur Teilnehmerübersicht">
      <ThemeIcon variant="light" color="brand" size={32} radius={9}>
        <IconBuildingBank size={19} stroke={1.7} />
      </ThemeIcon>
      {expanded && (
        <>
          <span className={classes.logoText}>Mock Bank</span>
          <Badge size="sm" color="brand">
            H005
          </Badge>
        </>
      )}
    </Link>
  )
}
