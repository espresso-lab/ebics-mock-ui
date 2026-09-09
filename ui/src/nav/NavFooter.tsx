import {
  Box,
  CopyButton,
  Group,
  Indicator,
  Menu,
  SegmentedControl,
  Text,
  ThemeIcon,
  UnstyledButton,
  useMantineColorScheme,
  type MantineColorScheme,
} from '@mantine/core'
import { IconBuildingBank, IconCheck, IconCopy, IconExternalLink, IconSelector } from '@tabler/icons-react'
import { useApiQuery } from '../api'
import { bankUrl } from '../config'
import classes from './Navigation.module.css'

const COLOR_SCHEMES = [
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
  { value: 'auto', label: 'Auto' },
]

type NavFooterProps = {
  collapsed?: boolean
  mobile?: boolean
}

export function NavFooter({ collapsed, mobile }: NavFooterProps) {
  const health = useApiQuery<{ status: string; hostId: string }>(['health'], '/api/health', 10_000)
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  const online = !!health.data
  const status = online ? `online · ${health.data.hostId}` : 'offline'

  return (
    <Box className={classes.footer}>
      <Menu
        width={mobile ? 'target' : 284}
        position={mobile ? 'top-start' : 'right-end'}
        offset={8}
        shadow="md"
        radius="md"
        withinPortal
        classNames={{ itemSection: classes.menuItemSection }}
      >
        <Menu.Target>
          <UnstyledButton className={classes.bank} data-collapsed={collapsed || undefined} aria-label="Bank-Einstellungen">
            <Group h="100%" gap={11} wrap="nowrap" justify={collapsed ? 'center' : 'flex-start'}>
              <Indicator color={online ? 'brand' : 'red'} size={9} offset={4} withBorder processing={!online}>
                <ThemeIcon variant="light" color={online ? 'brand' : 'red'} radius="xl" size={34}>
                  <IconBuildingBank size={18} stroke={1.7} />
                </ThemeIcon>
              </Indicator>
              {!collapsed && (
                <>
                  <Box miw={0} flex={1}>
                    <Text fz={13} fw={600} lh={1.3} truncate>
                      EBICS-Bankrechner
                    </Text>
                    <Text c={online ? 'dimmed' : 'red'} fz={11} truncate>
                      {status}
                    </Text>
                  </Box>
                  <IconSelector size={16} stroke={1.7} className={classes.bankChevron} />
                </>
              )}
            </Group>
          </UnstyledButton>
        </Menu.Target>

        <Menu.Dropdown>
          <Group className={classes.menuHeader} gap={11} wrap="nowrap">
            <ThemeIcon variant="light" color={online ? 'brand' : 'red'} radius="xl" size={38}>
              <IconBuildingBank size={20} stroke={1.7} />
            </ThemeIcon>
            <Box miw={0} flex={1}>
              <Text fz={14} fw={600} lh={1.3} truncate>
                Mock Bank
              </Text>
              <Text c={online ? 'dimmed' : 'red'} fz={12} truncate>
                {status}
              </Text>
            </Box>
          </Group>

          <Group className={classes.menuScheme} gap={10} wrap="nowrap">
            <Text className={classes.menuSchemeLabel}>Darstellung</Text>
            <SegmentedControl
              size="xs"
              value={colorScheme}
              onChange={(value) => setColorScheme(value as MantineColorScheme)}
              data={COLOR_SCHEMES}
              ml="auto"
            />
          </Group>

          <Menu.Divider />

          <CopyButton value={bankUrl} timeout={1500}>
            {({ copied, copy }) => (
              <Menu.Item
                closeMenuOnClick={false}
                leftSection={copied ? <IconCheck size={18} stroke={1.7} /> : <IconCopy size={18} stroke={1.7} />}
                onClick={copy}
              >
                {copied ? 'Bank-URL kopiert' : 'Bank-URL kopieren'}
              </Menu.Item>
            )}
          </CopyButton>
          <Menu.Item
            component="a"
            href={`${bankUrl.replace('/ebicsweb/ebicsweb', '')}/api/health`}
            target="_blank"
            rel="noopener noreferrer"
            leftSection={<IconExternalLink size={18} stroke={1.7} />}
          >
            Health-Endpunkt
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Box>
  )
}
