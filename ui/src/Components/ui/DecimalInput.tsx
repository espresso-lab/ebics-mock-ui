import { Text, TextInput, TextInputProps } from "@mantine/core";
import { useState } from "react";
import { flushSync } from "react-dom";
import { formatDecimal, parseDecimalInput, toEditableDecimal } from "../../utils/decimal.ts";

export type DecimalInputProps = Omit<TextInputProps, "value" | "onChange" | "type"> & {
  value?: number | string | null;
  onChange?: (value: number | undefined) => void;
  decimalScale?: number;
  fixedDecimalScale?: boolean;
  min?: number;
  max?: number;
  /** Unit shown inside the field — "kWh", "m³", "%". Purely decorative, never part of the value. */
  unit?: string;
};

export default function DecimalInput({
  value,
  onChange,
  decimalScale = 2,
  fixedDecimalScale = false,
  min,
  max,
  unit,
  onFocus,
  onBlur,
  ...inputProps
}: DecimalInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const numeric =
    value === "" || value === null || value === undefined || Number.isNaN(Number(value))
      ? undefined
      : Number(value);
  const formatted =
    numeric === undefined ? "" : formatDecimal(numeric, decimalScale, fixedDecimalScale);

  const emit = (raw: string) => {
    if (!onChange) return;
    if (raw.trim() === "") {
      onChange(undefined);
      return;
    }
    const parsed = parseDecimalInput(raw, decimalScale);
    if (parsed === undefined) return;
    onChange(Math.min(Math.max(parsed, min ?? -Infinity), max ?? Infinity));
  };

  return (
    <TextInput
      inputMode="decimal"
      autoComplete="off"
      rightSection={
        unit ? (
          <Text size="sm" c="dimmed">
            {unit}
          </Text>
        ) : undefined
      }
      rightSectionWidth={unit ? 16 + unit.length * 8 : undefined}
      rightSectionPointerEvents="none"
      {...inputProps}
      value={draft ?? formatted}
      onChange={(event) => {
        setDraft(event.currentTarget.value);
        emit(event.currentTarget.value);
      }}
      onFocus={(event) => {
        const input = event.currentTarget;
        if (numeric !== undefined && numeric !== 0) {
          flushSync(() => setDraft(toEditableDecimal(numeric, decimalScale, fixedDecimalScale)));
        }
        input.select();
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setDraft(null);
        onBlur?.(event);
      }}
    />
  );
}
