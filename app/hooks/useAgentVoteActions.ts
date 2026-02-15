/**
 * Mutations for agent votes without per-agent query subscriptions.
 */

'use client';

import { useCallback } from 'react';
import { useMutation } from '@/hooks/useConvex';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { VoteType } from '@/types/validationConstants';
import { useAppState } from '@/contexts/AppStateContext';

export function useAgentVoteActions(agentId: Id<'agents'>) {
  const { showToast } = useAppState();
  const voteMutation = useMutation(api.agentVotes.vote);
  const removeVoteMutation = useMutation(api.agentVotes.removeVote);

  const toggleVote = useCallback(
    async (nextVote: VoteType, currentVote: VoteType | null | undefined) => {
      try {
        if (currentVote === nextVote) {
          await removeVoteMutation({ agentId });
        } else {
          await voteMutation({ agentId, vote: nextVote });
        }
      } catch (error) {
        console.error('Vote error:', error);
        showToast('Failed to update vote', 'error');
      }
    },
    [agentId, voteMutation, removeVoteMutation, showToast]
  );

  return { toggleVote };
}
