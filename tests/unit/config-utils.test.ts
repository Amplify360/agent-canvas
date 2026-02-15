import { describe, it, expect } from 'vitest';
import {
  getToolDisplay,
  getSectionColor,
  getToolColorClass,
  TOOL_DEFINITIONS,
  SECTION_COLOR_PALETTE,
} from '@/utils/config';

describe('Config Utilities', () => {
  describe('getToolDisplay', () => {
    it('normalizes tool names (spaces + case) to known tool definitions', () => {
      expect(getToolDisplay('Web Search')).toEqual(TOOL_DEFINITIONS['web-search']);
      expect(getToolDisplay('MS Teams')).toEqual(TOOL_DEFINITIONS['ms-teams']);
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
