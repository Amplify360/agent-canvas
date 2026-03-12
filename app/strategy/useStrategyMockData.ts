/**
 * Transformation Map data adapter hook
 *
 * Replaces the former mock-only strategy adapter with Convex-backed queries while
 * preserving the same component-facing interface.
 */

'use client';

import { useMemo } from 'react';
import { api } from '../../convex/_generated/api';
import { useConvex, useMutation, useQuery, useCanQuery } from '@/hooks/useConvex';
import { useAuth } from '@/contexts/AuthContext';
import type { Department, DepartmentSummary, Deviation, FlowStep, Initiative, StrategicObjective, StrategicPressure, Service } from './types';
import { countUniqueLinkedAgentsForService } from './utils';
import { normalizeOrderedFlowSteps } from './editorUtils';

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
  const convex = useConvex();
  const updatePressureMutation = useMutation(api.transformationMaps.updatePressure);
  const removePressureMutation = useMutation(api.transformationMaps.removePressure);
  const updateObjectiveMutation = useMutation(api.transformationMaps.updateObjective);
  const removeObjectiveMutation = useMutation(api.transformationMaps.removeObjective);
  const updateDepartmentMutation = useMutation(api.transformationMaps.updateDepartment);
  const removeDepartmentMutation = useMutation(api.transformationMaps.removeDepartment);
  const updateServiceMutation = useMutation(api.transformationMaps.updateService);
  const removeServiceMutation = useMutation(api.transformationMaps.removeService);
  const applyServiceAnalysisMutation = useMutation(api.transformationMaps.applyServiceAnalysis);

  const maps = useQuery(
    api.transformationMaps.list,
    currentOrgId && canQuery ? { workosOrgId: currentOrgId } : 'skip'
  );

  const activeMap = maps?.[0];

  const overview = useQuery(
    api.transformationMaps.getOverviewSnapshot,
    canQuery && activeMap ? { mapId: activeMap._id } : 'skip'
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

    if (serviceSnapshot?.department && serviceSnapshot.department.id === departmentId) {
      return serviceSnapshot.department;
    }

    const summary = departmentSummaries.find((entry) => entry.id === departmentId);
    if (!summary) return undefined;
    return {
      id: summary.id,
      name: summary.name,
      description: summary.description,
      keyIssues: summary.keyIssues,
    };
  }, [departmentId, departmentSnapshot, departmentSummaries, serviceSnapshot]);

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

  const requireActiveMapId = () => {
    if (!activeMap) {
      throw new Error('Transformation Map not found');
    }
    return activeMap._id;
  };

  const applyCurrentServiceAnalysis = async (
    requestedServiceId: string,
    nextAnalysis: {
      idealFlowSteps?: FlowStep[];
      currentFlowSteps?: FlowStep[];
      deviations?: Deviation[];
      initiatives?: Initiative[];
    }
  ) => {
    const mapId = requireActiveMapId();
    const latestSnapshot = await convex.query(api.transformationMaps.getServiceSnapshot, {
      mapId,
      serviceKey: requestedServiceId,
    });

    if (!latestSnapshot?.service) {
      throw new Error('Service snapshot is not available');
    }

    const service = latestSnapshot.service;

    await applyServiceAnalysisMutation({
      mapId,
      serviceKey: requestedServiceId,
      payload: {
        service: {
          name: service.name,
          purpose: service.purpose,
          customer: service.customer,
          trigger: service.trigger,
          outcome: service.outcome,
          constraints: service.constraints,
          status: service.status,
          effectivenessMetric: service.effectivenessMetric,
          efficiencyMetric: service.efficiencyMetric,
        },
        idealFlowSteps: nextAnalysis.idealFlowSteps ?? latestSnapshot.idealSteps,
        currentFlowSteps: nextAnalysis.currentFlowSteps ?? latestSnapshot.currentSteps,
        deviations: nextAnalysis.deviations ?? latestSnapshot.deviations,
        initiatives: nextAnalysis.initiatives ?? latestSnapshot.initiatives,
        reviewStatus: latestSnapshot.reviewStatus,
      },
    });
  };

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
    updatePressure: async (
      pressureId: string,
      updates: Partial<Pick<StrategicPressure, 'type' | 'title' | 'description' | 'evidence'>>
    ) => {
      await updatePressureMutation({
        mapId: requireActiveMapId(),
        pressureKey: pressureId,
        ...updates,
      });
    },
    removePressure: async (pressureId: string) => {
      await removePressureMutation({
        mapId: requireActiveMapId(),
        pressureKey: pressureId,
      });
    },
    updateObjective: async (
      objectiveId: string,
      updates: Partial<Pick<StrategicObjective, 'title' | 'description' | 'linkedPressureIds'>>
    ) => {
      await updateObjectiveMutation({
        mapId: requireActiveMapId(),
        objectiveKey: objectiveId,
        title: updates.title,
        description: updates.description,
        linkedPressureKeys: updates.linkedPressureIds,
      });
    },
    removeObjective: async (objectiveId: string) => {
      await removeObjectiveMutation({
        mapId: requireActiveMapId(),
        objectiveKey: objectiveId,
      });
    },
    updateDepartment: async (
      requestedDepartmentId: string,
      updates: Partial<Pick<Department, 'name' | 'description' | 'keyIssues'>>
    ) => {
      await updateDepartmentMutation({
        mapId: requireActiveMapId(),
        departmentKey: requestedDepartmentId,
        ...updates,
      });
    },
    removeDepartment: async (requestedDepartmentId: string) => {
      await removeDepartmentMutation({
        mapId: requireActiveMapId(),
        departmentKey: requestedDepartmentId,
      });
    },
    updateService: async (
      requestedServiceId: string,
      updates: Partial<Pick<Service, 'name' | 'purpose' | 'customer' | 'trigger' | 'outcome' | 'constraints' | 'status' | 'effectivenessMetric' | 'efficiencyMetric'>>
    ) => {
      await updateServiceMutation({
        mapId: requireActiveMapId(),
        serviceKey: requestedServiceId,
        ...updates,
      });
    },
    removeService: async (requestedServiceId: string) => {
      await removeServiceMutation({
        mapId: requireActiveMapId(),
        serviceKey: requestedServiceId,
      });
    },
    updateFlowStep: async (
      requestedServiceId: string,
      flowType: 'ideal' | 'current',
      stepId: string,
      updates: Partial<FlowStep>
    ) => {
      const baseSteps = flowType === 'ideal' ? currentIdealSteps : currentCurrentSteps;
      const nextSteps = normalizeOrderedFlowSteps(
        baseSteps.map((step) => (step.id === stepId ? { ...step, ...updates } : step))
      );
      await applyCurrentServiceAnalysis(requestedServiceId, flowType === 'ideal'
        ? { idealFlowSteps: nextSteps }
        : { currentFlowSteps: nextSteps });
    },
    removeFlowStep: async (requestedServiceId: string, flowType: 'ideal' | 'current', stepId: string) => {
      const baseSteps = flowType === 'ideal' ? currentIdealSteps : currentCurrentSteps;
      const nextSteps = normalizeOrderedFlowSteps(baseSteps.filter((step) => step.id !== stepId));
      await applyCurrentServiceAnalysis(requestedServiceId, flowType === 'ideal'
        ? { idealFlowSteps: nextSteps }
        : { currentFlowSteps: nextSteps });
    },
    updateDeviation: async (requestedServiceId: string, deviationId: string, updates: Partial<Deviation>) => {
      await applyCurrentServiceAnalysis(requestedServiceId, {
        deviations: currentDeviations.map((deviation) =>
          deviation.id === deviationId ? { ...deviation, ...updates } : deviation
        ),
      });
    },
    removeDeviation: async (requestedServiceId: string, deviationId: string) => {
      await applyCurrentServiceAnalysis(requestedServiceId, {
        deviations: currentDeviations.filter((deviation) => deviation.id !== deviationId),
      });
    },
    updateInitiative: async (requestedServiceId: string, initiativeId: string, updates: Partial<Initiative>) => {
      await applyCurrentServiceAnalysis(requestedServiceId, {
        initiatives: currentInitiatives.map((initiative) =>
          initiative.id === initiativeId ? { ...initiative, ...updates } : initiative
        ),
      });
    },
    removeInitiative: async (requestedServiceId: string, initiativeId: string) => {
      await applyCurrentServiceAnalysis(requestedServiceId, {
        initiatives: currentInitiatives.filter((initiative) => initiative.id !== initiativeId),
      });
    },
  };
}
