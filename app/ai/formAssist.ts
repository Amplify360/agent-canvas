export interface StructuredAssistFieldConfig<T extends Record<string, any>, Field extends keyof T & string> {
  key: Field;
  label: string;
  isPopulated?: (value: T[Field & keyof T], current: T) => boolean;
  formatValue?: (value: T[Field & keyof T], current: T) => string;
  isEqual?: (currentValue: T[Field & keyof T], proposedValue: NonNullable<Partial<T>[Field & keyof Partial<T>]>, current: T) => boolean;
}

export interface StructuredAssistResult<T extends Record<string, any>, Field extends keyof T & string> {
  patch: Partial<T>;
  fieldMeta: Partial<Record<Field, { reason?: string }>>;
  warnings: string[];
  unmappedNotes: string[];
  model: string;
}

export interface StructuredAssistDiffItem<Field extends string> {
  field: Field;
  label: string;
  currentValue: string;
  proposedValue: string;
}

export function filterStructuredAssistPatch<T extends Record<string, any>, Field extends keyof T & string>(
  current: T,
  patch: Partial<T>,
  fields: ReadonlyArray<StructuredAssistFieldConfig<T, Field>>,
  fillEmptyOnly = false
): Partial<T> {
  if (!fillEmptyOnly) {
    return patch;
  }

  return fields.reduce<Partial<T>>((acc, field) => {
    const value = patch[field.key as keyof T];
    if (value === undefined) {
      return acc;
    }

    const currentValue = current[field.key];
    const isPopulated = field.isPopulated
      ? field.isPopulated(currentValue, current)
      : defaultIsPopulated(currentValue);
    if (isPopulated) {
      return acc;
    }

    acc[field.key as keyof T] = value;
    return acc;
  }, {});
}

export function createStructuredAssistSelection<T extends Record<string, any>, Field extends keyof T & string>(
  patch: Partial<T>,
  fields: ReadonlyArray<StructuredAssistFieldConfig<T, Field>>
): Record<Field, boolean> {
  return fields.reduce<Record<Field, boolean>>((acc, field) => {
    acc[field.key] = patch[field.key as keyof T] !== undefined;
    return acc;
  }, {} as Record<Field, boolean>);
}

export function getStructuredAssistDiff<T extends Record<string, any>, Field extends keyof T & string>(
  current: T,
  patch: Partial<T>,
  fields: ReadonlyArray<StructuredAssistFieldConfig<T, Field>>
): StructuredAssistDiffItem<Field>[] {
  return fields.flatMap((field) => {
    const proposedValue = patch[field.key as keyof T];
    if (proposedValue === undefined) {
      return [];
    }

    const currentValue = current[field.key];
    const isEqual = field.isEqual
      ? field.isEqual(currentValue, proposedValue, current)
      : defaultIsEqual(currentValue, proposedValue);
    if (isEqual) {
      return [];
    }

    const formatValue = field.formatValue ?? defaultFormatValue;
    return [{
      field: field.key,
      label: field.label,
      currentValue: formatValue(currentValue, current),
      proposedValue: formatValue(proposedValue as T[Field], current),
    }];
  });
}

function defaultIsPopulated(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (value && typeof value === 'object') {
    return Object.keys(value).length > 0;
  }
  return value !== undefined && value !== null;
}

function defaultIsEqual(currentValue: unknown, proposedValue: unknown): boolean {
  return JSON.stringify(currentValue ?? null) === JSON.stringify(proposedValue ?? null);
}

function defaultFormatValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim() || 'Empty';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'Empty';
    }
    return value.map((entry) => defaultFormatValue(entry)).join('\n');
  }
  if (value && typeof value === 'object') {
    const lines = Object.entries(value).map(([key, entry]) => `${key}: ${String(entry)}`);
    return lines.length > 0 ? lines.join('\n') : 'Empty';
  }
  return value === undefined || value === null ? 'Empty' : String(value);
}
