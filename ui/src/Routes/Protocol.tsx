import { Code, Text } from "@mantine/core";
import { DataTable, type Field } from "@espresso-lab/mantine-data-table";
import { field } from "../Components/fields.ts";
import { returnCodeStatus, StatusBadge } from "../Components/ui";
import type { ProtocolEntry } from "../types.ts";
import { formatDateTime } from "../utils/format.ts";

const codeOrDash = (value: string | null) => (value ? <Code>{value}</Code> : <Text size="sm" c="dimmed">–</Text>);

const fields: Field<ProtocolEntry>[] = [
  field("createdAt", {
    accessor: "createdAt",
    title: "Zeitpunkt",
    sortable: true,
    noWrap: true,
    render: (entry) => formatDateTime(entry.createdAt),
  }),
  field("orderType", { accessor: "orderType", title: "Auftragsart", render: (entry) => <Code>{entry.orderType}</Code> }),
  field("orderId", { accessor: "orderId", title: "Order-ID", render: (entry) => codeOrDash(entry.orderId) }),
  field("action", { accessor: "action", title: "Aktion", render: (entry) => codeOrDash(entry.action) }),
  field("reasonCode", {
    accessor: "reasonCode",
    title: "Ergebnis",
    visibleMediaQuery: "(min-width: 62em)",
    render: (entry) => codeOrDash(entry.reasonCode),
  }),
  field("returnCode", { accessor: "returnCode", title: "ReturnCode", render: (entry) => <StatusBadge status={returnCodeStatus(entry.returnCode)} /> }),
  field("reasonText", { accessor: "reasonText", title: "Hinweis", visibleMediaQuery: "(min-width: 75em)" }),
];

export function Protocol() {
  return (
    <DataTable<ProtocolEntry>
      title="Kundenprotokoll"
      titleOrder={2}
      titleHint="Jede Zeile ist ein Protokollschritt (pain.002) – Aktion und Ergebnis –, wie ihn der banking-service per HAC abholt und daraus den Status seiner Zahlungsaufträge ableitet."
      entityName="Protokolleintrag"
      queryKey={["protocol"]}
      apiPath="/api/protocol"
      search={{ placeholder: "Order-ID oder Auftragsart suchen", accessors: ["orderId", "orderType", "action"] }}
      fields={fields}
      mobileCards
      autoPoll={5000}
      defaultSort={{ field: "createdAt", direction: "desc" }}
    />
  );
}
