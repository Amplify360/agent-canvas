import { describe, expect, it } from 'vitest';
import {
  prepareYamlImport,
  parseYaml,
  slugifyTitle,
  generateUniqueSlug,
  exportToYaml,
} from '@/utils/yaml';
import { Agent } from '@/types/agent';
import { Id } from '../../convex/_generated/dataModel';

describe('YAML import', () => {
  it('parses YAML and converts agents to Convex format', () => {
    const yamlText = `
documentTitle: Example Canvas
agents:
  - name: Lead Qualifier
    phase: Sales
    agentOrder: 0
    objective: Qualify leads
    tools: [CRM]
    journeySteps: [Step 1]
    metrics:
      numberOfUsers: 10
      timeSaved: "5"
    category: Sales
    status: live
  - name: Triage Bot
    phase: Support
    agentOrder: 0
    tools: []
    journeySteps: []
    `.trim();

    const result = parseYaml(yamlText);

    expect(result.title).toBe('Example Canvas');
    expect(result.agents).toHaveLength(2);
    expect(result.phases).toEqual(['Sales', 'Support']);
    expect(result.categories).toEqual(['Sales']);
    expect(result.agents[0]).toMatchObject({
      phase: 'Sales',
      agentOrder: 0,
      name: 'Lead Qualifier',
      objective: 'Qualify leads',
      tools: ['CRM'],
      journeySteps: ['Step 1'],
      metrics: { numberOfUsers: 10, timeSaved: 5 },
      category: 'Sales',
      status: 'live',
    });
    expect(result.agents[1]).toMatchObject({
      phase: 'Support',
      agentOrder: 0,
      name: 'Triage Bot',
    });
  });

  it('prepares import with unique slug generation', () => {
    const yamlText = `
documentTitle: Example Canvas
agents:
  - name: Lead Qualifier
    phase: Sales
    `.trim();

    const result = prepareYamlImport({
      yamlText,
      overrideTitle: 'Imported Title',
      existingSlugs: new Set(['imported-title']),
    });

    expect(result.title).toBe('Imported Title');
    expect(result.slug).toBe('imported-title-2');
    expect(result.agents).toHaveLength(1);
    expect(result.phases).toEqual(['Sales']);
  });

  it('handles YAML with no agents', () => {
    const yamlText = `
documentTitle: Empty
agents: []
    `.trim();

    const result = prepareYamlImport({
      yamlText,
      existingSlugs: new Set(),
    });

    expect(result.title).toBe('Empty');
    expect(result.agents).toHaveLength(0);
    expect(result.phases).toEqual(['Backlog']);
    expect(result.categories).toEqual(['Uncategorized']);
  });

  it('throws error for invalid YAML', () => {
    const yamlText = 'invalid: [ unclosed';
    expect(() => parseYaml(yamlText)).toThrow(/YAML parse error/);
  });

  it('throws error for agents without names', () => {
    const yamlText = `
documentTitle: Test
agents:
  - phase: Phase
    objective: Has objective but no name
    `.trim();

    expect(() => parseYaml(yamlText)).toThrow(/missing a name/);
  });

  it('defaults phase to Backlog when not specified', () => {
    const yamlText = `
documentTitle: Test
agents:
  - name: Agent without phase
    `.trim();

    const result = parseYaml(yamlText);

    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].phase).toBe('Backlog');
    expect(result.phases).toEqual(['Backlog']);
  });

  it('ignores invalid status values', () => {
    const yamlText = `
documentTitle: Test Canvas
agents:
  - name: Agent with invalid status
    phase: Phase
    status: invalid_status_value
    `.trim();

    const result = parseYaml(yamlText);

    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].status).toBeUndefined();
  });

  it('parses valid status values', () => {
    const yamlText = `
documentTitle: Test Canvas
agents:
  - name: Active Agent
    phase: Phase
    status: live
  - name: Draft Agent
    phase: Phase
    status: idea
    `.trim();

    const result = parseYaml(yamlText);

    expect(result.agents).toHaveLength(2);
    expect(result.agents[0].status).toBe('live');
    expect(result.agents[1].status).toBe('idea');
  });
});

describe('slug utilities', () => {
  it('generates slugs correctly', () => {
    expect(slugifyTitle('My Canvas')).toBe('my-canvas');
    expect(slugifyTitle('Multiple   Spaces')).toBe('multiple-spaces');
    expect(slugifyTitle('Special!@#$%Characters')).toBe('special-characters');
  });

  it('generates unique slugs with suffix', () => {
    const existingSlugs = new Set(['my-canvas', 'my-canvas-2']);
    const slug = generateUniqueSlug('My Canvas', existingSlugs);
    expect(slug).toBe('my-canvas-3');
  });
});

