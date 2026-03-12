'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  createStructuredAssistSelection,
  filterStructuredAssistPatch,
  getStructuredAssistDiff,
  type StructuredAssistFieldConfig,
  type StructuredAssistResult,
} from '@/ai/formAssist';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';

interface UseStructuredFormAssistOptions<T extends Record<string, any>, Field extends string, RequestBody> {
  storageKey: string;
  defaultPrompt: string;
  modelFallback: string;
  current: T;
  fields: ReadonlyArray<StructuredAssistFieldConfig<T, Field>>;
  buildRequest: (notes: string, prompt: string) => RequestBody;
  onApplyPatch: (patch: Partial<T>) => void;
  requestEndpoint: string;
  transcribeEndpoint?: string;
  onToast: (message: string, type: 'success' | 'info' | 'error') => void;
  enabled: boolean;
}

export function useStructuredFormAssist<T extends Record<string, any>, Field extends string, RequestBody>({
  storageKey,
  defaultPrompt,
  modelFallback,
  current,
  fields,
  buildRequest,
  onApplyPatch,
  requestEndpoint,
  transcribeEndpoint,
  onToast,
  enabled,
}: UseStructuredFormAssistOptions<T, Field, RequestBody>) {
  const [prompt, setPrompt] = useLocalStorage(storageKey, defaultPrompt);
  const [isAssistOpen, setIsAssistOpen] = useState(false);
  const [isAdvancedPromptOpen, setIsAdvancedPromptOpen] = useState(false);
  const [assistNotes, setAssistNotes] = useState('');
  const [fillEmptyOnly, setFillEmptyOnly] = useState(false);
  const [assistError, setAssistError] = useState<string | null>(null);
  const [isGeneratingAssist, setIsGeneratingAssist] = useState(false);
  const [assistResult, setAssistResult] = useState<StructuredAssistResult<T, Field> | null>(null);
  const [selectedPatchFields, setSelectedPatchFields] = useState<Record<Field, boolean>>(
    createStructuredAssistSelection({}, fields)
  );

  const {
    isRecording,
    isTranscribing,
    toggleRecording,
    cleanup,
  } = useAudioTranscription({
    endpoint: transcribeEndpoint,
    onTranscript: (transcript) => {
      setAssistNotes((currentNotes) => currentNotes.trim()
        ? `${currentNotes.trim()}\n\n${transcript}`.trim()
        : transcript);
      onToast('Transcript added to notes', 'success');
    },
    onError: (message) => setAssistError(message),
  });
  const cleanupRef = useRef(cleanup);
  const fieldsRef = useRef(fields);
  const enabledRef = useRef(enabled);
  const requestAbortRef = useRef<AbortController | null>(null);
  const requestSequenceRef = useRef(0);

  useEffect(() => {
    cleanupRef.current = cleanup;
  }, [cleanup]);

  useEffect(() => {
    fieldsRef.current = fields;
  }, [fields]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    return () => {
      requestAbortRef.current?.abort();
      requestAbortRef.current = null;
    };
  }, []);

  const resetAssistState = useCallback(() => {
    requestAbortRef.current?.abort();
    requestAbortRef.current = null;
    cleanupRef.current();
    setAssistNotes('');
    setFillEmptyOnly(false);
    setAssistError(null);
    setAssistResult(null);
    setIsGeneratingAssist(false);
    setSelectedPatchFields(createStructuredAssistSelection({}, fieldsRef.current));
  }, []);

  useEffect(() => {
    if (enabled) {
      return;
    }

    resetAssistState();
  }, [enabled, resetAssistState]);

  const assistDiff = assistResult ? getStructuredAssistDiff(current, assistResult.patch, fields) : [];
  const isAiBusy = isGeneratingAssist || isTranscribing;

  const generateAssist = async () => {
    if (!assistNotes.trim()) {
      setAssistError('Paste notes or a transcript before populating the form.');
      return;
    }

    setAssistError(null);
    setIsGeneratingAssist(true);
    setAssistResult(null);
    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    requestAbortRef.current?.abort();
    const abortController = new AbortController();
    requestAbortRef.current = abortController;
    try {
      const response = await fetch(requestEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequest(assistNotes, prompt)),
        signal: abortController.signal,
      });

      const payload = await response.json() as Partial<StructuredAssistResult<T, Field>> & { error?: string };
      if (!response.ok || !payload.patch) {
        throw new Error(payload.error || 'Failed to populate form');
      }

      const patch = filterStructuredAssistPatch(current, payload.patch, fields, fillEmptyOnly);
      const nextResult: StructuredAssistResult<T, Field> = {
        patch,
        fieldMeta: payload.fieldMeta ?? {},
        warnings: payload.warnings ?? [],
        unmappedNotes: payload.unmappedNotes ?? [],
        model: payload.model ?? 'unknown',
      };

      if (
        abortController.signal.aborted ||
        !enabledRef.current ||
        requestSequenceRef.current !== requestId
      ) {
        return;
      }
      setAssistResult(nextResult);
      setSelectedPatchFields(createStructuredAssistSelection(nextResult.patch, fields));
      if (Object.keys(nextResult.patch).length === 0) {
        onToast('No field updates were suggested from those notes', 'info');
      } else {
        onToast('AI suggestions are ready to review', 'success');
      }
    } catch (error) {
      if (
        abortController.signal.aborted ||
        (error instanceof DOMException && error.name === 'AbortError')
      ) {
        return;
      }
      if (enabledRef.current && requestSequenceRef.current === requestId) {
        setAssistError(error instanceof Error ? error.message : 'Failed to populate form.');
      }
    } finally {
      if (requestAbortRef.current === abortController) {
        requestAbortRef.current = null;
      }
      if (enabledRef.current && requestSequenceRef.current === requestId) {
        setIsGeneratingAssist(false);
      }
    }
  };

  const applySelectedPatch = useCallback(() => {
    if (!assistResult) {
      return;
    }

    const patch = Object.entries(assistResult.patch).reduce<Partial<T>>((acc, [field, value]) => {
      if (selectedPatchFields[field as Field]) {
        acc[field as keyof T] = value as T[keyof T];
      }
      return acc;
    }, {});

    onApplyPatch(patch);
    setAssistResult(null);
    setSelectedPatchFields(createStructuredAssistSelection({}, fields));
    onToast('Applied AI suggestions to the form', 'success');
  }, [assistResult, fields, onApplyPatch, onToast, selectedPatchFields]);

  const dismissAssist = useCallback(() => {
    setAssistResult(null);
    setSelectedPatchFields(createStructuredAssistSelection({}, fieldsRef.current));
  }, []);

  const resetPrompt = useCallback(() => setPrompt(defaultPrompt), [defaultPrompt, setPrompt]);

  return {
    prompt,
    setPrompt,
    defaultPrompt,
    modelFallback,
    isAssistOpen,
    setIsAssistOpen,
    isAdvancedPromptOpen,
    setIsAdvancedPromptOpen,
    assistNotes,
    setAssistNotes,
    fillEmptyOnly,
    setFillEmptyOnly,
    assistError,
    setAssistError,
    isGeneratingAssist,
    isRecording,
    isTranscribing,
    isAiBusy,
    assistResult,
    assistDiff,
    selectedPatchFields,
    setSelectedPatchFields,
    generateAssist,
    applySelectedPatch,
    dismissAssist,
    resetAssistState,
    resetPrompt,
    toggleRecording,
  };
}
