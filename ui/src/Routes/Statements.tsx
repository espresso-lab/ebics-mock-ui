import { DataTable, type Field } from "@espresso-lab/mantine-data-table";
import { IconDownload } from "@tabler/icons-react";
import { statementContentUrl, useApiQuery } from "../api.ts";
import { field } from "../Components/fields.ts";
import { StatusBadge, statementStatus } from "../Components/ui";
import type { Statement } from "../types.ts";
import { countOf, formatDate, formatDateTime, formatIban } from "../utils/format.ts";

const download = (statement: Statement) => {
  const link = document.createElement("a");
  link.href = statementContentUrl(statement.id);
  link.download = statement.fileName;
  link.click();
};

const fields: Field<Statement>[] = [
  field("iban", { accessor: "iban", title: "Konto", sortable: true, noWrap: true, render: (statement) => formatIban(statement.iban) }, { delete: true }),
  field("period", {
    accessor: "fromDate",
    title: "Zeitraum",
    noWrap: true,
    render: (statement) => `${formatDate(statement.fromDate)} – ${formatDate(statement.toDate)}`,
  }),
  field("status", { accessor: "status", title: "Status", render: (statement) => <StatusBadge status={statementStatus[statement.status]} /> }),
  field("createdAt", {
    accessor: "createdAt",
    title: "Erstellt",
    sortable: true,
    noWrap: true,
    visibleMediaQuery: "(min-width: 62em)",
    render: (statement) => formatDateTime(statement.createdAt),
  }),
];

export function Statements() {
  const statements = useApiQuery<Statement[]>(["statements"], "/api/statements");
  const available = statements.data?.filter((statement) => statement.status === "AVAILABLE").length ?? 0;

  return (
    <DataTable<Statement>
      title="Kontoauszüge"
      titleOrder={2}
      description={
        statements.data
          ? [countOf(statements.data.length, "Kontoauszug", "Kontoauszüge"), available > 0 && `${available} abrufbar`].filter(Boolean).join(" · ")
          : undefined
      }
      titleHint="Erstellte camt.053-Auszüge. Abrufbare holt der banking-service beim nächsten BTD ab, danach stehen sie auf „Abgeholt“."
      entityName="Kontoauszug"
      recordLabel={(statement) => statement.fileName}
      queryKey={["statements"]}
      apiPath="/api/statements"
      search={{ placeholder: "IBAN suchen", match: (statement, query) => statement.iban.includes(query.replace(/\s/g, "").toUpperCase()) }}
      fields={fields}
      selection
      mobileCards
      defaultSort={{ field: "createdAt", direction: "desc" }}
      rowActions={(statement) => [
        { label: "Herunterladen", icon: <IconDownload size={16} />, onClick: () => download(statement) },
      ]}
    />
  );
}
