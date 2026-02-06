import { describe, it, expect } from 'vitest';
import {
  getToolDisplay,
  getSectionColor,
  getToolColorClass,
  TOOL_DEFINITIONS,
  SECTION_COLOR_PALETTE,
} from '@/utils/config';
import { getAgentStatusConfig } from '@/types/validationConstants';

describe('Config Utilities', () => {
  describe('getToolDisplay', () => {
    it('normalizes tool names with spaces', () => {
      const result = getToolDisplay('Web Search');
      expect(result.label).toBe('Web Search');
      expect(result.color).toBe('#10B981');
    });

    it('returns default for unknown tools', () => {
      const result = getToolDisplay('unknown-tool');
      expect(result).toEqual({
        label: 'unknown-tool',
        color: '#6B7280',
        icon: 'box',
      });
    });
  });

  describe('getSectionColor', () => {
    it('cycles through palette for large indices', () => {
      const paletteLength = SECTION_COLOR_PALETTE.length;
      expect(getSectionColor(paletteLength)).toBe(SECTION_COLOR_PALETTE[0]);
      expect(getSectionColor(paletteLength + 1)).toBe(SECTION_COLOR_PALETTE[1]);
    });
  });

  describe('getAgentStatusConfig', () => {
    it('returns correct config for known and unknown statuses', () => {
      const liveConfig = getAgentStatusConfig('live');
      expect(liveConfig.label).toBe('Live');
      expect(liveConfig.color).toBeDefined();

      const unknownConfig = getAgentStatusConfig('nonexistent-status');
      expect(unknownConfig.label).toBe('nonexistent-status');

      const undefinedConfig = getAgentStatusConfig(undefined);
      expect(undefinedConfig.label).toBe('Unknown');
    });
  });

  describe('getToolColorClass', () => {
    it('returns default for unknown colors', () => {
      expect(getToolColorClass('#000000')).toBe('default');
      expect(getToolColorClass('invalid')).toBe('default');
    });

    it('maps all defined tool colors', () => {
      Object.values(TOOL_DEFINITIONS).forEach((tool) => {
        const colorClass = getToolColorClass(tool.color);
        expect(colorClass).not.toBe('default');
      });
    });
  });
});
