import { Badge, Indicator, NavLink, Tooltip } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import type { NavTarget } from "./navigationModel.ts";
import { ITEM_CLASSNAMES, railTooltip } from "./navigationUi.ts";

type NavTargetLinkProps = {
  target: NavTarget;
  active: boolean;
  rail?: boolean;
  className?: string;
  onClick?: () => void;
};

export function NavTargetLink({
  target,
  active,
  rail = false,
  className,
  onClick,
}: NavTargetLinkProps) {
  const TargetIcon = target.icon;
  const linkProps = {
    to: target.to,
    activeOptions: { exact: target.exact },
  } as Pick<React.ComponentProps<typeof Link>, "to" | "activeOptions">;

  return (
    <Tooltip label={target.label} {...railTooltip(rail)}>
      <NavLink
        component={Link}
        {...linkProps}
        label={target.label}
        active={active}
        noWrap
        className={className}
        classNames={ITEM_CLASSNAMES}
        onClick={onClick}
        leftSection={
          <Indicator
            disabled={!rail || !target.badge}
            label={target.badge}
            maxValue={99}
            size={16}
            color="custom"
            offset={4}
          >
            <TargetIcon size={18} stroke={1.75} />
          </Indicator>
        }
        rightSection={
          target.badge ? <CountBadge count={target.badge} /> : undefined
        }
      />
    </Tooltip>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <Badge size="sm" radius="xl" variant="filled" color="custom">
      {count}
    </Badge>
  );
}
