import type { BaseEntity, Field } from "@espresso-lab/mantine-data-table";

/** A column of a `DataTable`; `flags` opts it into the create and edit dialogs. */
export function field<T extends BaseEntity>(
  id: string,
  column: Field<T>["column"],
  flags: Partial<Omit<Field<T>, "id" | "column">> = {},
): Field<T> {
  return { id, list: true, create: false, update: false, delete: false, column, ...flags };
}
