export const formatMoney = (amount: number | string, currency: string) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: currency || "EUR" }).format(Number(amount));

export const formatIban = (iban: string) => iban.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();

/** Upper-case byte pairs, the way abrechnung360 shows a bank key hash for comparison. */
export const formatHash = (hex: string) => hex.toUpperCase().match(/.{1,2}/g)?.join(" ") ?? "";

export const countOf = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

/** `DD.MM.YYYY` for a date or an instant, in the reader's time zone. */
export function formatDate(value: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}
