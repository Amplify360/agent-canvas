import { describe, expect, it } from 'vitest';
import { prepareYamlImport, parseYaml, slugifyTitle, generateUniqueSlug, extractTitleFromYaml } from '../../app/utils/yamlImport';

describe('Legacy YAML importer (one-way)', () => {
  it('parses YAML and converts agents to Convex format', () => {
    const yamlText = `
documentTitle: Example Canvas
agentGroups:
  - groupName: Sales
    agents:
      - name: Lead Qualifier
        tools: [CRM]
        journeySteps: [Step 1]
        metrics:
          usageThisWeek: "10"
          timeSaved: "5"
  - groupName: Support
    agents:
      - name: Triage Bot
        tools: []
        journeySteps: []
    `.trim();

    const result = parseYaml(yamlText);

    expect(result.title).toBe('Example Canvas');
    expect(result.agents).toHaveLength(2);
    expect(result.agents[0]).toMatchObject({
      phase: 'Sales',
      name: 'Lead Qualifier',
      tools: ['CRM'],
      metrics: { adoption: 10, satisfaction: 5 },
    });
  });

  it('prepares import with unique slug generation', () => {
    const yamlText = `
documentTitle: Example Canvas
agentGroups:
  - groupName: Sales
    agents:
      - name: Lead Qualifier
    `.trim();

    const result = prepareYamlImport({
      yamlText,
      overrideTitle: 'Imported Title',
      existingSlugs: new Set(['imported-title']),
    });

    expect(result.title).toBe('Imported Title');
    expect(result.slug).toBe('imported-title-2');
    expect(result.agents).toHaveLength(1);
  });

  it('handles YAML with no agents', () => {
    const yamlText = `
documentTitle: Empty
agentGroups: []
    `.trim();

    const result = prepareYamlImport({
      yamlText,
      existingSlugs: new Set(),
    });

    expect(result.title).toBe('Empty');
    expect(result.agents).toHaveLength(0);
  });

  it('extracts title from YAML', () => {
    const yamlText = `
documentTitle: Test Canvas
agentGroups: []
    `.trim();

    const title = extractTitleFromYaml(yamlText);
    expect(title).toBe('Test Canvas');
  });

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

  it('throws error for invalid YAML', () => {
    const yamlText = 'invalid: [ unclosed';
    expect(() => parseYaml(yamlText)).toThrow(/YAML parse error/);
  });

  it('throws error for agents without names', () => {
    const yamlText = `
documentTitle: Test
agentGroups:
  - groupName: Phase
    agents:
      - objective: Has objective but no name
    `.trim();

    expect(() => parseYaml(yamlText)).toThrow(/missing a name/);
  });
});
