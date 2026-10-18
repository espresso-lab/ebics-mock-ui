import { useState } from "react";
import { Button, Group, MultiSelect, Select, Stack, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { DataTable, type Field, SubTable, type SubTableColumn } from "@espresso-lab/mantine-data-table";
import { IconLock, IconLockOpen, IconUserPlus } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiPost, apiPut, errorMessage, useApiQuery } from "../api.ts";
import { field } from "../Components/fields.ts";
import { CopyAction, participantStage, participantStatus, QueryError, StatusBadge } from "../Components/ui";
import type { Account, ParticipantKeyResource, ParticipantResource, SignatureClass } from "../types.ts";
import { countOf, formatDate, formatDateTime, formatHash, formatIban } from "../utils/format.ts";

const SIGNATURE_CLASSES: { value: SignatureClass; label: string }[] = [
  { value: "E", label: "E – Einzelunterschrift" },
  { value: "A", label: "A – Erstunterschrift" },
  { value: "B", label: "B – Zweitunterschrift" },
  { value: "T", label: "T – Transportunterschrift" },
];

const KEY_LABEL: Record<ParticipantKeyResource["type"], string> = {
  A006: "Signatur (A006)",
  X002: "Authentifikation (X002)",
  E002: "Verschlüsselung (E002)",
};

const KEY_ORDER = Object.keys(KEY_LABEL) as ParticipantKeyResource["type"][];

function AccountPermissions({ values, setValues }: { values: ParticipantResource; setValues: (patch: Partial<ParticipantResource>) => void }) {
  const accounts = useApiQuery<Account[]>(["accounts"], "/api/accounts");
  const holders = new Map((accounts.data ?? []).map((account) => [account.id, account.name]));

  return (
    <MultiSelect
      label="Kontoberechtigungen"
      description="Leer lassen, damit HTD alle Konten der Bank nennt"
      placeholder={accounts.data?.length ? "Konten auswählen" : "Noch keine Konten angelegt"}
      data={(accounts.data ?? []).map((account) => ({ value: account.id, label: formatIban(account.iban) }))}
      renderOption={({ option }) => (
        <Stack gap={2}>
          <Text size="sm">{option.label}</Text>
          {holders.get(option.value) && (
            <Text size="xs" c="dimmed">
              {holders.get(option.value)}
            </Text>
          )}
        </Stack>
      )}
      value={values.accountIds}
      onChange={(accountIds) => setValues({ accountIds })}
      searchable
      clearable
    />
  );
}

const fields: Field<ParticipantResource>[] = [
  field("partnerId", { accessor: "partnerId", title: "Kunden-ID", sortable: true }, { create: true, required: true, delete: true }),
  field("userId", { accessor: "userId", title: "Teilnehmer-ID", sortable: true }, { create: true, required: true }),
  field("hostId", { accessor: "hostId", title: "Host-ID", hidden: true }, { create: true, placeholder: "MOCKBANK" }),
  field("status", {
    accessor: "activated",
    title: "Status",
    render: (participant) => <StatusBadge status={participantStatus[participantStage(participant)]} />,
  }),
  {
    ...field<ParticipantResource>("signatureClass", {
      accessor: "signatureClass",
      title: "Unterschriftsklasse",
      render: (participant) => (
        <Stack gap={2}>
          <Text size="sm">{participant.signatureClass}</Text>
          {!participant.signatureClassDisclosed && (
            <Text size="xs" c="dimmed">
              nicht im HTD
            </Text>
          )}
        </Stack>
      ),
    }),
    update: true,
    type: "custom",
    render: (values, setValues, _hideButtons, validation) => (
      <Select
        label="Unterschriftsklasse"
        data={SIGNATURE_CLASSES}
        value={values.signatureClass}
        onChange={(value) => value && setValues({ signatureClass: value as SignatureClass })}
        allowDeselect={false}
        error={validation?.error}
      />
    ),
  },
  field("signatureClassDisclosed", { accessor: "signatureClassDisclosed", title: "Klasse im HTD ausweisen", hidden: true }, { update: true, type: "boolean" }),
  {
    ...field<ParticipantResource>("accountIds", { accessor: "accountIds", title: "Kontoberechtigungen", hidden: true }),
    update: true,
    type: "custom",
    defaultValue: [],
    render: (values, setValues) => <AccountPermissions values={values} setValues={setValues} />,
  },
  field("createdAt", {
    accessor: "createdAt",
    title: "Angelegt",
    sortable: true,
    visibleMediaQuery: "(min-width: 62em)",
    render: (participant) => formatDate(participant.createdAt),
  }),
];

