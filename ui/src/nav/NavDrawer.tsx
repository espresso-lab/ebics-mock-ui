import { Fragment } from 'react'
import { ActionIcon, Box, Drawer, Group, ScrollArea, Stack, Text } from '@mantine/core'
import { IconX } from '@tabler/icons-react'
import { BankLogo } from './BankLogo'
import { NavFooter } from './NavFooter'
import { NavTargetLink } from './NavTargetLink'
import type { NavigationState } from './useNavigation'
import classes from './Navigation.module.css'

export function NavDrawer({ nav }: { nav: NavigationState }) {
  return (
    <Drawer
      opened={nav.drawerOpened}
      onClose={nav.drawer.close}
      position="left"
      size={336}
      withCloseButton={false}
      padding={0}
      styles={{
        content: { display: 'flex', flexDirection: 'column' },
        body: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: 0 },
      }}
    >
      <Stack className={classes.drawerHeader} gap={10} p={16}>
        <Group justify="space-between" wrap="nowrap">
          <BankLogo />
          <ActionIcon variant="subtle" color="gray" size={36} onClick={nav.drawer.close} aria-label="Menü schließen">
            <IconX size={22} stroke={1.7} />
          </ActionIcon>
        </Group>
      </Stack>

      <ScrollArea className={classes.body} type="hover">
        <Box className={classes.bodyInner}>
          {nav.sections.map((section) => (
            <Fragment key={section.id}>
              <Text className={classes.sectionLabel}>{section.label}</Text>
              {section.items.map((item) => (
                <NavTargetLink
                  key={item.id}
                  target={item}
                  active={nav.isActive(item)}
                  expanded
                  iconSize={23}
                  className={classes.drawerItem}
                  onClick={nav.drawer.close}
                />
              ))}
            </Fragment>
          ))}
        </Box>
      </ScrollArea>

      <NavFooter mobile />
    </Drawer>
  )
}
