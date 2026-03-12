/**
 * DepartmentView - Department detail with services list
 */

'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';
import { StrategyActionMenu } from './StrategyActionMenu';
import type { Department, Service, StrategicObjective } from '@/strategy/types';

interface DepartmentViewProps {
  department: Department;
  services: Service[];
  objectives: StrategicObjective[];
  onSelectService: (serviceId: string) => void;
  getAgentCount: (serviceId: string) => number;
  onEditDepartment: (department: Department) => void;
  onDeleteDepartment: (department: Department) => void;
  onEditObjective: (objective: StrategicObjective) => void;
  onDeleteObjective: (objective: StrategicObjective) => void;
  onEditService: (service: Service) => void;
  onDeleteService: (service: Service) => void;
}

const STATUS_CONFIG: Record<Service['status'], { label: string; badgeClass: string; icon: string }> = {
  'not-analyzed': { label: 'Not started', badgeClass: 'badge', icon: 'circle-dashed' },
  analyzed: { label: 'Analyzed', badgeClass: 'badge badge--info', icon: 'check-circle' },
  'has-deviations': { label: 'Has deviations', badgeClass: 'badge badge--warning', icon: 'alert-triangle' },
};

export function DepartmentView({
  department,
  services,
  objectives,
  onSelectService,
  getAgentCount,
  onEditDepartment,
  onDeleteDepartment,
  onEditObjective,
  onDeleteObjective,
  onEditService,
  onDeleteService,
}: DepartmentViewProps) {
  return (
    <div className="strategy-department">
      {/* Department header */}
      <div className="strategy-department__header">
        <div className="strategy-department__title-row">
          <h2 className="strategy-department__name">{department.name}</h2>
          <StrategyActionMenu
            actions={[
              { label: 'Edit', icon: 'edit-3', onSelect: () => onEditDepartment(department) },
              { label: 'Delete', icon: 'trash-2', tone: 'danger', onSelect: () => onDeleteDepartment(department) },
            ]}
          />
        </div>
        <p className="strategy-department__description">{department.description}</p>
      </div>

      {/* Department improvement priorities */}
      {objectives.length > 0 && (
        <section className="strategy-section">
          <div className="strategy-section__header">
            <Icon name="target" size={18} />
            <h3 className="strategy-section__title">Improvement Priorities</h3>
          </div>
          <div className="strategy-objectives-list">
            {objectives.map((obj) => (
              <div key={obj.id} className="strategy-objective-item">
                <Icon name="arrow-right" size={14} className="strategy-objective-item__icon" />
                <div className="strategy-objective-item__content">
                  <span className="strategy-objective-item__title">{obj.title}</span>
                  <span className="strategy-objective-item__description">{obj.description}</span>
                </div>
                <StrategyActionMenu
                  actions={[
                    { label: 'Edit', icon: 'edit-3', onSelect: () => onEditObjective(obj) },
                    { label: 'Delete', icon: 'trash-2', tone: 'danger', onSelect: () => onDeleteObjective(obj) },
                  ]}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Services */}
      <section className="strategy-section">
        <div className="strategy-section__header">
          <Icon name="layers" size={18} />
          <h3 className="strategy-section__title">Services</h3>
          <span className="badge">{services.length}</span>
        </div>
        <div className="strategy-service-grid">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              agentCount={getAgentCount(service.id)}
              onClick={() => onSelectService(service.id)}
              onEdit={() => onEditService(service)}
              onDelete={() => onDeleteService(service)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ServiceCard({
  service,
  agentCount,
  onClick,
  onEdit,
  onDelete,
}: {
  service: Service;
  agentCount: number;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = STATUS_CONFIG[service.status];
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div className="strategy-service-card">
      <div className="strategy-service-card__header">
        <h4 className="strategy-service-card__name">{service.name}</h4>
        <div className="strategy-service-card__header-actions">
          <span className={status.badgeClass}>
            <Icon name={status.icon} size={12} />
            {status.label}
          </span>
          <StrategyActionMenu
            actions={[
              { label: 'Edit', icon: 'edit-3', onSelect: onEdit },
              { label: 'Delete', icon: 'trash-2', tone: 'danger', onSelect: onDelete },
            ]}
          />
        </div>
      </div>
      <div
        className="strategy-service-card__content-button"
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleKeyDown}
      >
        <p className="strategy-service-card__purpose">{service.purpose}</p>
        <div className="strategy-service-card__metrics">
          <div className="strategy-service-card__metric">
            <div className="strategy-service-card__metric-header">
              <Icon name="target" size={14} />
              <span className="strategy-service-card__metric-label">Effectiveness</span>
            </div>
            <span className="strategy-service-card__metric-value">{service.effectivenessMetric}</span>
          </div>
          <div className="strategy-service-card__metric">
            <div className="strategy-service-card__metric-header">
              <Icon name="gauge" size={14} />
              <span className="strategy-service-card__metric-label">Efficiency</span>
            </div>
            <span className="strategy-service-card__metric-value">{service.efficiencyMetric}</span>
          </div>
        </div>
        {agentCount > 0 && (
          <div className="strategy-service-card__agents">
            <Icon name="bot" size={14} />
            <span>{agentCount} unique agent{agentCount !== 1 ? 's' : ''} linked</span>
          </div>
        )}
        {service.constraints.length > 0 && (
          <div className="strategy-service-card__constraints">
            {service.constraints.map((c, i) => (
              <span key={i} className="chip">{c}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
