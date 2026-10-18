import { useDisclosure, useLocalStorage } from "@mantine/hooks";
import { useLocation } from "@tanstack/react-router";
import { isActiveTarget, type NavTarget, useNavigationModel } from "./navigationModel.ts";

export const SIDEBAR_WIDTH = 264;
export const RAIL_WIDTH = 67;

export function useNavigation() {
  const sections = useNavigationModel();
  const pathname = useLocation({ select: (location) => location.pathname });
  const [drawerOpened, drawer] = useDisclosure(false);
  const [rail, setRail] = useLocalStorage({
    key: "a360-sidebar-collapsed",
    defaultValue: false,
    getInitialValueInEffect: false,
  });

  return {
    sections,
    isActive: (target: NavTarget) => isActiveTarget(target, pathname),
    drawerOpened,
    drawer,
    rail,
    toggleRail: () => setRail((collapsed) => !collapsed),
  };
}

export type NavigationState = ReturnType<typeof useNavigation>;
