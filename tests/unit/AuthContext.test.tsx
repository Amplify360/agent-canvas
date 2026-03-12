// @vitest-environment jsdom

import React, { useEffect } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { STORAGE_KEYS } from '@/constants/storageKeys';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

const signOutMock = vi.fn(async () => undefined);
const refreshAuthMock = vi.fn(async () => undefined);
const syncMyMembershipsMock = vi.fn(async () => ({ added: 0, updated: 0, removed: 0 }));

const authKitState: {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profilePictureUrl?: string;
  } | null;
  loading: boolean;
  signOut: typeof signOutMock;
  refreshAuth: typeof refreshAuthMock;
} = {
  user: null,
  loading: false,
  signOut: signOutMock,
  refreshAuth: refreshAuthMock,
};

let membershipsState = [
  { orgId: 'org_saved', orgName: 'Saved Org', role: 'admin' },
  { orgId: 'org_other', orgName: 'Other Org', role: 'member' },
];

vi.mock('@workos-inc/authkit-nextjs/components', () => ({
  useAuth: () => authKitState,
}));

vi.mock('@/hooks/useConvex', () => ({
  useAction: () => syncMyMembershipsMock,
  useCanQuery: () => ({
    canQuery: true,
    isConvexAuthenticated: true,
    isConvexAuthLoading: false,
  }),
}));

vi.mock('@/hooks/useStableQuery', () => ({
  useStableQuery: () => ({
    data: membershipsState,
    hasLoaded: true,
  }),
}));

vi.mock('@/utils/authDebug', () => ({
  authDebug: () => undefined,
}));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function Probe({
  onStateChange,
}: {
  onStateChange: (state: { currentOrgId: string | null; signOut: () => Promise<void> }) => void;
}) {
  const { currentOrgId, signOut } = useAuth();

  useEffect(() => {
    onStateChange({ currentOrgId, signOut });
  }, [currentOrgId, onStateChange, signOut]);

  return null;
}

describe('AuthProvider org persistence', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    signOutMock.mockClear();
    refreshAuthMock.mockClear();
    syncMyMembershipsMock.mockClear();
    authKitState.loading = false;
    authKitState.user = {
      id: 'user_123',
      email: 'user@example.com',
      firstName: 'Test',
      lastName: 'User',
    };
    membershipsState = [
      { orgId: 'org_saved', orgName: 'Saved Org', role: 'admin' },
      { orgId: 'org_other', orgName: 'Other Org', role: 'member' },
    ];
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('restores the persisted org and keeps it across sign-out for the same user', async () => {
    const states: Array<{ currentOrgId: string | null; signOut: () => Promise<void> }> = [];
    window.localStorage.setItem(STORAGE_KEYS.CURRENT_ORG, JSON.stringify('org_saved'));

    const renderTree = () => (
      <AuthProvider>
        <Probe
          onStateChange={(state) => {
            states.push(state);
          }}
        />
      </AuthProvider>
    );

    await act(async () => {
      root.render(renderTree());
    });

    expect(states.at(-1)?.currentOrgId).toBe('org_saved');

    await act(async () => {
      await states.at(-1)?.signOut();
    });

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(STORAGE_KEYS.CURRENT_ORG)).toBe(JSON.stringify('org_saved'));

    await act(async () => {
      authKitState.user = null;
      root.render(renderTree());
    });

    await act(async () => {
      authKitState.user = {
        id: 'user_123',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
      };
      root.render(renderTree());
    });

    expect(states.at(-1)?.currentOrgId).toBe('org_saved');
  });
});
