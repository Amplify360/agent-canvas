import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  checkSuperAdmin,
  getOrgRole,
  isOrgAdmin,
  hasOrgAccess,
  requireOrgAccess,
  requireOrgAdmin,
  type AuthContext,
} from '../../convex/lib/auth';

function mockAuth(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    workosUserId: 'user-1',
    email: 'test@example.com',
    isSuperAdmin: false,
    orgs: [],
    ...overrides,
  };
}

const ORG_ID = 'org-123';

describe('checkSuperAdmin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns true when email is in SUPER_ADMIN_EMAILS', () => {
    vi.stubEnv('SUPER_ADMIN_EMAILS', 'admin@example.com');
    expect(checkSuperAdmin('admin@example.com')).toBe(true);
  });

  it('returns true with case-insensitive match', () => {
    vi.stubEnv('SUPER_ADMIN_EMAILS', 'admin@example.com');
    expect(checkSuperAdmin('Admin@Example.com')).toBe(true);
  });

  it('returns false when email is not in the list', () => {
    vi.stubEnv('SUPER_ADMIN_EMAILS', 'admin@example.com');
    expect(checkSuperAdmin('other@example.com')).toBe(false);
  });

  it('handles multiple emails separated by commas', () => {
    vi.stubEnv('SUPER_ADMIN_EMAILS', 'admin@example.com,user@example.com,boss@example.com');
    expect(checkSuperAdmin('admin@example.com')).toBe(true);
    expect(checkSuperAdmin('user@example.com')).toBe(true);
    expect(checkSuperAdmin('boss@example.com')).toBe(true);
    expect(checkSuperAdmin('stranger@example.com')).toBe(false);
  });

  it('handles whitespace around emails', () => {
    vi.stubEnv('SUPER_ADMIN_EMAILS', ' admin@x.com , user@y.com ');
    expect(checkSuperAdmin('admin@x.com')).toBe(true);
    expect(checkSuperAdmin('user@y.com')).toBe(true);
  });

  it('returns false when SUPER_ADMIN_EMAILS is not set', () => {
    vi.stubEnv('SUPER_ADMIN_EMAILS', '');
    expect(checkSuperAdmin('anyone@example.com')).toBe(false);
  });
});

describe('getOrgRole', () => {
  it('returns admin role for super admin regardless of org membership', () => {
    const auth = mockAuth({ isSuperAdmin: true });
    expect(getOrgRole(auth, ORG_ID)).toBe('admin');
  });

  it('returns the user role for a matching org', () => {
    const auth = mockAuth({
      orgs: [{ id: ORG_ID, role: 'member' }],
    });
    expect(getOrgRole(auth, ORG_ID)).toBe('member');
  });

  it('returns null when user is not a member of the org', () => {
    const auth = mockAuth({
      orgs: [{ id: 'org-other', role: 'admin' }],
    });
    expect(getOrgRole(auth, ORG_ID)).toBeNull();
  });
});

describe('isOrgAdmin', () => {
  it('returns true for super admin', () => {
    const auth = mockAuth({ isSuperAdmin: true });
    expect(isOrgAdmin(auth, ORG_ID)).toBe(true);
  });

  it('returns true for org admin', () => {
    const auth = mockAuth({
      orgs: [{ id: ORG_ID, role: 'admin' }],
    });
    expect(isOrgAdmin(auth, ORG_ID)).toBe(true);
  });

  it('returns false for org member (non-admin)', () => {
    const auth = mockAuth({
      orgs: [{ id: ORG_ID, role: 'member' }],
    });
    expect(isOrgAdmin(auth, ORG_ID)).toBe(false);
  });

  it('returns false for non-member', () => {
    const auth = mockAuth({ orgs: [] });
    expect(isOrgAdmin(auth, ORG_ID)).toBe(false);
  });
});

describe('hasOrgAccess', () => {
  it('returns true for super admin even without membership', () => {
    const auth = mockAuth({ isSuperAdmin: true, orgs: [] });
    expect(hasOrgAccess(auth, ORG_ID)).toBe(true);
  });

  it('returns true for org member', () => {
    const auth = mockAuth({
      orgs: [{ id: ORG_ID, role: 'member' }],
    });
    expect(hasOrgAccess(auth, ORG_ID)).toBe(true);
  });

  it('returns true for org admin', () => {
    const auth = mockAuth({
      orgs: [{ id: ORG_ID, role: 'admin' }],
    });
    expect(hasOrgAccess(auth, ORG_ID)).toBe(true);
  });

  it('returns false for non-member', () => {
    const auth = mockAuth({ orgs: [] });
    expect(hasOrgAccess(auth, ORG_ID)).toBe(false);
  });
});

describe('requireOrgAccess', () => {
  it('does not throw for super admin', () => {
    const auth = mockAuth({ isSuperAdmin: true });
    expect(() => requireOrgAccess(auth, ORG_ID)).not.toThrow();
  });

  it('does not throw for org member', () => {
    const auth = mockAuth({
      orgs: [{ id: ORG_ID, role: 'member' }],
    });
    expect(() => requireOrgAccess(auth, ORG_ID)).not.toThrow();
  });

  it('throws "Auth: Organization access denied" for non-member', () => {
    const auth = mockAuth({ orgs: [] });
    expect(() => requireOrgAccess(auth, ORG_ID)).toThrow(
      'Auth: Organization access denied'
    );
  });
});

describe('requireOrgAdmin', () => {
  it('does not throw for super admin', () => {
    const auth = mockAuth({ isSuperAdmin: true });
    expect(() => requireOrgAdmin(auth, ORG_ID)).not.toThrow();
  });

  it('does not throw for org admin', () => {
    const auth = mockAuth({
      orgs: [{ id: ORG_ID, role: 'admin' }],
    });
    expect(() => requireOrgAdmin(auth, ORG_ID)).not.toThrow();
  });

  it('throws "Auth: Organization admin access required" for org member (non-admin)', () => {
    const auth = mockAuth({
      orgs: [{ id: ORG_ID, role: 'member' }],
    });
    expect(() => requireOrgAdmin(auth, ORG_ID)).toThrow(
      'Auth: Organization admin access required'
    );
  });

  it('throws for non-member', () => {
    const auth = mockAuth({ orgs: [] });
    expect(() => requireOrgAdmin(auth, ORG_ID)).toThrow(
      'Auth: Organization admin access required'
    );
  });
});
