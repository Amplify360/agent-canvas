/**
 * OverviewView - Strategic context overview (executive level)
 *
 * Shows pressures, enterprise objectives, and department summary cards.
 */

'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';
import type { StrategicPressure, StrategicObjective, DepartmentSummary } from '@/strategy/types';

interface OverviewViewProps {
  pressures: StrategicPressure[];
  enterpriseObjectives: StrategicObjective[];
  departmentSummaries: DepartmentSummary[];
  onSelectDepartment: (departmentId: string) => void;
  getPressure: (id: string) => StrategicPressure | undefined;
}

const PRESSURE_ICONS: Record<StrategicPressure['type'], string> = {
  external: 'globe',
  internal: 'building',
};

export function OverviewView({
  pressures,
  enterpriseObjectives,
  departmentSummaries,
  onSelectDepartment,
  getPressure,
}: OverviewViewProps) {
  const externalPressures = pressures.filter((p) => p.type === 'external');
  const internalPressures = pressures.filter((p) => p.type === 'internal');

  return (
    <div className="strategy-overview">
      {/* Pressures */}
      <section className="strategy-section">
        <div className="strategy-section__header">
          <Icon name="alert-triangle" size={18} />
          <h2 className="strategy-section__title">External Pressures</h2>
          <span className="badge">{externalPressures.length}</span>
        </div>
        <div className="strategy-card-grid">
          {externalPressures.map((p) => (
            <PressureCard key={p.id} pressure={p} />
          ))}
        </div>
      </section>

      <section className="strategy-section">
        <div className="strategy-section__header">
          <Icon name="alert-circle" size={18} />
          <h2 className="strategy-section__title">Internal Pain Points</h2>
          <span className="badge">{internalPressures.length}</span>
        </div>
        <div className="strategy-card-grid">
          {internalPressures.map((p) => (
            <PressureCard key={p.id} pressure={p} />
          ))}
        </div>
      </section>

      {/* Enterprise Objectives */}
      <section className="strategy-section">
        <div className="strategy-section__header">
          <Icon name="target" size={18} />
          <h2 className="strategy-section__title">Enterprise Objectives</h2>
          <span className="badge">{enterpriseObjectives.length}</span>
        </div>
        <div className="strategy-card-grid">
          {enterpriseObjectives.map((obj) => (
            <ObjectiveCard key={obj.id} objective={obj} getPressure={getPressure} />
          ))}
        </div>
      </section>

      {/* Departments */}
      <section className="strategy-section">
        <div className="strategy-section__header">
          <Icon name="building-2" size={18} />
          <h2 className="strategy-section__title">Departments</h2>
          <span className="badge">{departmentSummaries.length}</span>
        </div>
        <div className="strategy-card-grid">
          {departmentSummaries.map((dept) => (
            <DepartmentCard key={dept.id} department={dept} onClick={() => onSelectDepartment(dept.id)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function PressureCard({ pressure }: { pressure: StrategicPressure }) {
  return (
    <div className="strategy-card">
      <div className="strategy-card__header">
        <Icon name={PRESSURE_ICONS[pressure.type]} size={16} />
        <span className="strategy-card__type">
          {pressure.type === 'external' ? 'External' : 'Internal'}
        </span>
      </div>
      <h3 className="strategy-card__title">{pressure.title}</h3>
      <p className="strategy-card__description">{pressure.description}</p>
      {pressure.evidence.length > 0 && (
        <div className="strategy-card__evidence">
          {pressure.evidence.map((e, i) => (
            <span key={i} className="strategy-card__evidence-item">
              <Icon name="check-circle" size={12} />
              {e}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ObjectiveCard({
  objective,
  getPressure,
}: {
  objective: StrategicObjective;
  getPressure: (id: string) => StrategicPressure | undefined;
}) {
  return (
    <div className="strategy-card">
      <h3 className="strategy-card__title">{objective.title}</h3>
      <p className="strategy-card__description">{objective.description}</p>
      {objective.linkedPressureIds.length > 0 && (
        <div className="strategy-card__links">
          <span className="strategy-card__links-label">Linked pressures:</span>
          {objective.linkedPressureIds.map((pId) => {
            const p = getPressure(pId);
            return p ? (
              <span key={pId} className="chip">{p.title}</span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

function DepartmentCard({
  department,
  onClick,
}: {
  department: DepartmentSummary;
  onClick: () => void;
}) {
  return (
    <button className="strategy-card strategy-card--clickable" onClick={onClick}>
      <h3 className="strategy-card__title">{department.name}</h3>
      <p className="strategy-card__description">{department.description}</p>
      {department.improvementMandates.length > 0 && (
        <div className="strategy-card__mandates">
          <span className="strategy-card__mandates-label">Improvement mandates</span>
          {department.improvementMandates.map((objective) => (
            <span key={objective.id} className="strategy-card__mandate-item">
              <Icon name="target" size={12} />
              {objective.title}
            </span>
          ))}
        </div>
      )}
      <div className="strategy-card__stats">
        <span className="strategy-card__stat">
          <Icon name="layers" size={14} />
          {department.serviceCount} services
        </span>
        <span className="strategy-card__stat">
          <Icon name="search" size={14} />
          {department.analyzedCount} analyzed
        </span>
        {department.deviationCount > 0 && (
          <span className="strategy-card__stat strategy-card__stat--warning">
            <Icon name="alert-triangle" size={14} />
            {department.deviationCount} deviations
          </span>
        )}
      </div>
    </button>
  );
}
