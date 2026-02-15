/**
 * E2E entrypoint route.
 *
 * Renders the full AppLayout with in-memory mocks for Convex + auth so we can
 * run Playwright against the happy path without external dependencies.
 */

'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppStateProvider } from '@/contexts/AppStateContext';
import { AgentProvider } from '@/contexts/AgentContext';
import { CanvasProvider } from '@/contexts/CanvasContext';
import { GroupingProvider } from '@/contexts/GroupingContext';
import { AuthContext, type AuthContextValue } from '@/contexts/AuthContext';
import { MockConvexProvider, type MockConvexState } from '@/contexts/MockConvexContext';
import type { Organization, User } from '@/types/auth';
import { ORG_ROLES } from '@/types/validationConstants';

function createInitialState(user: User, org: Organization): MockConvexState {
  const now = Date.now();
  return {
    memberships: [
      {
        orgId: org.id,
        orgName: org.name ?? org.id,
        role: org.role,
      },
    ],
    canvases: [
      {
        _id: 'e2e_canvas_seed_1' as any,
        _creationTime: now,
        workosOrgId: org.id,
        title: 'Demo Canvas',
        slug: 'demo-canvas',
        phases: ['Backlog', 'Phase 1'],
        categories: ['Uncategorized'],
        createdBy: user.id,
        updatedBy: user.id,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: 'e2e_canvas_seed_2' as any,
        _creationTime: now,
        workosOrgId: org.id,
        title: 'Secondary Canvas',
        slug: 'secondary-canvas',
        phases: ['Backlog'],
        categories: ['Uncategorized'],
        createdBy: user.id,
        updatedBy: user.id,
        createdAt: now,
        updatedAt: now,
      },
    ],
    agents: [],
    votes: [],
    comments: [],
  };
}

export function E2ERoot() {
  const user = useMemo<User>(
    () => ({
      id: 'e2e_user_1',
      email: 'e2e.user@example.com',
      firstName: 'E2E',
      lastName: 'User',
    }),
    [],
  );

  const org = useMemo<Organization>(
    () => ({
      id: 'e2e_org_1',
      name: 'E2E Org',
      role: ORG_ROLES.MEMBER,
    }),
    [],
  );

  const [currentOrgId, setCurrentOrgId] = useState<string | null>(org.id);

  const setCurrentOrgIdStable = useCallback((orgId: string) => {
    setCurrentOrgId(orgId);
  }, []);

  const authValue = useMemo<AuthContextValue>(
    () => ({
      user,
      userOrgs: [org],
      currentOrgId,
      isInitialized: true,
      isAuthenticated: true,
      setCurrentOrgId: setCurrentOrgIdStable,
      signOut: async () => {
        // E2E route doesn't implement auth flows; keep this as a no-op.
      },
      refreshAuth: async () => {
        // No-op for E2E.
      },
    }),
    [currentOrgId, org, setCurrentOrgIdStable, user],
  );

  const initialState = useMemo(() => createInitialState(user, org), [org, user]);

  return (
    <MockConvexProvider
      currentUserId={user.id}
      currentUserEmail={user.email}
      initialState={initialState}
    >
      <AuthContext.Provider value={authValue}>
        <CanvasProvider>
          <AgentProvider>
            <GroupingProvider>
              <AppStateProvider>
                <AppLayout />
              </AppStateProvider>
            </GroupingProvider>
          </AgentProvider>
        </CanvasProvider>
      </AuthContext.Provider>
    </MockConvexProvider>
  );
}
