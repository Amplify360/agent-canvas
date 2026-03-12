import { describe, expect, it } from 'vitest';
import {
  buildDepartmentSnapshot,
  buildOverviewSnapshot,
  buildServiceSnapshot,
} from '../../convex/lib/transformationMap';

describe('Transformation Map snapshot builders', () => {
  const map = {
    _id: 'map_1',
    slug: 'transformation-map',
    title: 'Transformation Map',
    status: 'active',
    updatedAt: 100,
  } as any;

  const pressures = [
    {
      key: 'p-1',
      order: 0,
      type: 'external',
      title: 'Market Pressure',
      description: 'Competitive pressure',
      evidence: ['Signal 1'],
    },
  ] as any[];

  const objectives = [
    {
      key: 'obj-1',
      order: 0,
      scope: 'department',
      departmentKey: 'dept-finance',
      title: 'Accelerate close',
      description: 'Reduce month-end close time',
      linkedPressureKeys: ['p-1'],
    },
  ] as any[];

  const departments = [
    {
      key: 'dept-finance',
      order: 0,
      name: 'Finance',
      description: 'Owns billing and rev rec',
      keyIssues: ['Manual invoice handoff'],
      improvementMandates: ['Accelerate close'],
    },
  ] as any[];

  const services = [
    {
      _id: 'svc_doc_1',
      key: 'svc-invoice',
      departmentKey: 'dept-finance',
      order: 0,
      name: 'Invoice Processing',
      purpose: 'Generate invoices',
      customer: 'Customers',
      trigger: 'Closed deal',
      outcome: 'Accurate invoice sent',
      constraints: ['Tax rules'],
      status: 'has-deviations',
      effectivenessMetric: 'Works eventually',
      efficiencyMetric: 'Too manual',
      updatedAt: 100,
    },
  ] as any[];

  const analyses = [
    {
      serviceId: 'svc_doc_1',
      reviewStatus: 'reviewed',
      idealFlowSteps: [
        {
          id: 'fs-1',
          serviceId: 'svc-invoice',
          flowType: 'ideal',
          order: 1,
          description: 'Deal data synced',
          stepType: 'input',
        },
      ],
      currentFlowSteps: [
        {
          id: 'fs-2',
          serviceId: 'svc-invoice',
          flowType: 'current',
          order: 1,
          description: 'Finance receives email',
          stepType: 'handoff',
        },
      ],
      deviations: [
        {
          id: 'dev-1',
          serviceId: 'svc-invoice',
          what: 'Manual email handoff',
          why: 'No integration',
          necessary: false,
          impact: 'high',
          treatment: 'eliminate',
          classification: 'handoff',
        },
      ],
      initiatives: [
        {
          id: 'init-1',
          serviceId: 'svc-invoice',
          title: 'CRM to Billing Sync',
          description: 'Integrate upstream systems',
          status: 'approved',
          linkedAgents: [
            { id: 'agent-a', name: 'Integrator', role: 'Build the sync' },
            { id: 'agent-b', name: 'Mapper', role: 'Map fields' },
            { id: 'agent-a', name: 'Integrator', role: 'Validate rollout' },
          ],
        },
      ],
      updatedAt: 100,
    },
  ] as any[];

  it('builds department summaries with improvement mandates and deviation counts', () => {
    const snapshot = buildOverviewSnapshot({
      map,
      pressures: pressures as any,
      objectives: objectives as any,
      departments: departments as any,
      services: services as any,
      analyses: analyses as any,
    });

    expect(snapshot.departmentSummaries).toEqual([
      expect.objectContaining({
        id: 'dept-finance',
        serviceCount: 1,
        analyzedCount: 1,
        deviationCount: 1,
        improvementMandates: [
          expect.objectContaining({
            id: 'obj-1',
            title: 'Accelerate close',
          }),
        ],
      }),
    ]);
  });

  it('builds department and service snapshots with UI-ready structures', () => {
    const departmentSnapshot = buildDepartmentSnapshot({
      map,
      department: departments[0] as any,
      objectives: objectives as any,
      services: services as any,
      analyses: analyses as any,
    });

    expect(departmentSnapshot.agentCountsByService).toEqual({ 'svc-invoice': 2 });

    const serviceSnapshot = buildServiceSnapshot({
      map,
      department: departments[0] as any,
      service: services[0] as any,
      analysis: analyses[0] as any,
    });

    expect(serviceSnapshot.service).toEqual(
      expect.objectContaining({
        id: 'svc-invoice',
        departmentId: 'dept-finance',
      }),
    );
    expect(serviceSnapshot.reviewStatus).toBe('reviewed');
    expect(serviceSnapshot.deviations).toHaveLength(1);
    expect(serviceSnapshot.initiatives).toHaveLength(1);
  });
});
