import { describe, expect, it } from "vitest";
import { MCP_TOOLS } from "@/server/mcp/tools";

function getTool(name: string) {
  const tool = MCP_TOOLS.find((entry) => entry.name === name);
  expect(tool).toBeDefined();
  return tool!;
}

function getTransformationOperationSchema() {
  const tool = getTool("apply_transformation_map_changes");
  return (tool.inputSchema as any).properties.operations.items;
}

function getOperationBranch(type: string, scope?: string) {
  const itemSchema = getTransformationOperationSchema();
  const branch = itemSchema.oneOf.find((entry: any) => {
    const branchType = entry.properties.type.enum?.[0];
    const branchScope = entry.properties.scope?.enum?.[0];
    return branchType === type && (scope === undefined || branchScope === scope);
  });

  expect(branch).toBeDefined();
  return branch;
}

describe("transformation MCP tool metadata", () => {
  it("documents structured transformation map operations", () => {
    const tool = getTool("apply_transformation_map_changes");
    const schema = tool.inputSchema as any;
    const operationSchema = schema.properties.operations.items;
    const createPressure = getOperationBranch("create_pressure");
    const createEnterpriseObjective = getOperationBranch("create_objective", "enterprise");
    const createDepartmentObjective = getOperationBranch("create_objective", "department");
    const updateService = getOperationBranch("update_service");

    expect(tool.description).toContain("operations");
    expect(tool.description).toContain("create_pressure");
    expect(tool.description).toContain("create_objective");
    expect(tool.description).toContain("delete_pressure");
    expect(tool.description).toContain("delete_objective");
    expect(tool.description).toContain("Dry-run example");
    expect(tool.description).toContain("Delete example");
    expect(tool.description).toContain("top-level pressures");
    expect(tool.description).toContain('"dryRun":false');
    expect(schema.required).toContain("operations");
    expect(schema.properties.mapSlug.description).toContain("mapId is used first");
    expect(schema.properties.operations.description).toContain("discriminated union");
    expect(operationSchema.description).toContain("Machine-readable schema");
    expect(operationSchema.description).toContain("Validation is operation-specific");
    expect(operationSchema.description).toContain("Do not include blank, null, or placeholder values");
    expect(operationSchema.description).toContain("Create operations use `key`");
    expect(operationSchema.description).toContain("Minimal per-operation examples");
    expect(operationSchema.description).toContain('"type":"create_pressure"');
    expect(operationSchema.description).toContain('"type":"create_objective"');
    expect(operationSchema.oneOf).toHaveLength(14);
    expect(createPressure.additionalProperties).toBe(false);
    expect(createPressure.required).toEqual(["type", "key", "pressureType", "title"]);
    expect(createPressure.properties.pressureType.enum).toEqual(["external", "internal"]);
    expect(createPressure.properties.scope).toBeUndefined();
    expect(createEnterpriseObjective.required).toEqual([
      "type",
      "key",
      "scope",
      "title",
      "description",
    ]);
    expect(createEnterpriseObjective.properties.departmentKey).toBeUndefined();
    expect(createDepartmentObjective.required).toEqual([
      "type",
      "key",
      "scope",
      "departmentKey",
      "title",
      "description",
    ]);
    expect(updateService.required).toEqual(["type", "serviceKey"]);
    expect(updateService.properties.status.enum).toEqual(
      expect.arrayContaining(["not-analyzed", "analyzed", "has-deviations"])
    );
  });

  it("documents explicit department analysis payload fields", () => {
    const tool = getTool("apply_department_analysis");
    const payload = (tool.inputSchema as any).properties.payload;

    expect(tool.description).toContain("Semantics:");
    expect(tool.description).toContain("Minimal valid example");
    expect(tool.description).toContain("top-level pressures");
    expect(tool.description).toContain('"dryRun":false');
    expect(payload.additionalProperties).toBe(false);
    expect(payload.required).toEqual(["description", "improvementMandates", "services"]);
    expect(payload.properties.improvementMandates.items.required).toEqual([
      "key",
      "title",
      "description",
      "linkedPressureKeys",
    ]);
  });

  it("documents explicit service analysis payload fields and review semantics", () => {
    const tool = getTool("apply_service_analysis");
    const payload = (tool.inputSchema as any).properties.payload;

    expect(tool.description).toContain("Partial array merges are not supported");
    expect(tool.description).toContain("reviewStatus");
    expect(tool.description).toContain("internal pain points");
    expect(tool.description).toContain('"dryRun":false');
    expect(payload.additionalProperties).toBe(false);
    expect(payload.required).toEqual([
      "service",
      "idealFlowSteps",
      "currentFlowSteps",
      "deviations",
      "initiatives",
    ]);
    expect(payload.properties.reviewStatus.enum).toEqual(
      expect.arrayContaining(["draft", "reviewed", "approved", "archived"])
    );
  });

  it("documents review-status preconditions and effects", () => {
    const tool = getTool("set_transformation_review_status");

    expect(tool.description).toContain("must already have an attached analysis record");
    expect(tool.description).toContain("allows all transitions");
    expect(tool.description).toContain("updatedAt");
  });
});
