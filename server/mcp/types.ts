export type McpScope =
  | "canvas:read"
  | "canvas:write"
  | "transformation:read"
  | "transformation:write"
  | "transformation:review";

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}
