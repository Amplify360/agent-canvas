/**
 * Hook for syncing state with localStorage
 */

import { useState, useCallback, useEffect, useRef, Dispatch, SetStateAction } from 'react';

function readStorageValue<T>(key: string, initialValue: T): T {
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
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const initialValueRef = useRef(initialValue);
  const keyRef = useRef(key);
  if (keyRef.current !== key) {
    keyRef.current = key;
    initialValueRef.current = initialValue;
  }

  // Use initialValue for first render to keep server/client HTML consistent.
  const [storedValue, setStoredValue] = useState<T>(initialValueRef.current);

  useEffect(() => {
    setStoredValue(readStorageValue(key, initialValueRef.current));
  }, [key]);

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
      setStoredValue(readStorageValue(key, initialValueRef.current));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}
