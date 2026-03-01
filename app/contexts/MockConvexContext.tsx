/**
 * MockConvexProvider - In-memory Convex mock for E2E tests.
 *
 * This is intentionally minimal and only implements the Convex functions
 * the UI uses. It lets Playwright exercise the happy path without needing
 * real Convex or WorkOS credentials.
 */

'use client';

import React, { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Canvas } from '@/types/canvas';
import type { Agent } from '@/types/agent';
import type { VoteType } from '@/types/validationConstants';
import { getAgentCategory } from '@/utils/agentModel';

type MockOrgMembership = {
  orgId: string;
  orgName: string;
  role: string;
};

type MockVote = {
  _id: string;
  agentId: string;
  workosUserId: string;
  vote: VoteType;
  createdAt: number;
  updatedAt: number;
};

type MockComment = {
  _id: string;
  agentId: string;
  workosUserId: string;
  userEmail: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
};

export type MockConvexState = {
  canvases: Canvas[];
  agents: Agent[];
  memberships: MockOrgMembership[];
  votes: MockVote[];
  comments: MockComment[];
};

type MockConvexContextValue = {
  currentUserId: string;
  currentUserEmail: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  // Function name is the Convex function handle, e.g. "agents:list"
  query: (functionName: string, args: unknown) => unknown;
  mutation: (functionName: string, args: unknown) => Promise<unknown>;
  action: (functionName: string, args: unknown) => Promise<unknown>;
};

const MockConvexContext = createContext<MockConvexContextValue | null>(null);

export function useMockConvex() {
  return useContext(MockConvexContext);
}

function byString(a: string, b: string) {
  return a.toLowerCase().localeCompare(b.toLowerCase());
}

function safeString(value: unknown): string {
  if (typeof value === 'string') return value;
  return '';
}

function nowMs() {
  return Date.now();
}

