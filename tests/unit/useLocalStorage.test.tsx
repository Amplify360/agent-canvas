// @vitest-environment jsdom

import React, { useEffect } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useLocalStorage } from '@/hooks/useLocalStorage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function Probe({
  storageKey,
  initialValue,
  onStateChange,
}: {
  storageKey: string;
  initialValue: string | null;
  onStateChange: (value: string | null) => void;
}) {
  const [value] = useLocalStorage(storageKey, initialValue);

  useEffect(() => {
    onStateChange(value);
  }, [onStateChange, value]);

  return null;
}

describe('useLocalStorage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('hydrates the stored value on the first client mount', async () => {
    const states: Array<string | null> = [];
    window.localStorage.setItem('test-key', JSON.stringify('persisted-org'));

    await act(async () => {
      root.render(
        <Probe
          storageKey="test-key"
          initialValue={null}
          onStateChange={(value) => {
            states.push(value);
          }}
        />,
      );
    });

    expect(states.at(-1)).toBe('persisted-org');
  });
});
