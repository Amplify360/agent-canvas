/**
 * Strategy mock data adapter hook
 *
 * Provides the same interface that a Convex-backed implementation would.
 * Swap this for real queries later without touching components.
 */

import { useMemo } from 'react';
import type { DepartmentSummary } from './types';
import {
  MOCK_PRESSURES,
  MOCK_OBJECTIVES,
  MOCK_DEPARTMENTS,
  MOCK_SERVICES,
  MOCK_FLOW_STEPS,
  MOCK_DEVIATIONS,
  MOCK_INITIATIVES,
} from './mockData';
import type { Initiative } from './types';

export function countUniqueLinkedAgentsForService(
  initiatives: Initiative[],
  serviceId: string
): number {
  const serviceInitiatives = initiatives.filter((initiative) => initiative.serviceId === serviceId);
  const agentIds = new Set(
    serviceInitiatives.flatMap((initiative) => initiative.linkedAgents.map((agent) => agent.id))
  );
  return agentIds.size;
}

export function useStrategyData() {
  const pressures = MOCK_PRESSURES;
  const objectives = MOCK_OBJECTIVES;
  const departments = MOCK_DEPARTMENTS;
  const services = MOCK_SERVICES;
  const flowSteps = MOCK_FLOW_STEPS;
  const deviations = MOCK_DEVIATIONS;
  const initiatives = MOCK_INITIATIVES;

  const departmentSummaries: DepartmentSummary[] = useMemo(
    () =>
      departments.map((dept) => {
        const deptServices = services.filter((s) => s.departmentId === dept.id);
        const deptDeviations = deviations.filter((d) =>
          deptServices.some((s) => s.id === d.serviceId)
        );
        const analyzedCount = deptServices.filter(
          (s) => s.status === 'analyzed' || s.status === 'has-deviations'
        ).length;
        return {
          ...dept,
          serviceCount: deptServices.length,
          deviationCount: deptDeviations.length,
          analyzedCount,
        };
      }),
    [departments, services, deviations]
  );

  const getDepartment = (id: string) => departments.find((d) => d.id === id);

  const getServicesByDepartment = (departmentId: string) =>
    services.filter((s) => s.departmentId === departmentId);

  const getService = (id: string) => services.find((s) => s.id === id);

  const getFlowSteps = (serviceId: string, flowType: 'ideal' | 'current') =>
    flowSteps
      .filter((fs) => fs.serviceId === serviceId && fs.flowType === flowType)
      .sort((a, b) => a.order - b.order);

  const getDeviationsByService = (serviceId: string) =>
    deviations.filter((d) => d.serviceId === serviceId);

  const getInitiativesByService = (serviceId: string) =>
    initiatives.filter((i) => i.serviceId === serviceId);

  const getAgentCountByService = (serviceId: string) =>
    countUniqueLinkedAgentsForService(initiatives, serviceId);

  const getObjectivesByDepartment = (departmentId: string) =>
    objectives.filter((o) => o.scope === 'department' && o.departmentId === departmentId);

  const getEnterpriseObjectives = () => objectives.filter((o) => o.scope === 'enterprise');

  const getPressure = (id: string) => pressures.find((p) => p.id === id);

  return {
    pressures,
    objectives,
    departments,
    departmentSummaries,
    services,
    flowSteps,
    deviations,
    initiatives,
    getDepartment,
    getServicesByDepartment,
    getService,
    getFlowSteps,
    getDeviationsByService,
    getInitiativesByService,
    getAgentCountByService,
    getObjectivesByDepartment,
    getEnterpriseObjectives,
    getPressure,
  };
}
