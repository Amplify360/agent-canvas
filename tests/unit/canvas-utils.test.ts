import { describe, it, expect } from 'vitest';

/**
 * Test canvas utility functions
 * These mirror the utility logic from convex/canvases.ts
 */

// Replicate generateUniqueSlug for testing (same logic as convex/canvases.ts)
interface CanvasLike {
  slug: string;
}

function generateUniqueSlug(
  baseSlug: string,
  existingCanvases: CanvasLike[]
): string {
  const existingSlugs = new Set(existingCanvases.map((c) => c.slug));

  // Try the base slug with -copy suffix first
  let candidate = `${baseSlug}-copy`;
  if (!existingSlugs.has(candidate)) {
    return candidate;
  }

  // Try -copy-2, -copy-3, etc.
  let counter = 2;
  while (existingSlugs.has(`${baseSlug}-copy-${counter}`)) {
    counter++;
  }
  return `${baseSlug}-copy-${counter}`;
}

describe('Canvas Utilities', () => {
  describe('generateUniqueSlug', () => {
    it('should append -copy for first copy when no conflicts exist', () => {
      const existingCanvases: CanvasLike[] = [
        { slug: 'my-canvas' },
        { slug: 'other-canvas' },
      ];

      const result = generateUniqueSlug('my-canvas', existingCanvases);
      expect(result).toBe('my-canvas-copy');
    });

    it('should append -copy-2 when -copy already exists', () => {
      const existingCanvases: CanvasLike[] = [
        { slug: 'my-canvas' },
        { slug: 'my-canvas-copy' },
      ];

      const result = generateUniqueSlug('my-canvas', existingCanvases);
      expect(result).toBe('my-canvas-copy-2');
    });

    it('should find next available number when multiple copies exist', () => {
      const existingCanvases: CanvasLike[] = [
        { slug: 'my-canvas' },
        { slug: 'my-canvas-copy' },
        { slug: 'my-canvas-copy-2' },
        { slug: 'my-canvas-copy-3' },
      ];

      const result = generateUniqueSlug('my-canvas', existingCanvases);
      expect(result).toBe('my-canvas-copy-4');
    });

    it('should fill gaps in numbering', () => {
      const existingCanvases: CanvasLike[] = [
        { slug: 'my-canvas' },
        { slug: 'my-canvas-copy' },
        { slug: 'my-canvas-copy-3' }, // Note: -copy-2 is missing
      ];

      const result = generateUniqueSlug('my-canvas', existingCanvases);
      expect(result).toBe('my-canvas-copy-2');
    });

    it('should work with empty existing canvases array', () => {
      const existingCanvases: CanvasLike[] = [];

      const result = generateUniqueSlug('my-canvas', existingCanvases);
      expect(result).toBe('my-canvas-copy');
    });

    it('should handle base slug that does not exist in target org', () => {
      const existingCanvases: CanvasLike[] = [
        { slug: 'different-canvas' },
        { slug: 'another-canvas' },
      ];

      const result = generateUniqueSlug('my-canvas', existingCanvases);
      expect(result).toBe('my-canvas-copy');
    });

    it('should handle slugs with numbers in the base name', () => {
      const existingCanvases: CanvasLike[] = [
        { slug: 'canvas-2024' },
        { slug: 'canvas-2024-copy' },
      ];

      const result = generateUniqueSlug('canvas-2024', existingCanvases);
      expect(result).toBe('canvas-2024-copy-2');
    });

    it('should not be confused by similar but different slugs', () => {
      const existingCanvases: CanvasLike[] = [
        { slug: 'my-canvas' },
        { slug: 'my-canvas-extra' }, // Not a copy pattern
        { slug: 'my-canvas-other-copy' }, // Different base
      ];

      const result = generateUniqueSlug('my-canvas', existingCanvases);
      expect(result).toBe('my-canvas-copy');
    });
  });
});
