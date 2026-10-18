import { ActionIcon, CopyButton, Tooltip } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";

/** Our copy icon: right after a value in a table or a line of text, inside the field of a `CopyValue`. */
export function CopyAction({
  value,
  label = "Kopieren",
  onCopy,
  autoFocus,
}: {
  value: string;
  label?: string;
  onCopy?: () => void;
  autoFocus?: boolean;
}) {
  return (
    <CopyButton value={value} timeout={2000}>
      {({ copied, copy }) => (
        <Tooltip label={copied ? "Kopiert" : label}>
          <ActionIcon
            color={copied ? "success" : undefined}
            aria-label={copied ? "Kopiert" : label}
            autoFocus={autoFocus}
            onClick={(event) => {
              event.stopPropagation();
              copy();
              onCopy?.();
            }}
          >
            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
          </ActionIcon>
        </Tooltip>
      )}
    </CopyButton>
  );
}
