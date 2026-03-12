/**
 * DepartmentView - Department detail with services list
 */

'use client';

import React from 'react';
import { Icon } from '@/components/ui/Icon';
import type { Department, Service, StrategicObjective } from '@/strategy/types';

interface DepartmentViewProps {
  department: Department;
  services: Service[];
  objectives: StrategicObjective[];
  onSelectService: (serviceId: string) => void;
  getAgentCount: (serviceId: string) => number;
}

const STATUS_CONFIG: Record<Service['status'], { label: string; badgeClass: string; icon: string }> = {
  'not-analyzed': { label: 'Not started', badgeClass: 'badge', icon: 'circle-dashed' },
  analyzed: { label: 'Analyzed', badgeClass: 'badge badge--info', icon: 'check-circle' },
  'has-deviations': { label: 'Has deviations', badgeClass: 'badge badge--warning', icon: 'alert-triangle' },
};

export function DepartmentView({ department, services, objectives, onSelectService, getAgentCount }: DepartmentViewProps) {
  return (
    <div className="strategy-department">
      {/* Department header */}
      <div className="strategy-department__header">
        <h2 className="strategy-department__name">{department.name}</h2>
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
                <div>
                  <span className="strategy-objective-item__title">{obj.title}</span>
                  <span className="strategy-objective-item__description">{obj.description}</span>
                </div>
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
            <ServiceCard key={service.id} service={service} agentCount={getAgentCount(service.id)} onClick={() => onSelectService(service.id)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ServiceCard({ service, agentCount, onClick }: { service: Service; agentCount: number; onClick: () => void }) {
  const status = STATUS_CONFIG[service.status];

  return (
    <button className="strategy-service-card" onClick={onClick}>
      <div className="strategy-service-card__header">
        <h4 className="strategy-service-card__name">{service.name}</h4>
        <span className={status.badgeClass}>
          <Icon name={status.icon} size={12} />
          {status.label}
        </span>
      </div>
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
    </button>
  );
}
