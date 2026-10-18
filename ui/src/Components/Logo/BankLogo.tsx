import { Group, Text } from "@mantine/core";
import { IconBuildingBank } from "@tabler/icons-react";

type LogoProps = {
  size?: number;
  className?: string;
};

export function BankMark({ size = 28, className }: LogoProps) {
  return (
    <IconBuildingBank
      size={size}
      stroke={1.75}
      color="var(--mantine-primary-color-filled)"
      className={className}
      aria-hidden
    />
  );
}

export function BankLogo({ size = 28, className }: LogoProps) {
  return (
    <Group gap="xs" wrap="nowrap" className={className}>
      <BankMark size={size} />
      <Text fw={700} fz={Math.round(size * 0.65)} lh={1} style={{ whiteSpace: "nowrap" }}>
        Mock Bank
      </Text>
    </Group>
  );
}
