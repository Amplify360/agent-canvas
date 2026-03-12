/**
 * AgentModal - Form for creating/editing agents
 */

'use client';

import React, { useState, useEffect, useId, useRef } from 'react';
import { Agent, AgentCreateDefaults, AgentFormData, AgentMetrics } from '@/types/agent';
import { Modal } from '../ui/Modal';
import { useAgents } from '@/contexts/AgentContext';
import { useAppState } from '@/contexts/AppStateContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useQuery, useCanQuery } from '@/hooks/useConvex';
import { validateAgentForm } from '@/utils/validation';
import { getAvailableTools, getToolDisplay, DEFAULT_PHASE } from '@/utils/config';
import { AGENT_STATUS, AGENT_STATUS_OPTIONS, AgentStatus } from '@/types/validationConstants';
import { buildAgentMutationInput, getAgentCoreFields } from '@/utils/agentModel';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import {
  AGENT_ASSIST_MODEL_FALLBACK,
  DEFAULT_AGENT_GLOBAL_ASSIST_PROMPT,
  buildAgentAssistFormData,
  createEmptyAgentAssistSelection,
  filterAgentAssistPatch,
  getAgentAssistDiff,
  applyAgentAssistPatch,
  AGENT_ASSIST_FIELD_LABELS,
  type AgentAssistField,
  type AgentAssistRequest,
  type AgentAssistResult,
  type AgentTranscribeResult,
} from '@/agents/aiAssist';
import { encodeWavAudio } from '@/strategy/audioRecording';
import { Icon } from '@/components/ui/Icon';
import { Tooltip } from '@/components/ui/Tooltip';
import { api } from '../../../convex/_generated/api';

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent?: Agent | null;
  /** Initial values for new agents (ignored when editing). */
  defaults?: AgentCreateDefaults;
}

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

function FormSection({ title, children, defaultCollapsed = false }: FormSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div className={`form-section ${isCollapsed ? 'is-collapsed' : ''}`}>
      <button
        type="button"
        className="form-section__header"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <span>{title}</span>
        <Icon name="chevron-down" />
      </button>
      <div className="form-section__content">{children}</div>
    </div>
  );
}

function getEmptyAgentFormData(defaults?: AgentCreateDefaults): AgentFormData {
  return {
    name: '',
    objective: '',
    description: '',
    tools: [],
    journeySteps: [],
    demoLink: '',
    videoLink: '',
    metrics: {},
    category: '',
    status: AGENT_STATUS.IDEA,
    fieldValues: {},
    phase: DEFAULT_PHASE,
    agentOrder: 0,
    ...defaults,
  };
}

