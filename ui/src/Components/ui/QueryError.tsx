import { Alert, Button, Stack, Text } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";

/**
 * What a failed query shows instead of its content.
 *
 * <p>Treating missing data as "still loading" turned every failed request into a skeleton that
 * never went away — the Verteilung of an object opened in another organisation looked like it
 * was loading forever. A query renders this as soon as it reports `isError`, before its loading
 * state.
 */
export function QueryError({
  title,
  error,
  onRetry,
}: {
  title: string;
  error?: Error | null;
  onRetry: () => void;
}) {
  return (
    <Alert color="red" title={title}>
      <Stack gap="xs" align="flex-start">
        {error?.message && <Text size="sm">{error.message}</Text>}
        <Button variant="default" size="xs" leftSection={<IconRefresh size={14} />} onClick={onRetry}>
          Erneut laden
        </Button>
      </Stack>
    </Alert>
  );
}
