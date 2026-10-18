import { Card, Group, SimpleGrid, Skeleton, Stack, Text, Title } from "@mantine/core";
import { PageHeader } from "@espresso-lab/mantine-data-table";
import { useApiQuery } from "../api.ts";
import { CopyAction, CopyValue, QueryError } from "../Components/ui";
import { bankUrl } from "../config.ts";
import type { Account, BankKey, Health, ParticipantResource } from "../types.ts";
import { countOf, formatHash } from "../utils/format.ts";

const BANK_KEYS: { type: BankKey["type"]; label: string }[] = [
  { type: "X002", label: "Authentifikation (X002)" },
  { type: "E002", label: "Verschlüsselung (E002)" },
];

export function Overview() {
  const participants = useApiQuery<ParticipantResource[]>(["participants"], "/api/participants");
  const accounts = useApiQuery<Account[]>(["accounts"], "/api/accounts");
  const figures =
    participants.data && accounts.data
      ? `${countOf(participants.data.length, "Teilnehmer", "Teilnehmer")} · ${countOf(accounts.data.length, "Konto", "Konten")}`
      : undefined;

  return (
    <Stack gap="md">
      <PageHeader title="Übersicht" description={figures} />
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <AccessCard />
        <BankKeysCard />
      </SimpleGrid>
    </Stack>
  );
}

function AccessCard() {
  const health = useApiQuery<Health>(["health"], "/api/health", 15_000);

  return (
    <Card>
      <Stack gap="md">
        <Title order={4}>Zugangsdaten</Title>
        <Stack gap="sm">
          <CopyValue label="Bank-URL" value={bankUrl} />
          {health.isError ? (
            <QueryError title="Host-ID nicht geladen" error={health.error} onRetry={() => void health.refetch()} />
          ) : health.data ? (
            <CopyValue label="Host-ID" value={health.data.hostId} />
          ) : (
            <Skeleton height={58} />
          )}
          <Stack gap={4}>
            <Text size="sm" c="dimmed">
              Version
            </Text>
            <Text size="sm">EBICS 3.0 (H005)</Text>
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
}

function BankKeysCard() {
  const keys = useApiQuery<BankKey[]>(["bank-keys"], "/api/bank-keys");

  return (
    <Card>
      <Stack gap="md">
        <Stack gap={4}>
          <Title order={4}>Bank-Schlüssel</Title>
          <Text size="sm" c="dimmed">
            Hashwerte für den Abgleich beim Einrichten der Bankverbindung
          </Text>
        </Stack>
        {keys.isError ? (
          <QueryError title="Bank-Schlüssel nicht geladen" error={keys.error} onRetry={() => void keys.refetch()} />
        ) : keys.data ? (
          BANK_KEYS.map(({ type, label }) => {
            const hash = formatHash(keys.data.find((key) => key.type === type)?.digest ?? "");
            return (
              <Stack key={type} gap={4}>
                <Text size="sm" c="dimmed">
                  {label}
                </Text>
                <Group gap="xs" wrap="nowrap" align="flex-start">
                  <Text size="sm" ff="monospace" flex={1} miw={0}>
                    {hash || "–"}
                  </Text>
                  {hash && <CopyAction value={hash} label={`Hashwert ${type} kopieren`} />}
                </Group>
              </Stack>
            );
          })
        ) : (
          <Skeleton height={120} />
        )}
      </Stack>
    </Card>
  );
}
