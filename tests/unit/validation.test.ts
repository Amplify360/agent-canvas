import { describe, it, expect } from 'vitest';
import { validateAgentForm } from '../../app/utils/validation';

describe('Agent Form Validation', () => {
  describe('validateAgentForm', () => {
    it('should accept valid agent data', () => {
      const errors = validateAgentForm({
        name: 'Sales Agent',
        phase: 'Discovery',
        objective: 'Help sales team',
        description: 'A helpful agent for sales',
      });
      expect(errors).toHaveLength(0);
    });

    it('should require name', () => {
      const errors = validateAgentForm({ name: '', phase: 'Discovery' });
      expect(errors).toContainEqual({ field: 'name', message: 'Agent name is required' });
    });

    it('should require phase', () => {
      const errors = validateAgentForm({ name: 'Agent', phase: '' });
      expect(errors).toContainEqual({ field: 'phase', message: 'Phase is required' });
    });

    it('should reject name over 100 characters', () => {
      const errors = validateAgentForm({
        name: 'a'.repeat(101),
        phase: 'Discovery',
      });
      expect(errors).toContainEqual({ field: 'name', message: 'Agent name must be 100 characters or less' });
    });

    it('should reject phase over 50 characters', () => {
      const errors = validateAgentForm({
        name: 'Agent',
        phase: 'a'.repeat(51),
      });
      expect(errors).toContainEqual({ field: 'phase', message: 'Phase must be 50 characters or less' });
    });

    it('should reject objective over 500 characters', () => {
      const errors = validateAgentForm({
        name: 'Agent',
        phase: 'Discovery',
        objective: 'a'.repeat(501),
      });
      expect(errors).toContainEqual({ field: 'objective', message: 'Objective must be 500 characters or less' });
    });

    it('should reject description over 10000 characters', () => {
      const errors = validateAgentForm({
        name: 'Agent',
        phase: 'Discovery',
        description: 'a'.repeat(10001),
      });
      expect(errors).toContainEqual({ field: 'description', message: 'Description must be 10000 characters or less' });
    });

    it('should reject invalid demoLink URL', () => {
      const errors = validateAgentForm({
        name: 'Agent',
        phase: 'Discovery',
        demoLink: 'not-a-url',
      });
      expect(errors).toContainEqual({ field: 'demoLink', message: 'Demo link must be a valid URL' });
    });

    it('should accept valid demoLink URL', () => {
      const errors = validateAgentForm({
        name: 'Agent',
        phase: 'Discovery',
        demoLink: 'https://example.com/demo',
      });
      expect(errors.filter(e => e.field === 'demoLink')).toHaveLength(0);
    });
  });
});
