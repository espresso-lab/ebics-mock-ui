import { useRef } from "react";
import {
  Box,
  Divider,
  FocusTrap,
  Popover,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useClickOutside } from "@mantine/hooks";
import { IconSelector } from "@tabler/icons-react";
import { NavReveal } from "./NavReveal.tsx";
import { railTooltip } from "./navigationUi.ts";
import { SIDEBAR_WIDTH } from "./useNavigation.ts";
import classes from "./Navigation.module.css";

type NavCardProps = {
  avatar?: React.ReactNode;
  railAvatar?: React.ReactNode;
  title: string;
  meta: string;
  label: string;
  opened: boolean;
  onChange: (opened: boolean) => void;
  onExpanded?: () => void;
  placement: "above" | "below";
  rail?: boolean;
  children: React.ReactNode;
};

export function NavCard({
  avatar,
  railAvatar,
  title,
  meta,
  label,
  opened,
  onChange,
  onExpanded,
  placement,
  rail = false,
  children,
}: NavCardProps) {
  const header = useRef<HTMLButtonElement>(null);
  const inline = opened && !rail;
  const root = useClickOutside<HTMLDivElement>(
    () => onChange(false),
    null,
    undefined,
    inline,
  );
  const text = (
    <Box className={classes.cardText}>
      <Text className={classes.cardTitle}>{title}</Text>
      <Text className={classes.cardMeta}>{meta}</Text>
    </Box>
  );
  const separator = <Divider my={2} mx={-4} color="var(--nav-line)" />;
  const body = (
    <Box className={classes.cardBody}>
      {placement === "below" && separator}
      {children}
      {placement === "above" && separator}
    </Box>
  );
  const collapse = !rail && (
    <NavReveal opened={inline} onRevealed={onExpanded}>
      {body}
    </NavReveal>
  );

  return (
    <Box
      ref={root}
      className={classes.card}
      data-expanded={inline || undefined}
      data-placement={placement}
      onKeyDown={(event) => {
        if (event.key === "Escape" && inline) {
          event.stopPropagation();
          onChange(false);
          header.current?.focus();
        }
      }}
    >
      {placement === "above" && collapse}
      <Popover
        opened={rail && opened}
        onChange={onChange}
        position={placement === "below" ? "right-start" : "right-end"}
        offset={{ mainAxis: 21, crossAxis: placement === "below" ? -1 : 1 }}
        width={SIDEBAR_WIDTH - 24}
        radius={12}
        shadow="md"
        withRoles={rail}
        trapFocus
        returnFocus
        onEnterTransitionEnd={onExpanded}
        transitionProps={{
          transition:
            placement === "below" ? "pop-top-left" : "pop-bottom-left",
          duration: 150,
        }}
      >
        <Tooltip label={title} {...railTooltip(rail, opened)}>
          <Popover.Target>
            <UnstyledButton
              ref={header}
              className={classes.cardHeader}
              data-plain={!avatar || undefined}
              aria-label={label}
              aria-expanded={opened}
              onClick={() => onChange(!opened)}
            >
              {avatar}
              {railAvatar && (
                <Box
                  component="span"
                  className={classes.cardRailAvatar}
                  aria-hidden
                >
                  {railAvatar}
                </Box>
              )}
              {text}
              <IconSelector
                size={16}
                stroke={1.75}
                className={classes.cardChevron}
              />
            </UnstyledButton>
          </Popover.Target>
        </Tooltip>
        <Popover.Dropdown
          className={classes.floatingCard}
          data-placement={placement}
          p={3}
          pb={placement === "below" ? 0 : 3}
        >
          <FocusTrap.InitialFocus />
          {placement === "above" && body}
          <Box className={classes.cardInfo}>{text}</Box>
          {placement === "below" && body}
        </Popover.Dropdown>
      </Popover>
      {placement === "below" && collapse}
    </Box>
  );
}
