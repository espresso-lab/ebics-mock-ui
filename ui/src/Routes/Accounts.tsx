import { useState } from "react";
import { Button, FileButton, Group, Modal, Radio, Stack, Text } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { DataTable, type Field } from "@espresso-lab/mantine-data-table";
import { IconFileText, IconUpload } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiPost, errorMessage, useApiQuery } from "../api.ts";
import { field } from "../Components/fields.ts";
import { DecimalInput } from "../Components/ui";
import type { Account, Booking, CreditDebit } from "../types.ts";
import { GERMAN_DATE_FORMAT, GERMAN_DATE_PLACEHOLDER, parseGermanDate } from "../utils/date.ts";
import { countOf, formatDate, formatIban, formatMoney } from "../utils/format.ts";

const compact = (value: string) => value.replace(/\s/g, "").toLowerCase();

const signedAmount = (booking: Booking) => (booking.creditDebit === "DBIT" ? -1 : 1) * Number(booking.amount);

const accountFields: Field<Account>[] = [
  field("iban", { accessor: "iban", title: "IBAN", sortable: true, noWrap: true, render: (account) => formatIban(account.iban) }, {
    create: true,
    update: true,
    required: true,
    delete: true,
  }),
  field("name", { accessor: "name", title: "Kontoinhaber", sortable: true }, { create: true, update: true }),
  field("bic", { accessor: "bic", title: "BIC", visibleMediaQuery: "(min-width: 62em)" }, { create: true, update: true }),
  field("currency", { accessor: "currency", title: "Währung", hidden: true }, { create: true, update: true, placeholder: "EUR" }),
  {
    ...field<Account>("balance", {
      accessor: "balance",
      title: "Saldo",
      textAlign: "right",
      noWrap: true,
      render: (account) => formatMoney(account.balance, account.currency),
    }),
    create: true,
    update: true,
    type: "custom",
    render: (values, setValues) => (
      <DecimalInput
        label="Saldo"
        description="Nur zur Anzeige – der Kontoauszug rechnet mit den Umsätzen"
        unit={values.currency || "EUR"}
        value={values.balance}
        onChange={(value) => setValues({ balance: value === undefined ? "" : String(value) })}
      />
    ),
  },
];

const bookingFields: Field<Booking>[] = [
  {
    ...field<Booking>("bookDate", {
      accessor: "bookDate",
      title: "Buchungstag",
      sortable: true,
      noWrap: true,
      render: (booking) => formatDate(booking.bookDate),
    }),
    create: true,
    update: true,
    required: true,
    delete: true,
    type: "custom",
    render: (values, setValues, _hideButtons, validation) => (
      <DateInput
        label="Buchungstag"
        required
        placeholder={GERMAN_DATE_PLACEHOLDER}
        valueFormat={GERMAN_DATE_FORMAT}
        dateParser={parseGermanDate}
        value={values.bookDate || null}
        onChange={(value) => setValues({ bookDate: value ?? "" })}
        error={validation?.error}
      />
    ),
  },
  field("counterpartyName", { accessor: "counterpartyName", title: "Gegenpartei" }, { create: true, update: true }),
  field(
    "counterpartyIban",
    {
      accessor: "counterpartyIban",
      title: "IBAN Gegenpartei",
      noWrap: true,
      visibleMediaQuery: "(min-width: 75em)",
      render: (booking) => formatIban(booking.counterpartyIban),
    },
    { create: true, update: true },
  ),
  field("remittance", { accessor: "remittance", title: "Verwendungszweck", visibleMediaQuery: "(min-width: 62em)" }, { create: true, update: true }),
  {
    ...field<Booking>("creditDebit", { accessor: "creditDebit", title: "Richtung", hidden: true }),
    create: true,
    update: true,
    type: "custom",
    defaultValue: "CRDT",
    render: (values, setValues) => (
      <Radio.Group
        label="Richtung"
        value={values.creditDebit || "CRDT"}
        onChange={(value) => setValues({ creditDebit: value as CreditDebit })}
      >
        <Group mt="xs" gap="lg">
          <Radio value="CRDT" label="Eingang (CRDT)" />
          <Radio value="DBIT" label="Ausgang (DBIT)" />
        </Group>
      </Radio.Group>
    ),
  },
  {
    ...field<Booking>("amount", {
      accessor: "amount",
      title: "Betrag",
      textAlign: "right",
      noWrap: true,
      render: (booking) => formatMoney(signedAmount(booking), booking.currency),
    }),
    create: true,
    update: true,
    required: true,
    type: "custom",
    render: (values, setValues, _hideButtons, validation) => (
      <DecimalInput
        label="Betrag"
        required
        unit="EUR"
        value={values.amount}
        onChange={(value) => setValues({ amount: value === undefined ? "" : String(value) })}
        error={validation?.error}
      />
    ),
  },
];

