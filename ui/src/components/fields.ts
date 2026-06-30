import type { Field } from '@espresso-lab/mantine-data-table'

type Base = { id: string | number }

export function listField<T extends Base>(id: string, column: Field<T>['column'], extra: Partial<Field<T>> = {}): Field<T> {
  return { id, list: true, create: false, update: false, delete: false, column, ...extra }
}

export function formField<T extends Base>(
  id: string,
  column: Field<T>['column'],
  opts: { type?: Field<T>['type']; required?: boolean; update?: boolean; placeholder?: string } = {},
): Field<T> {
  return {
    id,
    list: true,
    create: true,
    update: opts.update ?? false,
    delete: false,
    type: opts.type,
    required: opts.required,
    placeholder: opts.placeholder,
    column,
  }
}
