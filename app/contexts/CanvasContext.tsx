/**
 * CanvasContext - Manages canvas list and current canvas state
 */

'use client';

import React, { createContext, useContext, useEffect, useCallback, useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Canvas } from '@/types/canvas';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useQuery, useMutation, useCanQuery } from '@/hooks/useConvex';
import { useStableQuery } from '@/hooks/useStableQuery';
import { useAuth } from './AuthContext';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { readLocalStorageValue } from '@/utils/localStorage';

interface CanvasContextValue {
  canvases: Canvas[];
  currentCanvasId: string | null;
  currentCanvas: Canvas | null;
  phases: string[];  // Canvas-level phase ordering (with defaults)
  categories: string[];  // Canvas-level category ordering (with defaults)
  isLoading: boolean;
  initialCanvasError: 'unavailable' | null;
  setCurrentCanvasId: (canvasId: string | null) => void;
  createCanvas: (title: string, slug: string) => Promise<string>;
  updateCanvas: (canvasId: string, data: Partial<Canvas>) => Promise<void>;
  deleteCanvas: (canvasId: string) => Promise<void>;
  reorderPhases: (phases: string[]) => Promise<void>;
  reorderCategories: (categories: string[]) => Promise<void>;
}

const CanvasContext = createContext<CanvasContextValue | undefined>(undefined);

interface CanvasProviderProps {
  children: React.ReactNode;
  initialCanvasId?: string;
}

