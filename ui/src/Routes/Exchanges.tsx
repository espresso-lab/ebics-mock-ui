import { Code, SimpleGrid, Text } from "@mantine/core";
import { DataTable, type Field } from "@espresso-lab/mantine-data-table";
import { field } from "../Components/fields.ts";
import { returnCodeStatus, StatusBadge, XmlBlock } from "../Components/ui";
import type { Exchange } from "../types.ts";
import { formatDateTime } from "../utils/format.ts";

const fields: Field<Exchange>[] = [
  field("createdAt", {
    accessor: "createdAt",
    title: "Zeitpunkt",
    sortable: true,
    noWrap: true,
    render: (exchange) => formatDateTime(exchange.createdAt),
  }),
  field("rootElement", { accessor: "rootElement", title: "Request", render: (exchange) => <Code>{exchange.rootElement}</Code> }),
  field("orderType", { accessor: "orderType", title: "Auftragsart" }),
  field("phase", { accessor: "phase", title: "Phase", visibleMediaQuery: "(min-width: 62em)" }),
  field("returnCode", {
    accessor: "returnCode",
    title: "ReturnCode",
    render: (exchange) =>
      exchange.returnCode ? (
        <StatusBadge status={returnCodeStatus(exchange.returnCode)} />
      ) : (
        <Text size="sm" c="dimmed">
          –
        </Text>
      ),
  }),
  field("transactionId", {
    accessor: "transactionId",
    title: "Transaktion",
    visibleMediaQuery: "(min-width: 75em)",
    render: (exchange) =>
      exchange.transactionId ? (
        <Text size="sm" ff="monospace" truncate="end" maw={160}>
          {exchange.transactionId}
        </Text>
      ) : (
        <Text size="sm" c="dimmed">
          –
        </Text>
      ),
  }),
];

export function Exchanges() {
  return (
    <DataTable<Exchange>
      title="EBICS-Verkehr"
      titleOrder={2}
      titleHint="Jeder EBICS-Request mit der Antwort der Bank im Klartext – das wichtigste Werkzeug beim Debuggen gegen den banking-service."
      entityName="Nachricht"
      queryKey={["exchanges"]}
      apiPath="/api/exchanges"
      search={{ placeholder: "Auftragsart oder ID suchen", accessors: ["orderType", "rootElement", "transactionId"] }}
      fields={fields}
      mobileCards
      defaultSort={{ field: "createdAt", direction: "desc" }}
      rowExpansion={{
        content: (exchange) => (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <XmlBlock title="Request" xml={exchange.requestXml} />
            <XmlBlock title="Response" xml={exchange.responseXml} />
          </SimpleGrid>
        ),
      }}
    />
  );
}