describe('YAML export', () => {
  const mockAgent = (overrides: Partial<Agent> = {}): Agent => ({
    _id: 'test-id' as Id<"agents">,
    _creationTime: Date.now(),
    canvasId: 'canvas-id' as Id<"canvases">,
    phase: 'Phase 1',
    agentOrder: 0,
    name: 'Test Agent',
    tools: [],
    journeySteps: [],
    createdBy: 'user-id',
    updatedBy: 'user-id',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  });

  it('exports agents to YAML format', () => {
    const agents: Agent[] = [
      mockAgent({
        name: 'Agent 1',
        phase: 'Discovery',
        agentOrder: 0,
        objective: 'First objective',
        tools: ['Tool A', 'Tool B'],
        journeySteps: ['Step 1', 'Step 2'],
        metrics: { numberOfUsers: 100, timesUsed: 50, timeSaved: 10, roi: 5000 },
        category: 'Sales',
        status: 'live',
      }),
      mockAgent({
        name: 'Agent 2',
        phase: 'Discovery',
        agentOrder: 1,
      }),
    ];

    const yaml = exportToYaml('Test Canvas', agents);

    expect(yaml).toContain('documentTitle: Test Canvas');
    expect(yaml).toContain('name: Agent 1');
    expect(yaml).toContain('objective: First objective');
    expect(yaml).toContain('- Tool A');
    expect(yaml).toContain('category: Sales');
    expect(yaml).toContain('status: live');
    expect(yaml).toContain('numberOfUsers: 100');
    expect(yaml).toContain('roi: 5000');
    expect(yaml).toContain('name: Agent 2');
  });

  it('omits empty optional fields', () => {
    const agents: Agent[] = [mockAgent({ name: 'Minimal Agent' })];

    const yaml = exportToYaml('Minimal', agents);

    expect(yaml).toContain('name: Minimal Agent');
    expect(yaml).not.toContain('objective:');
    expect(yaml).not.toContain('description:');
    expect(yaml).not.toContain('metrics:');
    expect(yaml).not.toContain('category:');
  });

  it('maintains phase ordering using canvas phaseOrder', () => {
    const agents: Agent[] = [
      mockAgent({ name: 'Third', phase: 'Phase C', agentOrder: 0 }),
      mockAgent({ name: 'First', phase: 'Phase A', agentOrder: 0 }),
      mockAgent({ name: 'Second', phase: 'Phase B', agentOrder: 0 }),
    ];

    const yaml = exportToYaml('Ordered', agents, ['Phase A', 'Phase B', 'Phase C']);

    const phaseAIndex = yaml.indexOf('Phase A');
    const phaseBIndex = yaml.indexOf('Phase B');
    const phaseCIndex = yaml.indexOf('Phase C');

    expect(phaseAIndex).toBeLessThan(phaseBIndex);
    expect(phaseBIndex).toBeLessThan(phaseCIndex);
  });

  it('maintains agent ordering within phases', () => {
    const agents: Agent[] = [
      mockAgent({ name: 'Second', phase: 'Phase', agentOrder: 1 }),
      mockAgent({ name: 'First', phase: 'Phase', agentOrder: 0 }),
      mockAgent({ name: 'Third', phase: 'Phase', agentOrder: 2 }),
    ];

    const yaml = exportToYaml('Ordered', agents);

    const firstIndex = yaml.indexOf('name: First');
    const secondIndex = yaml.indexOf('name: Second');
    const thirdIndex = yaml.indexOf('name: Third');

    expect(firstIndex).toBeLessThan(secondIndex);
    expect(secondIndex).toBeLessThan(thirdIndex);
  });

  it('handles empty agents array', () => {
    const yaml = exportToYaml('Empty Canvas', []);

    expect(yaml).toContain('documentTitle: Empty Canvas');
    expect(yaml).toContain('agents: []');
  });

  it('throws error for invalid title', () => {
    expect(() => exportToYaml('', [])).toThrow(/title is required/);
    expect(() => exportToYaml('a'.repeat(201), [])).toThrow(/200 characters or less/);
  });
});