function CamtUpload({ account }: { account: Account }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const { imported } = await apiPost<{ imported: number }>(`/api/accounts/${account.id}/import-camt`, {
        content: await file.text(),
      });
      await queryClient.invalidateQueries({ queryKey: ["bookings", account.id] });
      notifications.show({ color: "success", message: `${countOf(imported, "Umsatz", "Umsätze")} aus ${file.name} importiert` });
    } catch (error) {
      notifications.show({ color: "red", title: "camt-Datei nicht importiert", message: errorMessage(error) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <FileButton accept=".xml,text/xml,application/xml" onChange={upload}>
      {(props) => (
        <Button {...props} variant="default" size="xs" leftSection={<IconUpload size={14} />} loading={uploading}>
          camt-Datei hochladen
        </Button>
      )}
    </FileButton>
  );
}

function Bookings({ account }: { account: Account }) {
  return (
    <DataTable<Booking>
      nested
      title="Umsätze"
      entityName="Buchung"
      recordLabel={(booking) => `${formatDate(booking.bookDate)} ${booking.counterpartyName}`}
      queryKey={["bookings", account.id]}
      apiPath={`/api/accounts/${account.id}/bookings`}
      buttons={[<CamtUpload key="camt" account={account} />]}
      fields={bookingFields}
      selection
      mobileCards
      defaultSort={{ field: "bookDate", direction: "desc" }}
      noRecordsText="Noch keine Umsätze"
    />
  );
}

type StatementRequest = { account?: Account; opened: boolean };

function StatementModal({ account, opened, onClose }: StatementRequest & { onClose: () => void }) {
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (!account) return;
    setCreating(true);
    try {
      await apiPost(`/api/accounts/${account.id}/statements`, {
        ...(fromDate && { fromDate }),
        ...(toDate && { toDate }),
      });
      await queryClient.invalidateQueries({ queryKey: ["statements"] });
      notifications.show({ color: "success", message: `Kontoauszug für ${formatIban(account.iban)} erstellt` });
      onClose();
    } catch (error) {
      notifications.show({ color: "red", title: "Kontoauszug nicht erstellt", message: errorMessage(error) });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      onExitTransitionEnd={() => {
        setFromDate(null);
        setToDate(null);
      }}
      title="Kontoauszug erstellen"
      fullScreen={isMobile}
    >
      <Stack gap="sm">
        {account && (
          <Text size="sm" c="dimmed">
            {[formatIban(account.iban), account.name].filter(Boolean).join(" · ")}
          </Text>
        )}
        <DateInput
          label="Von"
          description="Leer: ab der ersten Buchung"
          placeholder={GERMAN_DATE_PLACEHOLDER}
          valueFormat={GERMAN_DATE_FORMAT}
          dateParser={parseGermanDate}
          clearable
          allowDeselect={false}
          value={fromDate}
          onChange={setFromDate}
        />
        <DateInput
          label="Bis"
          description="Leer: bis heute – ein früheres Datum lässt gerade verbuchte Aufträge weg"
          placeholder={GERMAN_DATE_PLACEHOLDER}
          valueFormat={GERMAN_DATE_FORMAT}
          dateParser={parseGermanDate}
          clearable
          allowDeselect={false}
          value={toDate}
          onChange={setToDate}
        />
      </Stack>
      <Group justify="flex-end" gap="xs" mt="md">
        <Button variant="default" onClick={onClose}>
          Abbrechen
        </Button>
        <Button leftSection={<IconFileText size={16} />} loading={creating} onClick={create}>
          Kontoauszug erstellen
        </Button>
      </Group>
    </Modal>
  );
}

export function Accounts() {
  const accounts = useApiQuery<Account[]>(["accounts"], "/api/accounts");
  const [statement, setStatement] = useState<StatementRequest>({ opened: false });

  return (
    <>
      <DataTable<Account>
        title="Konten"
        titleOrder={2}
        description={accounts.data ? countOf(accounts.data.length, "Konto", "Konten") : undefined}
        titleHint="Die Konten der Mock-Bank mit ihren Umsätzen. Ein Kontoauszug fasst die Umsätze eines Zeitraums als camt.053 zusammen, den der banking-service per BTD abholt; Anfangs- und Endsaldo ergeben sich allein aus den Umsätzen."
        entityName="Konto"
        recordLabel={(account) => formatIban(account.iban)}
        queryKey={["accounts"]}
        apiPath="/api/accounts"
        search={{
          placeholder: "IBAN oder Kontoinhaber suchen",
          match: (account, query) =>
            compact(account.iban).includes(compact(query)) || account.name.toLowerCase().includes(query.trim().toLowerCase()),
        }}
        fields={accountFields}
        mobileCards
        defaultSort={{ field: "iban", direction: "asc" }}
        rowActions={(account) => [
          {
            label: "Kontoauszug erstellen",
            icon: <IconFileText size={16} />,
            onClick: () => setStatement({ account, opened: true }),
          },
        ]}
        rowExpansion={{ content: (account) => <Bookings account={account} /> }}
      />
      <StatementModal {...statement} onClose={() => setStatement((current) => ({ ...current, opened: false }))} />
    </>
  );
}
