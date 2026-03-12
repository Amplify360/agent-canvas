import { MCP_TOOLS } from "./tools";

export class McpInvalidParamsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpInvalidParamsError";
  }
}

type JsonSchema = {
  type?: "object" | "array" | "string" | "number" | "boolean";
  enum?: readonly unknown[];
  minimum?: number;
  maximum?: number;
  oneOf?: readonly JsonSchema[];
  required?: readonly string[];
  additionalProperties?: boolean;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
};

function getToolSchema(name: string): JsonSchema {
  const tool = MCP_TOOLS.find((entry) => entry.name === name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return tool.inputSchema as JsonSchema;
}

function describePath(path: string): string {
  return path === "arguments" ? "arguments" : path.replace(/^arguments\./, "");
}

function validateObject(schema: JsonSchema, value: unknown, path: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new McpInvalidParamsError(`Validation: ${describePath(path)} must be an object`);
  }

  const record = value as Record<string, unknown>;
  for (const key of schema.required ?? []) {
    if (record[key] === undefined) {
      throw new McpInvalidParamsError(`Validation: Missing required field ${describePath(`${path}.${key}`)}`);
    }
  }

  const properties = schema.properties ?? {};
  if (schema.additionalProperties === false) {
    for (const key of Object.keys(record)) {
      if (!(key in properties)) {
        throw new McpInvalidParamsError(`Validation: Unknown field ${describePath(`${path}.${key}`)}`);
      }
    }
  }

  for (const [key, propertySchema] of Object.entries(properties)) {
    if (record[key] === undefined) {
      continue;
    }
    validateSchema(propertySchema, record[key], `${path}.${key}`);
  }
}

function validateArray(schema: JsonSchema, value: unknown, path: string) {
  if (!Array.isArray(value)) {
    throw new McpInvalidParamsError(`Validation: ${describePath(path)} must be an array`);
  }

  if (!schema.items) {
    return;
  }

  value.forEach((item, index) => {
    validateSchema(schema.items as JsonSchema, item, `${path}[${index}]`);
  });
}

function validateString(schema: JsonSchema, value: unknown, path: string) {
  if (typeof value !== "string") {
    throw new McpInvalidParamsError(`Validation: ${describePath(path)} must be a string`);
  }
  if (schema.enum && !schema.enum.includes(value)) {
    throw new McpInvalidParamsError(
      `Validation: ${describePath(path)} must be one of ${schema.enum.join(", ")}`
    );
  }
}

function validateNumber(schema: JsonSchema, value: unknown, path: string) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new McpInvalidParamsError(`Validation: ${describePath(path)} must be a number`);
  }
  if (schema.minimum !== undefined && value < schema.minimum) {
    throw new McpInvalidParamsError(
      `Validation: ${describePath(path)} must be greater than or equal to ${schema.minimum}`
    );
  }
  if (schema.maximum !== undefined && value > schema.maximum) {
    throw new McpInvalidParamsError(
      `Validation: ${describePath(path)} must be less than or equal to ${schema.maximum}`
    );
  }
}

function validateBoolean(value: unknown, path: string) {
  if (typeof value !== "boolean") {
    throw new McpInvalidParamsError(`Validation: ${describePath(path)} must be a boolean`);
  }
}

function getSingleEnumValues(schema: JsonSchema, property: string): string[] {
  const values = schema.properties?.[property]?.enum;
  if (!values || values.some((value) => typeof value !== "string")) {
    return [];
  }
  return values as string[];
}

function narrowSchemasByDiscriminator(
  schemas: readonly JsonSchema[],
  record: Record<string, unknown>,
  path: string,
  property: string
) {
  const rawValue = record[property];
  if (typeof rawValue !== "string") {
    return schemas;
  }

  const allowedValues = Array.from(
    new Set(
      schemas.flatMap((schema) => {
        const values = getSingleEnumValues(schema, property);
        return values.length === 1 ? values : [];
      })
    )
  );

  if (allowedValues.length === 0) {
    return schemas;
  }

  if (!allowedValues.includes(rawValue)) {
    throw new McpInvalidParamsError(
      `Validation: ${describePath(`${path}.${property}`)} must be one of ${allowedValues.join(", ")}`
    );
  }

  return schemas.filter((schema) => {
    const values = getSingleEnumValues(schema, property);
    return values.length === 0 || values.includes(rawValue);
  });
}

function validateOneOf(schema: JsonSchema, value: unknown, path: string) {
  const candidates = schema.oneOf ?? [];
  let narrowedCandidates = candidates;

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    narrowedCandidates = narrowSchemasByDiscriminator(narrowedCandidates, record, path, "type");
    narrowedCandidates = narrowSchemasByDiscriminator(narrowedCandidates, record, path, "scope");
  }

  let firstError: McpInvalidParamsError | undefined;
  for (const candidate of narrowedCandidates) {
    try {
      validateSchema(candidate, value, path);
      return;
    } catch (error) {
      if (!firstError && error instanceof McpInvalidParamsError) {
        firstError = error;
      }
    }
  }

  if (firstError) {
    throw firstError;
  }

  throw new McpInvalidParamsError(`Validation: ${describePath(path)} does not match a supported schema`);
}

function validateSchema(schema: JsonSchema, value: unknown, path: string) {
  if (schema.oneOf) {
    validateOneOf(schema, value, path);
    return;
  }

  if (schema.type === "object") {
    validateObject(schema, value, path);
    return;
  }

  if (schema.type === "array") {
    validateArray(schema, value, path);
    return;
  }

  if (schema.type === "string") {
    validateString(schema, value, path);
    return;
  }

  if (schema.type === "number") {
    validateNumber(schema, value, path);
    return;
  }

  if (schema.type === "boolean") {
    validateBoolean(value, path);
  }
}

export function validateToolArguments(name: string, args: Record<string, unknown>) {
  const schema = getToolSchema(name);
  validateSchema(schema, args, "arguments");
}