export function MockConvexProvider({
  children,
  currentUserId,
  currentUserEmail,
  initialState,
}: {
  children: ReactNode;
  currentUserId: string;
  currentUserEmail: string;
  initialState: MockConvexState;
}) {
  const [state, setState] = useState<MockConvexState>(initialState);

  // Synchronous ID generators (state updates are async in React, so keep counters in refs).
  const countersRef = useRef({
    canvas: initialState.canvases.length + 1,
    agent: initialState.agents.length + 1,
    vote: initialState.votes.length + 1,
    comment: initialState.comments.length + 1,
    storage: 1,
  });

  const nextId = (kind: keyof typeof countersRef.current) => {
    const n = countersRef.current[kind]++;
    return `e2e_${kind}_${n}`;
  };

  const query = (functionName: string, args: unknown) => {
    switch (functionName) {
      case 'orgMemberships:listMyMemberships': {
        return state.memberships.map((m) => ({
          orgId: m.orgId,
          orgName: m.orgName,
          role: m.role,
        }));
      }

      case 'canvases:list': {
        const { workosOrgId } = (args ?? {}) as { workosOrgId?: string };
        if (!workosOrgId) return [];
        return state.canvases.filter((c) => c.workosOrgId === workosOrgId && !c.deletedAt);
      }

      case 'canvases:get': {
        const { canvasId } = (args ?? {}) as { canvasId?: string };
        if (!canvasId) return null;
        const canvas = state.canvases.find((c) => c._id === canvasId);
        if (!canvas || canvas.deletedAt) return null;
        return canvas;
      }

      case 'agents:list': {
        const { canvasId } = (args ?? {}) as { canvasId?: string };
        if (!canvasId) return [];
        const agents = state.agents
          .filter((a) => a.canvasId === canvasId && !a.deletedAt)
          .slice()
          .sort((a, b) => (a.agentOrder ?? 0) - (b.agentOrder ?? 0));
        return agents;
      }

      case 'agents:getDistinctCategories': {
        const { workosOrgId } = (args ?? {}) as { workosOrgId?: string };
        if (!workosOrgId) return [];
        const canvasIds = new Set(
          state.canvases
            .filter((c) => c.workosOrgId === workosOrgId && !c.deletedAt)
            .map((c) => String(c._id))
        );
        const categories = new Set<string>();
        for (const agent of state.agents) {
          if (!canvasIds.has(String(agent.canvasId))) continue;
          if (agent.deletedAt) continue;
          const category = safeString(getAgentCategory(agent)).trim();
          if (category) categories.add(category);
        }
        return Array.from(categories).sort(byString);
      }

      case 'agentVotes:getVoteCountsForCanvas': {
        const { canvasId } = (args ?? {}) as { canvasId?: string };
        if (!canvasId) return {};
        const agentIds = state.agents
          .filter((a) => a.canvasId === canvasId && !a.deletedAt)
          .map((a) => a._id);
        const result: Record<string, { up: number; down: number }> = {};
        for (const id of agentIds) {
          result[id] = { up: 0, down: 0 };
        }
        for (const vote of state.votes) {
          if (!result[vote.agentId]) continue;
          if (vote.vote === 'up') result[vote.agentId].up += 1;
          if (vote.vote === 'down') result[vote.agentId].down += 1;
        }
        return result;
      }

      case 'agentVotes:getUserVotesForCanvas': {
        const { canvasId } = (args ?? {}) as { canvasId?: string };
        if (!canvasId) return {};
        const agentIds = new Set(
          state.agents
            .filter((a) => String(a.canvasId) === canvasId && !a.deletedAt)
            .map((a) => String(a._id))
        );
        const result: Record<string, VoteType> = {};
        for (const vote of state.votes) {
          if (vote.workosUserId !== currentUserId) continue;
          if (!agentIds.has(String(vote.agentId))) continue;
          result[vote.agentId] = vote.vote;
        }
        return result;
      }

      case 'agentComments:getCommentCountsForCanvas': {
        const { canvasId } = (args ?? {}) as { canvasId?: string };
        if (!canvasId) return {};
        const agentIds = new Set(
          state.agents
            .filter((a) => String(a.canvasId) === canvasId && !a.deletedAt)
            .map((a) => String(a._id))
        );
        const result: Record<string, number> = {};
        for (const id of agentIds) result[id] = 0;
        for (const comment of state.comments) {
          if (comment.deletedAt) continue;
          if (!agentIds.has(String(comment.agentId))) continue;
          result[comment.agentId] = (result[comment.agentId] ?? 0) + 1;
        }
        return result;
      }

      case 'agentVotes:getVoteCounts': {
        const { agentId } = (args ?? {}) as { agentId?: string };
        if (!agentId) return { up: 0, down: 0 };
        let up = 0;
        let down = 0;
        for (const vote of state.votes) {
          if (vote.agentId !== agentId) continue;
          if (vote.vote === 'up') up += 1;
          if (vote.vote === 'down') down += 1;
        }
        return { up, down };
      }

      case 'agentVotes:getUserVote': {
        const { agentId } = (args ?? {}) as { agentId?: string };
        if (!agentId) return null;
        const existing = state.votes.find((v) => v.agentId === agentId && v.workosUserId === currentUserId);
        return existing?.vote ?? null;
      }

      case 'agentComments:list': {
        const { agentId } = (args ?? {}) as { agentId?: string };
        if (!agentId) return [];
        return state.comments
          .filter((c) => c.agentId === agentId && !c.deletedAt)
          .slice()
          .sort((a, b) => b.createdAt - a.createdAt)
          .map((c) => ({
            ...c,
            isOwner: c.workosUserId === currentUserId,
          }));
      }

      case 'files:getUrl': {
        const { storageId } = (args ?? {}) as { storageId?: string };
        if (!storageId) return null;
        // Not a real Convex URL, but sufficient for UI rendering/tests.
        return `https://example.invalid/convex-storage/${storageId}`;
      }

      default: {
        throw new Error(`[MockConvex] Unhandled query: ${functionName}`);
      }
    }
  };

  const mutation = async (functionName: string, args: unknown) => {
    switch (functionName) {
      case 'canvases:create': {
        const { workosOrgId, title, slug, phases, categories } = (args ?? {}) as {
          workosOrgId?: string;
          title?: string;
          slug?: string;
          phases?: string[];
          categories?: string[];
        };
        if (!workosOrgId || !title || !slug) {
          throw new Error('[MockConvex] canvases:create missing required fields');
        }
        const id = nextId('canvas');
        const now = nowMs();
        const canvas: Canvas = {
          _id: id as any,
          _creationTime: now,
          workosOrgId,
          title,
          slug,
          phases: phases ?? ['Backlog'],
          categories: categories ?? ['Uncategorized'],
          createdBy: currentUserId,
          updatedBy: currentUserId,
          createdAt: now,
          updatedAt: now,
        };
        setState((prev) => ({
          ...prev,
          canvases: [...prev.canvases, canvas],
        }));
        return id;
      }

      case 'canvases:update': {
        const { canvasId, ...updates } = (args ?? {}) as Record<string, unknown> & { canvasId?: string };
        if (!canvasId) throw new Error('[MockConvex] canvases:update missing canvasId');
        const now = nowMs();
        setState((prev) => ({
          ...prev,
          canvases: prev.canvases.map((c) =>
            c._id === canvasId
              ? ({
                  ...c,
                  ...updates,
                  updatedBy: currentUserId,
                  updatedAt: now,
                } as Canvas)
              : c
          ),
        }));
        return null;
      }

      case 'canvases:reorderPhases': {
        const { canvasId, phases } = (args ?? {}) as { canvasId?: string; phases?: string[] };
        if (!canvasId || !phases) throw new Error('[MockConvex] canvases:reorderPhases missing fields');
        const now = nowMs();
        setState((prev) => ({
          ...prev,
          canvases: prev.canvases.map((c) =>
            c._id === canvasId
              ? ({
                  ...c,
                  phases,
                  updatedBy: currentUserId,
                  updatedAt: now,
                } as Canvas)
              : c
          ),
        }));
        return null;
      }

      case 'canvases:reorderCategories': {
        const { canvasId, categories } = (args ?? {}) as { canvasId?: string; categories?: string[] };
        if (!canvasId || !categories) throw new Error('[MockConvex] canvases:reorderCategories missing fields');
        const now = nowMs();
        setState((prev) => ({
          ...prev,
          canvases: prev.canvases.map((c) =>
            c._id === canvasId
              ? ({
                  ...c,
                  categories,
                  updatedBy: currentUserId,
                  updatedAt: now,
                } as Canvas)
              : c
          ),
        }));
        return null;
      }

      case 'canvases:remove': {
        const { canvasId } = (args ?? {}) as { canvasId?: string };
        if (!canvasId) throw new Error('[MockConvex] canvases:remove missing canvasId');
        const now = nowMs();
        setState((prev) => ({
          ...prev,
          canvases: prev.canvases.map((c) =>
            c._id === canvasId
              ? ({
                  ...c,
                  deletedAt: now,
                  updatedBy: currentUserId,
                  updatedAt: now,
                } as Canvas)
              : c
          ),
          agents: prev.agents.map((a) =>
            a.canvasId === canvasId
              ? ({
                  ...a,
                  deletedAt: now,
                  updatedBy: currentUserId,
                  updatedAt: now,
                } as Agent)
              : a
          ),
        }));
        return null;
      }

      case 'canvases:copyToOrgs': {
        const { sourceCanvasId, targetOrgIds, newTitle } = (args ?? {}) as {
          sourceCanvasId?: string;
          targetOrgIds?: string[];
          newTitle?: string;
        };
        if (!sourceCanvasId || !Array.isArray(targetOrgIds) || !newTitle) {
          throw new Error('[MockConvex] canvases:copyToOrgs missing fields');
        }
        const sourceCanvas = state.canvases.find((c) => c._id === sourceCanvasId && !c.deletedAt);
        if (!sourceCanvas) throw new Error('[MockConvex] Source canvas not found');

        const now = nowMs();
        const results: Array<{ orgId: string; canvasId: string; slug: string }> = [];
        const sourceAgents = state.agents.filter((a) => a.canvasId === sourceCanvasId && !a.deletedAt);

        setState((prev) => {
          const nextCanvases = [...prev.canvases];
          const nextAgents = [...prev.agents];

          for (const orgId of targetOrgIds) {
            const newCanvasId = nextId('canvas');
            const slug = `${sourceCanvas.slug}-copy-${orgId}`.toLowerCase();
            nextCanvases.push({
              ...sourceCanvas,
              _id: newCanvasId as any,
              _creationTime: now,
              workosOrgId: orgId,
              title: newTitle,
              slug,
              deletedAt: undefined,
              createdBy: currentUserId,
              updatedBy: currentUserId,
              createdAt: now,
              updatedAt: now,
            } as Canvas);

            for (const agent of sourceAgents) {
              const newAgentId = nextId('agent');
              nextAgents.push({
                ...agent,
                _id: newAgentId as any,
                _creationTime: now,
                canvasId: newCanvasId as any,
                deletedAt: undefined,
                createdBy: currentUserId,
                updatedBy: currentUserId,
                createdAt: now,
                updatedAt: now,
              } as Agent);
            }

            results.push({ orgId, canvasId: newCanvasId, slug });
          }

          return { ...prev, canvases: nextCanvases, agents: nextAgents };
        });

        return { success: true, results };
      }

      case 'agents:create': {
        const { canvasId, ...agentInput } = (args ?? {}) as Record<string, unknown> & { canvasId?: string };
        if (!canvasId) throw new Error('[MockConvex] agents:create missing canvasId');
        const id = nextId('agent');
        const now = nowMs();
        const agent: Agent = {
          _id: id as any,
          _creationTime: now,
          canvasId: canvasId as any,
          phase: safeString(agentInput.phase) || 'Backlog',
          agentOrder: typeof agentInput.agentOrder === 'number' ? agentInput.agentOrder : 0,
          name: safeString(agentInput.name) || 'Untitled Agent',
          objective: safeString(agentInput.objective) || undefined,
          description: safeString(agentInput.description) || undefined,
          tools: Array.isArray(agentInput.tools) ? (agentInput.tools as string[]) : [],
          journeySteps: Array.isArray(agentInput.journeySteps) ? (agentInput.journeySteps as string[]) : [],
          demoLink: safeString(agentInput.demoLink) || undefined,
          videoLink: safeString(agentInput.videoLink) || undefined,
          metrics: (agentInput.metrics as any) ?? {},
          category: safeString(agentInput.category) || undefined,
          status: (agentInput.status as any) ?? undefined,
          createdBy: currentUserId,
          updatedBy: currentUserId,
          createdAt: now,
          updatedAt: now,
        };
        setState((prev) => ({
          ...prev,
          agents: [...prev.agents, agent],
        }));
        return id;
      }

      case 'agents:update': {
        const { agentId, ...updates } = (args ?? {}) as Record<string, unknown> & { agentId?: string };
        if (!agentId) throw new Error('[MockConvex] agents:update missing agentId');
        const now = nowMs();
        setState((prev) => ({
          ...prev,
          agents: prev.agents.map((a) =>
            a._id === agentId
              ? ({
                  ...a,
                  ...updates,
                  updatedBy: currentUserId,
                  updatedAt: now,
                } as Agent)
              : a
          ),
        }));
        return null;
      }

      case 'agents:remove': {
        const { agentId } = (args ?? {}) as { agentId?: string };
        if (!agentId) throw new Error('[MockConvex] agents:remove missing agentId');
        const now = nowMs();
        setState((prev) => ({
          ...prev,
          agents: prev.agents.map((a) =>
            a._id === agentId
              ? ({
                  ...a,
                  deletedAt: now,
                  updatedBy: currentUserId,
                  updatedAt: now,
                } as Agent)
              : a
          ),
        }));
        return null;
      }

      case 'agents:bulkCreate': {
        const { canvasId, agents } = (args ?? {}) as { canvasId?: string; agents?: any[] };
        if (!canvasId || !Array.isArray(agents)) throw new Error('[MockConvex] agents:bulkCreate missing fields');

        const now = nowMs();
        const createdIds: string[] = [];

        setState((prev) => {
          const nextAgents = [...prev.agents];
          const nextCanvases = [...prev.canvases];

          const canvas = nextCanvases.find((c) => c._id === canvasId);
          const phases = new Set(canvas?.phases ?? ['Backlog']);
          const categories = new Set(canvas?.categories ?? ['Uncategorized']);

          for (const agentInput of agents) {
            const id = nextId('agent');
            createdIds.push(id);
            const phase = safeString(agentInput.phase) || 'Backlog';
            phases.add(phase);
            const category = safeString(agentInput.category).trim();
            if (category) categories.add(category);

            nextAgents.push({
              _id: id as any,
              _creationTime: now,
              canvasId: canvasId as any,
              phase,
              agentOrder: typeof agentInput.agentOrder === 'number' ? agentInput.agentOrder : 0,
              name: safeString(agentInput.name) || 'Untitled Agent',
              objective: safeString(agentInput.objective) || undefined,
              description: safeString(agentInput.description) || undefined,
              tools: Array.isArray(agentInput.tools) ? agentInput.tools : [],
              journeySteps: Array.isArray(agentInput.journeySteps) ? agentInput.journeySteps : [],
              demoLink: safeString(agentInput.demoLink) || undefined,
              videoLink: safeString(agentInput.videoLink) || undefined,
              metrics: agentInput.metrics ?? {},
              category: category || undefined,
              status: agentInput.status ?? undefined,
              createdBy: currentUserId,
              updatedBy: currentUserId,
              createdAt: now,
              updatedAt: now,
            } as Agent);
          }

          // Backfill canvas ordering lists for UI.
          if (canvas) {
            Object.assign(canvas, {
              phases: Array.from(phases),
              categories: Array.from(categories),
              updatedBy: currentUserId,
              updatedAt: now,
            });
          }

          return { ...prev, agents: nextAgents, canvases: nextCanvases };
        });

        return createdIds;
      }

      case 'agentVotes:vote': {
        const { agentId, vote } = (args ?? {}) as { agentId?: string; vote?: VoteType };
        if (!agentId || (vote !== 'up' && vote !== 'down')) {
          throw new Error('[MockConvex] agentVotes:vote missing fields');
        }
        const now = nowMs();
        setState((prev) => {
          const existing = prev.votes.find((v) => v.agentId === agentId && v.workosUserId === currentUserId);
          if (existing) {
            return {
              ...prev,
              votes: prev.votes.map((v) =>
                v._id === existing._id ? { ...v, vote, updatedAt: now } : v
              ),
            };
          }
          return {
            ...prev,
            votes: [
              ...prev.votes,
              {
                _id: nextId('vote'),
                agentId,
                workosUserId: currentUserId,
                vote,
                createdAt: now,
                updatedAt: now,
              },
            ],
          };
        });
        return null;
      }

      case 'agentVotes:removeVote': {
        const { agentId } = (args ?? {}) as { agentId?: string };
        if (!agentId) throw new Error('[MockConvex] agentVotes:removeVote missing agentId');
        setState((prev) => ({
          ...prev,
          votes: prev.votes.filter((v) => !(v.agentId === agentId && v.workosUserId === currentUserId)),
        }));
        return null;
      }

      case 'agentComments:create': {
        const { agentId, content, userEmail } = (args ?? {}) as { agentId?: string; content?: string; userEmail?: string };
        const trimmed = safeString(content).trim();
        if (!agentId || !trimmed) throw new Error('[MockConvex] agentComments:create missing fields');
        const id = nextId('comment');
        const now = nowMs();
        const email = safeString(userEmail).trim() || currentUserEmail;
        setState((prev) => ({
          ...prev,
          comments: [
            ...prev.comments,
            {
              _id: id,
              agentId,
              workosUserId: currentUserId,
              userEmail: email,
              content: trimmed,
              createdAt: now,
              updatedAt: now,
            },
          ],
        }));
        return id;
      }

      case 'agentComments:update': {
        const { commentId, content } = (args ?? {}) as { commentId?: string; content?: string };
        const trimmed = safeString(content).trim();
        if (!commentId || !trimmed) throw new Error('[MockConvex] agentComments:update missing fields');
        const now = nowMs();
        setState((prev) => ({
          ...prev,
          comments: prev.comments.map((c) =>
            c._id === commentId ? { ...c, content: trimmed, updatedAt: now } : c
          ),
        }));
        return null;
      }

      case 'agentComments:remove': {
        const { commentId } = (args ?? {}) as { commentId?: string };
        if (!commentId) throw new Error('[MockConvex] agentComments:remove missing commentId');
        const now = nowMs();
        setState((prev) => ({
          ...prev,
          comments: prev.comments.map((c) =>
            c._id === commentId ? { ...c, deletedAt: now } : c
          ),
        }));
        return null;
      }

      case 'files:generateUploadUrl': {
        // Not used in E2E tests, but keep FeedbackModal functional.
        const id = nextId('storage');
        return `https://example.invalid/upload/${id}`;
      }

      default: {
        throw new Error(`[MockConvex] Unhandled mutation: ${functionName}`);
      }
    }
  };

  const action = async (functionName: string, args: unknown) => {
    switch (functionName) {
      case 'orgMemberships:syncMyMemberships': {
        return { added: 0, updated: 0, removed: 0, errors: [] as string[] };
      }
      default: {
        throw new Error(`[MockConvex] Unhandled action: ${functionName}`);
      }
    }
  };

  const value = useMemo<MockConvexContextValue>(
    () => ({
      currentUserId,
      currentUserEmail,
      isAuthenticated: true,
      isLoading: false,
      query,
      mutation,
      action,
    }),
    // query/mutation/action are derived from current state and can change per render.
    // That's fine for E2E and keeps the implementation straightforward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUserId, currentUserEmail, state],
  );

  return (
    <MockConvexContext.Provider value={value}>
      {children}
    </MockConvexContext.Provider>
  );
}
