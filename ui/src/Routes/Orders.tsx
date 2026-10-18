import { Code, Stack, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { DataTable, type Field, SubTable, type SubTableColumn } from "@espresso-lab/mantine-data-table";
import { IconCoins, IconWritingSign } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiPost, errorMessage, useApiQuery } from "../api.ts";
import { field } from "../Components/fields.ts";
import { orderKind, orderStatus, QueryError, StatusBadge, XmlBlock } from "../Components/ui";
import type { Order, OrderItem } from "../types.ts";
import { countOf, formatDateTime, formatIban, formatMoney } from "../utils/format.ts";

const SIGNATURE: Record<string, { label: string; color?: string }> = {
  true: { label: "gültig" },
  false: { label: "ungültig", color: "red" },
  null: { label: "keine", color: "dimmed" },
};

const isDirectDebit = (order: Order) => order.kind === "CDD" || order.kind === "CDC";

const fields: Field<Order>[] = [
  field("orderId", { accessor: "orderId", title: "Order-ID", sortable: true, render: (order) => <Code>{order.orderId}</Code> }, { delete: true }),
  field("kind", {
    accessor: "kind",
    title: "Art",
    render: (order) => (
      <Stack gap={2}>
        <Text size="sm">{orderKind[order.kind]}</Text>
        <Text size="xs" c="dimmed">
          {order.msgName}
        </Text>
      </Stack>
    ),
  }),
  field("itemCount", { accessor: "itemCount", title: "Posten", textAlign: "right", visibleMediaQuery: "(min-width: 62em)" }),
  field("totalAmount", {
    accessor: "totalAmount",
    title: "Summe",
    textAlign: "right",
    noWrap: true,
    render: (order) => formatMoney(order.totalAmount, order.currency),
  }),
  field("signatureValid", {
    accessor: "signatureValid",
    title: "Unterschrift",
    visibleMediaQuery: "(min-width: 62em)",
    render: (order) => {
      const signature = SIGNATURE[String(order.signatureValid)];
      return (
        <Text size="sm" c={signature.color}>
          {signature.label}
        </Text>
      );
    },
  }),
  field("status", { accessor: "status", title: "Status", render: (order) => <StatusBadge status={orderStatus[order.status]} /> }),
  field("createdAt", {
    accessor: "createdAt",
    title: "Eingang",
    sortable: true,
    noWrap: true,
    visibleMediaQuery: "(min-width: 75em)",
    render: (order) => formatDateTime(order.createdAt),
  }),
];

function OrderDetails({ order }: { order: Order }) {
  const mobile = useMediaQuery("(max-width: 48em)") ?? false;
  const details = useApiQuery<Order>(["order", order.id], `/api/orders/${order.id}`);
  const columns: SubTableColumn<OrderItem>[] = [
    { accessor: "name", title: isDirectDebit(order) ? "Zahler" : "Empfänger" },
    { accessor: "iban", title: "IBAN", noWrap: true, render: (item) => formatIban(item.iban) },
    { accessor: "remittance", title: "Verwendungszweck" },
    { accessor: "endToEndId", title: "End-to-End-ID", hideOnMobile: () => true },
    { accessor: "amount", title: "Betrag", textAlign: "right", noWrap: true, render: (item) => formatMoney(item.amount, item.currency) },
  ];

  return (
    <Stack gap="xl">
      {details.isError ? (
        <QueryError title="Posten nicht geladen" error={details.error} onRetry={() => void details.refetch()} />
      ) : (
        <SubTable<OrderItem>
          nested
          title="Posten"
          mobile={mobile}
          columns={columns}
          records={details.data?.items ?? []}
          idAccessor="endToEndId"
          noRecordsText={details.isLoading ? "Posten werden geladen …" : "Keine Posten"}
        />
      )}
      <XmlBlock title="Auftragsdatei" xml={order.rawPain} />
    </Stack>
  );
}

export function Orders() {
  const queryClient = useQueryClient();
  const orders = useApiQuery<Order[]>(["orders"], "/api/orders");
  const unbooked = orders.data?.filter((order) => order.status === "RECEIVED").length ?? 0;

  const run = async (order: Order, perform: () => Promise<unknown>, outcome: string) => {
    try {
      await perform();
      notifications.show({ color: "success", message: `Auftrag ${order.orderId} ${outcome}` });
    } catch (error) {
      notifications.show({ color: "red", title: `Auftrag ${order.orderId} nicht ${outcome}`, message: errorMessage(error) });
    } finally {
      await Promise.all(
        [["orders"], ["veu"], ["bookings"], ["protocol"]].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    }
  };

  const book = (order: Order) => run(order, () => apiPost(`/api/orders/${order.id}/book`), "verbucht");

  const requestApproval = (order: Order) =>
    run(order, () => apiPost("/api/veu", { orderId: order.orderId }), "zur Freigabe gestellt");

  return (
    <DataTable<Order>
      title="Aufträge"
      titleOrder={2}
      description={
        orders.data
          ? [countOf(orders.data.length, "Auftrag", "Aufträge"), unbooked > 0 && `${unbooked} zu verbuchen`].filter(Boolean).join(" · ")
          : undefined
      }
      titleHint="Per BTU eingereichte SEPA-Aufträge (pain.001/pain.008), entschlüsselt und geprüft. Verbuchen schreibt die Posten als Umsätze auf das Konto des Auftraggebers; danach unter Konten einen Kontoauszug erstellen, damit sie im camt.053 stehen."
      entityName="Auftrag"
      recordLabel={(order) => order.orderId}
      queryKey={["orders"]}
      apiPath="/api/orders"
      search={{ placeholder: "Order-ID suchen", accessors: ["orderId"] }}
      fields={fields}
      selection
      mobileCards
      defaultSort={{ field: "createdAt", direction: "desc" }}
      rowActions={(order) =>
        order.status === "RECEIVED"
          ? [
              { label: "Verbuchen", icon: <IconCoins size={16} />, onClick: () => void book(order) },
              { label: "Zur Freigabe stellen", icon: <IconWritingSign size={16} />, onClick: () => void requestApproval(order) },
            ]
          : []
      }
      rowExpansion={{ content: (order) => <OrderDetails order={order} /> }}
    />
  );
}
