'use client';

import React, { useEffect, useState } from 'react';
import { FormAssistPanel } from '@/components/ai/FormAssistPanel';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { useAppState } from '@/contexts/AppStateContext';
import { useAudioTranscription } from '@/hooks/useAudioTranscription';
import { useStructuredFormAssist } from '@/hooks/useStructuredFormAssist';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import {
  DEFAULT_SERVICE_FIELD_IMPROVE_PROMPT,
  DEFAULT_SERVICE_GLOBAL_ASSIST_PROMPT,
  SERVICE_ASSIST_MODEL_FALLBACK,
  SERVICE_ASSIST_FIELD_LABELS,
  buildServiceEditorFormData,
  createEmptyServiceAssistSelection,
  filterServiceAssistPatch,
  getServiceAssistDiff,
  type ServiceAssistContext,
  type ServiceAssistField,
  type ServiceAssistRequest,
  type ServiceAssistResult,
  type ServiceEditorFormData,
  type ServiceFieldImproveResult,
} from '@/strategy/aiAssist';
import {
  DEFAULT_DEPARTMENT_ASSIST_PROMPT,
  DEFAULT_DEVIATION_ASSIST_PROMPT,
  DEFAULT_FLOW_STEP_ASSIST_PROMPT,
  DEFAULT_INITIATIVE_ASSIST_PROMPT,
  DEFAULT_OBJECTIVE_ASSIST_PROMPT,
  DEFAULT_PRESSURE_ASSIST_PROMPT,
  DEPARTMENT_FIELDS,
  DEVIATION_FIELDS,
  FLOW_STEP_FIELDS,
  INITIATIVE_FIELDS,
  OBJECTIVE_FIELDS,
  PRESSURE_FIELDS,
  STRATEGY_FORM_ASSIST_MODEL_FALLBACK,
  type DepartmentEditorFormData,
  type DeviationEditorFormData,
  type FlowStepEditorFormData,
  type InitiativeEditorFormData,
  type ObjectiveEditorFormData,
  type PressureEditorFormData,
  type StrategyFormAssistRequest,
} from '@/strategy/formAssist';
import {
  type Department,
  type Deviation,
  type DeviationClassification,
  type DeviationImpact,
  type DeviationTreatment,
  type FlowStep,
  type FlowStepType,
  type Initiative,
  type LinkedAgent,
  type Service,
  type StrategicObjective,
  type StrategicPressure,
} from '@/strategy/types';
import { linesToText, normalizeOptionalString, textToLines } from '@/strategy/editorUtils';

const SERVICE_STATUS_OPTIONS: Array<{ value: Service['status']; label: string }> = [
  { value: 'not-analyzed', label: 'Not started' },
  { value: 'analyzed', label: 'Analyzed' },
  { value: 'has-deviations', label: 'Has deviations' },
];

const FLOW_STEP_TYPE_OPTIONS: Array<{ value: FlowStepType; label: string }> = [
  { value: 'input', label: 'Input' },
  { value: 'process', label: 'Process' },
  { value: 'output', label: 'Output' },
  { value: 'control', label: 'Control' },
  { value: 'approval', label: 'Approval' },
  { value: 'handoff', label: 'Handoff' },
  { value: 'rework', label: 'Rework' },
  { value: 'exception', label: 'Exception' },
];

const DEVIATION_IMPACT_OPTIONS: Array<{ value: DeviationImpact; label: string }> = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const DEVIATION_TREATMENT_OPTIONS: Array<{ value: DeviationTreatment; label: string }> = [
  { value: 'automate', label: 'Automate' },
  { value: 'eliminate', label: 'Eliminate' },
  { value: 'simplify', label: 'Simplify' },
  { value: 'accept', label: 'Accept' },
];

const DEVIATION_CLASSIFICATION_OPTIONS: Array<{ value: DeviationClassification; label: string }> = [
  { value: 'approval', label: 'Approval' },
  { value: 'handoff', label: 'Handoff' },
  { value: 'rework', label: 'Rework' },
  { value: 'system-constraint', label: 'System constraint' },
  { value: 'exception', label: 'Exception' },
  { value: 'control', label: 'Control' },
];

