import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatCurrency,
  formatRelativeTime,
  getInitialsFromEmail,
  getColorFromString,
} from '@/utils/formatting';

describe('Formatting Utilities', () => {
  describe('formatCurrency', () => {
    it('returns exact dollar amount for values under 1000', () => {
      expect(formatCurrency(0)).toBe('$0');
      expect(formatCurrency(1)).toBe('$1');
      expect(formatCurrency(500)).toBe('$500');
      expect(formatCurrency(999)).toBe('$999');
    });

    it('returns zero as $0', () => {
      expect(formatCurrency(0)).toBe('$0');
    });

    it('formats values >= 1000 with K suffix', () => {
      expect(formatCurrency(1000)).toBe('$1.0K');
      expect(formatCurrency(1500)).toBe('$1.5K');
      expect(formatCurrency(2500)).toBe('$2.5K');
      expect(formatCurrency(10000)).toBe('$10.0K');
      expect(formatCurrency(999999)).toBe('$1000.0K');
    });

    it('formats the boundary value of exactly 1000', () => {
      expect(formatCurrency(1000)).toBe('$1.0K');
    });

    it('formats values >= 1000000 with M suffix', () => {
      expect(formatCurrency(1000000)).toBe('$1.0M');
      expect(formatCurrency(1500000)).toBe('$1.5M');
      expect(formatCurrency(2500000)).toBe('$2.5M');
      expect(formatCurrency(10000000)).toBe('$10.0M');
    });

    it('formats the boundary value of exactly 1000000', () => {
      expect(formatCurrency(1000000)).toBe('$1.0M');
    });

    it('rounds decimals correctly with toFixed(1)', () => {
      expect(formatCurrency(1550)).toBe('$1.6K');
      expect(formatCurrency(1549)).toBe('$1.5K');
      expect(formatCurrency(1050000)).toBe('$1.1M');
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-15T12:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "Just now" for timestamps within the last 59 seconds', () => {
      const now = Date.now();
      expect(formatRelativeTime(now)).toBe('Just now');
      expect(formatRelativeTime(now - 1000)).toBe('Just now');
      expect(formatRelativeTime(now - 59000)).toBe('Just now');
    });

    it('returns "1 minute ago" for singular minute', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 60 * 1000)).toBe('1 minute ago');
      expect(formatRelativeTime(now - 119 * 1000)).toBe('1 minute ago');
    });

    it('returns plural minutes for 2+ minutes', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 2 * 60 * 1000)).toBe('2 minutes ago');
      expect(formatRelativeTime(now - 30 * 60 * 1000)).toBe('30 minutes ago');
      expect(formatRelativeTime(now - 59 * 60 * 1000)).toBe('59 minutes ago');
    });

    it('returns "1 hour ago" for singular hour', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 60 * 60 * 1000)).toBe('1 hour ago');
      expect(formatRelativeTime(now - 119 * 60 * 1000)).toBe('1 hour ago');
    });

    it('returns plural hours for 2+ hours', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 2 * 60 * 60 * 1000)).toBe('2 hours ago');
      expect(formatRelativeTime(now - 12 * 60 * 60 * 1000)).toBe('12 hours ago');
      expect(formatRelativeTime(now - 23 * 60 * 60 * 1000)).toBe('23 hours ago');
    });

    it('returns "1 day ago" for singular day', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 24 * 60 * 60 * 1000)).toBe('1 day ago');
      expect(formatRelativeTime(now - 47 * 60 * 60 * 1000)).toBe('1 day ago');
    });

    it('returns plural days for 2+ days', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 2 * 24 * 60 * 60 * 1000)).toBe('2 days ago');
      expect(formatRelativeTime(now - 7 * 24 * 60 * 60 * 1000)).toBe('7 days ago');
      expect(formatRelativeTime(now - 30 * 24 * 60 * 60 * 1000)).toBe('30 days ago');
    });
  });

  describe('getInitialsFromEmail', () => {
    it('extracts initials from dot-separated email', () => {
      expect(getInitialsFromEmail('john.doe@example.com')).toBe('JD');
    });

    it('extracts initials from underscore-separated email', () => {
      expect(getInitialsFromEmail('john_doe@example.com')).toBe('JD');
    });

    it('extracts initials from hyphen-separated email', () => {
      expect(getInitialsFromEmail('john-doe@example.com')).toBe('JD');
    });

    it('takes first two characters for single-part names', () => {
      expect(getInitialsFromEmail('john@example.com')).toBe('JO');
    });

    it('returns "??" for empty string', () => {
      expect(getInitialsFromEmail('')).toBe('??');
    });

    it('handles single-character name parts', () => {
      // "a@example.com" -> name = "a", parts = ["a"], length 1 but only 1 char
      // Falls to: name.slice(0, 2).toUpperCase() || '??' -> "A" but slice(0,2) on "a" is "a" -> "A"
      // Actually: parts[0].length >= 2 is false, so it goes to name.slice(0, 2) = "a" -> "A"
      expect(getInitialsFromEmail('a@example.com')).toBe('A');
    });

    it('handles multi-part names with more than two parts', () => {
      expect(getInitialsFromEmail('john.middle.doe@example.com')).toBe('JM');
    });

    it('uppercases the initials', () => {
      expect(getInitialsFromEmail('alice.bob@example.com')).toBe('AB');
      expect(getInitialsFromEmail('alice_bob@example.com')).toBe('AB');
    });
  });

  describe('getColorFromString', () => {
    const PALETTE = [
      '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E',
      '#F59E0B', '#10B981', '#06B6D4', '#3B82F6',
    ];

    it('returns a color from the palette', () => {
      const color = getColorFromString('test@example.com');
      expect(PALETTE).toContain(color);
    });

    it('is deterministic (same input returns same color)', () => {
      const first = getColorFromString('hello');
      const second = getColorFromString('hello');
      expect(first).toBe(second);
    });

    it('does not crash on empty string (uses "unknown" fallback)', () => {
      const color = getColorFromString('');
      expect(PALETTE).toContain(color);
    });

    it('handles falsy input without crashing', () => {
      // The function uses `str || 'unknown'`, so null/undefined cast to falsy
      const color = getColorFromString(undefined as unknown as string);
      expect(PALETTE).toContain(color);
    });

    it('produces different colors for different inputs', () => {
      const inputs = ['alice@example.com', 'bob@example.com', 'charlie@example.com', 'dave@example.com'];
      const colors = inputs.map(getColorFromString);
      // With 4 inputs and 8 colors, at least 2 should differ
      const unique = new Set(colors);
      expect(unique.size).toBeGreaterThan(1);
    });

    it('empty and undefined both resolve to the "unknown" fallback color', () => {
      const fromEmpty = getColorFromString('');
      const fromUndefined = getColorFromString(undefined as unknown as string);
      expect(fromEmpty).toBe(fromUndefined);
    });
  });
});
