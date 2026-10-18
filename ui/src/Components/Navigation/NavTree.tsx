import { Box, Text } from "@mantine/core";
import { NavTargetLink } from "./NavTargetLink.tsx";
import type { NavigationState } from "./useNavigation.ts";
import classes from "./Navigation.module.css";

type NavTreeProps = {
  nav: NavigationState;
  touch?: boolean;
  rail?: boolean;
  onNavigate?: () => void;
};

export function NavTree({ nav, touch, rail, onNavigate }: NavTreeProps) {
  return (
    <>
      {nav.sections.map((section) => (
        <Box
          key={section.id}
          className={classes.section}
          role="group"
          aria-label={section.label}
        >
          <Text className={classes.sectionLabel}>{section.label}</Text>
          {section.items.map((item) => (
            <NavTargetLink
              key={item.id}
              target={item}
              active={nav.isActive(item)}
              rail={rail}
              className={touch ? classes.touchItem : undefined}
              onClick={onNavigate}
            />
          ))}
        </Box>
      ))}
    </>
  );
}
