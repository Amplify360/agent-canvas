/**
 * StrategyExplorer - Main orchestrator for the strategy layer
 *
 * Reads searchParams to determine which view to render.
 * Uses the same sidebar/main-wrapper layout as the canvas pages.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import {
  DEFAULT_SIDEBAR_COLLAPSED,
  DEFAULT_SIDEBAR_WIDTH,
  useAppState,
} from '@/contexts/AppStateContext';
import { Icon } from '@/components/ui/Icon';
import { Tooltip } from '@/components/ui/Tooltip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ToastContainer } from '@/components/ui/Toast';
import { ConnectionRecoveryBanner } from '@/components/ui/ConnectionRecoveryBanner';
import { StrategyBreadcrumb, type BreadcrumbItem } from './StrategyBreadcrumb';
import { OverviewView } from './OverviewView';
import { DepartmentView } from './DepartmentView';
import { ServiceDetailView } from './ServiceDetailView';
import {
  DepartmentEditModal,
  DeviationEditModal,
  FlowStepEditModal,
  InitiativeEditModal,
  ObjectiveEditModal,
  PressureEditModal,
  ServiceEditModal,
} from './StrategyEditorModals';
import { useStrategyData } from '@/strategy/useStrategyMockData';
import {
  buildTransformationMapPath,
  shouldCanonicalizeTransformationMapSlug,
} from '@/strategy/navigation';
import type {
  Department,
  Deviation,
  FlowStep,
  Initiative,
  Service,
  StrategicObjective,
  StrategicPressure,
} from '@/strategy/types';

interface DeleteState {
  title: string;
  message: string;
  successMessage: string;
  errorMessage: string;
  onConfirm: () => Promise<void>;
}

export function StrategyExplorer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSidebarCollapsed, toggleSidebar, sidebarWidth, showToast } = useAppState();
  const [hasMounted, setHasMounted] = useState(false);
  const effectiveSidebarCollapsed = hasMounted ? isSidebarCollapsed : DEFAULT_SIDEBAR_COLLAPSED;
  const effectiveSidebarWidth = hasMounted ? sidebarWidth : DEFAULT_SIDEBAR_WIDTH;

  const mapSlug = searchParams.get('map');
  const departmentId = searchParams.get('department');
  const serviceId = searchParams.get('service');
  const data = useStrategyData(mapSlug, departmentId, serviceId);
  const resolvedMapSlug = data.map?.slug ?? null;
  const department = departmentId ? data.getDepartment(departmentId) : undefined;
  const service = serviceId ? data.getService(serviceId) : undefined;
  const [editingPressure, setEditingPressure] = useState<StrategicPressure | null>(null);
  const [editingObjective, setEditingObjective] = useState<StrategicObjective | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingFlowStep, setEditingFlowStep] = useState<{ flowType: 'ideal' | 'current'; step: FlowStep } | null>(null);
  const [editingDeviation, setEditingDeviation] = useState<Deviation | null>(null);
  const [editingInitiative, setEditingInitiative] = useState<Initiative | null>(null);
  const [deleteState, setDeleteState] = useState<DeleteState | null>(null);
  const shouldCanonicalizeServiceUrl =
    Boolean(serviceId && !departmentId && service);
  const shouldCanonicalizeMapSlug = shouldCanonicalizeTransformationMapSlug(mapSlug, resolvedMapSlug);
  const hasMismatchedDepartmentService =
    Boolean(department && service && service.departmentId !== department.id);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if ((!shouldCanonicalizeServiceUrl || !serviceId || !service) && !shouldCanonicalizeMapSlug) {
      return;
    }

    router.replace(buildTransformationMapPath({
      requestedMapSlug: shouldCanonicalizeMapSlug ? null : mapSlug,
      resolvedMapSlug: shouldCanonicalizeMapSlug ? resolvedMapSlug : null,
      departmentId: shouldCanonicalizeServiceUrl && service ? service.departmentId : departmentId,
      serviceId,
    }));
  }, [
    departmentId,
    mapSlug,
    resolvedMapSlug,
    router,
    service,
    serviceId,
    shouldCanonicalizeMapSlug,
    shouldCanonicalizeServiceUrl,
  ]);

  // Navigation helpers
  const navigate = (path: string) => router.push(path);

  const buildMapPath = (nextDepartmentId?: string, nextServiceId?: string) => {
    return buildTransformationMapPath({
      requestedMapSlug: mapSlug,
      resolvedMapSlug,
      departmentId: nextDepartmentId,
      serviceId: nextServiceId,
    });
  };

  const navigateToDepartment = (id: string) => {
    router.push(buildMapPath(id));
  };

  const navigateToService = (deptId: string, svcId: string) => {
    router.push(buildMapPath(deptId, svcId));
  };

  const saveWithToast = async (operation: () => Promise<void>, successMessage: string) => {
    await operation();
    showToast(successMessage, 'success');
  };

  const requestDelete = (nextDeleteState: DeleteState) => {
    setDeleteState(nextDeleteState);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteState) {
      return;
    }

    try {
      await deleteState.onConfirm();
      showToast(deleteState.successMessage, 'success');
      setDeleteState(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : deleteState.errorMessage, 'error');
    }
  };

  // Build breadcrumb
  const breadcrumbItems: BreadcrumbItem[] = [{ label: 'Transformation Map', href: buildMapPath() }];

  if (department) {
    if (!hasMismatchedDepartmentService) {
      breadcrumbItems.push({
        label: department.name,
        href: serviceId ? buildMapPath(departmentId ?? undefined) : undefined,
      });
    }
  }

  if (service && !hasMismatchedDepartmentService) {
    if (serviceId) {
      breadcrumbItems.push({ label: service.name });
    }
  }

  // Determine which view to render
  let content: React.ReactNode;

  if (data.isLoading) {
    content = (
      <div className="empty-state">
        <div className="empty-state__icon">
          <Icon name="loader-2" className="loading-icon" />
        </div>
        <h2 className="empty-state__title">Loading transformation map...</h2>
      </div>
    );
  } else if (!data.hasMap) {
    content = (
      <div className="empty-state">
        <div className="empty-state__icon">
          <Icon name="map" size={32} />
        </div>
        <h2 className="empty-state__title">No transformation maps yet</h2>
        <p className="empty-state__description">Create a Transformation Map or connect via MCP to start capturing pressures, services, and change initiatives.</p>
      </div>
    );
  } else if (shouldCanonicalizeServiceUrl) {
    content = (
      <div className="empty-state">
        <div className="empty-state__icon">
          <Icon name="loader-2" className="loading-icon" />
        </div>
        <h2 className="empty-state__title">Loading service...</h2>
      </div>
    );
  } else if (serviceId && departmentId) {
    if (service && department && !hasMismatchedDepartmentService) {
      content = (
        <ServiceDetailView
          service={service}
          idealSteps={data.getFlowSteps(serviceId, 'ideal')}
          currentSteps={data.getFlowSteps(serviceId, 'current')}
          deviations={data.getDeviationsByService(serviceId)}
          initiatives={data.getInitiativesByService(serviceId)}
          onEditService={setEditingService}
          onDeleteService={(currentService) => {
            requestDelete({
              title: 'Delete Service',
              message: `Delete "${currentService.name}" and its analysis bundle? This cannot be undone.`,
              successMessage: 'Service deleted',
              errorMessage: 'Failed to delete service',
              onConfirm: async () => {
                await data.removeService(currentService.id);
                if (departmentId) {
                  router.push(buildMapPath(departmentId));
                } else {
                  router.push(buildMapPath());
                }
              },
            });
          }}
          onEditFlowStep={(flowType, step) => setEditingFlowStep({ flowType, step })}
          onDeleteFlowStep={(flowType, step) => {
            requestDelete({
              title: 'Delete Flow Step',
              message: `Delete step ${step.order} from the ${flowType === 'ideal' ? 'first-principles' : 'current-state'} flow?`,
              successMessage: 'Flow step deleted',
              errorMessage: 'Failed to delete flow step',
              onConfirm: async () => {
                await data.removeFlowStep(service.id, flowType, step.id);
              },
            });
          }}
          onEditDeviation={setEditingDeviation}
          onDeleteDeviation={(deviation) => {
            requestDelete({
              title: 'Delete Deviation',
              message: `Delete "${deviation.what}" from this service analysis?`,
              successMessage: 'Deviation deleted',
              errorMessage: 'Failed to delete deviation',
              onConfirm: async () => {
                await data.removeDeviation(service.id, deviation.id);
              },
            });
          }}
          onEditInitiative={setEditingInitiative}
          onDeleteInitiative={(initiative) => {
            requestDelete({
              title: 'Delete Initiative',
              message: `Delete "${initiative.title}" from this service?`,
              successMessage: 'Initiative deleted',
              errorMessage: 'Failed to delete initiative',
              onConfirm: async () => {
                await data.removeInitiative(service.id, initiative.id);
              },
            });
          }}
        />
      );
    } else if (hasMismatchedDepartmentService) {
      content = (
        <NotFound message="Service does not belong to that department" />
      );
    } else {
      content = <NotFound message="Service not found" />;
    }
  } else if (serviceId) {
    content = <NotFound message="Service not found" />;
  } else if (departmentId) {
    if (department) {
      content = (
        <DepartmentView
          department={department}
          services={data.getServicesByDepartment(departmentId)}
          objectives={data.getObjectivesByDepartment(departmentId)}
          onSelectService={(svcId) => navigateToService(departmentId, svcId)}
          getAgentCount={data.getAgentCountByService}
          onEditDepartment={setEditingDepartment}
          onDeleteDepartment={(currentDepartment) => {
            requestDelete({
              title: 'Delete Department',
              message: `Delete "${currentDepartment.name}" and all services and analyses underneath it? This cannot be undone.`,
              successMessage: 'Department deleted',
              errorMessage: 'Failed to delete department',
              onConfirm: async () => {
                await data.removeDepartment(currentDepartment.id);
                router.push(buildMapPath());
              },
            });
          }}
          onEditObjective={setEditingObjective}
          onDeleteObjective={(objective) => {
            requestDelete({
              title: 'Delete Objective',
              message: `Delete "${objective.title}" from this department?`,
              successMessage: 'Objective deleted',
              errorMessage: 'Failed to delete objective',
              onConfirm: async () => {
                await data.removeObjective(objective.id);
              },
            });
          }}
          onEditService={setEditingService}
          onDeleteService={(currentService) => {
            requestDelete({
              title: 'Delete Service',
              message: `Delete "${currentService.name}" and its analysis bundle? This cannot be undone.`,
              successMessage: 'Service deleted',
              errorMessage: 'Failed to delete service',
              onConfirm: async () => {
                await data.removeService(currentService.id);
              },
            });
          }}
        />
      );
    } else {
      content = <NotFound message="Department not found" />;
    }
  } else {
    content = (
      <OverviewView
        pressures={data.pressures}
        enterpriseObjectives={data.getEnterpriseObjectives()}
        departmentSummaries={data.departmentSummaries}
        onSelectDepartment={navigateToDepartment}
        onEditPressure={setEditingPressure}
        onDeletePressure={(pressure) => {
          requestDelete({
            title: 'Delete Pressure',
            message: `Delete "${pressure.title}" from this Transformation Map?`,
            successMessage: 'Pressure deleted',
            errorMessage: 'Failed to delete pressure',
            onConfirm: async () => {
              await data.removePressure(pressure.id);
            },
          });
        }}
        onEditObjective={setEditingObjective}
        onDeleteObjective={(objective) => {
          requestDelete({
            title: 'Delete Objective',
            message: `Delete "${objective.title}" from the Transformation Map?`,
            successMessage: 'Objective deleted',
            errorMessage: 'Failed to delete objective',
            onConfirm: async () => {
              await data.removeObjective(objective.id);
            },
          });
        }}
        onEditDepartment={setEditingDepartment}
        onDeleteDepartment={(currentDepartment) => {
          requestDelete({
            title: 'Delete Department',
            message: `Delete "${currentDepartment.name}" and all services and analyses underneath it? This cannot be undone.`,
            successMessage: 'Department deleted',
            errorMessage: 'Failed to delete department',
            onConfirm: async () => {
              await data.removeDepartment(currentDepartment.id);
            },
          });
        }}
        getPressure={data.getPressure}
      />
    );
  }

  return (
    <>
      <ConnectionRecoveryBanner />
      <Sidebar />
      <div
        className={`main-wrapper ${effectiveSidebarCollapsed ? 'sidebar-collapsed' : ''}`}
        style={
          !effectiveSidebarCollapsed
            ? ({ '--sidebar-width': `${effectiveSidebarWidth}px` } as React.CSSProperties)
            : undefined
        }
      >
        {effectiveSidebarCollapsed && (
          <Tooltip content="Expand sidebar" placement="right" triggerClassName="sidebar-expand-tooltip">
            <button className="sidebar-expand-btn" onClick={toggleSidebar}>
              <Icon name="panel-left-open" />
            </button>
          </Tooltip>
        )}

        {/* Strategy toolbar */}
        <header className="toolbar">
          <div className="toolbar__left">
            <StrategyBreadcrumb items={breadcrumbItems} onNavigate={navigate} />
          </div>
          <div className="toolbar__right">
            <span className="toolbar__badge">
              <Icon name="map" size={14} />
              Transformation Map
            </span>
          </div>
        </header>

        <main className="main-content">
          {content}
        </main>
      </div>
      <PressureEditModal
        isOpen={Boolean(editingPressure)}
        pressure={editingPressure}
        onClose={() => setEditingPressure(null)}
        onSave={async (updates) => {
          if (!editingPressure) return;
          await saveWithToast(() => data.updatePressure(editingPressure.id, updates), 'Pressure updated');
        }}
      />
      <ObjectiveEditModal
        isOpen={Boolean(editingObjective)}
        objective={editingObjective}
        pressures={data.pressures}
        onClose={() => setEditingObjective(null)}
        onSave={async (updates) => {
          if (!editingObjective) return;
          await saveWithToast(() => data.updateObjective(editingObjective.id, updates), 'Objective updated');
        }}
      />
      <DepartmentEditModal
        isOpen={Boolean(editingDepartment)}
        department={editingDepartment}
        onClose={() => setEditingDepartment(null)}
        onSave={async (updates) => {
          if (!editingDepartment) return;
          await saveWithToast(() => data.updateDepartment(editingDepartment.id, updates), 'Department updated');
        }}
      />
      <ServiceEditModal
        isOpen={Boolean(editingService)}
        service={editingService}
        department={department ?? null}
        pressures={data.pressures}
        enterpriseObjectives={data.getEnterpriseObjectives()}
        departmentObjectives={departmentId ? data.getObjectivesByDepartment(departmentId) : []}
        mapTitle={data.map?.title}
        onClose={() => setEditingService(null)}
        onSave={async (updates) => {
          if (!editingService) return;
          await saveWithToast(() => data.updateService(editingService.id, updates), 'Service updated');
        }}
      />
      <FlowStepEditModal
        isOpen={Boolean(editingFlowStep)}
        step={editingFlowStep?.step ?? null}
        flowLabel={editingFlowStep?.flowType === 'ideal' ? 'First-Principles' : 'Current-State'}
        onClose={() => setEditingFlowStep(null)}
        onSave={async (updates) => {
          if (!editingFlowStep || !service) return;
          await saveWithToast(
            () => data.updateFlowStep(service.id, editingFlowStep.flowType, editingFlowStep.step.id, updates),
            'Flow step updated'
          );
        }}
      />
      <DeviationEditModal
        isOpen={Boolean(editingDeviation)}
        deviation={editingDeviation}
        onClose={() => setEditingDeviation(null)}
        onSave={async (updates) => {
          if (!editingDeviation || !service) return;
          await saveWithToast(() => data.updateDeviation(service.id, editingDeviation.id, updates), 'Deviation updated');
        }}
      />
      <InitiativeEditModal
        isOpen={Boolean(editingInitiative)}
        initiative={editingInitiative}
        onClose={() => setEditingInitiative(null)}
        onSave={async (updates) => {
          if (!editingInitiative || !service) return;
          await saveWithToast(() => data.updateInitiative(service.id, editingInitiative.id, updates), 'Initiative updated');
        }}
      />
      <ConfirmDialog
        isOpen={Boolean(deleteState)}
        title={deleteState?.title ?? 'Delete Item'}
        message={deleteState?.message ?? ''}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteState(null)}
      />
      <ToastContainer />
    </>
  );
}

function NotFound({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <Icon name="search-x" size={32} />
      </div>
      <h2 className="empty-state__title">{message}</h2>
      <p className="empty-state__description">The item you&apos;re looking for doesn&apos;t exist in the current Transformation Map.</p>
    </div>
  );
}
