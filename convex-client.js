/**
 * Convex client adapter for AgentCanvas
 * Handles Convex connection, subscriptions, and mutations
 */

import { ConvexClient } from "convex/browser";
import { state, saveCanvasPreference, saveOrgPreference } from "./state.js";

let client = null;
let subscriptions = new Map();

/**
 * Initialize the Convex client
 * @param {string} url - Convex deployment URL
 * @returns {ConvexClient}
 */
export function initConvexClient(url) {
  if (client) {
    return client;
  }

  const convexUrl = url || window.CONVEX_URL;
  if (!convexUrl) {
    throw new Error("CONVEX_URL not configured");
  }

  client = new ConvexClient(convexUrl);
  return client;
}

/**
 * Get the Convex client instance
 * @returns {ConvexClient|null}
 */
export function getConvexClient() {
  return client;
}

/**
 * Subscribe to canvases for the current org
 * @param {string} workosOrgId - WorkOS organization ID
 * @param {function} callback - Called when data updates
 * @returns {function} Unsubscribe function
 */
export function subscribeToCanvases(workosOrgId, callback) {
  if (!client) {
    console.error("Convex client not initialized");
    return () => {};
  }

  const key = `canvases:${workosOrgId}`;

  // Unsubscribe from existing subscription
  if (subscriptions.has(key)) {
    subscriptions.get(key)();
  }

  // Note: In a real implementation, this would use the generated API types
  // For now, we'll use a placeholder that matches the expected pattern
  const unsubscribe = client.onUpdate(
    { path: "canvases:list", args: { workosOrgId } },
    (canvases) => {
      state.canvases = canvases || [];
      callback(canvases);
    }
  );

  subscriptions.set(key, unsubscribe);
  return unsubscribe;
}

/**
 * Subscribe to agents for a canvas
 * @param {string} canvasId - Convex canvas ID
 * @param {function} callback - Called when data updates
 * @returns {function} Unsubscribe function
 */
export function subscribeToAgents(canvasId, callback) {
  if (!client) {
    console.error("Convex client not initialized");
    return () => {};
  }

  const key = `agents:${canvasId}`;

  // Unsubscribe from existing subscription
  if (subscriptions.has(key)) {
    subscriptions.get(key)();
  }

  const unsubscribe = client.onUpdate(
    { path: "agents:list", args: { canvasId } },
    (agents) => {
      state.agents = agents || [];
      callback(agents);
    }
  );

  subscriptions.set(key, unsubscribe);
  return unsubscribe;
}

/**
 * Subscribe to org settings
 * @param {string} workosOrgId - WorkOS organization ID
 * @param {function} callback - Called when data updates
 * @returns {function} Unsubscribe function
 */
export function subscribeToOrgSettings(workosOrgId, callback) {
  if (!client) {
    console.error("Convex client not initialized");
    return () => {};
  }

  const key = `orgSettings:${workosOrgId}`;

  // Unsubscribe from existing subscription
  if (subscriptions.has(key)) {
    subscriptions.get(key)();
  }

  const unsubscribe = client.onUpdate(
    { path: "orgSettings:get", args: { workosOrgId } },
    (settings) => {
      state.orgSettings = settings;
      callback(settings);
    }
  );

  subscriptions.set(key, unsubscribe);
  return unsubscribe;
}

/**
 * Unsubscribe from all subscriptions
 */
export function unsubscribeAll() {
  for (const unsubscribe of subscriptions.values()) {
    unsubscribe();
  }
  subscriptions.clear();
}

// Canvas mutations

/**
 * Create a new canvas
 * @param {object} data - Canvas data
 * @returns {Promise<string>} Canvas ID
 */
export async function createCanvas(data) {
  if (!client) throw new Error("Convex client not initialized");

  return await client.mutation("canvases:create", {
    workosOrgId: data.workosOrgId || state.currentOrgId,
    title: data.title,
    slug: data.slug,
  });
}

/**
 * Update a canvas
 * @param {string} canvasId - Canvas ID
 * @param {object} data - Updated data
 */
export async function updateCanvas(canvasId, data) {
  if (!client) throw new Error("Convex client not initialized");

  await client.mutation("canvases:update", {
    canvasId,
    ...data,
  });
}

