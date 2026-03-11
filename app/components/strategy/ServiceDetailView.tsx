/**
 * ServiceDetailView - Side-by-side flow comparison with deviation analysis
 *
 * The core analytical view: ideal flow vs current flow, with deviations highlighted.
 */

'use client';

import React, { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { Service, FlowStep, FlowStepType, Deviation, Initiative } from '@/strategy/types';

interface ServiceDetailViewProps {
  service: Service;
  idealSteps: FlowStep[];
  currentSteps: FlowStep[];
  deviations: Deviation[];
  initiatives: Initiative[];
}

const STEP_TYPE_CONFIG: Record<FlowStepType, { icon: string; color: string }> = {
  input: { icon: 'log-in', color: 'var(--info)' },
  process: { icon: 'cog', color: 'var(--text-secondary)' },
  output: { icon: 'log-out', color: 'var(--success)' },
  control: { icon: 'shield-check', color: 'var(--accent-primary)' },
  approval: { icon: 'user-check', color: 'var(--warning)' },
  handoff: { icon: 'arrow-right-left', color: 'var(--warning)' },
  rework: { icon: 'rotate-ccw', color: 'var(--error)' },
  exception: { icon: 'alert-circle', color: 'var(--error)' },
};

const TREATMENT_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  automate: { label: 'Automate', badgeClass: 'badge badge--info' },
  eliminate: { label: 'Eliminate', badgeClass: 'badge badge--error' },
  simplify: { label: 'Simplify', badgeClass: 'badge badge--warning' },
  accept: { label: 'Accept', badgeClass: 'badge badge--success' },
};

const IMPACT_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  high: { label: 'High', badgeClass: 'badge badge--error' },
  medium: { label: 'Medium', badgeClass: 'badge badge--warning' },
  low: { label: 'Low', badgeClass: 'badge badge--success' },
};

const NECESSARY_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  true: { label: 'Required', badgeClass: 'badge badge--warning' },
  false: { label: 'Not required', badgeClass: 'badge badge--success' },
};

const INITIATIVE_STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  proposed: { label: 'Proposed', badgeClass: 'badge' },
  approved: { label: 'Approved', badgeClass: 'badge badge--info' },
  'in-progress': { label: 'In Progress', badgeClass: 'badge badge--warning' },
  done: { label: 'Done', badgeClass: 'badge badge--success' },
};

type ActiveTab = 'flows' | 'deviations' | 'initiatives';

export function ServiceDetailView({
  service,
  idealSteps,
  currentSteps,
  deviations,
  initiatives,
}: ServiceDetailViewProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('flows');

  return (
    <div className="strategy-service-detail">
      {/* Service header */}
      <div className="strategy-service-detail__header">
        <h2 className="strategy-service-detail__name">{service.name}</h2>
        <p className="strategy-service-detail__purpose">{service.purpose}</p>
        <div className="strategy-service-detail__meta">
          <span className="strategy-service-detail__meta-item">
            <strong>Customer:</strong> {service.customer}
          </span>
          <span className="strategy-service-detail__meta-item">
            <strong>Trigger:</strong> {service.trigger}
          </span>
          <span className="strategy-service-detail__meta-item">
            <strong>Outcome:</strong> {service.outcome}
          </span>
        </div>
        {service.effectivenessMetric && service.effectivenessMetric !== 'Not yet assessed.' && (
          <div className="strategy-service-detail__metrics">
            <div className="strategy-service-detail__metric">
              <div className="strategy-service-detail__metric-header">
                <Icon name="target" size={16} />
                <span>Effectiveness</span>
              </div>
              <p className="strategy-service-detail__metric-value">{service.effectivenessMetric}</p>
            </div>
            <div className="strategy-service-detail__metric">
              <div className="strategy-service-detail__metric-header">
                <Icon name="gauge" size={16} />
                <span>Efficiency</span>
              </div>
              <p className="strategy-service-detail__metric-value">{service.efficiencyMetric}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tab navigation */}
      <div className="strategy-tabs">
        <button
          className={`strategy-tab ${activeTab === 'flows' ? 'strategy-tab--active' : ''}`}
          onClick={() => setActiveTab('flows')}
        >
          <Icon name="git-compare" size={16} />
          Flows
          <span className="strategy-tab__count">{idealSteps.length} / {currentSteps.length}</span>
        </button>
        <button
          className={`strategy-tab ${activeTab === 'deviations' ? 'strategy-tab--active' : ''}`}
          onClick={() => setActiveTab('deviations')}
        >
          <Icon name="alert-triangle" size={16} />
          Deviations
          {deviations.length > 0 && <span className="strategy-tab__count">{deviations.length}</span>}
        </button>
        <button
          className={`strategy-tab ${activeTab === 'initiatives' ? 'strategy-tab--active' : ''}`}
          onClick={() => setActiveTab('initiatives')}
        >
          <Icon name="rocket" size={16} />
          Initiatives
          {initiatives.length > 0 && <span className="strategy-tab__count">{initiatives.length}</span>}
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'flows' && (
        <FlowComparison idealSteps={idealSteps} currentSteps={currentSteps} />
      )}
      {activeTab === 'deviations' && (
        <DeviationTable deviations={deviations} />
      )}
      {activeTab === 'initiatives' && (
        <InitiativeList initiatives={initiatives} deviations={deviations} />
      )}
    </div>
  );
}

