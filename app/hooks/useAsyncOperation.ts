/**
 * Hook for handling async operations with automatic loading/toast states
 * Eliminates repetitive try-catch-finally boilerplate across components
 */

import { useCallback } from 'react';
import { useAppState } from '@/contexts/AppStateContext';

interface AsyncOperationOptions {
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useAsyncOperation() {
  const { showLoading, hideLoading, showToast } = useAppState();

  const executeOperation = useCallback(
    async <T>(
      operation: () => Promise<T>,
      options: AsyncOperationOptions = {}
    ): Promise<T | undefined> => {
      let didShowLoading = false;

      try {
        if (options.loadingMessage) {
          showLoading(options.loadingMessage);
          didShowLoading = true;
        }

        const result = await operation();

        if (options.successMessage) {
          showToast(options.successMessage, 'success');
        }

        options.onSuccess?.();
        return result;
      } catch (error) {
        console.error('Async operation error:', error);

        const errorMsg = options.errorMessage ||
          (error instanceof Error ? error.message : 'Operation failed');
        showToast(errorMsg, 'error');

        options.onError?.(error as Error);
        return undefined;
      } finally {
        if (didShowLoading) {
          hideLoading();
        }
      }
    },
    [showLoading, hideLoading, showToast]
  );

  return executeOperation;
}
