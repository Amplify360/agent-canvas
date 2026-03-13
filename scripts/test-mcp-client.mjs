#!/usr/bin/env node

const DEFAULT_SERVER_URL = "http://localhost:3000/api/mcp";
const DEFAULT_PROTOCOL_VERSION = "2025-06-18";

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

async function main() {
  const token = getRequiredEnv("MCP_TOKEN");
  const serverUrl = getServerUrl();

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
        name: "agent-canvas-mcp-smoke-client",
        version: "1.0.0",
      },
    },
  });
  assertJsonRpcSuccess(initializeResult, "initialize");
  console.log("✔ initialize");

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
  console.log(`✔ tools/list (${tools.length} tools)`);

  const whoamiResult = await sendJsonRpcRequest({
    serverUrl,
    token,
    id: 3,
    method: "tools/call",
    params: {
      name: "whoami",
      arguments: {},
    },
  });
  assertJsonRpcSuccess(whoamiResult, "tools/call(whoami)");

  const structuredContent = whoamiResult.payload.result?.structuredContent;
  if (!structuredContent || typeof structuredContent !== "object") {
    throw new Error("tools/call(whoami) did not return structuredContent");
  }

  const requiredFields = ["tokenId", "name", "scopes", "workosOrgId"];
  for (const field of requiredFields) {
    if (!(field in structuredContent)) {
      throw new Error(`tools/call(whoami) missing field: ${field}`);
    }
  }

  console.log("✔ tools/call(whoami)");
  console.log("\nMCP smoke test passed.");
}

main().catch((error) => {
  console.error(`\nMCP smoke test failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
