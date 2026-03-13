#!/usr/bin/env node

const DEFAULT_SERVER_URL = "http://localhost:3000/api/mcp";
const DEFAULT_PROTOCOL_VERSION = "2025-06-18";
const REQUIRED_TOOLS = [
  "whoami",
  "list_transformation_maps",
  "get_transformation_map_snapshot",
  "get_transformation_department_snapshot",
  "get_transformation_service_snapshot",
  "create_transformation_map",
  "delete_transformation_map",
  "apply_transformation_map_changes",
  "apply_department_analysis",
  "apply_service_analysis",
];

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getServerUrl() {
  return process.env.MCP_SERVER_URL?.trim() || DEFAULT_SERVER_URL;
}

async function sendJsonRpcRequest({ serverUrl, token, id, method, params }) {
  const response = await fetch(serverUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params,
    }),
  });

  const protocolVersion = response.headers.get("MCP-Protocol-Version");
  const payload = await response.json();

  return {
    status: response.status,
    protocolVersion,
    payload,
  };
}

function assertJsonRpcSuccess(result, context) {
  if (result.status !== 200) {
    throw new Error(`${context} failed with HTTP ${result.status}`);
  }

  if (result.payload.error) {
    throw new Error(
      `${context} returned JSON-RPC error ${result.payload.error.code}: ${result.payload.error.message}`,
    );
  }

  if (!Object.prototype.hasOwnProperty.call(result.payload, "result")) {
    throw new Error(`${context} did not include a JSON-RPC result`);
  }
}

async function sendNotification({ serverUrl, token, method, params }) {
  const response = await fetch(serverUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
    }),
  });

  return {
    status: response.status,
    protocolVersion: response.headers.get("MCP-Protocol-Version"),
  };
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function getToolResult(result, context) {
  assertJsonRpcSuccess(result, context);

  const toolResult = result.payload.result;
  if (!toolResult || typeof toolResult !== "object") {
    throw new Error(`${context} did not return a tool result object`);
  }

  const structuredContent = toolResult.structuredContent;
  if (toolResult.isError) {
    const message =
      structuredContent && typeof structuredContent === "object" && typeof structuredContent.error === "string"
        ? structuredContent.error
        : `${context} returned an MCP tool error`;
    throw new Error(`${context} failed: ${message}`);
  }

  if (!structuredContent || typeof structuredContent !== "object") {
    throw new Error(`${context} did not return structuredContent`);
  }

  return structuredContent;
}

async function callTool({ serverUrl, token, id, name, args }) {
  const result = await sendJsonRpcRequest({
    serverUrl,
    token,
    id,
    method: "tools/call",
    params: {
      name,
      arguments: args,
    },
  });

  return getToolResult(result, `tools/call(${name})`);
}

async function callToolExpectFailure({ serverUrl, token, id, name, args }) {
  const result = await sendJsonRpcRequest({
    serverUrl,
    token,
    id,
    method: "tools/call",
    params: {
      name,
      arguments: args,
    },
  });

  if (result.status !== 200) {
    throw new Error(`tools/call(${name}) failed with HTTP ${result.status}`);
  }

  if (result.payload.error) {
    return {
      kind: "jsonrpc",
      code: result.payload.error.code,
      error: result.payload.error.message,
    };
  }

  const toolResult = result.payload.result;
  if (!toolResult || typeof toolResult !== "object" || !toolResult.isError) {
    throw new Error(`tools/call(${name}) was expected to fail`);
  }

  const structuredContent = toolResult.structuredContent;
  if (!structuredContent || typeof structuredContent !== "object" || typeof structuredContent.error !== "string") {
    throw new Error(`tools/call(${name}) did not return a structured error payload`);
  }

  return {
    kind: "tool",
    code: structuredContent.code,
    error: structuredContent.error,
  };
}

function makeRunId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function findById(items, id) {
  return Array.isArray(items) ? items.find((item) => item && typeof item === "object" && item.id === id) : undefined;
}