/**
 * Delete a canvas
 * @param {string} canvasId - Canvas ID
 */
export async function deleteCanvas(canvasId) {
  if (!client) throw new Error("Convex client not initialized");

  await client.mutation("canvases:remove", { canvasId });
}

// Agent mutations

/**
 * Create a new agent
 * @param {object} data - Agent data
 * @returns {Promise<string>} Agent ID
 */
export async function createAgent(data) {
  if (!client) throw new Error("Convex client not initialized");

  return await client.mutation("agents:create", {
    canvasId: data.canvasId || state.currentCanvasId,
    phase: data.phase,
    phaseOrder: data.phaseOrder || 0,
    agentOrder: data.agentOrder || 0,
    name: data.name,
    objective: data.objective,
    description: data.description,
    tools: data.tools || [],
    journeySteps: data.journeySteps || [],
    demoLink: data.demoLink,
    videoLink: data.videoLink,
    metrics: data.metrics,
  });
}

/**
 * Update an agent
 * @param {string} agentId - Agent ID
 * @param {object} data - Updated data
 */
export async function updateAgent(agentId, data) {
  if (!client) throw new Error("Convex client not initialized");

  await client.mutation("agents:update", {
    agentId,
    ...data,
  });
}

/**
 * Delete an agent
 * @param {string} agentId - Agent ID
 */
export async function deleteAgent(agentId) {
  if (!client) throw new Error("Convex client not initialized");

  await client.mutation("agents:remove", { agentId });
}

/**
 * Reorder an agent
 * @param {string} agentId - Agent ID
 * @param {string} phase - New phase
 * @param {number} phaseOrder - New phase order
 * @param {number} agentOrder - New agent order
 */
export async function reorderAgent(agentId, phase, phaseOrder, agentOrder) {
  if (!client) throw new Error("Convex client not initialized");

  await client.mutation("agents:reorder", {
    agentId,
    phase,
    phaseOrder,
    agentOrder,
  });
}

/**
 * Bulk create agents (for import)
 * @param {string} canvasId - Canvas ID
 * @param {Array} agents - Array of agent data
 * @returns {Promise<Array>} Created agent IDs
 */
export async function bulkCreateAgents(canvasId, agents) {
  if (!client) throw new Error("Convex client not initialized");

  return await client.mutation("agents:bulkCreate", {
    canvasId,
    agents,
  });
}

// Org settings mutations

/**
 * Update org settings
 * @param {string} workosOrgId - WorkOS organization ID
 * @param {object} data - Settings data
 */
export async function updateOrgSettings(workosOrgId, data) {
  if (!client) throw new Error("Convex client not initialized");

  await client.mutation("orgSettings:update", {
    workosOrgId,
    ...data,
  });
}

/**
 * Initialize default org settings
 * @param {string} workosOrgId - WorkOS organization ID
 */
export async function initOrgSettings(workosOrgId) {
  if (!client) throw new Error("Convex client not initialized");

  await client.mutation("orgSettings:initDefaults", { workosOrgId });
}

// Query helpers (one-time fetches)

/**
 * Get canvas by slug
 * @param {string} workosOrgId - WorkOS organization ID
 * @param {string} slug - Canvas slug
 * @returns {Promise<object|null>}
 */
export async function getCanvasBySlug(workosOrgId, slug) {
  if (!client) throw new Error("Convex client not initialized");

  return await client.query("canvases:getBySlug", { workosOrgId, slug });
}

/**
 * Get agent history
 * @param {string} agentId - Agent ID
 * @returns {Promise<Array>}
 */
export async function getAgentHistory(agentId) {
  if (!client) throw new Error("Convex client not initialized");

  return await client.query("agentHistory:list", { agentId });
}

/**
 * Get recent history for org
 * @param {string} workosOrgId - WorkOS organization ID
 * @param {number} limit - Max items
 * @returns {Promise<Array>}
 */
export async function getRecentHistory(workosOrgId, limit = 50) {
  if (!client) throw new Error("Convex client not initialized");

  return await client.query("agentHistory:listRecent", { workosOrgId, limit });
}
