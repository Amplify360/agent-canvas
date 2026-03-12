// @vitest-environment jsdom

import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MembersWidget } from '@/components/org/MembersWidget';

const useWidgetTokenMock = vi.fn((..._args: any[]) => ({
  token: null,
  loading: false,
  error: null,
  refetch: vi.fn(),
}));

vi.mock('@/hooks/useWidgetToken', () => ({
  useWidgetToken: (orgId: string | null, options: { scopes: string[] }) => useWidgetTokenMock(orgId, options),
}));

vi.mock('@workos-inc/widgets', () => ({
  UsersManagement: () => null,
}));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('MembersWidget', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    useWidgetTokenMock.mockClear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('does not request a widget token while closed', async () => {
    await act(async () => {
      root.render(
        <MembersWidget
          isOpen={false}
          onClose={() => {}}
          orgId="org_123"
        />,
      );
    });

    expect(useWidgetTokenMock).toHaveBeenCalledWith(null, {
      scopes: ['widgets:users-table:manage'],
    });
  });

  it('requests a widget token for the org when opened', async () => {
    await act(async () => {
      root.render(
        <MembersWidget
          isOpen
          onClose={() => {}}
          orgId="org_123"
        />,
      );
    });

    expect(useWidgetTokenMock).toHaveBeenCalledWith('org_123', {
      scopes: ['widgets:users-table:manage'],
    });
  });
});
