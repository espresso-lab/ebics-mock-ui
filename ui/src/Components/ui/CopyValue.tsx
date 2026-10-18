import { TextInput, type TextInputProps } from "@mantine/core";
import { CopyAction } from "./CopyAction";

/** A value to paste elsewhere — an API key, an address: a read-only field in the code font, our copy icon inside. */
export function CopyValue({
  value,
  onCopy,
  autoFocus,
  ...props
}: Omit<TextInputProps, "value" | "onCopy"> & {
  value: string;
  onCopy?: () => void;
}) {
  return (
    <TextInput
      {...props}
      value={value}
      readOnly
      data-monospace
      rightSection={
        <CopyAction value={value} onCopy={onCopy} autoFocus={autoFocus} />
      }
      rightSectionPointerEvents="auto"
    />
  );
}
