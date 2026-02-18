import { describe, it, expect } from 'vitest';
import {
  validateMetric,
  validateMetrics,
  validateNonEmptyString,
  validateSlug,
  validateTitle,
  validateCanvasDescription,
  validateAgentName,
  validatePhase,
  validateObjective,
  validateDescription,
  validateOptionalUrl,
  validateAgentData,
} from '../../convex/lib/validation';

describe('Convex Backend Validation', () => {
  describe('validateMetric', () => {
    it('should accept 0 (boundary)', () => {
      expect(() => validateMetric(0, 'testField')).not.toThrow();
    });

    it('should accept positive numbers', () => {
      expect(() => validateMetric(1, 'testField')).not.toThrow();
      expect(() => validateMetric(100, 'testField')).not.toThrow();
      expect(() => validateMetric(999999, 'testField')).not.toThrow();
    });

    it('should throw for negative numbers', () => {
      expect(() => validateMetric(-1, 'testField')).toThrow(
        'Validation: testField must be 0 or greater'
      );
      expect(() => validateMetric(-100, 'testField')).toThrow(
        'Validation: testField must be 0 or greater'
      );
    });
  });

  describe('validateMetrics', () => {
    it('should accept undefined (no-op)', () => {
      expect(() => validateMetrics(undefined)).not.toThrow();
    });

    it('should accept valid metrics', () => {
      expect(() =>
        validateMetrics({
          numberOfUsers: 10,
          timesUsed: 50,
          timeSaved: 100,
          roi: 25,
        })
      ).not.toThrow();
    });

    it('should throw for negative numberOfUsers', () => {
      expect(() => validateMetrics({ numberOfUsers: -1 })).toThrow(
        'Validation: numberOfUsers must be 0 or greater'
      );
    });

    it('should throw for negative timesUsed', () => {
      expect(() => validateMetrics({ timesUsed: -5 })).toThrow(
        'Validation: timesUsed must be 0 or greater'
      );
    });

    it('should throw for negative timeSaved', () => {
      expect(() => validateMetrics({ timeSaved: -10 })).toThrow(
        'Validation: timeSaved must be 0 or greater'
      );
    });

    it('should allow negative roi (intentional exception)', () => {
      expect(() => validateMetrics({ roi: -50 })).not.toThrow();
      expect(() => validateMetrics({ roi: -999 })).not.toThrow();
    });

    it('should accept all-undefined metric fields', () => {
      expect(() => validateMetrics({})).not.toThrow();
      expect(() =>
        validateMetrics({
          numberOfUsers: undefined,
          timesUsed: undefined,
          timeSaved: undefined,
          roi: undefined,
        })
      ).not.toThrow();
    });
  });

  describe('validateNonEmptyString', () => {
    it('should throw for empty string', () => {
      expect(() => validateNonEmptyString('', 'field')).toThrow(
        'Validation: field cannot be empty'
      );
    });

    it('should throw for whitespace-only string', () => {
      expect(() => validateNonEmptyString('   ', 'field')).toThrow(
        'Validation: field cannot be empty'
      );
      expect(() => validateNonEmptyString('\t\n', 'field')).toThrow(
        'Validation: field cannot be empty'
      );
    });

    it('should accept non-empty string', () => {
      expect(() => validateNonEmptyString('hello', 'field')).not.toThrow();
      expect(() => validateNonEmptyString('a', 'field')).not.toThrow();
    });
  });

  describe('validateSlug', () => {
    it('should accept valid slugs', () => {
      expect(() => validateSlug('hello')).not.toThrow();
      expect(() => validateSlug('hello-world')).not.toThrow();
      expect(() => validateSlug('a1-b2')).not.toThrow();
      expect(() => validateSlug('abc123')).not.toThrow();
      expect(() => validateSlug('a')).not.toThrow();
    });

    it('should throw for uppercase characters', () => {
      expect(() => validateSlug('Hello')).toThrow(
        'Validation: slug must be lowercase'
      );
      expect(() => validateSlug('HELLO')).toThrow(
        'Validation: slug must be lowercase'
      );
    });

    it('should throw for leading hyphen', () => {
      expect(() => validateSlug('-hello')).toThrow(
        'Validation: slug must contain only lowercase letters, numbers, and hyphens'
      );
    });

    it('should throw for trailing hyphen', () => {
      expect(() => validateSlug('hello-')).toThrow(
        'Validation: slug must contain only lowercase letters, numbers, and hyphens'
      );
    });

    it('should throw for consecutive hyphens', () => {
      expect(() => validateSlug('hello--world')).toThrow(
        'Validation: slug must contain only lowercase letters, numbers, and hyphens'
      );
    });

    it('should throw for spaces', () => {
      expect(() => validateSlug('hello world')).toThrow(
        'Validation: slug must contain only lowercase letters, numbers, and hyphens'
      );
    });

    it('should throw for special characters', () => {
      expect(() => validateSlug('hello@world')).toThrow(
        'Validation: slug must contain only lowercase letters, numbers, and hyphens'
      );
    });

    it('should throw for empty string', () => {
      expect(() => validateSlug('')).toThrow(
        'Validation: slug cannot be empty'
      );
    });

    it('should throw for over 100 characters', () => {
      expect(() => validateSlug('a'.repeat(101))).toThrow(
        'Validation: slug must be 100 characters or less'
      );
    });

    it('should accept slug at exactly 100 characters', () => {
      expect(() => validateSlug('a'.repeat(100))).not.toThrow();
    });
  });

  describe('validateTitle', () => {
    it('should accept valid title', () => {
      expect(() => validateTitle('My Canvas')).not.toThrow();
    });

    it('should throw for empty string', () => {
      expect(() => validateTitle('')).toThrow(
        'Validation: title cannot be empty'
      );
    });

    it('should throw for string exceeding 200 characters', () => {
      expect(() => validateTitle('a'.repeat(201))).toThrow(
        'Validation: title must be 200 characters or less'
      );
    });

    it('should accept string at exactly 200 characters', () => {
      expect(() => validateTitle('a'.repeat(200))).not.toThrow();
    });
  });

  describe('validateCanvasDescription', () => {
    it('should accept undefined (optional field)', () => {
      expect(() => validateCanvasDescription(undefined)).not.toThrow();
    });

    it('should accept whitespace-only (treated as empty, no-op)', () => {
      expect(() => validateCanvasDescription('   ')).not.toThrow();
      expect(() => validateCanvasDescription('\n\t')).not.toThrow();
    });

    it('should accept valid string within limit', () => {
      expect(() => validateCanvasDescription('Canvas narrative context')).not.toThrow();
    });

    it('should throw for string exceeding 5000 characters', () => {
      expect(() => validateCanvasDescription('a'.repeat(5001))).toThrow(
        'Validation: description must be 5000 characters or less'
      );
    });

    it('should accept string at exactly 5000 characters', () => {
      expect(() => validateCanvasDescription('a'.repeat(5000))).not.toThrow();
    });
  });

  describe('validateAgentName', () => {
    it('should accept valid name', () => {
      expect(() => validateAgentName('Sales Agent')).not.toThrow();
    });

    it('should throw for empty string', () => {
      expect(() => validateAgentName('')).toThrow(
        'Validation: name cannot be empty'
      );
    });

    it('should throw for string exceeding 100 characters', () => {
      expect(() => validateAgentName('a'.repeat(101))).toThrow(
        'Validation: name must be 100 characters or less'
      );
    });

    it('should accept string at exactly 100 characters', () => {
      expect(() => validateAgentName('a'.repeat(100))).not.toThrow();
    });
  });

  describe('validatePhase', () => {
    it('should accept valid phase', () => {
      expect(() => validatePhase('Discovery')).not.toThrow();
    });

    it('should throw for empty string', () => {
      expect(() => validatePhase('')).toThrow(
        'Validation: phase cannot be empty'
      );
    });

    it('should throw for string exceeding 50 characters', () => {
      expect(() => validatePhase('a'.repeat(51))).toThrow(
        'Validation: phase must be 50 characters or less'
      );
    });

    it('should accept string at exactly 50 characters', () => {
      expect(() => validatePhase('a'.repeat(50))).not.toThrow();
    });
  });

  describe('validateObjective', () => {
    it('should accept undefined (optional field)', () => {
      expect(() => validateObjective(undefined)).not.toThrow();
    });

    it('should accept whitespace-only (treated as empty, no-op)', () => {
      expect(() => validateObjective('   ')).not.toThrow();
      expect(() => validateObjective('\t')).not.toThrow();
    });

    it('should accept valid string within limit', () => {
      expect(() => validateObjective('Help the sales team close deals')).not.toThrow();
    });

    it('should throw for string exceeding 500 characters', () => {
      expect(() => validateObjective('a'.repeat(501))).toThrow(
        'Validation: objective must be 500 characters or less'
      );
    });

    it('should accept string at exactly 500 characters', () => {
      expect(() => validateObjective('a'.repeat(500))).not.toThrow();
    });
  });

  describe('validateDescription', () => {
    it('should accept undefined (optional field)', () => {
      expect(() => validateDescription(undefined)).not.toThrow();
    });

    it('should accept whitespace-only (treated as empty, no-op)', () => {
      expect(() => validateDescription('   ')).not.toThrow();
      expect(() => validateDescription('\n\t')).not.toThrow();
    });

    it('should accept valid string within limit', () => {
      expect(() => validateDescription('A helpful agent for sales')).not.toThrow();
    });

    it('should throw for string exceeding 10000 characters', () => {
      expect(() => validateDescription('a'.repeat(10001))).toThrow(
        'Validation: description must be 10000 characters or less'
      );
    });

    it('should accept string at exactly 10000 characters', () => {
      expect(() => validateDescription('a'.repeat(10000))).not.toThrow();
    });
  });

  describe('validateOptionalUrl', () => {
    it('should accept undefined (no-op)', () => {
      expect(() => validateOptionalUrl(undefined, 'link')).not.toThrow();
    });

    it('should accept valid URL', () => {
      expect(() => validateOptionalUrl('https://example.com', 'link')).not.toThrow();
      expect(() => validateOptionalUrl('http://localhost:3000', 'link')).not.toThrow();
      expect(() =>
        validateOptionalUrl('https://example.com/path?q=1&r=2', 'link')
      ).not.toThrow();
    });

    it('should accept "#" as placeholder (special case)', () => {
      expect(() => validateOptionalUrl('#', 'link')).not.toThrow();
    });

    it('should throw for invalid URL', () => {
      expect(() => validateOptionalUrl('not-a-url', 'demoLink')).toThrow(
        'Validation: demoLink must be a valid URL'
      );
      expect(() => validateOptionalUrl('just some words', 'link')).toThrow(
        'Validation: link must be a valid URL'
      );
    });

    it('should accept empty string (falsy, no-op)', () => {
      expect(() => validateOptionalUrl('', 'link')).not.toThrow();
    });
  });

  describe('validateAgentData', () => {
    it('should accept valid full data', () => {
      expect(() =>
        validateAgentData({
          name: 'Sales Agent',
          phase: 'Discovery',
          objective: 'Help the sales team',
          description: 'A helpful agent',
          metrics: { numberOfUsers: 10, timesUsed: 50, timeSaved: 100, roi: 25 },
          demoLink: 'https://example.com/demo',
          videoLink: 'https://youtube.com/watch?v=123',
        })
      ).not.toThrow();
    });

    it('should throw for invalid name', () => {
      expect(() => validateAgentData({ name: '' })).toThrow(
        'Validation: name cannot be empty'
      );
    });

    it('should throw for name exceeding max length', () => {
      expect(() => validateAgentData({ name: 'a'.repeat(101) })).toThrow(
        'Validation: name must be 100 characters or less'
      );
    });

    it('should throw for invalid phase', () => {
      expect(() => validateAgentData({ phase: '' })).toThrow(
        'Validation: phase cannot be empty'
      );
    });

    it('should throw for invalid metrics (negative numberOfUsers)', () => {
      expect(() =>
        validateAgentData({ metrics: { numberOfUsers: -1 } })
      ).toThrow('Validation: numberOfUsers must be 0 or greater');
    });

    it('should throw for invalid metrics (negative timesUsed)', () => {
      expect(() =>
        validateAgentData({ metrics: { timesUsed: -5 } })
      ).toThrow('Validation: timesUsed must be 0 or greater');
    });

    it('should throw for invalid demoLink URL', () => {
      expect(() => validateAgentData({ demoLink: 'not-a-url' })).toThrow(
        'Validation: demoLink must be a valid URL'
      );
    });

    it('should throw for invalid videoLink URL', () => {
      expect(() => validateAgentData({ videoLink: 'bad-link' })).toThrow(
        'Validation: videoLink must be a valid URL'
      );
    });

    it('should only validate fields that are present (partial data works)', () => {
      expect(() => validateAgentData({})).not.toThrow();
      expect(() => validateAgentData({ name: 'Agent' })).not.toThrow();
      expect(() => validateAgentData({ phase: 'Discovery' })).not.toThrow();
      expect(() =>
        validateAgentData({ demoLink: 'https://example.com' })
      ).not.toThrow();
    });

    it('should ignore non-string/non-object fields (number passed as name is ignored)', () => {
      expect(() => validateAgentData({ name: 42 as unknown })).not.toThrow();
      expect(() => validateAgentData({ phase: 123 as unknown })).not.toThrow();
      expect(() => validateAgentData({ metrics: 'not-an-object' })).not.toThrow();
      expect(() => validateAgentData({ demoLink: 99 as unknown })).not.toThrow();
    });

    it('should allow negative roi through agent data', () => {
      expect(() =>
        validateAgentData({ metrics: { roi: -50 } })
      ).not.toThrow();
    });
  });
});
