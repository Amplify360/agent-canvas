import { describe, expect, it } from "vitest";
import { buildToolCallErrorResult, shouldExposeToolCallErrorResult } from "@/server/mcp/responses";

describe("mcp responses", () => {
  it("formats tool call failures as MCP tool results", () => {
    expect(buildToolCallErrorResult("Validation: Missing required field operations", -32602)).toEqual({
      content: [{ type: "text", text: "Validation: Missing required field operations" }],
      structuredContent: {
        status: "error",
        error: "Validation: Missing required field operations",
        code: -32602,
      },
      isError: true,
    });
  });

  it("only exposes domain and validation failures as tool-call results", () => {
    expect(shouldExposeToolCallErrorResult("Validation: Missing required field operations", -32602)).toBe(true);
    expect(shouldExposeToolCallErrorResult("NotFound: Service not found", -32000)).toBe(true);
    expect(shouldExposeToolCallErrorResult("Auth: Invalid service token", -32000)).toBe(false);
    expect(shouldExposeToolCallErrorResult("Unknown tool: test", -32000)).toBe(false);
  });
});
