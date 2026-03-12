/**
 * Hook for syncing state with localStorage
 */

import { useState, useCallback, useEffect, Dispatch, SetStateAction } from 'react';
import { readLocalStorageValue } from '@/utils/localStorage';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const [keyState, setKeyState] = useState(() => ({
    key,
    initialValue,
  }));

  // Use initialValue for first render to keep server/client HTML consistent.
  const [storedValue, setStoredValue] = useState<T>(keyState.initialValue);

  useEffect(() => {
    if (keyState.key === key) {
      return;
    }

    setKeyState({ key, initialValue });
  }, [initialValue, key, keyState.key]);

  useEffect(() => {
    setStoredValue(readLocalStorageValue(keyState.key, keyState.initialValue));
  }, [keyState.initialValue, keyState.key]);

  const setValue: Dispatch<SetStateAction<T>> = useCallback((value) => {
    setStoredValue((currentValue) => {
      try {
        // Support functional updates like useState
        const valueToStore = value instanceof Function ? value(currentValue) : value;
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
        return valueToStore;
      } catch (error) {
        console.warn(`Error saving localStorage key "${key}":`, error);
        return currentValue;
      }
    });
  }, [key]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== key) {
        return;
      }
      setStoredValue(readLocalStorageValue(key, keyState.initialValue));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, keyState.initialValue]);

  return [storedValue, setValue];
}
