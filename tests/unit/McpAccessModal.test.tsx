// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { McpAccessModal } from '@/components/org/McpAccessModal';

const useQueryMock = vi.fn();
const useMutationMock = vi.fn(() => vi.fn());
const useCanQueryMock = vi.fn(() => ({ canQuery: true, isConvexAuthenticated: true, isConvexAuthLoading: false }));

vi.mock('@/hooks/useConvex', () => ({
  useQuery: (...args: any[]) => (useQueryMock as any).apply(null, args),
  useMutation: (...args: any[]) => (useMutationMock as any).apply(null, args),
  useCanQuery: () => useCanQueryMock(),
}));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('McpAccessModal', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    useQueryMock.mockReset();
    useMutationMock.mockClear();
    useCanQueryMock.mockClear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('skips the token query while the modal is closed', async () => {
    useQueryMock.mockReturnValue(undefined);

    await act(async () => {
      root.render(
        <McpAccessModal
          isOpen={false}
          onClose={() => {}}
          workosOrgId="org_123"
          canvases={[]}
        />,
      );
    });

    expect(useQueryMock).toHaveBeenCalledTimes(1);
    expect(useQueryMock.mock.calls[0]?.[1]).toBe('skip');
  });

  it('loads tokens when the modal is open and Convex auth is ready', async () => {
    useQueryMock.mockReturnValue([]);

    await act(async () => {
      root.render(
        <McpAccessModal
          isOpen
          onClose={() => {}}
          workosOrgId="org_123"
          canvases={[]}
        />,
      );
    });

    expect(useQueryMock).toHaveBeenCalledTimes(1);
    expect(useQueryMock.mock.calls[0]?.[1]).toEqual({
      workosOrgId: 'org_123',
      includeRevoked: true,
    });
  });
});