/** Group consecutive steps that share a parallelGroup into blocks */
function groupSteps(steps: FlowStep[]): Array<{ parallel: boolean; group?: string; steps: FlowStep[] }> {
  const blocks: Array<{ parallel: boolean; group?: string; steps: FlowStep[] }> = [];
  for (const step of steps) {
    const lastBlock = blocks[blocks.length - 1];
    if (step.parallelGroup) {
      if (lastBlock?.parallel && lastBlock.group === step.parallelGroup) {
        lastBlock.steps.push(step);
      } else {
        blocks.push({ parallel: true, group: step.parallelGroup, steps: [step] });
      }
    } else {
      blocks.push({ parallel: false, steps: [step] });
    }
  }
  return blocks;
}

function FlowComparison({
  idealSteps,
  currentSteps,
}: {
  idealSteps: FlowStep[];
  currentSteps: FlowStep[];
}) {
  const idealBlocks = groupSteps(idealSteps);
  const currentBlocks = groupSteps(currentSteps);

  return (
    <div className="strategy-flows">
      <div className="strategy-flow-column">
        <div className="strategy-flow-column__header">
          <Icon name="sparkles" size={16} />
          <h3>First-Principles Flow</h3>
          <span className="badge badge--success">{idealSteps.length} steps</span>
        </div>
        <div className="strategy-flow-steps">
          {idealBlocks.map((block, i) =>
            block.parallel ? (
              <GroupBlock key={`p-${i}`} steps={block.steps} />
            ) : (
              <FlowStepCard key={block.steps[0].id} step={block.steps[0]} />
            )
          )}
        </div>
      </div>
      <div className="strategy-flow-column">
        <div className="strategy-flow-column__header">
          <Icon name="git-branch" size={16} />
          <h3>Current-State Flow</h3>
          <span className="badge badge--warning">{currentSteps.length} steps</span>
        </div>
        <div className="strategy-flow-steps">
          {currentBlocks.map((block, i) =>
            block.parallel ? (
              <GroupBlock key={`p-${i}`} steps={block.steps} />
            ) : (
              <FlowStepCard key={block.steps[0].id} step={block.steps[0]} />
            )
          )}
        </div>
      </div>
    </div>
  );
}

function GroupBlock({ steps }: { steps: FlowStep[] }) {
  const label = steps.find((s) => s.groupLabel)?.groupLabel;
  return (
    <div className="strategy-flow-group">
      {label && (
        <div className="strategy-flow-group__label">{label}</div>
      )}
      <div className="strategy-flow-group__steps">
        {steps.map((step) => (
          <FlowStepCard key={step.id} step={step} />
        ))}
      </div>
    </div>
  );
}