describe('YAML full canvas import', () => {
  it('imports a real-world canvas YAML file with 42 agents', () => {
    const fs = require('fs');
    const path = require('path');
    const yamlText = fs.readFileSync(
      path.join(__dirname, '../fixtures/danucem-agents-complete.yaml'),
      'utf-8'
    );

    const result = parseYaml(yamlText);

    // Title
    expect(result.title).toBe(
      'Danucem AI Agent Portfolio - Complete Workshop (Jan 8, 28, 29, 30, 2026)'
    );

    // All 42 agents imported
    expect(result.agents).toHaveLength(42);

    // All agents should have required fields
    result.agents.forEach((agent) => {
      expect(agent.name).toBeTruthy();
      expect(agent.phase).toBeTruthy();
      expect(typeof agent.agentOrder).toBe('number');
      expect(Array.isArray(agent.tools)).toBe(true);
      expect(Array.isArray(agent.journeySteps)).toBe(true);
    });

    // Single phase: all agents are in "ideation"
    expect(result.phases).toEqual(['ideation']);

    // Categories extracted from agents
    expect(result.categories).toContain('Finance & Controlling');
    expect(result.categories).toContain('Health & Safety');
    expect(result.categories).toContain('Procurement & Supply Chain');
    expect(result.categories).toContain('IT & Cybersecurity');
    expect(result.categories).toContain('Sales & Marketing');
    expect(result.categories).toContain('HR & Talent Management');
    expect(result.categories).toContain('Strategy & Management');
    expect(result.categories).toContain('Legal & Compliance');
    expect(result.categories).toContain('Logistics & Operations');
    expect(result.categories).toContain('Operations & Support');
    expect(result.categories).toContain('Performance & Analytics');
    expect(result.categories).toContain('Maintenance & Production');

    // All agents have status "idea"
    result.agents.forEach((agent) => {
      expect(agent.status).toBe('idea');
    });

    // Spot-check a specific agent with long multiline description
    const proposalAgent = result.agents.find(
      (a) => a.name === 'Business Acquisition Proposal Agent'
    );
    expect(proposalAgent).toBeDefined();
    expect(proposalAgent!.category).toBe('Finance & Controlling');
    expect(proposalAgent!.tools).toEqual(['rag', 'code']);
    expect(proposalAgent!.journeySteps).toHaveLength(4);
    expect(proposalAgent!.description).toContain('VALUE MEASUREMENT');

    // Spot-check agent with special characters in name
    const learningAgent = result.agents.find(
      (a) => a.name === 'Learning path/ Individual Development plan  agent'
    );
    expect(learningAgent).toBeDefined();
    expect(learningAgent!.tools).toEqual(['rag', 'code', 'forms']);

    // Spot-check agent with 4 tools
    const salesAssistant = result.agents.find((a) => a.name === 'Sales Assistant');
    expect(salesAssistant).toBeDefined();
    expect(salesAssistant!.tools).toEqual(['rag', 'code', 'web-search', 'api']);

    // Extra fields (submitter, department) should be silently ignored
    const gdprAgent = result.agents.find((a) => a.name === 'GDPR agent');
    expect(gdprAgent).toBeDefined();
    expect(gdprAgent).not.toHaveProperty('submitter');
    expect(gdprAgent).not.toHaveProperty('department');

    // Agent with unicode characters in description (en-dashes)
    const journalAgent = result.agents.find(
      (a) => a.name === 'Journal Entry Tax Validation Agent'
    );
    expect(journalAgent).toBeDefined();
    expect(journalAgent!.description).toContain('tax');
  });

  it('round-trips a full canvas through export and re-import', () => {
    const fs = require('fs');
    const path = require('path');
    const yamlText = fs.readFileSync(
      path.join(__dirname, '../fixtures/danucem-agents-complete.yaml'),
      'utf-8'
    );

    const imported = parseYaml(yamlText);

    // Convert to Agent[] for export
    const agents: Agent[] = imported.agents.map((a, i) => ({
      _id: `id-${i}` as Id<"agents">,
      _creationTime: Date.now(),
      canvasId: 'canvas-id' as Id<"canvases">,
      ...a,
      createdBy: 'user',
      updatedBy: 'user',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));

    const exported = exportToYaml(imported.title, agents, imported.phases);
    const reimported = parseYaml(exported);

    expect(reimported.title).toBe(imported.title);
    expect(reimported.agents).toHaveLength(imported.agents.length);
    expect(reimported.phases).toEqual(imported.phases);

    for (let i = 0; i < imported.agents.length; i++) {
      expect(reimported.agents[i].name).toBe(imported.agents[i].name);
      expect(reimported.agents[i].phase).toBe(imported.agents[i].phase);
      expect(reimported.agents[i].tools).toEqual(imported.agents[i].tools);
      expect(reimported.agents[i].journeySteps).toEqual(imported.agents[i].journeySteps);
      expect(reimported.agents[i].category).toBe(imported.agents[i].category);
      expect(reimported.agents[i].status).toBe(imported.agents[i].status);
    }
  });
});
