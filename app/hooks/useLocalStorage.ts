/**
 * Hook for syncing state with localStorage
 */

import { useState, useCallback, Dispatch, SetStateAction } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error loading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

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

  return [storedValue, setValue];
}
