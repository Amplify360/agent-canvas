/**
 * YAML conversion utilities
 * Converts between YAML document format and Convex normalized format
 */

// Constants
const DEFAULT_PHASE_NAME = 'Uncategorized';
const DEFAULT_ROI_CONTRIBUTION = 'Medium';
const DEFAULT_DOCUMENT_TITLE = 'AgentCanvas';

/**
 * Convert YAML document to Convex agents format
 * @param {object} yamlDoc - Parsed YAML document
 * @returns {Array} Array of agent objects ready for Convex
 */
export function yamlToConvexAgents(yamlDoc) {
  if (!yamlDoc || !yamlDoc.agentGroups || !Array.isArray(yamlDoc.agentGroups)) {
    return [];
  }

  const agents = [];
  let phaseOrder = 0;

  for (const group of yamlDoc.agentGroups) {
    const phase = group.groupName || `Phase ${phaseOrder + 1}`;
    let agentOrder = 0;

    if (group.agents && Array.isArray(group.agents)) {
      for (const agent of group.agents) {
        agents.push({
          phase,
          phaseOrder,
          agentOrder: agentOrder++,
          name: agent.name || '',
          objective: agent.objective || '',
          description: agent.description || '',
          tools: Array.isArray(agent.tools) ? agent.tools : [],
          journeySteps: Array.isArray(agent.journeySteps) ? agent.journeySteps : [],
          demoLink: agent.demoLink || undefined,
          videoLink: agent.videoLink || undefined,
          metrics: agent.metrics ? {
            adoption: parseFloat(agent.metrics.usageThisWeek) || 0,
            satisfaction: parseFloat(agent.metrics.timeSaved) || 0,
          } : undefined,
          payload: { ...agent }, // Store full portable payload for round-trip fidelity
        });
      }
    }

    phaseOrder++;
  }

  return agents;
}

/**
 * Convert Convex agents to YAML document format
 * @param {object} canvas - Canvas document
 * @param {Array} agents - Array of agent documents from Convex
 * @param {object} orgSettings - Optional org settings
 * @returns {object} YAML document object
 */
export function convexToYaml(canvas, agents, orgSettings = null) {
  // Group agents by phase
  const phaseMap = new Map();
  
  for (const agent of agents) {
    const phase = agent.phase || DEFAULT_PHASE_NAME;
    if (!phaseMap.has(phase)) {
      phaseMap.set(phase, {
        phaseOrder: agent.phaseOrder || 0,
        agents: [],
      });
    }
    phaseMap.get(phase).agents.push(agent);
  }

  // Sort phases by phaseOrder
  const sortedPhases = Array.from(phaseMap.entries())
    .sort((a, b) => a[1].phaseOrder - b[1].phaseOrder);

  // Build agentGroups
  const agentGroups = sortedPhases.map(([phaseName, phaseData]) => {
    // Sort agents within phase by agentOrder
    const sortedAgents = phaseData.agents.sort((a, b) => 
      (a.agentOrder || 0) - (b.agentOrder || 0)
    );

    // Convert agents back to YAML format
    const yamlAgents = sortedAgents.map(agent => {
      // Use payload if available, otherwise reconstruct from normalized fields
      const agentData = agent.payload || {
        name: agent.name,
        objective: agent.objective,
        description: agent.description,
        tools: agent.tools,
        journeySteps: agent.journeySteps,
        demoLink: agent.demoLink,
        videoLink: agent.videoLink,
        metrics: agent.metrics ? {
          usageThisWeek: String(agent.metrics.adoption || 0),
          timeSaved: String(agent.metrics.satisfaction || 0),
          roiContribution: DEFAULT_ROI_CONTRIBUTION,
        } : undefined,
      };

      return agentData;
    });

    return {
      groupName: phaseName,
      groupId: `group-${phaseName.toLowerCase().replace(/\s+/g, '-')}`,
      agents: yamlAgents,
    };
  });

  // Build YAML document
  const yamlDoc = {
    documentTitle: canvas.title || DEFAULT_DOCUMENT_TITLE,
    agentGroups,
  };

  // Add sectionDefaults from orgSettings if available
  if (orgSettings && orgSettings.sectionDefaults) {
    yamlDoc.sectionDefaults = orgSettings.sectionDefaults;
  }

  // Add toolsConfig from orgSettings if available
  if (orgSettings && orgSettings.toolDefinitions) {
    yamlDoc.toolsConfig = orgSettings.toolDefinitions;
  }

  return yamlDoc;
}

/**
 * Convert YAML string to Convex format and return agents
 * @param {string} yamlText - YAML document as string
 * @returns {Array} Array of agent objects ready for Convex
 */
export function parseYamlToConvex(yamlText) {
  if (typeof window === 'undefined' || !window.jsyaml) {
    throw new Error('js-yaml not available');
  }
  const yamlDoc = window.jsyaml.load(yamlText);
  return yamlToConvexAgents(yamlDoc);
}

/**
 * Convert Convex data to YAML string
 * @param {object} canvas - Canvas document
 * @param {Array} agents - Array of agent documents
 * @param {object} orgSettings - Optional org settings
 * @returns {string} YAML document as string
 */
export function convexToYamlString(canvas, agents, orgSettings = null) {
  if (typeof window === 'undefined' || !window.jsyaml) {
    throw new Error('js-yaml not available');
  }
  const yamlDoc = convexToYaml(canvas, agents, orgSettings);
  return window.jsyaml.dump(yamlDoc);
}
