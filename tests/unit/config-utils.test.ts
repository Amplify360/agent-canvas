import { describe, it, expect } from 'vitest';
import {
  getToolDisplay,
  getSectionColor,
  getStatusColor,
  getStatusConfig,
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

    it('handles case insensitivity', () => {
      const result = getToolDisplay('EMAIL');
      expect(result.label).toBe('Email');
    });
  });

  describe('getSectionColor', () => {
    it('cycles through palette for large indices', () => {
      const paletteLength = SECTION_COLOR_PALETTE.length;
      expect(getSectionColor(paletteLength)).toBe(SECTION_COLOR_PALETTE[0]);
      expect(getSectionColor(paletteLength + 1)).toBe(SECTION_COLOR_PALETTE[1]);
    });
  });

  describe('getStatusColor', () => {
    it('returns default color for unknown status', () => {
      expect(getStatusColor('unknown')).toBe(getAgentStatusConfig('unknown').color);
    });

    it('returns default color for undefined status', () => {
      expect(getStatusColor(undefined)).toBe(getAgentStatusConfig(undefined).color);
    });
  });

  describe('getStatusConfig', () => {
    it('returns default config with custom label for unknown status', () => {
      const config = getStatusConfig('custom-status');
      expect(config.color).toBe(getAgentStatusConfig('custom-status').color);
      expect(config.label).toBe('custom-status');
    });

    it('returns Unknown label for undefined status', () => {
      const config = getStatusConfig(undefined);
      expect(config.label).toBe('Unknown');
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
        expect(typeof colorClass).toBe('string');
        expect(colorClass.length).toBeGreaterThan(0);
      });
    });
  });
});
