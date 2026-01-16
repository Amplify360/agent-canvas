/**
 * Factory utility for creating React context with custom hook
 * Eliminates boilerplate code across context providers
 */

import { createContext, useContext } from 'react';

/**
 * Creates a context and associated hook with proper error handling
 * @param displayName - Name used in error messages (e.g., 'useAuth')
 * @returns Tuple of [Context, useHook function]
 *
 * @example
 * const [AuthContext, useAuth] = createContextHook<AuthValue>('useAuth');
 *
 * export function AuthProvider({ children }: { children: React.ReactNode }) {
 *   const value = { ... };
 *   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
 * }
 *
 * export { useAuth };
 */
export function createContextHook<T>(
  displayName: string
): [React.Context<T | undefined>, () => T] {
  const Context = createContext<T | undefined>(undefined);
  Context.displayName = displayName;

  function useHook(): T {
    const ctx = useContext(Context);
    if (ctx === undefined) {
      throw new Error(
        `${displayName} must be used within a ${displayName.replace('use', '')}Provider`
      );
    }
    return ctx;
  }

  return [Context, useHook];
}
