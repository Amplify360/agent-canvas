/**
 * Hook for managing agent feedback (votes and comments)
 * Used by QuickLookPanel for individual agent interactions
 */

'use client';

import { useQuery, useMutation } from './useConvex';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useCallback } from 'react';
import { useCurrentUser } from '@/contexts/AuthContext';

interface UseAgentFeedbackOptions {
  agentId: Id<"agents"> | undefined;
}

export function useAgentFeedback({ agentId }: UseAgentFeedbackOptions) {
  // Get current user for email (used for comments)
  const currentUser = useCurrentUser();

  // Queries - skip when no agentId
  const voteCounts = useQuery(
    api.agentVotes.getVoteCounts,
    agentId ? { agentId } : "skip"
  );
  const userVote = useQuery(
    api.agentVotes.getUserVote,
    agentId ? { agentId } : "skip"
  );
  const comments = useQuery(
    api.agentComments.list,
    agentId ? { agentId } : "skip"
  );

  // Vote mutations
  const voteMutation = useMutation(api.agentVotes.vote);
  const removeVoteMutation = useMutation(api.agentVotes.removeVote);

  // Comment mutations
  const createCommentMutation = useMutation(api.agentComments.create);
  const updateCommentMutation = useMutation(api.agentComments.update);
  const removeCommentMutation = useMutation(api.agentComments.remove);

  // Vote actions
  const handleVote = useCallback(
    async (voteType: "up" | "down") => {
      if (!agentId) return;
      const id = agentId; // TypeScript narrowing
      // Toggle behavior: clicking same vote removes it
      if (userVote === voteType) {
        await removeVoteMutation({ agentId: id });
      } else {
        await voteMutation({ agentId: id, vote: voteType });
      }
    },
    [agentId, userVote, voteMutation, removeVoteMutation]
  );

  // Comment actions
  const addComment = useCallback(
    async (content: string) => {
      if (!agentId) return;
      const id = agentId; // TypeScript narrowing
      // Pass user email from frontend (WorkOS access tokens may not include email)
      await createCommentMutation({
        agentId: id,
        content,
        userEmail: currentUser?.email || undefined,
      });
    },
    [agentId, createCommentMutation, currentUser?.email]
  );

  const editComment = useCallback(
    async (commentId: Id<"agentComments">, content: string) => {
      await updateCommentMutation({ commentId, content });
    },
    [updateCommentMutation]
  );

  const deleteComment = useCallback(
    async (commentId: Id<"agentComments">) => {
      await removeCommentMutation({ commentId });
    },
    [removeCommentMutation]
  );

  return {
    // Vote state
    voteCounts,
    userVote,
    handleVote,

    // Comments state
    comments,
    addComment,
    editComment,
    deleteComment,

    // Loading states
    isLoading: voteCounts === undefined || comments === undefined,
  };
}
