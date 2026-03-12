import { describe, expect, it } from "vitest";
import { McpInvalidParamsError, validateToolArguments } from "@/server/mcp/validation";

describe("mcp tool argument validation", () => {
  it("accepts valid transformation map change arguments", () => {
    expect(() =>
      validateToolArguments("apply_transformation_map_changes", {
        mapId: "kn7bqecvv8078vxya6f2y3xxgn82rr6s",
        dryRun: false,
        expectedUpdatedAt: 1773328616778,
        operations: [
          {
            type: "create_pressure",
            key: "margin-pressure",
            pressureType: "external",
            title: "Margin pressure",
          },
        ],
      })
    ).not.toThrow();
  });

  it("rejects missing required operations", () => {
    expect(() =>
      validateToolArguments("apply_transformation_map_changes", {
        mapId: "kn7bqecvv8078vxya6f2y3xxgn82rr6s",
        dryRun: false,
        expectedUpdatedAt: 1773328616778,
      })
    ).toThrowError(new McpInvalidParamsError("Validation: Missing required field operations"));
  });

  it("rejects unknown top-level fields", () => {
    expect(() =>
      validateToolArguments("create_transformation_map", {
        title: "Test Map",
        unexpected: true,
      })
    ).toThrowError(new McpInvalidParamsError("Validation: Unknown field unexpected"));
  });

  it("rejects fields from other transformation operation types", () => {
    expect(() =>
      validateToolArguments("apply_transformation_map_changes", {
        mapId: "kn7bqecvv8078vxya6f2y3xxgn82rr6s",
        dryRun: true,
        operations: [
          {
            type: "create_pressure",
            key: "payment-timing-pressure",
            pressureType: "external",
            title: "Suppliers expect faster payment visibility",
            scope: "enterprise",
          },
        ],
      })
    ).toThrowError(
      new McpInvalidParamsError("Validation: Unknown field operations[0].scope")
    );
  });

  it("rejects missing required fields for a discriminated operation branch", () => {
    expect(() =>
      validateToolArguments("apply_transformation_map_changes", {
        mapId: "kn7bqecvv8078vxya6f2y3xxgn82rr6s",
        dryRun: true,
        operations: [
          {
            type: "create_service",
            key: "accounts-payable",
            name: "Accounts Payable",
          },
        ],
      })
    ).toThrowError(
      new McpInvalidParamsError("Validation: Missing required field operations[0].departmentKey")
    );
  });

  it("rejects enterprise objective payloads that include departmentKey", () => {
    expect(() =>
      validateToolArguments("apply_transformation_map_changes", {
        mapId: "kn7bqecvv8078vxya6f2y3xxgn82rr6s",
        dryRun: true,
        operations: [
          {
            type: "create_objective",
            key: "improve-payment-transparency",
            scope: "enterprise",
            departmentKey: "finance",
            title: "Improve payment transparency",
            description: "Provide clearer visibility.",
          },
        ],
      })
    ).toThrowError(
      new McpInvalidParamsError("Validation: Unknown field operations[0].departmentKey")
    );
  });
});
