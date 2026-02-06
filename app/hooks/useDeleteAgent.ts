/**
 * Hook for deleting an agent with confirmation dialog and toast feedback.
 * Shared between AgentGrid and AppLayout (QuickLook panel) to avoid
 * duplicating the confirm + delete + loading/success/error pattern.
 */

import { useCallback } from 'react';
import { useAgents } from '@/contexts/AgentContext';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { Id } from '../../convex/_generated/dataModel';

export function useDeleteAgent() {
  const { deleteAgent } = useAgents();
  const executeOperation = useAsyncOperation();

  const confirmAndDelete = useCallback(
    async (agentId: Id<"agents">, agentName: string): Promise<boolean> => {
      if (!window.confirm(`Are you sure you want to delete "${agentName}"?`)) {
        return false;
      }

      await executeOperation(
        () => deleteAgent(agentId),
        {
          loadingMessage: 'Deleting agent...',
          successMessage: 'Agent deleted successfully',
          errorMessage: 'Failed to delete agent',
        }
      );

      return true;
    },
    [deleteAgent, executeOperation]
  );

  return confirmAndDelete;
}
