import { Badge, type BadgeProps } from "@mantine/core";
import type { StatusEntry } from "./statusMaps";

type StatusBadgeProps = Omit<BadgeProps, "color" | "children"> & {
  status: StatusEntry;
};

export function StatusBadge({ status, ...props }: StatusBadgeProps) {
  return (
    <Badge color={status.color} {...props}>
      {status.label}
    </Badge>
  );
}
