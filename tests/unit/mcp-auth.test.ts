import { describe, expect, it } from 'vitest';
import { getTokenFromRequest, hashTokenForLookup, requireScope } from '@/server/mcp/auth';

describe('mcp auth helpers', () => {
  it('parses bearer token', () => {
    const request = new Request('http://localhost', { headers: { Authorization: 'Bearer abc123' } });
    expect(getTokenFromRequest(request)).toBe('abc123');
  });

  it('falls back to x-api-key', () => {
    const request = new Request('http://localhost', { headers: { 'X-API-Key': 'k_test' } });
    expect(getTokenFromRequest(request)).toBe('k_test');
  });

  it('hashes token without forwarding the raw secret', async () => {
    await expect(hashTokenForLookup('mcp_prefix.secret')).resolves.toEqual({
      tokenPrefix: 'mcp_prefix',
      tokenHash: '4ad7e6b16f5835092577c95bc1b33289605d9e8c4d5cbdbb4bce20fe0dc5d97a',
    });
  });

  it('rejects malformed tokens', async () => {
    await expect(hashTokenForLookup('')).rejects.toThrow(/Invalid service token format/);
  });

  it('checks scopes', () => {
    expect(() => requireScope({ scopes: ['canvas:read'] } as any, 'canvas:write')).toThrow(/Missing required scope/);
  });
});
