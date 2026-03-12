/**
 * Transformation Map data adapter hook
 *
 * Replaces the former mock-only strategy adapter with Convex-backed queries while
 * preserving the same component-facing interface.
 */

'use client';

import { useEffect, useMemo, useRef } from 'react';
import { api } from '../../convex/_generated/api';
import { useMutation, useQuery, useCanQuery } from '@/hooks/useConvex';
import { useAuth } from '@/contexts/AuthContext';
import type { Department, DepartmentSummary, Deviation, Initiative, StrategicObjective, Service } from './types';
import { countUniqueLinkedAgentsForService } from './utils';

export function useStrategyData(departmentId?: string | null, serviceId?: string | null) {
  const { currentOrgId, isInitialized } = useAuth();
  const { canQuery } = useCanQuery();
  const ensurePrototypeMap = useMutation(api.transformationMaps.ensurePrototypeMap);
  const seededOrgRef = useRef<string | null>(null);

  const maps = useQuery(
    api.transformationMaps.list,
    currentOrgId && canQuery ? { workosOrgId: currentOrgId } : 'skip'
  );

  useEffect(() => {
    if (!currentOrgId || !canQuery || maps === undefined) {
      return;
    }
    if (maps.length > 0) {
      seededOrgRef.current = currentOrgId;
      return;
    }
    if (seededOrgRef.current === currentOrgId) {
      return;
    }

    seededOrgRef.current = currentOrgId;
    void ensurePrototypeMap({ workosOrgId: currentOrgId }).catch(() => {
      seededOrgRef.current = null;
    });
  }, [canQuery, currentOrgId, ensurePrototypeMap, maps]);

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

  const departmentSummaries = overview?.departmentSummaries ?? [];
  const pressures = overview?.pressures ?? [];
  const enterpriseObjectives = overview?.enterpriseObjectives ?? [];

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

  const currentServices = departmentSnapshot?.services ?? [];
  const currentService = useMemo<Service | undefined>(() => {
    if (serviceSnapshot?.service) return serviceSnapshot.service;
    return currentServices.find((entry) => entry.id === serviceId);
  }, [currentServices, serviceId, serviceSnapshot]);

  const currentObjectives = departmentSnapshot?.objectives ?? [];
  const currentIdealSteps = serviceSnapshot?.idealSteps ?? [];
  const currentCurrentSteps = serviceSnapshot?.currentSteps ?? [];
  const currentDeviations = serviceSnapshot?.deviations ?? [];
  const currentInitiatives = serviceSnapshot?.initiatives ?? [];
  const agentCountsByService = departmentSnapshot?.agentCountsByService ?? {};

  const isLoading =
    !isInitialized ||
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
