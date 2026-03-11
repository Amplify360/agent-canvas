import { describe, expect, it } from 'vitest';
import { getTokenFromRequest, requireScope } from '@/server/mcp/auth';

describe('mcp auth helpers', () => {
  it('parses bearer token', () => {
    const request = new Request('http://localhost', { headers: { Authorization: 'Bearer abc123' } });
    expect(getTokenFromRequest(request)).toBe('abc123');
  });

  it('falls back to x-api-key', () => {
    const request = new Request('http://localhost', { headers: { 'X-API-Key': 'k_test' } });
    expect(getTokenFromRequest(request)).toBe('k_test');
  });

  it('checks scopes', () => {
    expect(() => requireScope({ scopes: ['canvas:read'] } as any, 'canvas:write')).toThrow(/Missing required scope/);
  });
});
