import { describe, expect, it } from 'vitest';
import {
  buildTransformationMapPath,
  shouldCanonicalizeTransformationMapSlug,
} from '@/strategy/navigation';

describe('transformation map navigation helpers', () => {
  it('prefers the resolved map slug when building paths', () => {
    expect(
      buildTransformationMapPath({
        requestedMapSlug: 'missing-map',
        resolvedMapSlug: 'bsc-demo-transformation-map',
        departmentId: 'finance',
        serviceId: 'billing',
      })
    ).toBe('/transformation-map?map=bsc-demo-transformation-map&department=finance&service=billing');
  });

  it('only canonicalizes when the requested slug differs from the resolved map', () => {
    expect(shouldCanonicalizeTransformationMapSlug('missing-map', 'bsc-demo-transformation-map')).toBe(true);
    expect(shouldCanonicalizeTransformationMapSlug('bsc-demo-transformation-map', 'bsc-demo-transformation-map')).toBe(false);
    expect(shouldCanonicalizeTransformationMapSlug(null, 'bsc-demo-transformation-map')).toBe(false);
  });
});
