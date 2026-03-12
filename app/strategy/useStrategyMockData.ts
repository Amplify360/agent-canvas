/**
 * Transformation Map data adapter hook
 *
 * Replaces the former mock-only strategy adapter with Convex-backed queries while
 * preserving the same component-facing interface.
 */

'use client';

import { useMemo } from 'react';
import { api } from '../../convex/_generated/api';
import { useQuery, useCanQuery } from '@/hooks/useConvex';
import { useAuth } from '@/contexts/AuthContext';
import type { Department, DepartmentSummary, Deviation, FlowStep, Initiative, StrategicObjective, StrategicPressure, Service } from './types';
import { countUniqueLinkedAgentsForService } from './utils';

const EMPTY_DEPARTMENT_SUMMARIES: DepartmentSummary[] = [];
const EMPTY_PRESSURES: StrategicPressure[] = [];
const EMPTY_ENTERPRISE_OBJECTIVES: StrategicObjective[] = [];
const EMPTY_SERVICES: Service[] = [];
const EMPTY_STEPS: FlowStep[] = [];
const EMPTY_DEVIATIONS: Deviation[] = [];
const EMPTY_INITIATIVES: Initiative[] = [];
const EMPTY_AGENT_COUNTS: Record<string, number> = {};

export function useStrategyData(departmentId?: string | null, serviceId?: string | null) {
  const { currentOrgId, isInitialized } = useAuth();
  const { canQuery } = useCanQuery();

  const maps = useQuery(
    api.transformationMaps.list,
    currentOrgId && canQuery ? { workosOrgId: currentOrgId } : 'skip'
  );

  const activeMap = maps?.[0];

  const overview = useQuery(
    api.transformationMaps.getOverviewSnapshot,
    canQuery && activeMap && !departmentId && !serviceId ? { mapId: activeMap._id } : 'skip'
  );

  const departmentSnapshot = useQuery(
    api.transformationMaps.getDepartmentSnapshot,
    canQuery && activeMap && departmentId ? { mapId: activeMap._id, departmentKey: departmentId } : 'skip'
  );

  const serviceSnapshot = useQuery(
    api.transformationMaps.getServiceSnapshot,
    canQuery && activeMap && serviceId ? { mapId: activeMap._id, serviceKey: serviceId } : 'skip'
  );

  const departmentSummaries = overview?.departmentSummaries ?? EMPTY_DEPARTMENT_SUMMARIES;
  const pressures = overview?.pressures ?? EMPTY_PRESSURES;
  const enterpriseObjectives = overview?.enterpriseObjectives ?? EMPTY_ENTERPRISE_OBJECTIVES;

  const currentDepartment = useMemo<Department | undefined>(() => {
    if (departmentSnapshot?.department) {
      return departmentSnapshot.department;
    }

    const summary = departmentSummaries.find((entry) => entry.id === departmentId);
    if (!summary) return undefined;
    return {
      id: summary.id,
      name: summary.name,
      description: summary.description,
      keyIssues: summary.keyIssues,
    };
  }, [departmentId, departmentSnapshot, departmentSummaries]);

  const currentServices = departmentSnapshot?.services ?? EMPTY_SERVICES;
  const currentService = useMemo<Service | undefined>(() => {
    if (serviceSnapshot?.service) return serviceSnapshot.service;
    return currentServices.find((entry) => entry.id === serviceId);
  }, [currentServices, serviceId, serviceSnapshot]);

  const currentObjectives = departmentSnapshot?.objectives ?? EMPTY_ENTERPRISE_OBJECTIVES;
  const currentIdealSteps = serviceSnapshot?.idealSteps ?? EMPTY_STEPS;
  const currentCurrentSteps = serviceSnapshot?.currentSteps ?? EMPTY_STEPS;
  const currentDeviations = serviceSnapshot?.deviations ?? EMPTY_DEVIATIONS;
  const currentInitiatives = serviceSnapshot?.initiatives ?? EMPTY_INITIATIVES;
  const agentCountsByService = departmentSnapshot?.agentCountsByService ?? EMPTY_AGENT_COUNTS;
  const isWaitingForQueryAuth = isInitialized && !!currentOrgId && !canQuery;

  const isLoading =
    !isInitialized ||
    isWaitingForQueryAuth ||
    (canQuery && maps === undefined) ||
    (canQuery && !!activeMap && !departmentId && !serviceId && overview === undefined) ||
    (canQuery && !!activeMap && !!departmentId && !serviceId && departmentSnapshot === undefined) ||
    (canQuery && !!activeMap && !!serviceId && serviceSnapshot === undefined);

  return {
    isLoading,
    hasMap: Boolean(activeMap),
    map: activeMap,
    pressures,
    objectives: currentObjectives,
    departments: currentDepartment ? [currentDepartment] : [],
    departmentSummaries: departmentSummaries as DepartmentSummary[],
    services: currentServices,
    flowSteps: [...currentIdealSteps, ...currentCurrentSteps],
    deviations: currentDeviations as Deviation[],
    initiatives: currentInitiatives as Initiative[],
    getDepartment: (id: string) =>
      currentDepartment?.id === id
        ? currentDepartment
        : departmentSummaries.find((entry) => entry.id === id),
    getServicesByDepartment: (requestedDepartmentId: string) =>
      requestedDepartmentId === departmentId ? currentServices : [],
    getService: (id: string) => (currentService?.id === id ? currentService : undefined),
    getFlowSteps: (requestedServiceId: string, flowType: 'ideal' | 'current') => {
      if (requestedServiceId !== serviceId) return [];
      return flowType === 'ideal' ? currentIdealSteps : currentCurrentSteps;
    },
    getDeviationsByService: (requestedServiceId: string) =>
      requestedServiceId === serviceId ? currentDeviations : [],
    getInitiativesByService: (requestedServiceId: string) =>
      requestedServiceId === serviceId ? currentInitiatives : [],
    getAgentCountByService: (requestedServiceId: string) => {
      if (requestedServiceId in agentCountsByService) {
        return agentCountsByService[requestedServiceId];
      }
      if (requestedServiceId === serviceId) {
        return countUniqueLinkedAgentsForService(currentInitiatives as Initiative[], requestedServiceId);
      }
      return 0;
    },
    getObjectivesByDepartment: (requestedDepartmentId: string): StrategicObjective[] =>
      requestedDepartmentId === departmentId ? (currentObjectives as StrategicObjective[]) : [],
    getEnterpriseObjectives: () => enterpriseObjectives as StrategicObjective[],
    getPressure: (id: string) => pressures.find((pressure) => pressure.id === id),
  };
}