function ParticipantDetails({ participant }: { participant: ParticipantResource }) {
  const mobile = useMediaQuery("(max-width: 48em)") ?? false;
  const keys = useApiQuery<ParticipantKeyResource[]>(["participant-keys", participant.id], `/api/participants/${participant.id}/keys`);
  const orderedKeys = KEY_ORDER.flatMap((type) => keys.data?.filter((key) => key.type === type) ?? []);
  const accounts = useApiQuery<Account[]>(["accounts"], "/api/accounts");
  const permitted = (accounts.data ?? []).filter((account) => participant.accountIds.includes(account.id));

  const keyColumns: SubTableColumn<ParticipantKeyResource>[] = [
    { accessor: "type", title: "Schlüssel", noWrap: true, render: (key) => KEY_LABEL[key.type] },
    {
      accessor: "digest",
      title: "Hashwert (SHA-256)",
      render: (key) => (
        <Group gap="xs" wrap="nowrap" align="flex-start">
          <Text size="sm" ff="monospace" flex={1} miw={0}>
            {formatHash(key.digest)}
          </Text>
          <CopyAction value={formatHash(key.digest)} label={`Hashwert ${key.type} kopieren`} />
        </Group>
      ),
    },
    {
      accessor: "createdAt",
      title: "Empfangen",
      noWrap: true,
      hideOnMobile: () => true,
      render: (key) => formatDateTime(key.createdAt),
    },
  ];

  return (
    <Stack gap="xl">
      {keys.isError ? (
        <QueryError title="Schlüssel nicht geladen" error={keys.error} onRetry={() => void keys.refetch()} />
      ) : (
        <SubTable<ParticipantKeyResource>
          nested
          title="Schlüssel"
          mobile={mobile}
          columns={keyColumns}
          records={orderedKeys}
          noRecordsText={keys.isLoading ? "Schlüssel werden geladen …" : "Noch keine Schlüssel empfangen"}
        />
      )}
      <SubTable<Account>
        nested
        title="Kontoberechtigungen"
        mobile={mobile}
        columns={[
          { accessor: "iban", title: "IBAN", render: (account) => formatIban(account.iban) },
          { accessor: "name", title: "Kontoinhaber" },
        ]}
        records={permitted}
        noRecordsText="Alle Konten der Bank"
      />
    </Stack>
  );
}

function SimulateButton() {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);

  const simulate = async () => {
    setRunning(true);
    try {
      const participant = await apiPost<ParticipantResource>("/api/participants/simulate");
      await queryClient.invalidateQueries({ queryKey: ["participants"] });
      notifications.show({ color: "success", message: `Test-Teilnehmer ${participant.partnerId} angelegt` });
    } catch (error) {
      notifications.show({ color: "red", title: "Test-Teilnehmer nicht angelegt", message: errorMessage(error) });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Button variant="default" leftSection={<IconUserPlus size={16} />} loading={running} onClick={simulate}>
      Test-Teilnehmer simulieren
    </Button>
  );
}

export function Participants() {
  const queryClient = useQueryClient();
  const participants = useApiQuery<ParticipantResource[]>(["participants"], "/api/participants");
  const waiting = participants.data?.filter((participant) => participantStage(participant) === "AWAITING_LETTER").length ?? 0;

  const setActivated = async (participant: ParticipantResource, activated: boolean) => {
    try {
      await apiPut(`/api/participants/${participant.id}`, { activated });
      await queryClient.invalidateQueries({ queryKey: ["participants"] });
      notifications.show({ color: "success", message: `Teilnehmer ${participant.userId} ${activated ? "freigeschaltet" : "gesperrt"}` });
    } catch (error) {
      notifications.show({ color: "red", title: "Teilnehmer nicht gespeichert", message: errorMessage(error) });
    }
  };

  return (
    <DataTable<ParticipantResource>
      title="Teilnehmer"
      titleOrder={2}
      description={
        participants.data
          ? [countOf(participants.data.length, "Teilnehmer", "Teilnehmer"), waiting > 0 && `${waiting} ohne INI-Brief`].filter(Boolean).join(" · ")
          : undefined
      }
      titleHint="Die Bank legt den Teilnehmer an und übergibt Host-, Kunden- und Teilnehmer-ID an den Kunden. Der banking-service schickt dann INI und HIA; HPB liefert die Bankschlüssel erst, wenn der Teilnehmer freigeschaltet ist – das ersetzt den INI-Brief. Die Unterschriftsklasse steht im HTD an den BTU-Berechtigungen; ein T-Teilnehmer reicht nur mit requestEDS ein, der Auftrag wartet dann unter Freigaben."
      entityName="Teilnehmer"
      recordLabel={(participant) => `${participant.partnerId} / ${participant.userId}`}
      queryKey={["participants"]}
      apiPath="/api/participants"
      search={{ placeholder: "Kunden-/Teilnehmer-ID suchen", accessors: ["partnerId", "userId"] }}
      buttons={[<SimulateButton key="simulate" />]}
      fields={fields}
      mobileCards
      defaultSort={{ field: "createdAt", direction: "desc" }}
      rowActions={(participant) => [
        participant.activated
          ? { label: "Sperren", icon: <IconLock size={16} />, onClick: () => void setActivated(participant, false) }
          : { label: "Freischalten", icon: <IconLockOpen size={16} />, onClick: () => void setActivated(participant, true) },
      ]}
      rowExpansion={{ content: (participant) => <ParticipantDetails participant={participant} /> }}
    />
  );
}
