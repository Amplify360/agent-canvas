'use client';

import { Icon } from '@/components/ui/Icon';

interface FormAssistPanelProps<Field extends string> {
  modelFallback: string;
  prompt: string;
  onPromptChange: (value: string) => void;
  onResetPrompt: () => void;
  isAssistOpen: boolean;
  onToggleOpen: () => void;
  isAdvancedPromptOpen: boolean;
  onToggleAdvanced: () => void;
  assistNotes: string;
  onNotesChange: (value: string) => void;
  fillEmptyOnly: boolean;
  onFillEmptyOnlyChange: (value: boolean) => void;
  assistError: string | null;
  isGeneratingAssist: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  isAiBusy: boolean;
  onToggleRecording: () => void;
  onGenerateAssist: () => void;
  assistResult: {
    fieldMeta: Partial<Record<Field, { reason?: string }>>;
    warnings: string[];
    model: string;
  } | null;
  assistDiff: Array<{ field: Field; label: string; currentValue: string; proposedValue: string }>;
  selectedPatchFields: Record<Field, boolean>;
  onSelectionChange: (field: Field, checked: boolean) => void;
  onApplySelected: () => void;
  onDismiss: () => void;
}

export function FormAssistPanel<Field extends string>({
  modelFallback,
  prompt,
  onPromptChange,
  onResetPrompt,
  isAssistOpen,
  onToggleOpen,
  isAdvancedPromptOpen,
  onToggleAdvanced,
  assistNotes,
  onNotesChange,
  fillEmptyOnly,
  onFillEmptyOnlyChange,
  assistError,
  isGeneratingAssist,
  isRecording,
  isTranscribing,
  isAiBusy,
  onToggleRecording,
  onGenerateAssist,
  assistResult,
  assistDiff,
  selectedPatchFields,
  onSelectionChange,
  onApplySelected,
  onDismiss,
}: FormAssistPanelProps<Field>) {
  return (
    <section className="strategy-ai-assist">
      <button
        type="button"
        className="strategy-ai-assist__toggle"
        onClick={onToggleOpen}
        aria-expanded={isAssistOpen}
      >
        <span className="strategy-ai-assist__toggle-main">
          <Icon name="sparkles" size={16} />
          <span>AI Assist</span>
        </span>
        <div className="strategy-ai-assist__toggle-meta">
          <span className="form-help">Paste notes or transcript and populate this form with {modelFallback.replace(/^openai\//, '')}.</span>
          <Icon name={isAssistOpen ? 'chevron-up' : 'chevron-down'} size={16} />
        </div>
      </button>
      {isAssistOpen && (
        <div className="strategy-ai-assist__body">
          <div className="form-group">
            <div className="strategy-ai-assist__label-row">
              <label className="form-label">Notes / transcript</label>
              <div className="strategy-ai-assist__actions">
                <button
                  type="button"
                  className={`btn btn--sm btn--ghost ${isRecording ? 'strategy-ai-assist__recording-btn' : ''}`.trim()}
                  onClick={onToggleRecording}
                  disabled={isAiBusy && !isRecording}
                >
                  <Icon name={isRecording ? 'square' : 'mic'} size={14} />
                  {isRecording ? 'Stop recording' : 'Record'}
                </button>
                <button
                  type="button"
                  className="btn btn--sm btn--secondary"
                  onClick={onGenerateAssist}
                  disabled={isAiBusy}
                >
                  <Icon name={isGeneratingAssist ? 'loader-2' : 'sparkles'} size={14} className={isGeneratingAssist ? 'loading-icon' : undefined} />
                  {isGeneratingAssist ? 'Populating...' : 'Populate form'}
                </button>
              </div>
            </div>
            <textarea
              className="form-textarea"
              value={assistNotes}
              onChange={(event) => onNotesChange(event.target.value)}
              disabled={isAiBusy}
              rows={6}
              placeholder="Paste a narrative, workshop notes, or a transcript here."
            />
            <div className="strategy-ai-assist__options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={fillEmptyOnly}
                  onChange={(event) => onFillEmptyOnlyChange(event.target.checked)}
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
              onClick={onToggleAdvanced}
              aria-expanded={isAdvancedPromptOpen}
            >
              <Icon name={isAdvancedPromptOpen ? 'chevron-up' : 'chevron-down'} size={14} />
              Advanced prompt
            </button>
            {isAdvancedPromptOpen && (
              <div className="strategy-ai-assist__advanced-body">
                <div className="form-group">
                  <label className="form-label">Assist instructions</label>
                  <textarea
                    className="form-textarea"
                    value={prompt}
                    onChange={(event) => onPromptChange(event.target.value)}
                    rows={4}
                    disabled={isAiBusy}
                  />
                </div>
                <div className="strategy-ai-assist__prompt-actions">
                  <button type="button" className="btn btn--sm btn--ghost" onClick={onResetPrompt}>
                    Reset prompt
                  </button>
                </div>
              </div>
            )}
          </div>
          {assistError && (
            <p className="form-error">
              <Icon name="alert-circle" size={14} />
              <span>{assistError}</span>
            </p>
          )}
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
                        onChange={(event) => onSelectionChange(item.field, event.target.checked)}
                      />
                      <div className="strategy-ai-assist__proposal-item-body">
                        <div className="strategy-ai-assist__proposal-item-header">
                          <strong>{item.label}</strong>
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
                  onClick={onApplySelected}
                  disabled={!assistDiff.some((item) => selectedPatchFields[item.field])}
                >
                  Apply selected
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={onDismiss}>
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
