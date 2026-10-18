import { Code, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { DataTable, type Field } from "@espresso-lab/mantine-data-table";
import { IconCircleCheck, IconCircleX } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiPost, errorMessage, useApiQuery } from "../api.ts";
import { field } from "../Components/fields.ts";
import { orderKind, StatusBadge, veuStatus } from "../Components/ui";
import type { VeuOrder } from "../types.ts";
import { countOf, formatDateTime, formatMoney } from "../utils/format.ts";

const fields: Field<VeuOrder>[] = [
  field("orderId", { accessor: "orderId", title: "Order-ID", sortable: true, render: (veu) => <Code>{veu.orderId}</Code> }, { delete: true }),
  field("kind", { accessor: "kind", title: "Art", render: (veu) => orderKind[veu.kind] }),
  field("totalAmount", {
    accessor: "totalAmount",
    title: "Summe",
    textAlign: "right",
    noWrap: true,
    render: (veu) => formatMoney(veu.totalAmount, veu.currency),
  }),
  field("signatures", {
    accessor: "signaturesDone",
    title: "Unterschriften",
    textAlign: "right",
    visibleMediaQuery: "(min-width: 62em)",
    render: (veu) => `${veu.signaturesDone} von ${veu.signaturesRequired}`,
  }),
  field("status", { accessor: "status", title: "Status", render: (veu) => <StatusBadge status={veuStatus[veu.status]} /> }),
  field("createdAt", {
    accessor: "createdAt",
    title: "Eingang",
    sortable: true,
    noWrap: true,
    visibleMediaQuery: "(min-width: 75em)",
    render: (veu) => formatDateTime(veu.createdAt),
  }),
];

export function Veu() {
  const queryClient = useQueryClient();
  const veu = useApiQuery<VeuOrder[]>(["veu"], "/api/veu");
  const open = veu.data?.filter((entry) => entry.status === "OPEN").length ?? 0;

  const decide = async (entry: VeuOrder, action: "approve" | "cancel") => {
    const outcome = action === "approve" ? "freigegeben" : "storniert";
    try {
      await apiPost(`/api/veu/${entry.id}/${action}`);
      notifications.show({ color: "success", message: `Auftrag ${entry.orderId} ${outcome}` });
    } catch (error) {
      notifications.show({ color: "red", title: `Auftrag ${entry.orderId} nicht ${outcome}`, message: errorMessage(error) });
    } finally {
      await Promise.all(
        [["veu"], ["orders"], ["protocol"], ["bookings"]].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    }
  };

  const confirmApproval = (entry: VeuOrder) =>
    modals.openConfirmModal({
      title: "Auftrag freigeben?",
      centered: true,
      children: (
        <Text size="sm">
          Auftrag „{entry.orderId}“ über {formatMoney(entry.totalAmount, entry.currency)} wird wie in der Bank-App
          freigegeben und verbucht. Im Kundenprotokoll folgen VEU_VERIFICATION_END und ORDER_HAC_FINAL_POS.
        </Text>
      ),
      labels: { confirm: "Freigeben", cancel: "Abbrechen" },
      onConfirm: () => void decide(entry, "approve"),
    });

  const confirmCancellation = (entry: VeuOrder) =>
    modals.openConfirmModal({
      title: "Auftrag stornieren?",
      centered: true,
      children: (
        <Text size="sm">
          Auftrag „{entry.orderId}“ über {formatMoney(entry.totalAmount, entry.currency)} wird wie in der Bank-App
          storniert und abgewiesen. Im Kundenprotokoll folgen VEU_CANCEL_ORDER und ORDER_HAC_FINAL_NEG.
        </Text>
      ),
      labels: { confirm: "Stornieren", cancel: "Abbrechen" },
      confirmProps: { color: "red" },
      onConfirm: () => void decide(entry, "cancel"),
    });

  return (
    <DataTable<VeuOrder>
      title="Freigaben"
      titleOrder={2}
      description={veu.data ? [countOf(veu.data.length, "Auftrag", "Aufträge"), open > 0 && `${open} offen`].filter(Boolean).join(" · ") : undefined}
      titleHint="Aufträge im Unterschriftsordner der Bank (VEU). Ein T-Teilnehmer reicht mit requestEDS ein; freigegeben oder storniert wird außerhalb von EBICS in der Bank-App – das übernehmen hier „Freigeben“ und „Stornieren“."
      entityName="Freigabe"
      recordLabel={(entry) => entry.orderId}
      queryKey={["veu"]}
      apiPath="/api/veu"
      search={{ placeholder: "Order-ID suchen", accessors: ["orderId"] }}
      fields={fields}
      selection
      mobileCards
      autoPoll={5000}
      defaultSort={{ field: "createdAt", direction: "desc" }}
      rowActions={(entry) =>
        entry.status === "OPEN"
          ? [
              { label: "Freigeben", icon: <IconCircleCheck size={16} />, onClick: () => confirmApproval(entry) },
              { label: "Stornieren", icon: <IconCircleX size={16} />, onClick: () => confirmCancellation(entry) },
            ]
          : []
      }
    />
  );
}
