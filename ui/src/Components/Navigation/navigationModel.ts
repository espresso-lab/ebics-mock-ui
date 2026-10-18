import {
  type Icon,
  IconArrowsExchange,
  IconBuildingBank,
  IconChecklist,
  IconFileText,
  IconFileUpload,
  IconLayoutGrid,
  IconUsers,
  IconWritingSign,
} from "@tabler/icons-react";
import { useApiQuery } from "../../api.ts";
import type { Order, VeuOrder } from "../../types.ts";

const QUEUE_POLL = 10_000;

export type NavTarget = {
  id: string;
  label: string;
  icon: Icon;
  to: string;
  exact?: boolean;
  badge?: number;
};

export type NavSection = {
  id: string;
  label: string;
  items: NavTarget[];
};

export function isActiveTarget(target: NavTarget, pathname: string): boolean {
  if (target.exact) {
    return pathname === target.to;
  }
  return pathname === target.to || pathname.startsWith(`${target.to}/`);
}

export function useNavigationModel(): NavSection[] {
  const orders = useApiQuery<Order[]>(["orders"], "/api/orders", QUEUE_POLL);
  const veu = useApiQuery<VeuOrder[]>(["veu"], "/api/veu", QUEUE_POLL);
  const unbooked = orders.data?.filter((order) => order.status === "RECEIVED").length;
  const awaitingApproval = veu.data?.filter((entry) => entry.status === "OPEN").length;

  return [
    {
      id: "bank",
      label: "Bank",
      items: [
        { id: "home", label: "Übersicht", icon: IconLayoutGrid, to: "/", exact: true },
        { id: "participants", label: "Teilnehmer", icon: IconUsers, to: "/participants" },
      ],
    },
    {
      id: "payments",
      label: "Zahlungsverkehr",
      items: [
        { id: "accounts", label: "Konten", icon: IconBuildingBank, to: "/accounts" },
        { id: "orders", label: "Aufträge", icon: IconFileUpload, to: "/orders", badge: unbooked },
        { id: "veu", label: "Freigaben", icon: IconWritingSign, to: "/veu", badge: awaitingApproval },
        { id: "statements", label: "Kontoauszüge", icon: IconFileText, to: "/statements" },
      ],
    },
    {
      id: "protocol",
      label: "Protokoll",
      items: [
        { id: "protocol", label: "Kundenprotokoll", icon: IconChecklist, to: "/protocol" },
        { id: "exchanges", label: "EBICS-Verkehr", icon: IconArrowsExchange, to: "/exchanges" },
      ],
    },
  ];
}