function FlowStepCard({ step }: { step: FlowStep }) {
  const config = STEP_TYPE_CONFIG[step.stepType];

  return (
    <div className={`strategy-flow-step ${step.hasDeviation ? 'strategy-flow-step--deviation' : ''}`}>
      <div className="strategy-flow-step__number">{step.order}</div>
      <div className="strategy-flow-step__icon" style={{ color: config.color }}>
        <Icon name={config.icon} size={16} />
      </div>
      <div className="strategy-flow-step__content">
        <span className="strategy-flow-step__type">{step.stepType}</span>
        <span className="strategy-flow-step__description">{step.description}</span>
      </div>
      {step.hasDeviation && (
        <div className="strategy-flow-step__deviation-marker">
          <Icon name="alert-triangle" size={14} />
        </div>
      )}
    </div>
  );
}

function DeviationTable({ deviations }: { deviations: Deviation[] }) {
  if (deviations.length === 0) {
    return (
      <div className="strategy-empty">
        <Icon name="check-circle" size={32} />
        <p>No deviations identified for this service.</p>
      </div>
    );
  }

  return (
    <div className="strategy-deviation-table">
      <div className="strategy-deviation-table__header">
        <span>What</span>
        <span>Why</span>
        <span>Necessary?</span>
        <span>Impact</span>
        <span>Treatment</span>
        <span>Type</span>
      </div>
      {deviations.map((d) => {
        const necessary = NECESSARY_CONFIG[String(d.necessary)];
        const treatment = TREATMENT_CONFIG[d.treatment];
        const impact = IMPACT_CONFIG[d.impact];
        return (
          <div key={d.id} className="strategy-deviation-row">
            <div className="strategy-deviation-row__what">
              <span className="strategy-deviation-row__title">{d.what}</span>
            </div>
            <div className="strategy-deviation-row__why">{d.why}</div>
            <div>
              <span className={necessary.badgeClass}>{necessary.label}</span>
            </div>
            <div>
              <span className={impact.badgeClass}>{impact.label}</span>
            </div>
            <div>
              <span className={treatment.badgeClass}>{treatment.label}</span>
            </div>
            <div>
              <span className="chip">{d.classification}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InitiativeList({ initiatives, deviations }: { initiatives: Initiative[]; deviations: Deviation[] }) {
  if (initiatives.length === 0) {
    return (
      <div className="strategy-empty">
        <Icon name="rocket" size={32} />
        <p>No initiatives linked to this service yet.</p>
      </div>
    );
  }

  const deviationMap = new Map(deviations.map((d) => [d.id, d]));

  return (
    <div className="strategy-initiative-list">
      {initiatives.map((init) => {
        const status = INITIATIVE_STATUS_CONFIG[init.status];
        const addressedDeviations = init.deviationIds
          .map((id) => deviationMap.get(id))
          .filter(Boolean) as Deviation[];

        return (
          <div key={init.id} className="strategy-initiative-card">
            <div className="strategy-initiative-card__header">
              <h4 className="strategy-initiative-card__title">{init.title}</h4>
              <span className={status.badgeClass}>{status.label}</span>
            </div>
            <p className="strategy-initiative-card__description">{init.description}</p>

            {addressedDeviations.length > 0 && (
              <div className="strategy-initiative-card__deviations">
                <Icon name="alert-triangle" size={14} />
                <span>Addresses:</span>
                {addressedDeviations.map((d) => (
                  <span key={d.id} className="chip chip--sm">{d.what}</span>
                ))}
              </div>
            )}

            {init.linkedAgents.length > 0 && (
              <div className="strategy-initiative-card__agents">
                <div className="strategy-initiative-card__agents-header">
                  <Icon name="bot" size={14} />
                  <span>{init.linkedAgents.length} agent{init.linkedAgents.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="strategy-initiative-card__agent-list">
                  {init.linkedAgents.map((agent) => (
                    <div key={agent.id} className="strategy-initiative-card__agent">
                      <span className="strategy-initiative-card__agent-name">{agent.name}</span>
                      <span className="strategy-initiative-card__agent-role">{agent.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
