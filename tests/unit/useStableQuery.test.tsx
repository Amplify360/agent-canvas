// @vitest-environment jsdom

import React, { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStableQuery } from '@/hooks/useStableQuery';

const useQueryMock = vi.fn();

vi.mock('@/hooks/useConvex', () => ({
  useQuery: (...args: any[]) => useQueryMock(...args),
}));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function Probe({
  args,
  resetKey,
  onStateChange,
}: {
  args: unknown;
  resetKey?: unknown;
  onStateChange: (state: {
    data: unknown;
    hasLoaded: boolean;
    isLoading: boolean;
  }) => void;
}) {
  const state = useStableQuery({} as never, args as never, resetKey);

  useEffect(() => {
    onStateChange(state);
  }, [onStateChange, state]);

  return null;
}

describe('useStableQuery', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    useQueryMock.mockReset();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('does not report loading while the query is skipped', async () => {
    const states: Array<{ data: unknown; hasLoaded: boolean; isLoading: boolean }> = [];

    useQueryMock.mockReturnValue(undefined);

    await act(async () => {
      root.render(
        <Probe
          args="skip"
          resetKey={null}
          onStateChange={(state) => {
            states.push(state);
          }}
        />,
      );
    });

    expect(states.at(-1)).toEqual({
      data: undefined,
      hasLoaded: false,
      isLoading: false,
    });
  });

  it('starts loading again when a skipped query becomes active', async () => {
    const states: Array<{ data: unknown; hasLoaded: boolean; isLoading: boolean }> = [];

    useQueryMock.mockReturnValue(undefined);

    await act(async () => {
      root.render(
        <Probe
          args="skip"
          resetKey="canvas-1"
          onStateChange={(state) => {
            states.push(state);
          }}
        />,
      );
    });

    await act(async () => {
      root.render(
        <Probe
          args={{ canvasId: 'canvas-1' }}
          resetKey="canvas-1"
          onStateChange={(state) => {
            states.push(state);
          }}
        />,
      );
    });

    expect(states.at(-1)).toEqual({
      data: undefined,
      hasLoaded: false,
      isLoading: true,
    });
  });
});
