/**
 * Canvas-scoped feedback queries (votes + comment counts).
 *
 * This avoids per-AgentCard query fanout by using Convex batch queries.
 */

'use client';

import type { Id } from '../../convex/_generated/dataModel';
import { useCanQuery } from '@/hooks/useConvex';
import { useStableQuery } from '@/hooks/useStableQuery';
import { api } from '../../convex/_generated/api';
import type { VoteType } from '@/types/validationConstants';

export function useCanvasFeedback(canvasId: Id<'canvases'> | null) {
  const { canQuery } = useCanQuery();

  const { data: voteCountsByAgent = {}, hasLoaded: hasLoadedVoteCounts } = useStableQuery(
    api.agentVotes.getVoteCountsForCanvas,
    canQuery && canvasId ? { canvasId } : 'skip',
    canvasId,
  );

  const { data: userVotesByAgent = {}, hasLoaded: hasLoadedUserVotes } = useStableQuery(
    api.agentVotes.getUserVotesForCanvas,
    canQuery && canvasId ? { canvasId } : 'skip',
    canvasId,
  );

  const { data: commentCountsByAgent = {}, hasLoaded: hasLoadedCommentCounts } = useStableQuery(
    api.agentComments.getCommentCountsForCanvas,
    canQuery && canvasId ? { canvasId } : 'skip',
    canvasId,
  );

  return {
    voteCountsByAgent: voteCountsByAgent as Record<string, { up: number; down: number }>,
    userVotesByAgent: userVotesByAgent as Record<string, VoteType>,
    commentCountsByAgent: commentCountsByAgent as Record<string, number>,
    isLoading: !(hasLoadedVoteCounts && hasLoadedUserVotes && hasLoadedCommentCounts),
  };
}