function findDepartmentSummary(items, id) {
  return Array.isArray(items) ? items.find((item) => item && typeof item === "object" && item.id === id) : undefined;
}

async function main() {
  const token = getRequiredEnv("MCP_TOKEN");
  const serverUrl = getServerUrl();
  const runId = makeRunId();
  const mapTitle = `MCP E2E ${runId}`;
  const mapSlug = `mcp-e2e-${runId}`;
  const pressureKey = `margin-pressure-${runId}`;
  const enterpriseObjectiveKey = `improve-margin-${runId}`;
  const departmentKey = `finance-${runId}`;
  const serviceKey = `accounts-payable-${runId}`;
  const departmentObjectiveKey = `shorten-close-${runId}`;
  const sourceRef = `mcp-e2e-${runId}`;
  let requestId = 3;
  let createdMapId = null;
  let deletedMap = false;

  console.log(`Testing MCP server: ${serverUrl}`);

  const initializeResult = await sendJsonRpcRequest({
    serverUrl,
    token,
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: DEFAULT_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: "agent-canvas-mcp-e2e-client",
        version: "1.0.0",
      },
    },
  });
  assertJsonRpcSuccess(initializeResult, "initialize");
  assertCondition(
    initializeResult.protocolVersion === DEFAULT_PROTOCOL_VERSION,
    "initialize returned an unexpected MCP protocol version",
  );
  assertCondition(
    initializeResult.payload.result?.protocolVersion === DEFAULT_PROTOCOL_VERSION,
    "initialize result did not echo the negotiated protocol version",
  );
  assertCondition(
    initializeResult.payload.result?.capabilities?.tools?.listChanged === false,
    "initialize result did not include expected tools capability metadata",
  );
  console.log("✔ initialize");

  const initializedNotification = await sendNotification({
    serverUrl,
    token,
    method: "notifications/initialized",
    params: {},
  });
  assertCondition(
    initializedNotification.status === 202,
    "notifications/initialized should be accepted with HTTP 202",
  );
  assertCondition(
    initializedNotification.protocolVersion === DEFAULT_PROTOCOL_VERSION,
    "notifications/initialized returned an unexpected MCP protocol version header",
  );
  console.log("✔ notifications/initialized");

  const toolsListResult = await sendJsonRpcRequest({
    serverUrl,
    token,
    id: 2,
    method: "tools/list",
    params: {},
  });
  assertJsonRpcSuccess(toolsListResult, "tools/list");
  const tools = toolsListResult.payload.result?.tools;
  if (!Array.isArray(tools) || tools.length === 0) {
    throw new Error("tools/list returned no tools");
  }
  for (const toolName of REQUIRED_TOOLS) {
    assertCondition(
      tools.some((tool) => tool?.name === toolName),
      `tools/list is missing required tool: ${toolName}`,
    );
  }
  console.log(`✔ tools/list (${tools.length} tools)`);

  const structuredContent = await callTool({
    serverUrl,
    token,
    id: requestId++,
    name: "whoami",
    args: {},
  });

  const requiredFields = ["tokenId", "scopes", "workosOrgId"];
  for (const field of requiredFields) {
    if (!(field in structuredContent)) {
      throw new Error(`tools/call(whoami) missing field: ${field}`);
    }
  }
  if (typeof structuredContent.tokenName !== "string" && typeof structuredContent.name !== "string") {
    throw new Error("tools/call(whoami) missing field: tokenName");
  }
  assertCondition(Array.isArray(structuredContent.scopes), "tools/call(whoami) scopes must be an array");
  assertCondition(
    structuredContent.scopes.includes("transformation:read"),
    "MCP token is missing required scope transformation:read",
  );
  assertCondition(
    structuredContent.scopes.includes("transformation:write"),
    "MCP token is missing required scope transformation:write",
  );
  console.log("✔ tools/call(whoami)");

  try {
    const createResult = await callTool({
      serverUrl,
      token,
      id: requestId++,
      name: "create_transformation_map",
      args: {
        title: mapTitle,
        slug: mapSlug,
        description: "MCP lifecycle test map",
      },
    });
    createdMapId = createResult.mapId;
    assertCondition(typeof createdMapId === "string", "create_transformation_map did not return mapId");
    console.log("✔ create_transformation_map");

    const mapsAfterCreate = await callTool({
      serverUrl,
      token,
      id: requestId++,
      name: "list_transformation_maps",
      args: { text: mapSlug, limit: 10 },
    });
    assertCondition(Array.isArray(mapsAfterCreate), "list_transformation_maps did not return an array");
    const createdListEntry = mapsAfterCreate.find((map) => map?.mapId === createdMapId);
    assertCondition(createdListEntry, "Created Transformation Map was not returned by list_transformation_maps");
    console.log("✔ list_transformation_maps");

    const initialSnapshot = await callTool({
      serverUrl,
      token,
      id: requestId++,
      name: "get_transformation_map_snapshot",
      args: { mapId: createdMapId, view: "full" },
    });
    assertCondition(initialSnapshot.map?.slug === mapSlug, "Initial map snapshot returned the wrong slug");
    assertCondition(initialSnapshot.map?.title === mapTitle, "Initial map snapshot returned the wrong title");
    assertCondition(Array.isArray(initialSnapshot.pressures) && initialSnapshot.pressures.length === 0, "New map should start with no pressures");
    assertCondition(
      Array.isArray(initialSnapshot.enterpriseObjectives) && initialSnapshot.enterpriseObjectives.length === 0,
      "New map should start with no enterprise objectives",
    );
    assertCondition(
      Array.isArray(initialSnapshot.departmentSummaries) && initialSnapshot.departmentSummaries.length === 0,
      "New map should start with no departments",
    );
    console.log("✔ get_transformation_map_snapshot (initial)");

    const dryRunOperations = [
      {
        type: "update_map",
        title: `${mapTitle} Dry Run`,
        description: "This description should not persist.",
      },
    ];

    const dryRunChangeResult = await callTool({
      serverUrl,
      token,
      id: requestId++,
      name: "apply_transformation_map_changes",
      args: {
        mapId: createdMapId,
        dryRun: true,
        expectedUpdatedAt: initialSnapshot.map.updatedAt,
        operations: dryRunOperations,
      },
    });
    assertCondition(dryRunChangeResult.ok === true, "Dry-run map changes should return ok: true");
    assertCondition(dryRunChangeResult.dryRun === true, "Dry-run map changes should report dryRun: true");
    console.log("✔ apply_transformation_map_changes (dry-run)");

    const snapshotAfterDryRun = await callTool({
      serverUrl,
      token,
      id: requestId++,
      name: "get_transformation_map_snapshot",
      args: { mapId: createdMapId, view: "full" },
    });
    assertCondition(snapshotAfterDryRun.map?.title === mapTitle, "Dry-run map changes should not persist title updates");
    assertCondition(snapshotAfterDryRun.pressures.length === 0, "Dry-run map changes should not persist pressures");
    assertCondition(snapshotAfterDryRun.departmentSummaries.length === 0, "Dry-run map changes should not persist departments");
    console.log("✔ get_transformation_map_snapshot (dry-run unchanged)");

    const mapStructureOperations = [
      {
        type: "create_pressure",
        key: pressureKey,
        pressureType: "external",
        title: "Margin pressure",
        description: "Cost pressure is forcing the team to simplify the workflow.",
        evidence: ["Cycle time is rising", "Manual work is increasing"],
        order: 0,
      },
      {
        type: "create_objective",
        key: enterpriseObjectiveKey,
        scope: "enterprise",
        title: "Improve operating margin",
        description: "Reduce manual finance work while preserving control quality.",
        linkedPressureKeys: [pressureKey],
        order: 0,
      },
      {
        type: "create_department",
        key: departmentKey,
        name: "Finance",
        description: "Owns close, payables, and reporting.",
        keyIssues: ["Manual reconciliations"],
        improvementMandates: [],
        order: 0,
      },
    ];

    const applyMapStructureResult = await callTool({
      serverUrl,
      token,
      id: requestId++,
      name: "apply_transformation_map_changes",
      args: {
        mapId: createdMapId,
        dryRun: false,
        expectedUpdatedAt: initialSnapshot.map.updatedAt,
        operations: mapStructureOperations,
      },
    });
    assertCondition(applyMapStructureResult.ok === true, "Persisted map structure changes should return ok: true");
    assertCondition(applyMapStructureResult.dryRun === false, "Persisted map structure changes should report dryRun: false");
    console.log("✔ apply_transformation_map_changes (structure)");

    const structureSnapshot = await callTool({
      serverUrl,
      token,
      id: requestId++,
      name: "get_transformation_map_snapshot",
      args: { mapId: createdMapId, view: "full" },
    });
    const createdPressureAfterStructure = findById(structureSnapshot.pressures, pressureKey);
    const createdObjectiveAfterStructure = findById(structureSnapshot.enterpriseObjectives, enterpriseObjectiveKey);
    const createdDepartmentAfterStructure = findDepartmentSummary(structureSnapshot.departmentSummaries, departmentKey);
    assertCondition(createdPressureAfterStructure?.title === "Margin pressure", "Pressure was not created correctly");
    assertCondition(createdObjectiveAfterStructure?.title === "Improve operating margin", "Enterprise objective was not created correctly");
    assertCondition(createdDepartmentAfterStructure?.name === "Finance", "Department was not created correctly");
    assertCondition(Array.isArray(structureSnapshot.services) && structureSnapshot.services.length === 0, "Service should not exist before service creation");
    console.log("✔ get_transformation_map_snapshot (structure)");

    const serviceCreationOperations = [
      {
        type: "create_service",
        key: serviceKey,
        departmentKey,
        name: "Accounts Payable",
        purpose: "Pay approved invoices",
        customer: "Suppliers",
        trigger: "Approved invoice received",
        outcome: "Invoices paid on time",
        constraints: ["PO match"],
        status: "not-analyzed",
        effectivenessMetric: "On-time payment rate",
        efficiencyMetric: "Invoice cycle time",
        order: 0,
      },
    ];

    const applyServiceCreationResult = await callTool({
      serverUrl,
      token,
      id: requestId++,
      name: "apply_transformation_map_changes",
      args: {
        mapId: createdMapId,
        dryRun: false,
        expectedUpdatedAt: structureSnapshot.map.updatedAt,
        operations: serviceCreationOperations,
      },
    });
    assertCondition(applyServiceCreationResult.ok === true, "Persisted service creation should return ok: true");
    assertCondition(applyServiceCreationResult.dryRun === false, "Persisted service creation should report dryRun: false");
    console.log("✔ apply_transformation_map_changes (service)");

    const updatedMapSnapshot = await callTool({
      serverUrl,
      token,
      id: requestId++,
      name: "get_transformation_map_snapshot",
      args: { mapId: createdMapId, view: "full" },
    });
    const createdPressure = findById(updatedMapSnapshot.pressures, pressureKey);
    const createdObjective = findById(updatedMapSnapshot.enterpriseObjectives, enterpriseObjectiveKey);
    const createdDepartment = findDepartmentSummary(updatedMapSnapshot.departmentSummaries, departmentKey);
    const createdService = findById(updatedMapSnapshot.services, serviceKey);
    assertCondition(createdPressure?.title === "Margin pressure", "Pressure was not created correctly");
    assertCondition(createdObjective?.title === "Improve operating margin", "Enterprise objective was not created correctly");
    assertCondition(createdDepartment?.name === "Finance", "Department was not created correctly");
    assertCondition(createdDepartment?.serviceCount === 1, "Department summary should report one service");
    assertCondition(createdService?.status === "not-analyzed", "Service was not created correctly");
    console.log("✔ get_transformation_map_snapshot (persisted)");

    const departmentAnalysisResult = await callTool({
      serverUrl,
      token,
      id: requestId++,
      name: "apply_department_analysis",
      args: {
        mapId: createdMapId,
        departmentKey,
        dryRun: false,
        expectedUpdatedAt: updatedMapSnapshot.map.updatedAt,
        payload: {
          description: "Finance manages close, payables, and reporting.",
          keyIssues: ["Manual reconciliations", "Fragmented invoice intake"],
          improvementMandates: [
            {
              key: departmentObjectiveKey,
              title: "Shorten month-end close",
              description: "Reduce close cycle time from seven days to three.",
              linkedPressureKeys: [pressureKey],
            },
          ],
          services: [
            {
              key: serviceKey,
              name: "Accounts Payable",
              purpose: "Pay approved invoices within SLA",
              customer: "Suppliers",
              trigger: "Approved invoice received",
              outcome: "Invoices paid accurately and on time",
              constraints: ["PO match", "Tax validation"],
              status: "analyzed",
              effectivenessMetric: "On-time payment rate",
              efficiencyMetric: "Invoice cycle time",
            },
          ],
          sourceType: "ai_generated",
          sourceRef,
        },
      },
    });
    assertCondition(departmentAnalysisResult.ok === true, "Department analysis should return ok: true");
    console.log("✔ apply_department_analysis");

    const departmentSnapshot = await callTool({
      serverUrl,
      token,
      id: requestId++,
      name: "get_transformation_department_snapshot",
      args: { mapId: createdMapId, departmentKey },
    });
    const departmentObjective = findById(departmentSnapshot.objectives, departmentObjectiveKey);
    const analyzedDepartmentService = findById(departmentSnapshot.services, serviceKey);
    assertCondition(
      departmentSnapshot.department?.description === "Finance manages close, payables, and reporting.",
      "Department snapshot did not reflect the updated description",
    );
    assertCondition(
      Array.isArray(departmentSnapshot.department?.keyIssues) &&
        departmentSnapshot.department.keyIssues.includes("Fragmented invoice intake"),
      "Department snapshot did not reflect the updated key issues",
    );
    assertCondition(departmentObjective?.title === "Shorten month-end close", "Department objective was not created correctly");
    assertCondition(analyzedDepartmentService?.status === "analyzed", "Department service update was not persisted");
    console.log("✔ get_transformation_department_snapshot");

    const serviceAnalysisResult = await callTool({
      serverUrl,
      token,
      id: requestId++,
      name: "apply_service_analysis",
      args: {
        mapId: createdMapId,
        serviceKey,
        dryRun: false,
        expectedUpdatedAt: departmentSnapshot.map.updatedAt,
        payload: {
          service: {
            name: "Accounts Payable",
            purpose: "Pay approved invoices within SLA",
            customer: "Suppliers",
            trigger: "Approved invoice received",
            outcome: "Invoices paid accurately and on time",
            constraints: ["PO match", "Tax validation"],
            status: "has-deviations",
            effectivenessMetric: "On-time payment rate",
            efficiencyMetric: "Invoice cycle time",
          },
          idealFlowSteps: [
            {
              id: `ideal-${runId}-1`,
              serviceId: serviceKey,
              flowType: "ideal",
              order: 0,
              description: "Validate the invoice against the purchase order automatically",
              stepType: "control",
            },
          ],
          currentFlowSteps: [
            {
              id: `current-${runId}-1`,
              serviceId: serviceKey,
              flowType: "current",
              order: 0,
              description: "Finance receives invoices through multiple mailboxes",
              stepType: "input",
              hasDeviation: true,
            },
          ],
          deviations: [
            {
              id: `deviation-${runId}-1`,
              serviceId: serviceKey,
              flowStepId: `current-${runId}-1`,
              what: "Invoices arrive in multiple inboxes",
              why: "Suppliers use outdated addresses",
              necessary: false,
              impact: "medium",
              treatment: "simplify",
              classification: "handoff",
            },
          ],
          initiatives: [
            {
              id: `initiative-${runId}-1`,
              serviceId: serviceKey,
              title: "Standardize invoice intake",
              description: "Route all invoices through a single intake path.",
              status: "proposed",
              linkedAgents: [
                {
                  id: `agent-${runId}-1`,
                  name: "Invoice Intake Agent",
                  role: "Normalize supplier submissions",
                },
              ],
            },
          ],
          reviewStatus: "reviewed",
          sourceType: "ai_generated",
          sourceRef,
        },
      },
    });
    assertCondition(serviceAnalysisResult.ok === true, "Service analysis should return ok: true");
    console.log("✔ apply_service_analysis");

    const serviceSnapshot = await callTool({
      serverUrl,
      token,
      id: requestId++,
      name: "get_transformation_service_snapshot",
      args: { mapId: createdMapId, serviceKey },
    });
    assertCondition(serviceSnapshot.service?.status === "has-deviations", "Service snapshot did not reflect the updated status");
    assertCondition(serviceSnapshot.reviewStatus === "reviewed", "Service snapshot did not reflect the review status");
    assertCondition(serviceSnapshot.idealSteps?.length === 1, "Service snapshot should contain one ideal step");
    assertCondition(serviceSnapshot.currentSteps?.length === 1, "Service snapshot should contain one current step");
    assertCondition(serviceSnapshot.deviations?.length === 1, "Service snapshot should contain one deviation");
    assertCondition(serviceSnapshot.initiatives?.length === 1, "Service snapshot should contain one initiative");
    console.log("✔ get_transformation_service_snapshot");

    const deleteResult = await callTool({
      serverUrl,
      token,
      id: requestId++,
      name: "delete_transformation_map",
      args: { mapId: createdMapId },
    });
    deletedMap = true;
    assertCondition(deleteResult.ok === true, "delete_transformation_map should return ok: true");
    assertCondition(deleteResult.mapId === createdMapId, "delete_transformation_map returned the wrong mapId");
    console.log("✔ delete_transformation_map");

    const mapsAfterDelete = await callTool({
      serverUrl,
      token,
      id: requestId++,
      name: "list_transformation_maps",
      args: { text: mapSlug, limit: 10 },
    });
    assertCondition(
      Array.isArray(mapsAfterDelete) && !mapsAfterDelete.some((map) => map?.mapId === createdMapId),
      "Deleted Transformation Map still appears in list_transformation_maps",
    );
    console.log("✔ list_transformation_maps (cleanup)");

    const deletedSnapshotError = await callToolExpectFailure({
      serverUrl,
      token,
      id: requestId++,
      name: "get_transformation_map_snapshot",
      args: { mapId: createdMapId, view: "full" },
    });
    assertCondition(
      deletedSnapshotError.kind === "tool" && deletedSnapshotError.error.startsWith("NotFound:"),
      "Reading a deleted map should return a NotFound tool error",
    );
    console.log("✔ get_transformation_map_snapshot (deleted)");
  } finally {
    if (createdMapId && !deletedMap) {
      try {
        await callTool({
          serverUrl,
          token,
          id: requestId++,
          name: "delete_transformation_map",
          args: { mapId: createdMapId },
        });
        console.log("✔ cleanup delete_transformation_map");
      } catch (cleanupError) {
        console.error(
          `Cleanup failed for map ${createdMapId}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`
        );
      }
    }
  }

  console.log("\nMCP end-to-end test passed.");
}

main().catch((error) => {
  console.error(`\nMCP end-to-end test failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