export function AgentModal({ isOpen, onClose, agent, defaults }: AgentModalProps) {
  const { createAgent, updateAgent } = useAgents();
  const { showToast } = useAppState();
  const { currentOrgId } = useAuth();
  const [assistPrompt, setAssistPrompt] = useLocalStorage(
    STORAGE_KEYS.AGENT_ASSIST_PROMPT,
    DEFAULT_AGENT_GLOBAL_ASSIST_PROMPT
  );
  // Use Convex's auth state to gate queries - this ensures token is actually set
  const { canQuery } = useCanQuery();
  const executeOperation = useAsyncOperation();

  // Get existing categories from org for autocomplete
  // Must check isConvexAuthenticated to avoid race condition on page refresh
  // (currentOrgId loads from localStorage before auth is initialized)
  const existingCategories = useQuery(
    api.agents.getDistinctCategories,
    canQuery && currentOrgId ? { workosOrgId: currentOrgId } : 'skip'
  ) || [];
  const categoryDatalistId = useId();

  const [formData, setFormData] = useState<AgentFormData>({
    ...getEmptyAgentFormData(defaults),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newJourneyStep, setNewJourneyStep] = useState('');
  const [isAssistOpen, setIsAssistOpen] = useState(false);
  const [isAdvancedPromptOpen, setIsAdvancedPromptOpen] = useState(false);
  const [assistNotes, setAssistNotes] = useState('');
  const [fillEmptyOnly, setFillEmptyOnly] = useState(false);
  const [assistError, setAssistError] = useState<string | null>(null);
  const [isGeneratingAssist, setIsGeneratingAssist] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [assistResult, setAssistResult] = useState<AgentAssistResult | null>(null);
  const [selectedPatchFields, setSelectedPatchFields] = useState<Record<AgentAssistField, boolean>>(
    createEmptyAgentAssistSelection({})
  );
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const captureFramesRef = useRef<Float32Array[]>([]);
  const captureSampleRateRef = useRef(16000);

  // Load agent data when editing
  useEffect(() => {
    if (agent) {
      const coreFields = getAgentCoreFields(agent);
      setFormData({
        name: agent.name,
        objective: coreFields.objective || '',
        description: coreFields.description || '',
        tools: coreFields.tools,
        journeySteps: coreFields.journeySteps,
        demoLink: coreFields.demoLink || '',
        videoLink: coreFields.videoLink || '',
        metrics: coreFields.metrics || {},
        category: coreFields.category || '',
        status: coreFields.status || AGENT_STATUS.IDEA,
        fieldValues: agent.fieldValues || {},
        phase: agent.phase,
        agentOrder: agent.agentOrder,
      });
      setErrors({});
    } else {
      // Reset form for new agent
      setFormData(getEmptyAgentFormData(defaults));
      setErrors({});
    }
    setNewJourneyStep('');
    setAssistNotes('');
    setFillEmptyOnly(false);
    setAssistError(null);
    setAssistResult(null);
    setSelectedPatchFields(createEmptyAgentAssistSelection({}));
  }, [agent, defaults, isOpen]);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    cleanupAudioCapture();
    setIsRecording(false);
  }, [isOpen]);

  const validateField = (field: string, value: string) => {
    const testData = { ...formData, [field]: value };
    const validationErrors = validateAgentForm(testData);
    const fieldError = validationErrors.find((e) => e.field === field);

    setErrors((prev) => {
      if (fieldError) {
        return { ...prev, [field]: fieldError.message };
      }
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateAgentForm(formData);
    if (validationErrors.length > 0) {
      const errorMap: Record<string, string> = {};
      validationErrors.forEach((err) => {
        errorMap[err.field] = err.message;
      });
      setErrors(errorMap);
      showToast('Please fix the errors before submitting', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await executeOperation(
        async () => {
          const mutationInput = buildAgentMutationInput(formData);
          if (agent) {
            await updateAgent(agent._id, mutationInput);
          } else {
            await createAgent(mutationInput);
          }
        },
        {
          loadingMessage: agent ? 'Updating agent...' : 'Creating agent...',
          successMessage: agent ? 'Agent updated successfully' : 'Agent created successfully',
          errorMessage: 'Failed to save agent',
          onSuccess: onClose,
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToolToggle = (tool: string) => {
    setFormData((prev) => ({
      ...prev,
      tools: prev.tools.includes(tool)
        ? prev.tools.filter((t) => t !== tool)
        : [...prev.tools, tool],
    }));
  };

  const handleAddJourneyStep = () => {
    if (newJourneyStep.trim()) {
      setFormData((prev) => ({
        ...prev,
        journeySteps: [...prev.journeySteps, newJourneyStep.trim()],
      }));
      setNewJourneyStep('');
    }
  };

  const handleRemoveJourneyStep = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      journeySteps: prev.journeySteps.filter((_, i) => i !== index),
    }));
  };

  const handleMetricChange = (key: keyof AgentMetrics, value: string) => {
    const numValue = value === '' ? undefined : Number(value);
    setFormData((prev) => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        [key]: numValue,
      },
    }));
  };

  const availableTools = getAvailableTools();
  const availableToolOptions = availableTools.map((tool) => ({
    id: tool,
    label: getToolDisplay(tool).label,
  }));
  const assistContext = {
    current: buildAgentAssistFormData(formData),
    availableTools: availableToolOptions,
    availableStatuses: AGENT_STATUS_OPTIONS,
    existingCategories,
  };
  const assistDiff = assistResult ? getAgentAssistDiff(assistContext.current, assistResult.patch) : [];
  const isAiBusy = isGeneratingAssist || isSubmitting || isTranscribing;

  const getInputClassName = (field: string, baseClass: string = 'form-input') => {
    return errors[field] ? `${baseClass} ${baseClass}--error` : baseClass;
  };

  const applySelectedPatch = () => {
    if (!assistResult) {
      return;
    }

    const patch = Object.entries(assistResult.patch).reduce<Partial<typeof assistContext.current>>((acc, [field, value]) => {
      const typedField = field as AgentAssistField;
      if (selectedPatchFields[typedField]) {
        acc[typedField] = value as never;
      }
      return acc;
    }, {});

    setFormData((current) => ({
      ...current,
      ...applyAgentAssistPatch(buildAgentAssistFormData(current), patch),
    }));
    setAssistResult(null);
    setSelectedPatchFields(createEmptyAgentAssistSelection({}));
    showToast('Applied AI suggestions to the form', 'success');
  };

  const handleGlobalAssist = async () => {
    if (!assistNotes.trim()) {
      setAssistError('Paste notes or a transcript before populating the form.');
      return;
    }

    setAssistError(null);
    setIsGeneratingAssist(true);
    setAssistResult(null);
    try {
      const response = await fetch('/api/agents/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptOverride: assistPrompt,
          notes: assistNotes,
          context: assistContext,
        } satisfies AgentAssistRequest),
      });

      const payload = await response.json() as Partial<AgentAssistResult> & { error?: string };
      if (!response.ok || !payload.patch) {
        throw new Error(payload.error || 'Failed to populate form');
      }

      const patch = filterAgentAssistPatch(assistContext.current, payload.patch, fillEmptyOnly);
      const nextResult: AgentAssistResult = {
        patch,
        fieldMeta: payload.fieldMeta ?? {},
        warnings: payload.warnings ?? [],
        unmappedNotes: payload.unmappedNotes ?? [],
        model: payload.model ?? 'unknown',
      };

      setAssistResult(nextResult);
      setSelectedPatchFields(createEmptyAgentAssistSelection(nextResult.patch));
      if (Object.keys(nextResult.patch).length === 0) {
        showToast('No field updates were suggested from those notes', 'info');
      } else {
        showToast('AI suggestions are ready to review', 'success');
      }
    } catch (assistRequestError) {
      setAssistError(assistRequestError instanceof Error ? assistRequestError.message : 'Failed to populate form.');
    } finally {
      setIsGeneratingAssist(false);
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      stopAudioCapture();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === 'undefined') {
      setAssistError('Audio recording is not supported in this browser.');
      return;
    }

    try {
      setAssistError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      captureFramesRef.current = [];

      const audioContext = new AudioContext();
      const sourceNode = audioContext.createMediaStreamSource(stream);
      const processorNode = audioContext.createScriptProcessor(4096, 1, 1);
      const sinkNode = audioContext.createGain();
      sinkNode.gain.value = 0;

      captureSampleRateRef.current = audioContext.sampleRate;
      audioContextRef.current = audioContext;
      sourceNodeRef.current = sourceNode;
      processorNodeRef.current = processorNode;

      processorNode.onaudioprocess = (event) => {
        const channel = event.inputBuffer.getChannelData(0);
        captureFramesRef.current.push(new Float32Array(channel));
      };

      sourceNode.connect(processorNode);
      processorNode.connect(sinkNode);
      sinkNode.connect(audioContext.destination);

      setIsRecording(true);
    } catch (recordingError) {
      cleanupAudioCapture();
      setAssistError(recordingError instanceof Error ? recordingError.message : 'Failed to start recording.');
    }
  };

  const stopAudioCapture = async () => {
    if (!isRecording) {
      return;
    }

    setIsRecording(false);

    const capturedFrames = captureFramesRef.current;
    const sampleRate = captureSampleRateRef.current;
    cleanupAudioCapture();

    if (capturedFrames.length === 0) {
      return;
    }

    const audioBlob = encodeWavAudio(capturedFrames, sampleRate);
    setIsTranscribing(true);
    try {
      const formPayload = new FormData();
      formPayload.append('audio', new File([audioBlob], 'agent-notes.wav', { type: audioBlob.type }));
      const response = await fetch('/api/agents/transcribe', {
        method: 'POST',
        body: formPayload,
      });
      const payload = await response.json() as Partial<AgentTranscribeResult> & { error?: string };
      if (!response.ok || !payload.transcript) {
        throw new Error(payload.error || 'Failed to transcribe audio');
      }

      setAssistNotes((current) => current.trim()
        ? `${current.trim()}\n\n${payload.transcript?.trim() ?? ''}`.trim()
        : payload.transcript?.trim() ?? '');
      showToast('Transcript added to notes', 'success');
    } catch (transcribeError) {
      setAssistError(transcribeError instanceof Error ? transcribeError.message : 'Failed to transcribe audio.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const cleanupAudioCapture = () => {
    processorNodeRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioContextRef.current?.close().catch(() => undefined);
    processorNodeRef.current = null;
    sourceNodeRef.current = null;
    mediaStreamRef.current = null;
    audioContextRef.current = null;
    captureFramesRef.current = [];
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={agent ? 'Edit Agent' : 'New Agent'} size="large" closeOnOverlayClick={false}>
      <form onSubmit={handleSubmit} className="agent-form">
        <section className="strategy-ai-assist">
          <button
            type="button"
            className="strategy-ai-assist__toggle"
            onClick={() => setIsAssistOpen((current) => !current)}
            aria-expanded={isAssistOpen}
          >
            <span className="strategy-ai-assist__toggle-main">
              <Icon name="sparkles" size={16} />
              <span>AI Assist</span>
            </span>
            <div className="strategy-ai-assist__toggle-meta">
              <span className="form-help">Paste notes or transcript and populate this form with {AGENT_ASSIST_MODEL_FALLBACK.replace(/^openai\//, '')}.</span>
              <Icon name={isAssistOpen ? 'chevron-up' : 'chevron-down'} size={16} />
            </div>
          </button>
          {isAssistOpen && (
            <div className="strategy-ai-assist__body">
              <div className="form-group">
                <div className="strategy-ai-assist__label-row">
                  <label htmlFor="agent-assist-notes" className="form-label">Notes / transcript</label>
                  <div className="strategy-ai-assist__actions">
                    <button
                      type="button"
                      className={`btn btn--sm btn--ghost ${isRecording ? 'strategy-ai-assist__recording-btn' : ''}`.trim()}
                      onClick={handleToggleRecording}
                      disabled={isAiBusy && !isRecording}
                    >
                      <Icon name={isRecording ? 'square' : 'mic'} size={14} />
                      {isRecording ? 'Stop recording' : 'Record'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm btn--secondary"
                      onClick={handleGlobalAssist}
                      disabled={isAiBusy}
                    >
                      <Icon name={isGeneratingAssist ? 'loader-2' : 'sparkles'} size={14} className={isGeneratingAssist ? 'loading-icon' : undefined} />
                      {isGeneratingAssist ? 'Populating...' : 'Populate form'}
                    </button>
                  </div>
                </div>
                <textarea
                  id="agent-assist-notes"
                  className="form-textarea"
                  value={assistNotes}
                  onChange={(event) => setAssistNotes(event.target.value)}
                  disabled={isSubmitting || isGeneratingAssist || isTranscribing}
                  rows={6}
                  placeholder="Paste a narrative, workshop notes, or a transcript here."
                />
                <div className="strategy-ai-assist__options">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={fillEmptyOnly}
                      onChange={(event) => setFillEmptyOnly(event.target.checked)}
                      disabled={isAiBusy}
                    />
                    <span>Fill empty fields only</span>
                  </label>
                  {isTranscribing && <span className="form-help">Transcribing audio...</span>}
                </div>
              </div>
              <div className="strategy-ai-assist__advanced">
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={() => setIsAdvancedPromptOpen((current) => !current)}
                  aria-expanded={isAdvancedPromptOpen}
                >
                  <Icon name={isAdvancedPromptOpen ? 'chevron-up' : 'chevron-down'} size={14} />
                  Advanced prompt
                </button>
                {isAdvancedPromptOpen && (
                  <div className="strategy-ai-assist__advanced-body">
                    <div className="form-group">
                      <label htmlFor="agent-assist-prompt" className="form-label">Assist instructions</label>
                      <textarea
                        id="agent-assist-prompt"
                        className="form-textarea"
                        value={assistPrompt}
                        onChange={(event) => setAssistPrompt(event.target.value)}
                        rows={4}
                        disabled={isAiBusy}
                      />
                    </div>
                    <div className="strategy-ai-assist__prompt-actions">
                      <button
                        type="button"
                        className="btn btn--sm btn--ghost"
                        onClick={() => setAssistPrompt(DEFAULT_AGENT_GLOBAL_ASSIST_PROMPT)}
                      >
                        Reset prompt
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {assistError && <div className="form-error">{assistError}</div>}
              {assistResult && (
                <div className="strategy-ai-assist__proposal">
                  <div className="strategy-ai-assist__proposal-header">
                    <div>
                      <h3 className="strategy-ai-assist__proposal-title">Proposed updates</h3>
                      <p className="form-help">Review and apply the suggested field changes before saving the form.</p>
                    </div>
                    <span className="badge badge--info">{assistResult.model.replace(/^openai\//, '')}</span>
                  </div>
                  {assistDiff.length > 0 ? (
                    <div className="strategy-ai-assist__proposal-list">
                      {assistDiff.map((item) => (
                        <label key={item.field} className="strategy-ai-assist__proposal-item">
                          <input
                            type="checkbox"
                            checked={selectedPatchFields[item.field]}
                            onChange={(event) =>
                              setSelectedPatchFields((current) => ({
                                ...current,
                                [item.field]: event.target.checked,
                              }))
                            }
                          />
                          <div className="strategy-ai-assist__proposal-item-body">
                            <div className="strategy-ai-assist__proposal-item-header">
                              <strong>{AGENT_ASSIST_FIELD_LABELS[item.field]}</strong>
                              {assistResult.fieldMeta[item.field]?.reason && (
                                <span className="form-help">{assistResult.fieldMeta[item.field]?.reason}</span>
                              )}
                            </div>
                            <div className="strategy-ai-assist__proposal-values">
                              <div>
                                <span className="form-help">Current</span>
                                <pre>{item.currentValue}</pre>
                              </div>
                              <div>
                                <span className="form-help">Proposed</span>
                                <pre>{item.proposedValue}</pre>
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="form-help">No field changes were proposed from the current notes and form state.</p>
                  )}
                  {assistResult.warnings.length > 0 && (
                    <div className="strategy-ai-assist__messages">
                      {assistResult.warnings.map((warning, index) => (
                        <p key={`${warning}-${index}`} className="form-help">{warning}</p>
                      ))}
                    </div>
                  )}
                  <div className="strategy-ai-assist__proposal-actions">
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={applySelectedPatch}
                      disabled={!assistDiff.some((item) => selectedPatchFields[item.field])}
                    >
                      Apply selected
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => {
                        setAssistResult(null);
                        setSelectedPatchFields(createEmptyAgentAssistSelection({}));
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
        {/* Basic Info Section */}
        <FormSection title="Basic Info">
          <div className="form-group">
            <label htmlFor="agent-name" className="form-label">
              Agent Name <span className="required">*</span>
            </label>
            <input
              id="agent-name"
              type="text"
              className={getInputClassName('name')}
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              onBlur={(e) => validateField('name', e.target.value)}
              required
            />
            {errors.name && <div className="form-error">{errors.name}</div>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="agent-phase" className="form-label">
                Implementation Phase <span className="required">*</span>
              </label>
              <input
                id="agent-phase"
                type="text"
                className={getInputClassName('phase')}
                value={formData.phase}
                onChange={(e) => setFormData((prev) => ({ ...prev, phase: e.target.value }))}
                onBlur={(e) => validateField('phase', e.target.value)}
                placeholder="e.g., Phase 1, Q2 2025, Backlog"
                required
              />
              {errors.phase && <div className="form-error">{errors.phase}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="agent-category" className="form-label">
                Category
              </label>
              <input
                id="agent-category"
                type="text"
                className="form-input"
                list={categoryDatalistId}
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                onBlur={(e) => {
                  // Normalize: trim whitespace
                  const trimmed = e.target.value.trim();
                  if (trimmed !== e.target.value) {
                    setFormData((prev) => ({ ...prev, category: trimmed }));
                  }
                }}
                placeholder="e.g., Recruitment, Onboarding, Benefits"
              />
              <datalist id={categoryDatalistId}>
                {existingCategories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="agent-status" className="form-label">
              Status
            </label>
            <select
              id="agent-status"
              className="form-select"
              value={formData.status}
              onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as AgentStatus }))}
            >
              {AGENT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </FormSection>

        {/* Details Section */}
        <FormSection title="Details">
          <div className="form-group">
            <label htmlFor="agent-objective" className="form-label">
              Objective
            </label>
            <textarea
              id="agent-objective"
              className={getInputClassName('objective', 'form-textarea')}
              value={formData.objective}
              onChange={(e) => setFormData((prev) => ({ ...prev, objective: e.target.value }))}
              onBlur={(e) => validateField('objective', e.target.value)}
              rows={2}
              placeholder="What does this agent aim to achieve?"
            />
            {errors.objective && <div className="form-error">{errors.objective}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="agent-description" className="form-label">
              Description
            </label>
            <textarea
              id="agent-description"
              className={getInputClassName('description', 'form-textarea')}
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              onBlur={(e) => validateField('description', e.target.value)}
              rows={3}
              placeholder="Detailed description of the agent's functionality..."
            />
            {errors.description && <div className="form-error">{errors.description}</div>}
          </div>
        </FormSection>

        {/* Capabilities Section */}
        <FormSection title="Capabilities">
          <div className="form-group">
            <label className="form-label">Tools</label>
            <div className="checkbox-grid">
              {availableTools.map((tool) => {
                const toolDisplay = getToolDisplay(tool);
                return (
                  <label
                    key={tool}
                    className={`checkbox-item ${formData.tools.includes(tool) ? 'is-checked' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.tools.includes(tool)}
                      onChange={() => handleToolToggle(tool)}
                    />
                    <div className="checkbox-item__check">
                      <Icon name="check" />
                    </div>
                    <Icon name={toolDisplay.icon} style={{ color: toolDisplay.color }} />
                    <span>{toolDisplay.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </FormSection>

        {/* Journey Section */}
        <FormSection title="Journey Steps">
          <div className="journey-editor">
            <div className="journey-editor__input">
              <input
                type="text"
                className="form-input"
                value={newJourneyStep}
                onChange={(e) => setNewJourneyStep(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddJourneyStep();
                  }
                }}
                placeholder="Add a journey step..."
              />
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={handleAddJourneyStep}
                disabled={!newJourneyStep.trim()}
              >
                <Icon name="plus" />
                Add
              </button>
            </div>

            {formData.journeySteps.length === 0 ? (
              <div className="journey-editor__empty">
                No journey steps defined. Add steps to describe the agent&apos;s workflow.
              </div>
            ) : (
              <div className="journey-editor__list">
                {formData.journeySteps.map((step, index) => (
                  <div key={index} className="journey-editor__item">
                    <div className="journey-editor__item-number">{index + 1}</div>
                    <div className="journey-editor__item-text">{step}</div>
                    <Tooltip content="Remove step" placement="left">
                      <button
                        type="button"
                        className="journey-editor__item-remove"
                        onClick={() => handleRemoveJourneyStep(index)}
                      >
                        <Icon name="x" />
                      </button>
                    </Tooltip>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FormSection>

        {/* Links Section */}
        <FormSection title="Links">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="agent-demoLink" className="form-label">
                Demo Link
              </label>
              <input
                id="agent-demoLink"
                type="url"
                className={getInputClassName('demoLink')}
                value={formData.demoLink}
                onChange={(e) => setFormData((prev) => ({ ...prev, demoLink: e.target.value }))}
                onBlur={(e) => e.target.value && validateField('demoLink', e.target.value)}
                placeholder="https://example.com/demo"
              />
              {errors.demoLink && <div className="form-error">{errors.demoLink}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="agent-videoLink" className="form-label">
                Video Link
              </label>
              <input
                id="agent-videoLink"
                type="url"
                className={getInputClassName('videoLink')}
                value={formData.videoLink}
                onChange={(e) => setFormData((prev) => ({ ...prev, videoLink: e.target.value }))}
                onBlur={(e) => e.target.value && validateField('videoLink', e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
              {errors.videoLink && <div className="form-error">{errors.videoLink}</div>}
            </div>
          </div>
        </FormSection>

        {/* Metrics Section - Collapsed by default */}
        <FormSection title="Metrics" defaultCollapsed={true}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="agent-numberOfUsers" className="form-label">
                Number of Users
              </label>
              <input
                id="agent-numberOfUsers"
                type="number"
                className="form-input"
                value={formData.metrics?.numberOfUsers ?? ''}
                onChange={(e) => handleMetricChange('numberOfUsers', e.target.value)}
                min="0"
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="agent-timesUsed" className="form-label">
                Times Used
              </label>
              <input
                id="agent-timesUsed"
                type="number"
                className="form-input"
                value={formData.metrics?.timesUsed ?? ''}
                onChange={(e) => handleMetricChange('timesUsed', e.target.value)}
                min="0"
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="agent-timeSaved" className="form-label">
                Time Saved (hours)
              </label>
              <input
                id="agent-timeSaved"
                type="number"
                className="form-input"
                value={formData.metrics?.timeSaved ?? ''}
                onChange={(e) => handleMetricChange('timeSaved', e.target.value)}
                min="0"
                step="0.5"
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="agent-roi" className="form-label">
                ROI ($)
              </label>
              <input
                id="agent-roi"
                type="number"
                className="form-input"
                value={formData.metrics?.roi ?? ''}
                onChange={(e) => handleMetricChange('roi', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </FormSection>

        <div className="form-actions">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary">
            {agent ? 'Update' : 'Create'} Agent
          </button>
        </div>
      </form>
    </Modal>
  );
}