const INITIATIVE_STATUS_OPTIONS: Array<{ value: Initiative['status']; label: string }> = [
  { value: 'proposed', label: 'Proposed' },
  { value: 'approved', label: 'Approved' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
  { value: 'parked', label: 'Parked' },
];

function createDraftId(prefix: string) {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${random}`;
}

function FormError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <p className="form-error">
      <Icon name="alert-circle" size={14} />
      <span>{message}</span>
    </p>
  );
}

interface PressureEditModalProps {
  isOpen: boolean;
  pressure: StrategicPressure | null;
  onClose: () => void;
  onSave: (updates: Pick<StrategicPressure, 'type' | 'title' | 'description' | 'evidence'>) => Promise<void>;
}

export function PressureEditModal({ isOpen, pressure, onClose, onSave }: PressureEditModalProps) {
  const { showToast } = useAppState();
  const [type, setType] = useState<StrategicPressure['type']>('external');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceText, setEvidenceText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pressureFormData: PressureEditorFormData = { type, title, description, evidenceText };
  const pressureAssist = useStructuredFormAssist<
    PressureEditorFormData,
    keyof PressureEditorFormData & string,
    StrategyFormAssistRequest
  >({
    storageKey: STORAGE_KEYS.STRATEGY_PRESSURE_ASSIST_PROMPT,
    defaultPrompt: DEFAULT_PRESSURE_ASSIST_PROMPT,
    modelFallback: STRATEGY_FORM_ASSIST_MODEL_FALLBACK,
    current: pressureFormData,
    fields: PRESSURE_FIELDS,
    buildRequest: (notes, promptOverride) => ({
      formType: 'pressure',
      promptOverride,
      notes,
      context: { current: pressureFormData },
    }),
    onApplyPatch: (patch) => {
      if (patch.type !== undefined) setType(patch.type);
      if (patch.title !== undefined) setTitle(patch.title);
      if (patch.description !== undefined) setDescription(patch.description);
      if (patch.evidenceText !== undefined) setEvidenceText(patch.evidenceText);
    },
    requestEndpoint: '/api/strategy/form-assist',
    onToast: showToast,
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen || !pressure) return;
    setType(pressure.type);
    setTitle(pressure.title);
    setDescription(pressure.description);
    setEvidenceText(linesToText(pressure.evidence));
    setError(null);
  }, [isOpen, pressure]);

  if (!pressure) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave({
        type,
        title: title.trim(),
        description: description.trim(),
        evidence: textToLines(evidenceText),
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save pressure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Pressure" size="medium" closeOnOverlayClick={false}>
      <form onSubmit={handleSubmit} className="strategy-editor-form">
        <FormAssistPanel
          modelFallback={pressureAssist.modelFallback}
          prompt={pressureAssist.prompt}
          onPromptChange={pressureAssist.setPrompt}
          onResetPrompt={pressureAssist.resetPrompt}
          isAssistOpen={pressureAssist.isAssistOpen}
          onToggleOpen={() => pressureAssist.setIsAssistOpen(!pressureAssist.isAssistOpen)}
          isAdvancedPromptOpen={pressureAssist.isAdvancedPromptOpen}
          onToggleAdvanced={() => pressureAssist.setIsAdvancedPromptOpen(!pressureAssist.isAdvancedPromptOpen)}
          assistNotes={pressureAssist.assistNotes}
          onNotesChange={pressureAssist.setAssistNotes}
          fillEmptyOnly={pressureAssist.fillEmptyOnly}
          onFillEmptyOnlyChange={pressureAssist.setFillEmptyOnly}
          assistError={pressureAssist.assistError}
          isGeneratingAssist={pressureAssist.isGeneratingAssist}
          isRecording={pressureAssist.isRecording}
          isTranscribing={pressureAssist.isTranscribing}
          isAiBusy={pressureAssist.isAiBusy || isSubmitting}
          onToggleRecording={pressureAssist.toggleRecording}
          onGenerateAssist={pressureAssist.generateAssist}
          assistResult={pressureAssist.assistResult}
          assistDiff={pressureAssist.assistDiff}
          selectedPatchFields={pressureAssist.selectedPatchFields}
          onSelectionChange={(field, checked) =>
            pressureAssist.setSelectedPatchFields((current) => ({ ...current, [field]: checked }))
          }
          onApplySelected={pressureAssist.applySelectedPatch}
          onDismiss={pressureAssist.dismissAssist}
        />
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="pressure-type" className="form-label">Type</label>
            <select
              id="pressure-type"
              className="form-select"
              value={type}
              onChange={(event) => setType(event.target.value as StrategicPressure['type'])}
              disabled={isSubmitting}
            >
              <option value="external">External</option>
              <option value="internal">Internal</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="pressure-title" className="form-label">Title</label>
            <input
              id="pressure-title"
              type="text"
              className="form-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="pressure-description" className="form-label">Description</label>
          <textarea
            id="pressure-description"
            className="form-textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isSubmitting}
            rows={4}
          />
        </div>
        <div className="form-group">
          <label htmlFor="pressure-evidence" className="form-label">Evidence</label>
          <textarea
            id="pressure-evidence"
            className="form-textarea"
            value={evidenceText}
            onChange={(event) => setEvidenceText(event.target.value)}
            disabled={isSubmitting}
            rows={5}
            placeholder="One line per evidence signal"
          />
        </div>
        <FormError message={error} />
        <div className="modal__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

interface ObjectiveEditModalProps {
  isOpen: boolean;
  objective: StrategicObjective | null;
  pressures: StrategicPressure[];
  onClose: () => void;
  onSave: (updates: Pick<StrategicObjective, 'title' | 'description' | 'linkedPressureIds'>) => Promise<void>;
}

export function ObjectiveEditModal({ isOpen, objective, pressures, onClose, onSave }: ObjectiveEditModalProps) {
  const { showToast } = useAppState();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [linkedPressureIds, setLinkedPressureIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pressureTitleById = new Map(pressures.map((pressure) => [pressure.id, pressure.title]));
  const objectiveFields = OBJECTIVE_FIELDS(pressureTitleById);
  const objectiveFormData: ObjectiveEditorFormData = { title, description, linkedPressureIds };
  const objectiveAssist = useStructuredFormAssist<
    ObjectiveEditorFormData,
    keyof ObjectiveEditorFormData & string,
    StrategyFormAssistRequest
  >({
    storageKey: STORAGE_KEYS.STRATEGY_OBJECTIVE_ASSIST_PROMPT,
    defaultPrompt: DEFAULT_OBJECTIVE_ASSIST_PROMPT,
    modelFallback: STRATEGY_FORM_ASSIST_MODEL_FALLBACK,
    current: objectiveFormData,
    fields: objectiveFields,
    buildRequest: (notes, promptOverride) => ({
      formType: 'objective',
      promptOverride,
      notes,
      context: {
        current: objectiveFormData,
        availablePressures: pressures.map((pressure) => ({
          id: pressure.id,
          type: pressure.type,
          title: pressure.title,
          description: pressure.description,
        })),
      },
    }),
    onApplyPatch: (patch) => {
      if (patch.title !== undefined) setTitle(patch.title);
      if (patch.description !== undefined) setDescription(patch.description);
      if (patch.linkedPressureIds !== undefined) setLinkedPressureIds(patch.linkedPressureIds);
    },
    requestEndpoint: '/api/strategy/form-assist',
    onToast: showToast,
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen || !objective) return;
    setTitle(objective.title);
    setDescription(objective.description);
    setLinkedPressureIds(objective.linkedPressureIds);
    setError(null);
  }, [isOpen, objective]);

  if (!objective) return null;

  const togglePressure = (pressureId: string) => {
    setLinkedPressureIds((current) =>
      current.includes(pressureId)
        ? current.filter((id) => id !== pressureId)
        : [...current, pressureId]
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        linkedPressureIds,
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save objective.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Objective" size="medium" closeOnOverlayClick={false}>
      <form onSubmit={handleSubmit} className="strategy-editor-form">
        <FormAssistPanel
          modelFallback={objectiveAssist.modelFallback}
          prompt={objectiveAssist.prompt}
          onPromptChange={objectiveAssist.setPrompt}
          onResetPrompt={objectiveAssist.resetPrompt}
          isAssistOpen={objectiveAssist.isAssistOpen}
          onToggleOpen={() => objectiveAssist.setIsAssistOpen(!objectiveAssist.isAssistOpen)}
          isAdvancedPromptOpen={objectiveAssist.isAdvancedPromptOpen}
          onToggleAdvanced={() => objectiveAssist.setIsAdvancedPromptOpen(!objectiveAssist.isAdvancedPromptOpen)}
          assistNotes={objectiveAssist.assistNotes}
          onNotesChange={objectiveAssist.setAssistNotes}
          fillEmptyOnly={objectiveAssist.fillEmptyOnly}
          onFillEmptyOnlyChange={objectiveAssist.setFillEmptyOnly}
          assistError={objectiveAssist.assistError}
          isGeneratingAssist={objectiveAssist.isGeneratingAssist}
          isRecording={objectiveAssist.isRecording}
          isTranscribing={objectiveAssist.isTranscribing}
          isAiBusy={objectiveAssist.isAiBusy || isSubmitting}
          onToggleRecording={objectiveAssist.toggleRecording}
          onGenerateAssist={objectiveAssist.generateAssist}
          assistResult={objectiveAssist.assistResult}
          assistDiff={objectiveAssist.assistDiff}
          selectedPatchFields={objectiveAssist.selectedPatchFields}
          onSelectionChange={(field, checked) =>
            objectiveAssist.setSelectedPatchFields((current) => ({ ...current, [field]: checked }))
          }
          onApplySelected={objectiveAssist.applySelectedPatch}
          onDismiss={objectiveAssist.dismissAssist}
        />
        <div className="form-group">
          <label htmlFor="objective-title" className="form-label">Title</label>
          <input
            id="objective-title"
            type="text"
            className="form-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={isSubmitting}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label htmlFor="objective-description" className="form-label">Description</label>
          <textarea
            id="objective-description"
            className="form-textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isSubmitting}
            rows={4}
          />
        </div>
        <div className="form-group">
          <span className="form-label">Linked Pressures</span>
          <div className="strategy-editor-checklist">
            {pressures.map((pressure) => (
              <label key={pressure.id} className="checkbox-label strategy-editor-checklist__item">
                <input
                  type="checkbox"
                  checked={linkedPressureIds.includes(pressure.id)}
                  onChange={() => togglePressure(pressure.id)}
                  disabled={isSubmitting}
                />
                <span>{pressure.title}</span>
              </label>
            ))}
          </div>
        </div>
        <FormError message={error} />
        <div className="modal__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

interface DepartmentEditModalProps {
  isOpen: boolean;
  department: Department | null;
  onClose: () => void;
  onSave: (updates: Pick<Department, 'name' | 'description' | 'keyIssues'>) => Promise<void>;
}

export function DepartmentEditModal({ isOpen, department, onClose, onSave }: DepartmentEditModalProps) {
  const { showToast } = useAppState();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [keyIssuesText, setKeyIssuesText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const departmentFormData: DepartmentEditorFormData = { name, description, keyIssuesText };
  const departmentAssist = useStructuredFormAssist<
    DepartmentEditorFormData,
    keyof DepartmentEditorFormData & string,
    StrategyFormAssistRequest
  >({
    storageKey: STORAGE_KEYS.STRATEGY_DEPARTMENT_ASSIST_PROMPT,
    defaultPrompt: DEFAULT_DEPARTMENT_ASSIST_PROMPT,
    modelFallback: STRATEGY_FORM_ASSIST_MODEL_FALLBACK,
    current: departmentFormData,
    fields: DEPARTMENT_FIELDS,
    buildRequest: (notes, promptOverride) => ({
      formType: 'department',
      promptOverride,
      notes,
      context: { current: departmentFormData },
    }),
    onApplyPatch: (patch) => {
      if (patch.name !== undefined) setName(patch.name);
      if (patch.description !== undefined) setDescription(patch.description);
      if (patch.keyIssuesText !== undefined) setKeyIssuesText(patch.keyIssuesText);
    },
    requestEndpoint: '/api/strategy/form-assist',
    onToast: showToast,
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen || !department) return;
    setName(department.name);
    setDescription(department.description);
    setKeyIssuesText(linesToText(department.keyIssues));
    setError(null);
  }, [isOpen, department]);

  if (!department) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !description.trim()) {
      setError('Name and description are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        keyIssues: textToLines(keyIssuesText),
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save department.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Department" size="medium" closeOnOverlayClick={false}>
      <form onSubmit={handleSubmit} className="strategy-editor-form">
        <FormAssistPanel
          modelFallback={departmentAssist.modelFallback}
          prompt={departmentAssist.prompt}
          onPromptChange={departmentAssist.setPrompt}
          onResetPrompt={departmentAssist.resetPrompt}
          isAssistOpen={departmentAssist.isAssistOpen}
          onToggleOpen={() => departmentAssist.setIsAssistOpen(!departmentAssist.isAssistOpen)}
          isAdvancedPromptOpen={departmentAssist.isAdvancedPromptOpen}
          onToggleAdvanced={() => departmentAssist.setIsAdvancedPromptOpen(!departmentAssist.isAdvancedPromptOpen)}
          assistNotes={departmentAssist.assistNotes}
          onNotesChange={departmentAssist.setAssistNotes}
          fillEmptyOnly={departmentAssist.fillEmptyOnly}
          onFillEmptyOnlyChange={departmentAssist.setFillEmptyOnly}
          assistError={departmentAssist.assistError}
          isGeneratingAssist={departmentAssist.isGeneratingAssist}
          isRecording={departmentAssist.isRecording}
          isTranscribing={departmentAssist.isTranscribing}
          isAiBusy={departmentAssist.isAiBusy || isSubmitting}
          onToggleRecording={departmentAssist.toggleRecording}
          onGenerateAssist={departmentAssist.generateAssist}
          assistResult={departmentAssist.assistResult}
          assistDiff={departmentAssist.assistDiff}
          selectedPatchFields={departmentAssist.selectedPatchFields}
          onSelectionChange={(field, checked) =>
            departmentAssist.setSelectedPatchFields((current) => ({ ...current, [field]: checked }))
          }
          onApplySelected={departmentAssist.applySelectedPatch}
          onDismiss={departmentAssist.dismissAssist}
        />
        <div className="form-group">
          <label htmlFor="department-name" className="form-label">Name</label>
          <input
            id="department-name"
            type="text"
            className="form-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isSubmitting}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label htmlFor="department-description" className="form-label">Description</label>
          <textarea
            id="department-description"
            className="form-textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isSubmitting}
            rows={4}
          />
        </div>
        <div className="form-group">
          <label htmlFor="department-key-issues" className="form-label">Key Issues</label>
          <textarea
            id="department-key-issues"
            className="form-textarea"
            value={keyIssuesText}
            onChange={(event) => setKeyIssuesText(event.target.value)}
            disabled={isSubmitting}
            rows={5}
            placeholder="One line per issue"
          />
        </div>
        <FormError message={error} />
        <div className="modal__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

interface ServiceEditModalProps {
  isOpen: boolean;
  service: Service | null;
  department: Department | null;
  pressures: StrategicPressure[];
  enterpriseObjectives: StrategicObjective[];
  departmentObjectives: StrategicObjective[];
  mapTitle?: string;
  onClose: () => void;
  onSave: (updates: Pick<Service, 'name' | 'purpose' | 'customer' | 'trigger' | 'outcome' | 'constraints' | 'status' | 'effectivenessMetric' | 'efficiencyMetric'>) => Promise<void>;
}

export function ServiceEditModal({
  isOpen,
  service,
  department,
  pressures,
  enterpriseObjectives,
  departmentObjectives,
  mapTitle,
  onClose,
  onSave,
}: ServiceEditModalProps) {
  const { showToast } = useAppState();
  const [assistPrompt, setAssistPrompt] = useLocalStorage(
    STORAGE_KEYS.TRANSFORMATION_MAP_SERVICE_ASSIST_PROMPT,
    DEFAULT_SERVICE_GLOBAL_ASSIST_PROMPT
  );
  const [fieldPrompt, setFieldPrompt] = useLocalStorage(
    STORAGE_KEYS.TRANSFORMATION_MAP_SERVICE_FIELD_PROMPT,
    DEFAULT_SERVICE_FIELD_IMPROVE_PROMPT
  );
  const [formData, setFormData] = useState<ServiceEditorFormData>({
    name: '',
    purpose: '',
    customer: '',
    trigger: '',
    outcome: '',
    constraintsText: '',
    status: 'not-analyzed',
    effectivenessMetric: '',
    efficiencyMetric: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAssistOpen, setIsAssistOpen] = useState(false);
  const [isAdvancedPromptOpen, setIsAdvancedPromptOpen] = useState(false);
  const [assistNotes, setAssistNotes] = useState('');
  const [fillEmptyOnly, setFillEmptyOnly] = useState(false);
  const [assistError, setAssistError] = useState<string | null>(null);
  const [isGeneratingAssist, setIsGeneratingAssist] = useState(false);
  const [activeFieldImprove, setActiveFieldImprove] = useState<ServiceAssistField | null>(null);
  const [fieldImproveError, setFieldImproveError] = useState<string | null>(null);
  const [fieldImproveSuggestion, setFieldImproveSuggestion] = useState<ServiceFieldImproveResult | null>(null);
  const [assistResult, setAssistResult] = useState<ServiceAssistResult | null>(null);
  const [selectedPatchFields, setSelectedPatchFields] = useState<Record<ServiceAssistField, boolean>>(
    createEmptyServiceAssistSelection({})
  );
  const {
    isRecording,
    isTranscribing,
    toggleRecording,
    cleanup: cleanupAudioCapture,
  } = useAudioTranscription({
    endpoint: '/api/transformation-map/service-transcribe',
    onTranscript: (transcript) => {
      setAssistNotes((current) => current.trim()
        ? `${current.trim()}\n\n${transcript}`.trim()
        : transcript);
      showToast('Transcript added to notes', 'success');
    },
    onError: (message) => setAssistError(message),
  });

  useEffect(() => {
    if (!isOpen || !service) return;
    setFormData(buildServiceEditorFormData(service));
    setAssistNotes('');
    setFillEmptyOnly(false);
    setError(null);
    setAssistError(null);
    setFieldImproveError(null);
    setFieldImproveSuggestion(null);
    setAssistResult(null);
    setSelectedPatchFields(createEmptyServiceAssistSelection({}));
  }, [isOpen, service]);

  useEffect(() => {
    if (isOpen) {
      return;
    }

    cleanupAudioCapture();
  }, [cleanupAudioCapture, isOpen]);

  if (!service) return null;

  const assistContext: ServiceAssistContext = {
    mapTitle,
    pressures: pressures.map((pressure) => ({
      type: pressure.type,
      title: pressure.title,
      description: pressure.description,
    })),
    enterpriseObjectives: enterpriseObjectives.map((objective) => ({
      title: objective.title,
      description: objective.description,
    })),
    department: department
      ? {
          id: department.id,
          name: department.name,
          description: department.description,
          keyIssues: department.keyIssues,
        }
      : null,
    departmentObjectives: departmentObjectives.map((objective) => ({
      title: objective.title,
      description: objective.description,
    })),
    service: formData,
  };

  const assistDiff = assistResult ? getServiceAssistDiff(formData, assistResult.patch) : [];
  const isFieldImproveBusy = Boolean(activeFieldImprove);
  const isAiBusy = isFieldImproveBusy || isGeneratingAssist || isSubmitting || isTranscribing;

  const applySelectedPatch = () => {
    if (!assistResult) {
      return;
    }

    const patch = Object.entries(assistResult.patch).reduce<Partial<ServiceEditorFormData>>((acc, [field, value]) => {
      const typedField = field as ServiceAssistField;
      if (selectedPatchFields[typedField]) {
        acc[typedField] = value as never;
      }
      return acc;
    }, {});

    setFormData((current) => ({
      ...current,
      ...patch,
    }));
    setAssistResult(null);
    setSelectedPatchFields(createEmptyServiceAssistSelection({}));
    showToast('Applied AI suggestions to the form', 'success');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim() || !formData.purpose.trim()) {
      setError('Name and purpose are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave({
        name: formData.name.trim(),
        purpose: formData.purpose.trim(),
        customer: formData.customer.trim(),
        trigger: formData.trigger.trim(),
        outcome: formData.outcome.trim(),
        constraints: textToLines(formData.constraintsText),
        status: formData.status,
        effectivenessMetric: formData.effectivenessMetric.trim(),
        efficiencyMetric: formData.efficiencyMetric.trim(),
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGlobalAssist = async () => {
    if (!assistNotes.trim()) {
      setAssistError('Paste notes or a transcript before populating the form.');
      return;
    }

    setAssistError(null);
    setIsGeneratingAssist(true);
    setAssistResult(null);
    setFieldImproveSuggestion(null);
    try {
      const response = await fetch('/api/transformation-map/service-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'global_extract',
          promptOverride: assistPrompt,
          notes: assistNotes,
          context: assistContext,
        } satisfies ServiceAssistRequest),
      });

      const payload = await response.json() as Partial<ServiceAssistResult> & { error?: string };
      if (!response.ok || !payload.patch) {
        throw new Error(payload.error || 'Failed to populate form');
      }

      const patch = filterServiceAssistPatch(formData, payload.patch, fillEmptyOnly);
      const nextResult: ServiceAssistResult = {
        patch,
        fieldMeta: payload.fieldMeta ?? {},
        warnings: payload.warnings ?? [],
        unmappedNotes: payload.unmappedNotes ?? [],
        model: payload.model ?? 'unknown',
      };

      setAssistResult(nextResult);
      setSelectedPatchFields(createEmptyServiceAssistSelection(nextResult.patch));
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

  const handleImproveField = async (targetField: ServiceAssistField) => {
    setActiveFieldImprove(targetField);
    setFieldImproveError(null);
    setFieldImproveSuggestion(null);
    try {
      const response = await fetch('/api/transformation-map/service-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'field_improve',
          promptOverride: fieldPrompt,
          targetField,
          context: assistContext,
        } satisfies ServiceAssistRequest),
      });

      const payload = await response.json() as Partial<ServiceFieldImproveResult> & { error?: string };
      if (!response.ok || !payload.suggestionText || !payload.targetField) {
        throw new Error(payload.error || 'Failed to improve field');
      }

      setFieldImproveSuggestion({
        targetField: payload.targetField,
        suggestionText: payload.suggestionText,
        reason: payload.reason,
        model: payload.model ?? 'unknown',
      });
    } catch (improveError) {
      setFieldImproveError(improveError instanceof Error ? improveError.message : 'Failed to improve field.');
    } finally {
      setActiveFieldImprove(null);
    }
  };

  const applyFieldSuggestion = () => {
    if (!fieldImproveSuggestion) {
      return;
    }

    setFormData((current) => ({
      ...current,
      [fieldImproveSuggestion.targetField]: fieldImproveSuggestion.suggestionText,
    }));
    showToast(`Updated ${SERVICE_ASSIST_FIELD_LABELS[fieldImproveSuggestion.targetField]}`, 'success');
    setFieldImproveSuggestion(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Service" size="large" closeOnOverlayClick={false}>
      <form onSubmit={handleSubmit} className="strategy-editor-form">
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
              <span className="form-help">Paste notes or transcript and populate this form with {SERVICE_ASSIST_MODEL_FALLBACK.replace(/^openai\//, '')}.</span>
              <Icon name={isAssistOpen ? 'chevron-up' : 'chevron-down'} size={16} />
            </div>
          </button>
          {isAssistOpen && (
            <div className="strategy-ai-assist__body">
              <div className="form-group">
                <div className="strategy-ai-assist__label-row">
                  <label htmlFor="service-assist-notes" className="form-label">Notes / transcript</label>
                  <div className="strategy-ai-assist__actions">
                    <button
                      type="button"
                      className={`btn btn--sm btn--ghost ${isRecording ? 'strategy-ai-assist__recording-btn' : ''}`.trim()}
                      onClick={toggleRecording}
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
                  id="service-assist-notes"
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
                      <label htmlFor="service-assist-prompt" className="form-label">Global assist instructions</label>
                      <textarea
                        id="service-assist-prompt"
                        className="form-textarea"
                        value={assistPrompt}
                        onChange={(event) => setAssistPrompt(event.target.value)}
                        rows={4}
                        disabled={isAiBusy}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="service-field-prompt" className="form-label">Field improve instructions</label>
                      <textarea
                        id="service-field-prompt"
                        className="form-textarea"
                        value={fieldPrompt}
                        onChange={(event) => setFieldPrompt(event.target.value)}
                        rows={3}
                        disabled={isAiBusy}
                      />
                    </div>
                    <div className="strategy-ai-assist__prompt-actions">
                      <button
                        type="button"
                        className="btn btn--sm btn--ghost"
                        onClick={() => {
                          setAssistPrompt(DEFAULT_SERVICE_GLOBAL_ASSIST_PROMPT);
                          setFieldPrompt(DEFAULT_SERVICE_FIELD_IMPROVE_PROMPT);
                        }}
                      >
                        Reset prompts
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {assistError && <FormError message={assistError} />}
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
                              <strong>{SERVICE_ASSIST_FIELD_LABELS[item.field]}</strong>
                              {assistResult.fieldMeta[item.field]?.reason && (
                                <span className="form-help">{assistResult.fieldMeta[item.field]?.reason}</span>
                              )}
                            </div>
                            <div className="strategy-ai-assist__proposal-values">
                              <div>
                                <span className="form-help">Current</span>
                                <pre>{item.currentValue || 'Empty'}</pre>
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
                        setSelectedPatchFields(createEmptyServiceAssistSelection({}));
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
              {fieldImproveError && <FormError message={fieldImproveError} />}
              {fieldImproveSuggestion && (
                <div className="strategy-ai-assist__field-suggestion">
                  <div className="strategy-ai-assist__proposal-header">
                    <div>
                      <h3 className="strategy-ai-assist__proposal-title">
                        Suggested {SERVICE_ASSIST_FIELD_LABELS[fieldImproveSuggestion.targetField]} update
                      </h3>
                      {fieldImproveSuggestion.reason && (
                        <p className="form-help">{fieldImproveSuggestion.reason}</p>
                      )}
                    </div>
                    <span className="badge">{fieldImproveSuggestion.model.replace(/^openai\//, '')}</span>
                  </div>
                  <pre>{fieldImproveSuggestion.suggestionText}</pre>
                  <div className="strategy-ai-assist__proposal-actions">
                    <button type="button" className="btn btn--secondary btn--sm" onClick={applyFieldSuggestion}>
                      Replace field
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setFieldImproveSuggestion(null)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
        <div className="form-row">
          <div className="form-group">
            <FieldLabel
              htmlFor="service-name"
              label="Name"
              isWorking={activeFieldImprove === 'name'}
              isDisabled={isAiBusy}
              onImprove={() => handleImproveField('name')}
            />
            <input
              id="service-name"
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
              disabled={isSubmitting}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="service-status" className="form-label">Status</label>
            <select
              id="service-status"
              className="form-select"
              value={formData.status}
              onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value as Service['status'] }))}
              disabled={isSubmitting}
            >
              {SERVICE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <FieldLabel
            htmlFor="service-purpose"
            label="Purpose"
            isWorking={activeFieldImprove === 'purpose'}
            isDisabled={isAiBusy}
            onImprove={() => handleImproveField('purpose')}
          />
          <textarea
            id="service-purpose"
            className="form-textarea"
            value={formData.purpose}
            onChange={(event) => setFormData((current) => ({ ...current, purpose: event.target.value }))}
            disabled={isSubmitting}
            rows={3}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <FieldLabel
              htmlFor="service-customer"
              label="Customer"
              isWorking={activeFieldImprove === 'customer'}
              isDisabled={isAiBusy}
              onImprove={() => handleImproveField('customer')}
            />
            <input
              id="service-customer"
              type="text"
              className="form-input"
              value={formData.customer}
              onChange={(event) => setFormData((current) => ({ ...current, customer: event.target.value }))}
              disabled={isSubmitting}
            />
          </div>
          <div className="form-group">
            <FieldLabel
              htmlFor="service-trigger"
              label="Trigger"
              isWorking={activeFieldImprove === 'trigger'}
              isDisabled={isAiBusy}
              onImprove={() => handleImproveField('trigger')}
            />
            <input
              id="service-trigger"
              type="text"
              className="form-input"
              value={formData.trigger}
              onChange={(event) => setFormData((current) => ({ ...current, trigger: event.target.value }))}
              disabled={isSubmitting}
            />
          </div>
        </div>
        <div className="form-group">
          <FieldLabel
            htmlFor="service-outcome"
            label="Outcome"
            isWorking={activeFieldImprove === 'outcome'}
            isDisabled={isAiBusy}
            onImprove={() => handleImproveField('outcome')}
          />
          <input
            id="service-outcome"
            type="text"
            className="form-input"
            value={formData.outcome}
            onChange={(event) => setFormData((current) => ({ ...current, outcome: event.target.value }))}
            disabled={isSubmitting}
          />
        </div>
        <div className="form-group">
          <FieldLabel
            htmlFor="service-constraints"
            label="Constraints"
            isWorking={activeFieldImprove === 'constraintsText'}
            isDisabled={isAiBusy}
            onImprove={() => handleImproveField('constraintsText')}
          />
          <textarea
            id="service-constraints"
            className="form-textarea"
            value={formData.constraintsText}
            onChange={(event) => setFormData((current) => ({ ...current, constraintsText: event.target.value }))}
            disabled={isSubmitting}
            rows={4}
            placeholder="One line per constraint"
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <FieldLabel
              htmlFor="service-effectiveness"
              label="Effectiveness"
              isWorking={activeFieldImprove === 'effectivenessMetric'}
              isDisabled={isAiBusy}
              onImprove={() => handleImproveField('effectivenessMetric')}
            />
            <textarea
              id="service-effectiveness"
              className="form-textarea"
              value={formData.effectivenessMetric}
              onChange={(event) => setFormData((current) => ({ ...current, effectivenessMetric: event.target.value }))}
              disabled={isSubmitting}
              rows={4}
            />
          </div>
          <div className="form-group">
            <FieldLabel
              htmlFor="service-efficiency"
              label="Efficiency"
              isWorking={activeFieldImprove === 'efficiencyMetric'}
              isDisabled={isAiBusy}
              onImprove={() => handleImproveField('efficiencyMetric')}
            />
            <textarea
              id="service-efficiency"
              className="form-textarea"
              value={formData.efficiencyMetric}
              onChange={(event) => setFormData((current) => ({ ...current, efficiencyMetric: event.target.value }))}
              disabled={isSubmitting}
              rows={4}
            />
          </div>
        </div>
        <FormError message={error} />
        <div className="modal__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

function FieldLabel({
  htmlFor,
  label,
  isWorking,
  isDisabled,
  onImprove,
}: {
  htmlFor: string;
  label: string;
  isWorking: boolean;
  isDisabled: boolean;
  onImprove: () => void;
}) {
  return (
    <div className="strategy-editor-field-label">
      <label htmlFor={htmlFor} className="form-label">{label}</label>
      <button
        type="button"
        className="btn btn--sm btn--ghost strategy-editor-field-label__action"
        onClick={onImprove}
        disabled={isDisabled}
      >
        <Icon name={isWorking ? 'loader-2' : 'sparkles'} size={14} className={isWorking ? 'loading-icon' : undefined} />
        {isWorking ? 'Improving...' : 'Improve'}
      </button>
    </div>
  );
}

interface FlowStepEditModalProps {
  isOpen: boolean;
  step: FlowStep | null;
  flowLabel: string;
  onClose: () => void;
  onSave: (updates: Partial<FlowStep>) => Promise<void>;
}

export function FlowStepEditModal({ isOpen, step, flowLabel, onClose, onSave }: FlowStepEditModalProps) {
  const { showToast } = useAppState();
  const [description, setDescription] = useState('');
  const [stepType, setStepType] = useState<FlowStepType>('process');
  const [hasDeviation, setHasDeviation] = useState(false);
  const [parallelGroup, setParallelGroup] = useState('');
  const [groupLabel, setGroupLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const flowStepFormData: FlowStepEditorFormData = {
    description,
    stepType,
    hasDeviation,
    parallelGroup,
    groupLabel,
  };
  const flowStepAssist = useStructuredFormAssist<
    FlowStepEditorFormData,
    keyof FlowStepEditorFormData & string,
    StrategyFormAssistRequest
  >({
    storageKey: STORAGE_KEYS.STRATEGY_FLOW_STEP_ASSIST_PROMPT,
    defaultPrompt: DEFAULT_FLOW_STEP_ASSIST_PROMPT,
    modelFallback: STRATEGY_FORM_ASSIST_MODEL_FALLBACK,
    current: flowStepFormData,
    fields: FLOW_STEP_FIELDS,
    buildRequest: (notes, promptOverride) => ({
      formType: 'flow-step',
      promptOverride,
      notes,
      context: {
        current: flowStepFormData,
        flowLabel,
      },
    }),
    onApplyPatch: (patch) => {
      if (patch.description !== undefined) setDescription(patch.description);
      if (patch.stepType !== undefined) setStepType(patch.stepType);
      if (patch.hasDeviation !== undefined) setHasDeviation(patch.hasDeviation);
      if (patch.parallelGroup !== undefined) setParallelGroup(patch.parallelGroup);
      if (patch.groupLabel !== undefined) setGroupLabel(patch.groupLabel);
    },
    requestEndpoint: '/api/strategy/form-assist',
    onToast: showToast,
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen || !step) return;
    setDescription(step.description);
    setStepType(step.stepType);
    setHasDeviation(Boolean(step.hasDeviation));
    setParallelGroup(step.parallelGroup ?? '');
    setGroupLabel(step.groupLabel ?? '');
    setError(null);
  }, [isOpen, step]);

  if (!step) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave({
        description: description.trim(),
        stepType,
        hasDeviation,
        parallelGroup: normalizeOptionalString(parallelGroup),
        groupLabel: normalizeOptionalString(groupLabel),
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save flow step.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${flowLabel} Step`} size="medium" closeOnOverlayClick={false}>
      <form onSubmit={handleSubmit} className="strategy-editor-form">
        <FormAssistPanel
          modelFallback={flowStepAssist.modelFallback}
          prompt={flowStepAssist.prompt}
          onPromptChange={flowStepAssist.setPrompt}
          onResetPrompt={flowStepAssist.resetPrompt}
          isAssistOpen={flowStepAssist.isAssistOpen}
          onToggleOpen={() => flowStepAssist.setIsAssistOpen(!flowStepAssist.isAssistOpen)}
          isAdvancedPromptOpen={flowStepAssist.isAdvancedPromptOpen}
          onToggleAdvanced={() => flowStepAssist.setIsAdvancedPromptOpen(!flowStepAssist.isAdvancedPromptOpen)}
          assistNotes={flowStepAssist.assistNotes}
          onNotesChange={flowStepAssist.setAssistNotes}
          fillEmptyOnly={flowStepAssist.fillEmptyOnly}
          onFillEmptyOnlyChange={flowStepAssist.setFillEmptyOnly}
          assistError={flowStepAssist.assistError}
          isGeneratingAssist={flowStepAssist.isGeneratingAssist}
          isRecording={flowStepAssist.isRecording}
          isTranscribing={flowStepAssist.isTranscribing}
          isAiBusy={flowStepAssist.isAiBusy || isSubmitting}
          onToggleRecording={flowStepAssist.toggleRecording}
          onGenerateAssist={flowStepAssist.generateAssist}
          assistResult={flowStepAssist.assistResult}
          assistDiff={flowStepAssist.assistDiff}
          selectedPatchFields={flowStepAssist.selectedPatchFields}
          onSelectionChange={(field, checked) =>
            flowStepAssist.setSelectedPatchFields((current) => ({ ...current, [field]: checked }))
          }
          onApplySelected={flowStepAssist.applySelectedPatch}
          onDismiss={flowStepAssist.dismissAssist}
        />
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="flow-step-type" className="form-label">Step Type</label>
            <select
              id="flow-step-type"
              className="form-select"
              value={stepType}
              onChange={(event) => setStepType(event.target.value as FlowStepType)}
              disabled={isSubmitting}
            >
              {FLOW_STEP_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Flags</label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={hasDeviation}
                onChange={(event) => setHasDeviation(event.target.checked)}
                disabled={isSubmitting}
              />
              <span>Highlights a deviation</span>
            </label>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="flow-step-description" className="form-label">Description</label>
          <textarea
            id="flow-step-description"
            className="form-textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isSubmitting}
            autoFocus
            rows={4}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="flow-step-parallel-group" className="form-label">Parallel Group</label>
            <input
              id="flow-step-parallel-group"
              type="text"
              className="form-input"
              value={parallelGroup}
              onChange={(event) => setParallelGroup(event.target.value)}
              disabled={isSubmitting}
              placeholder="Optional group key"
            />
          </div>
          <div className="form-group">
            <label htmlFor="flow-step-group-label" className="form-label">Group Label</label>
            <input
              id="flow-step-group-label"
              type="text"
              className="form-input"
              value={groupLabel}
              onChange={(event) => setGroupLabel(event.target.value)}
              disabled={isSubmitting}
              placeholder="Optional display label"
            />
          </div>
        </div>
        <FormError message={error} />
        <div className="modal__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

interface DeviationEditModalProps {
  isOpen: boolean;
  deviation: Deviation | null;
  onClose: () => void;
  onSave: (updates: Partial<Deviation>) => Promise<void>;
}

export function DeviationEditModal({ isOpen, deviation, onClose, onSave }: DeviationEditModalProps) {
  const { showToast } = useAppState();
  const [what, setWhat] = useState('');
  const [why, setWhy] = useState('');
  const [necessary, setNecessary] = useState(false);
  const [impact, setImpact] = useState<DeviationImpact>('medium');
  const [treatment, setTreatment] = useState<DeviationTreatment>('simplify');
  const [classification, setClassification] = useState<DeviationClassification>('handoff');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const deviationFormData: DeviationEditorFormData = {
    what,
    why,
    necessary,
    impact,
    treatment,
    classification,
  };
  const deviationAssist = useStructuredFormAssist<
    DeviationEditorFormData,
    keyof DeviationEditorFormData & string,
    StrategyFormAssistRequest
  >({
    storageKey: STORAGE_KEYS.STRATEGY_DEVIATION_ASSIST_PROMPT,
    defaultPrompt: DEFAULT_DEVIATION_ASSIST_PROMPT,
    modelFallback: STRATEGY_FORM_ASSIST_MODEL_FALLBACK,
    current: deviationFormData,
    fields: DEVIATION_FIELDS,
    buildRequest: (notes, promptOverride) => ({
      formType: 'deviation',
      promptOverride,
      notes,
      context: { current: deviationFormData },
    }),
    onApplyPatch: (patch) => {
      if (patch.what !== undefined) setWhat(patch.what);
      if (patch.why !== undefined) setWhy(patch.why);
      if (patch.necessary !== undefined) setNecessary(patch.necessary);
      if (patch.impact !== undefined) setImpact(patch.impact);
      if (patch.treatment !== undefined) setTreatment(patch.treatment);
      if (patch.classification !== undefined) setClassification(patch.classification);
    },
    requestEndpoint: '/api/strategy/form-assist',
    onToast: showToast,
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen || !deviation) return;
    setWhat(deviation.what);
    setWhy(deviation.why);
    setNecessary(deviation.necessary);
    setImpact(deviation.impact);
    setTreatment(deviation.treatment);
    setClassification(deviation.classification);
    setError(null);
  }, [isOpen, deviation]);

  if (!deviation) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!what.trim() || !why.trim()) {
      setError('What and why are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave({
        what: what.trim(),
        why: why.trim(),
        necessary,
        impact,
        treatment,
        classification,
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save deviation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Deviation" size="medium" closeOnOverlayClick={false}>
      <form onSubmit={handleSubmit} className="strategy-editor-form">
        <FormAssistPanel
          modelFallback={deviationAssist.modelFallback}
          prompt={deviationAssist.prompt}
          onPromptChange={deviationAssist.setPrompt}
          onResetPrompt={deviationAssist.resetPrompt}
          isAssistOpen={deviationAssist.isAssistOpen}
          onToggleOpen={() => deviationAssist.setIsAssistOpen(!deviationAssist.isAssistOpen)}
          isAdvancedPromptOpen={deviationAssist.isAdvancedPromptOpen}
          onToggleAdvanced={() => deviationAssist.setIsAdvancedPromptOpen(!deviationAssist.isAdvancedPromptOpen)}
          assistNotes={deviationAssist.assistNotes}
          onNotesChange={deviationAssist.setAssistNotes}
          fillEmptyOnly={deviationAssist.fillEmptyOnly}
          onFillEmptyOnlyChange={deviationAssist.setFillEmptyOnly}
          assistError={deviationAssist.assistError}
          isGeneratingAssist={deviationAssist.isGeneratingAssist}
          isRecording={deviationAssist.isRecording}
          isTranscribing={deviationAssist.isTranscribing}
          isAiBusy={deviationAssist.isAiBusy || isSubmitting}
          onToggleRecording={deviationAssist.toggleRecording}
          onGenerateAssist={deviationAssist.generateAssist}
          assistResult={deviationAssist.assistResult}
          assistDiff={deviationAssist.assistDiff}
          selectedPatchFields={deviationAssist.selectedPatchFields}
          onSelectionChange={(field, checked) =>
            deviationAssist.setSelectedPatchFields((current) => ({ ...current, [field]: checked }))
          }
          onApplySelected={deviationAssist.applySelectedPatch}
          onDismiss={deviationAssist.dismissAssist}
        />
        <div className="form-group">
          <label htmlFor="deviation-what" className="form-label">What</label>
          <textarea
            id="deviation-what"
            className="form-textarea"
            value={what}
            onChange={(event) => setWhat(event.target.value)}
            disabled={isSubmitting}
            autoFocus
            rows={3}
          />
        </div>
        <div className="form-group">
          <label htmlFor="deviation-why" className="form-label">Why</label>
          <textarea
            id="deviation-why"
            className="form-textarea"
            value={why}
            onChange={(event) => setWhy(event.target.value)}
            disabled={isSubmitting}
            rows={4}
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="deviation-impact" className="form-label">Impact</label>
            <select
              id="deviation-impact"
              className="form-select"
              value={impact}
              onChange={(event) => setImpact(event.target.value as DeviationImpact)}
              disabled={isSubmitting}
            >
              {DEVIATION_IMPACT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="deviation-treatment" className="form-label">Treatment</label>
            <select
              id="deviation-treatment"
              className="form-select"
              value={treatment}
              onChange={(event) => setTreatment(event.target.value as DeviationTreatment)}
              disabled={isSubmitting}
            >
              {DEVIATION_TREATMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="deviation-classification" className="form-label">Classification</label>
            <select
              id="deviation-classification"
              className="form-select"
              value={classification}
              onChange={(event) => setClassification(event.target.value as DeviationClassification)}
              disabled={isSubmitting}
            >
              {DEVIATION_CLASSIFICATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Required?</label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={necessary}
                onChange={(event) => setNecessary(event.target.checked)}
                disabled={isSubmitting}
              />
              <span>This step is necessary</span>
            </label>
          </div>
        </div>
        <FormError message={error} />
        <div className="modal__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

function LinkedAgentsEditor({
  linkedAgents,
  onChange,
  disabled,
}: {
  linkedAgents: LinkedAgent[];
  onChange: (nextLinkedAgents: LinkedAgent[]) => void;
  disabled: boolean;
}) {
  const updateAgent = (agentId: string, updates: Partial<LinkedAgent>) => {
    onChange(linkedAgents.map((agent) => (agent.id === agentId ? { ...agent, ...updates } : agent)));
  };

  const removeAgent = (agentId: string) => {
    onChange(linkedAgents.filter((agent) => agent.id !== agentId));
  };

  const addAgent = () => {
    onChange([
      ...linkedAgents,
      {
        id: createDraftId('linked-agent'),
        name: '',
        role: '',
      },
    ]);
  };

  return (
    <div className="strategy-linked-agents-editor">
      <div className="strategy-linked-agents-editor__list">
        {linkedAgents.map((agent) => (
          <div key={agent.id} className="strategy-linked-agents-editor__row">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Agent Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={agent.name}
                  onChange={(event) => updateAgent(agent.id, { name: event.target.value })}
                  disabled={disabled}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <input
                  type="text"
                  className="form-input"
                  value={agent.role}
                  onChange={(event) => updateAgent(agent.id, { role: event.target.value })}
                  disabled={disabled}
                />
              </div>
            </div>
            <button
              type="button"
              className="btn btn--sm btn--ghost strategy-linked-agents-editor__remove"
              onClick={() => removeAgent(agent.id)}
              disabled={disabled}
            >
              <Icon name="trash-2" size={14} />
              Remove
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn--secondary btn--sm" onClick={addAgent} disabled={disabled}>
        <Icon name="plus" size={14} />
        Add linked agent
      </button>
    </div>
  );
}

interface InitiativeEditModalProps {
  isOpen: boolean;
  initiative: Initiative | null;
  onClose: () => void;
  onSave: (updates: Partial<Initiative>) => Promise<void>;
}

export function InitiativeEditModal({ isOpen, initiative, onClose, onSave }: InitiativeEditModalProps) {
  const { showToast } = useAppState();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Initiative['status']>('proposed');
  const [linkedAgents, setLinkedAgents] = useState<LinkedAgent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initiativeFormData: InitiativeEditorFormData = {
    title,
    description,
    status,
    linkedAgents: linkedAgents.map((agent) => ({
      name: agent.name,
      role: agent.role,
    })),
  };
  const initiativeAssist = useStructuredFormAssist<
    InitiativeEditorFormData,
    keyof InitiativeEditorFormData & string,
    StrategyFormAssistRequest
  >({
    storageKey: STORAGE_KEYS.STRATEGY_INITIATIVE_ASSIST_PROMPT,
    defaultPrompt: DEFAULT_INITIATIVE_ASSIST_PROMPT,
    modelFallback: STRATEGY_FORM_ASSIST_MODEL_FALLBACK,
    current: initiativeFormData,
    fields: INITIATIVE_FIELDS,
    buildRequest: (notes, promptOverride) => ({
      formType: 'initiative',
      promptOverride,
      notes,
      context: { current: initiativeFormData },
    }),
    onApplyPatch: (patch) => {
      if (patch.title !== undefined) setTitle(patch.title);
      if (patch.description !== undefined) setDescription(patch.description);
      if (patch.status !== undefined) setStatus(patch.status);
      if (patch.linkedAgents !== undefined) {
        setLinkedAgents(patch.linkedAgents.map((agent) => ({
          id: createDraftId('linked-agent'),
          name: agent.name,
          role: agent.role,
        })));
      }
    },
    requestEndpoint: '/api/strategy/form-assist',
    onToast: showToast,
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen || !initiative) return;
    setTitle(initiative.title);
    setDescription(initiative.description);
    setStatus(initiative.status);
    setLinkedAgents(initiative.linkedAgents);
    setError(null);
  }, [isOpen, initiative]);

  if (!initiative) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    const cleanedAgents = linkedAgents
      .map((agent) => ({
        ...agent,
        name: agent.name.trim(),
        role: agent.role.trim(),
      }))
      .filter((agent) => agent.name && agent.role);

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        status,
        linkedAgents: cleanedAgents,
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save initiative.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Initiative" size="large" closeOnOverlayClick={false}>
      <form onSubmit={handleSubmit} className="strategy-editor-form">
        <FormAssistPanel
          modelFallback={initiativeAssist.modelFallback}
          prompt={initiativeAssist.prompt}
          onPromptChange={initiativeAssist.setPrompt}
          onResetPrompt={initiativeAssist.resetPrompt}
          isAssistOpen={initiativeAssist.isAssistOpen}
          onToggleOpen={() => initiativeAssist.setIsAssistOpen(!initiativeAssist.isAssistOpen)}
          isAdvancedPromptOpen={initiativeAssist.isAdvancedPromptOpen}
          onToggleAdvanced={() => initiativeAssist.setIsAdvancedPromptOpen(!initiativeAssist.isAdvancedPromptOpen)}
          assistNotes={initiativeAssist.assistNotes}
          onNotesChange={initiativeAssist.setAssistNotes}
          fillEmptyOnly={initiativeAssist.fillEmptyOnly}
          onFillEmptyOnlyChange={initiativeAssist.setFillEmptyOnly}
          assistError={initiativeAssist.assistError}
          isGeneratingAssist={initiativeAssist.isGeneratingAssist}
          isRecording={initiativeAssist.isRecording}
          isTranscribing={initiativeAssist.isTranscribing}
          isAiBusy={initiativeAssist.isAiBusy || isSubmitting}
          onToggleRecording={initiativeAssist.toggleRecording}
          onGenerateAssist={initiativeAssist.generateAssist}
          assistResult={initiativeAssist.assistResult}
          assistDiff={initiativeAssist.assistDiff}
          selectedPatchFields={initiativeAssist.selectedPatchFields}
          onSelectionChange={(field, checked) =>
            initiativeAssist.setSelectedPatchFields((current) => ({ ...current, [field]: checked }))
          }
          onApplySelected={initiativeAssist.applySelectedPatch}
          onDismiss={initiativeAssist.dismissAssist}
        />
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="initiative-title" className="form-label">Title</label>
            <input
              id="initiative-title"
              type="text"
              className="form-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="initiative-status" className="form-label">Status</label>
            <select
              id="initiative-status"
              className="form-select"
              value={status}
              onChange={(event) => setStatus(event.target.value as Initiative['status'])}
              disabled={isSubmitting}
            >
              {INITIATIVE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="initiative-description" className="form-label">Description</label>
          <textarea
            id="initiative-description"
            className="form-textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={isSubmitting}
            rows={4}
          />
        </div>
        <div className="form-group">
          <span className="form-label">Linked Agents</span>
          <LinkedAgentsEditor linkedAgents={linkedAgents} onChange={setLinkedAgents} disabled={isSubmitting} />
        </div>
        <FormError message={error} />
        <div className="modal__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