export function CanvasProvider({ children, initialCanvasId }: CanvasProviderProps) {
  const pathname = usePathname();
  const { currentOrgId, isInitialized, setCurrentOrgId } = useAuth();
  // Gate Convex queries on auth state to prevent empty results during token refresh
  const { canQuery, isConvexAuthLoading } = useCanQuery();
  const [currentCanvasId, setCurrentCanvasIdState] = useLocalStorage<string | null>(STORAGE_KEYS.CURRENT_CANVAS, null);
  const [initialCanvasError, setInitialCanvasError] = useState<'unavailable' | null>(null);
  const [handledInitialCanvasId, setHandledInitialCanvasId] = useState<string | null>(null);
  const routedCanvasId = useMemo(() => {
    const match = pathname.match(/^\/c\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : undefined;
  }, [pathname]);
  const effectiveInitialCanvasId = initialCanvasId ?? routedCanvasId;
  const shouldResolveInitialCanvas = Boolean(
    effectiveInitialCanvasId && handledInitialCanvasId !== effectiveInitialCanvasId
  );

  // Subscribe to canvases using official Convex hook with stale-data caching
  // Only query if Convex has the token AND has orgId
  const {
    data: canvasesData,
    isLoading: isCanvasesQueryLoading,
    hasLoaded: hasLoadedCanvases,
  } = useStableQuery(
    api.canvases.list,
    canQuery && currentOrgId ? { workosOrgId: currentOrgId } : 'skip',
    currentOrgId,
  );
  const canvases = useMemo(() => canvasesData ?? [], [canvasesData]);

  // Query the initial canvas by ID if provided (for shareable links)
  const initialCanvas = useQuery(
    api.canvases.get,
    canQuery && shouldResolveInitialCanvas && effectiveInitialCanvasId
      ? { canvasId: effectiveInitialCanvasId as Id<"canvases"> }
      : 'skip'
  );

  const createCanvasMutation = useMutation(api.canvases.create);
  const updateCanvasMutation = useMutation(api.canvases.update);
  const deleteCanvasMutation = useMutation(api.canvases.remove);
  const reorderPhasesMutation = useMutation(api.canvases.reorderPhases);
  const reorderCategoriesMutation = useMutation(api.canvases.reorderCategories);

  // Find current canvas
  const currentCanvas = currentCanvasId
    ? canvases.find((c: Canvas) => c._id === currentCanvasId) || null
    : null;

  useEffect(() => {
    if (!effectiveInitialCanvasId) {
      setHandledInitialCanvasId(null);
      setInitialCanvasError(null);
    }
  }, [effectiveInitialCanvasId]);

  // Handle initial canvas from URL (shareable links).
  useEffect(() => {
    if (
      isConvexAuthLoading ||
      !effectiveInitialCanvasId ||
      !shouldResolveInitialCanvas ||
      initialCanvas === undefined
    ) {
      return;
    }

    // Query returned null - canvas not found or no access
    if (initialCanvas === null) {
      setHandledInitialCanvasId(effectiveInitialCanvasId);
      setInitialCanvasError('unavailable');
      return;
    }

    // Canvas found - switch org if needed and select canvas
    const canvasOrgId = initialCanvas.workosOrgId;
    setHandledInitialCanvasId(effectiveInitialCanvasId);
    setInitialCanvasError(null);
    if (currentOrgId !== canvasOrgId) {
      setCurrentOrgId(canvasOrgId);
    }
    setCurrentCanvasIdState(initialCanvas._id);
    // Update URL to reflect the canvas
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/c/${initialCanvas._id}`);
    }
  }, [
    currentOrgId,
    effectiveInitialCanvasId,
    initialCanvas,
    isConvexAuthLoading,
    setCurrentOrgId,
    setCurrentCanvasIdState,
    shouldResolveInitialCanvas,
  ]);

  // Auto-select first canvas if none selected or current canvas was deleted
  // Skip this if we have an initialCanvasId that hasn't been handled yet
  useEffect(() => {
    if (!canQuery || isConvexAuthLoading || !hasLoadedCanvases || shouldResolveInitialCanvas) {
      return; // Wait for initial canvas handling
    }

    if (canvases.length > 0) {
      // If current canvas doesn't exist in the list (was deleted), select first available
      const currentExists = currentCanvasId && canvases.some((c: Canvas) => c._id === currentCanvasId);
      if (!currentExists) {
        const persistedCanvasId = readLocalStorageValue<string | null>(STORAGE_KEYS.CURRENT_CANVAS, null);
        const nextCanvasId = persistedCanvasId && canvases.some((c: Canvas) => c._id === persistedCanvasId)
          ? persistedCanvasId
          : canvases[0]._id;
        setCurrentCanvasIdState(nextCanvasId);
      }
    } else if (currentCanvasId) {
      // No canvases available, clear selection
      setCurrentCanvasIdState(null);
    }
  }, [
    canQuery,
    currentCanvasId,
    canvases,
    hasLoadedCanvases,
    isConvexAuthLoading,
    setCurrentCanvasIdState,
    shouldResolveInitialCanvas,
  ]);

  const setCurrentCanvasId = useCallback((canvasId: string | null) => {
    setCurrentCanvasIdState(canvasId);
  }, [setCurrentCanvasIdState]);

  const createCanvas = useCallback(async (title: string, slug: string) => {
    if (!currentOrgId) throw new Error('No organization selected');
    const canvasId = await createCanvasMutation({
      workosOrgId: currentOrgId,
      title,
      slug,
    });
    return canvasId as string;
  }, [currentOrgId, createCanvasMutation]);

  const updateCanvas = useCallback(async (canvasId: string, data: Partial<Canvas>) => {
    await updateCanvasMutation({ canvasId: canvasId as Id<"canvases">, ...data });
  }, [updateCanvasMutation]);

  const deleteCanvas = useCallback(async (canvasId: string) => {
    await deleteCanvasMutation({ canvasId: canvasId as Id<"canvases">, confirmDelete: true });
  }, [deleteCanvasMutation]);

  const reorderPhases = useCallback(async (phases: string[]) => {
    if (!currentCanvasId) throw new Error('No canvas selected');
    await reorderPhasesMutation({ canvasId: currentCanvasId as Id<"canvases">, phases });
  }, [currentCanvasId, reorderPhasesMutation]);

  const reorderCategories = useCallback(async (categories: string[]) => {
    if (!currentCanvasId) throw new Error('No canvas selected');
    await reorderCategoriesMutation({ canvasId: currentCanvasId as Id<"canvases">, categories });
  }, [currentCanvasId, reorderCategoriesMutation]);

  // Derive phases/categories from current canvas with defaults
  const phases = useMemo(() => currentCanvas?.phases ?? ['Backlog'], [currentCanvas?.phases]);
  const categories = useMemo(() => currentCanvas?.categories ?? ['Uncategorized'], [currentCanvas?.categories]);
  const isLoading =
    !isInitialized ||
    isConvexAuthLoading ||
    (canQuery && !hasLoadedCanvases) ||
    (canQuery && isCanvasesQueryLoading);

  const value = useMemo<CanvasContextValue>(() => ({
    canvases,
    currentCanvasId,
    currentCanvas,
    phases,
    categories,
    isLoading,
    initialCanvasError,
    setCurrentCanvasId,
    createCanvas,
    updateCanvas,
    deleteCanvas,
    reorderPhases,
    reorderCategories,
  }), [
    canvases, currentCanvasId, currentCanvas, phases, categories, isLoading,
    initialCanvasError, setCurrentCanvasId, createCanvas, updateCanvas,
    deleteCanvas, reorderPhases, reorderCategories,
  ]);

  return <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>;
}

export function useCanvas() {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
}
