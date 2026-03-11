/**
 * StrategyExplorer - Main orchestrator for the strategy layer
 *
 * Reads searchParams to determine which view to render.
 * Uses the same sidebar/main-wrapper layout as the canvas pages.
 */

'use client';

import React, { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAppState } from '@/contexts/AppStateContext';
import { Icon } from '@/components/ui/Icon';
import { Tooltip } from '@/components/ui/Tooltip';
import { ToastContainer } from '@/components/ui/Toast';
import { ConnectionRecoveryBanner } from '@/components/ui/ConnectionRecoveryBanner';
import { StrategyBreadcrumb, type BreadcrumbItem } from './StrategyBreadcrumb';
import { OverviewView } from './OverviewView';
import { DepartmentView } from './DepartmentView';
import { ServiceDetailView } from './ServiceDetailView';
import { useStrategyData } from '@/strategy/useStrategyMockData';

export function StrategyExplorer() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSidebarCollapsed, toggleSidebar, sidebarWidth } = useAppState();
  const data = useStrategyData();

  const departmentId = searchParams.get('department');
  const serviceId = searchParams.get('service');
  const department = departmentId ? data.getDepartment(departmentId) : undefined;
  const service = serviceId ? data.getService(serviceId) : undefined;
  const shouldCanonicalizeServiceUrl =
    Boolean(serviceId && !departmentId && service);
  const hasMismatchedDepartmentService =
    Boolean(department && service && service.departmentId !== department.id);

  useEffect(() => {
    if (!shouldCanonicalizeServiceUrl || !serviceId || !service) {
      return;
    }

    router.replace(`/strategy?department=${service.departmentId}&service=${serviceId}`);
  }, [router, service, serviceId, shouldCanonicalizeServiceUrl]);

  // Navigation helpers
  const navigate = (path: string) => router.push(path);

  const navigateToDepartment = (id: string) => {
    router.push(`/strategy?department=${id}`);
  };

  const navigateToService = (deptId: string, svcId: string) => {
    router.push(`/strategy?department=${deptId}&service=${svcId}`);
  };

  // Build breadcrumb
  const breadcrumbItems: BreadcrumbItem[] = [{ label: 'Strategy', href: '/strategy' }];

  if (department) {
    if (!hasMismatchedDepartmentService) {
      breadcrumbItems.push({
        label: department.name,
        href: serviceId ? `/strategy?department=${departmentId}` : undefined,
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

  if (shouldCanonicalizeServiceUrl) {
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
        getPressure={data.getPressure}
      />
    );
  }

  return (
    <>
      <ConnectionRecoveryBanner />
      <Sidebar />
      <div
        className={`main-wrapper ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}
        style={!isSidebarCollapsed ? { '--sidebar-width': `${sidebarWidth}px` } as React.CSSProperties : undefined}
      >
        {isSidebarCollapsed && (
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
              <Icon name="flask-conical" size={14} />
              Prototype
            </span>
          </div>
        </header>

        <main className="main-content">
          {content}
        </main>
      </div>
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
      <p className="empty-state__description">The item you&apos;re looking for doesn&apos;t exist in the mock data.</p>
    </div>
  );
}
