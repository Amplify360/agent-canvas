/**
 * Sidebar - Navigation and organization selector with collapsible support
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useAuth, useIsOrgAdmin, useCurrentOrg } from '@/contexts/AuthContext';
import { useAgents } from '@/contexts/AgentContext';
import { useCanvas } from '@/contexts/CanvasContext';
import {
  DEFAULT_SIDEBAR_COLLAPSED,
  DEFAULT_SIDEBAR_WIDTH,
  useAppState,
} from '@/contexts/AppStateContext';
import { useAction, useCanQuery, useConvex, useMutation, useQuery } from '@/hooks/useConvex';
import { api } from '../../../convex/_generated/api';
import { useResizable } from '@/hooks/useResizable';
import { useClickOutside } from '@/hooks/useClickOutside';
import { Icon } from '@/components/ui/Icon';
import { ImportYamlModal } from '../forms/ImportYamlModal';
import { CanvasRenameModal } from '../forms/CanvasRenameModal';
import { CopyCanvasModal } from '../forms/CopyCanvasModal';
import { TransformationMapRenameModal } from '../forms/TransformationMapRenameModal';
import { FeedbackModal } from '../forms/FeedbackModal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { MembersWidget } from '../org/MembersWidget';
import { McpAccessModal } from '../org/McpAccessModal';
import { Tooltip } from '../ui/Tooltip';
import { THEMES, SYSTEM_THEME_OPTION, THEME_VALUES } from '@/constants/themes';
import { copyTextToClipboard } from '@/utils/clipboard';
import { exportToYaml, slugifyTitle } from '@/utils/yaml';
import { Id } from '../../../convex/_generated/dataModel';

const SIDEBAR_MIN_WIDTH = 180;
const SIDEBAR_MAX_WIDTH = 400;

type SidebarEntityType = 'canvas' | 'transformation-map';
type SidebarMenuAction = 'share' | 'export' | 'copy' | 'rename' | 'delete';

interface SidebarResourceItemProps {
  iconName: React.ComponentProps<typeof Icon>['name'];
  title: string;
  isActive: boolean;
  menuLabel: string;
  onSelect: () => void;
  onOpenMenu: (event: React.MouseEvent) => void;
  onContextMenu: (event: React.MouseEvent) => void;
}

function SidebarResourceItem({
  iconName,
  title,
  isActive,
  menuLabel,
  onSelect,
  onOpenMenu,
  onContextMenu,
}: SidebarResourceItemProps) {
  return (
    <div
      className={`sidebar__resource-item ${isActive ? 'is-active' : ''}`}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <Icon name={iconName} />
      <Tooltip content={title} placement="right" showOnlyWhenTruncated>
        <span className="sidebar__resource-title">{title}</span>
      </Tooltip>
      <button
        className="sidebar__resource-menu-btn"
        aria-label={menuLabel}
        onClick={(event) => {
          event.stopPropagation();
          onOpenMenu(event);
        }}
      >
        <Icon name="more-vertical" />
      </button>
    </div>
  );
}

interface SidebarMenuState {
  entityType: SidebarEntityType;
  entityId: string;
  x: number;
  y: number;
}

// Context menu dimensions for viewport boundary calculations
const MENU_WIDTH = 150;
const MENU_HEIGHT = 190; // 5 items
const VIEWPORT_PADDING = 8;

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, userOrgs, currentOrgId, setCurrentOrgId, signOut } = useAuth();
  const { canvases, currentCanvasId, setCurrentCanvasId, createCanvas, deleteCanvas } = useCanvas();
  const { agents, isLoading: isAgentsLoading } = useAgents();
  const convex = useConvex();
  const { isSidebarCollapsed, toggleSidebar, showToast, sidebarWidth, setSidebarWidth, themePreference, setThemePreference } = useAppState();
  const { canQuery } = useCanQuery();
  const [hasMounted, setHasMounted] = useState(false);
  const effectiveSidebarCollapsed = hasMounted ? isSidebarCollapsed : DEFAULT_SIDEBAR_COLLAPSED;
  const effectiveSidebarWidth = hasMounted ? sidebarWidth : DEFAULT_SIDEBAR_WIDTH;

  const { isDragging, resizeHandleProps } = useResizable({
    minWidth: SIDEBAR_MIN_WIDTH,
    maxWidth: SIDEBAR_MAX_WIDTH,
    currentWidth: effectiveSidebarWidth,
    onResize: setSidebarWidth,
  });
  const isOrgAdmin = useIsOrgAdmin();
  const currentOrg = useCurrentOrg();
  const transformationMaps = useQuery(
    api.transformationMaps.list,
    currentOrgId && canQuery ? { workosOrgId: currentOrgId } : 'skip'
  ) ?? [];
  const isTransformationRoute = pathname.startsWith('/transformation-map') || pathname.startsWith('/strategy');
  const currentMapSlugParam = searchParams.get('map');
  const activeTransformationMap =
    transformationMaps.find((map) => map.slug === currentMapSlugParam) ??
    transformationMaps[0] ??
    null;

  // Convex action for syncing memberships from WorkOS
  const syncMyMemberships = useAction(api.orgMemberships.syncMyMemberships);
  const deleteTransformationMap = useMutation(api.transformationMaps.removeMap);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSwitchingOrg, setIsSwitchingOrg] = useState(false);

  // Convex memberships for the current user — used to skip sync when membership already exists
  const convexMemberships = useQuery(api.orgMemberships.listMyMemberships) ?? [];

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [itemMenu, setItemMenu] = useState<SidebarMenuState | null>(null);
  const [renameCanvas, setRenameCanvas] = useState<{ id: string; title: string } | null>(null);
  const [renameTransformationMap, setRenameTransformationMap] = useState<{ id: string; title: string } | null>(null);
  const [copyCanvas, setCopyCanvas] = useState<{ id: string; title: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ entityType: SidebarEntityType; id: string; title: string } | null>(null);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [canvasActionsOpen, setCanvasActionsOpen] = useState(false);
  const [isCanvasPanelOpen, setIsCanvasPanelOpen] = useState(!isTransformationRoute);
  const [isTransformationPanelOpen, setIsTransformationPanelOpen] = useState(isTransformationRoute);
  const menuRef = useRef<HTMLDivElement>(null);
  const orgDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const canvasActionsRef = useRef<HTMLDivElement>(null);

  // Handle manual membership sync
  const handleSyncMemberships = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      // First sync from WorkOS to Convex
      const result = await syncMyMemberships({});
      showToast(
        `Memberships synced: ${result.added} added, ${result.updated} updated, ${result.removed} removed`,
        'success'
      );
    } catch (error) {
      console.error('Failed to sync memberships:', error);
      showToast('Failed to sync memberships', 'error');
    } finally {
      setIsSyncing(false);
      setUserMenuOpen(false);
    }
  };

  // Get user initials for avatar
  const getUserInitials = useCallback((): string => {
    if (!user) return '??';
    const first = user.firstName?.charAt(0) || '';
    const last = user.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || user.email?.charAt(0).toUpperCase() || '??';
  }, [user]);

  // Close menus on outside click or Escape key
  const closeItemMenu = useCallback(() => setItemMenu(null), []);
  const closeOrgDropdown = useCallback(() => setOrgDropdownOpen(false), []);
  const closeUserMenu = useCallback(() => setUserMenuOpen(false), []);
  const closeCanvasActions = useCallback(() => setCanvasActionsOpen(false), []);

  useClickOutside(menuRef, closeItemMenu, itemMenu !== null);
  useClickOutside(orgDropdownRef, closeOrgDropdown, orgDropdownOpen);
  useClickOutside(userMenuRef, closeUserMenu, userMenuOpen);
  useClickOutside(canvasActionsRef, closeCanvasActions, canvasActionsOpen);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (isTransformationRoute) {
      setIsTransformationPanelOpen(true);
    } else {
      setIsCanvasPanelOpen(true);
    }
  }, [isTransformationRoute]);

  const openItemMenu = (event: React.MouseEvent, entityType: SidebarEntityType, entityId: string) => {
    event.preventDefault();
    event.stopPropagation();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = event.clientX;
    let y = event.clientY;

    if (x + MENU_WIDTH + VIEWPORT_PADDING > viewportWidth) {
      x = viewportWidth - MENU_WIDTH - VIEWPORT_PADDING;
    }

    if (y + MENU_HEIGHT + VIEWPORT_PADDING > viewportHeight) {
      y = viewportHeight - MENU_HEIGHT - VIEWPORT_PADDING;
    }

    setItemMenu({ entityType, entityId, x, y });
  };

  const handleCanvasContextMenu = (event: React.MouseEvent, canvasId: string) => {
    openItemMenu(event, 'canvas', canvasId);
  };

  const handleTransformationMapContextMenu = (event: React.MouseEvent, mapId: string) => {
    openItemMenu(event, 'transformation-map', mapId);
  };

  const handleCanvasMenuAction = async (action: 'rename' | 'delete' | 'share' | 'copy' | 'export', canvasId: string) => {
    const canvas = canvases.find((entry) => entry._id === canvasId);
    if (!canvas) {
      return;
    }

    if (action === 'rename') {
      setRenameCanvas({ id: canvas._id, title: canvas.title });
      return;
    }

    if (action === 'copy') {
      setCopyCanvas({ id: canvas._id, title: canvas.title });
      return;
    }

    if (action === 'delete') {
      setDeleteConfirm({ entityType: 'canvas', id: canvas._id, title: canvas.title });
      return;
    }

    if (action === 'share') {
      const url = `${window.location.origin}/c/${canvas._id}`;
      const ok = await copyTextToClipboard(url);
      showToast(ok ? 'Link copied to clipboard' : 'Failed to copy link', ok ? 'success' : 'error');
      return;
    }

    await handleExportYaml(canvas._id);
  };

  const handleTransformationMapMenuAction = async (action: 'rename' | 'delete' | 'share', mapId: string) => {
    const map = transformationMaps.find((entry) => entry._id === mapId);
    if (!map) {
      return;
    }

    if (action === 'rename') {
      setRenameTransformationMap({ id: map._id, title: map.title });
      return;
    }

    if (action === 'delete') {
      setDeleteConfirm({ entityType: 'transformation-map', id: map._id, title: map.title });
      return;
    }

    const url = `${window.location.origin}/transformation-map?map=${encodeURIComponent(map.slug)}`;
    const ok = await copyTextToClipboard(url);
    showToast(ok ? 'Link copied to clipboard' : 'Failed to copy link', ok ? 'success' : 'error');
  };

  const handleMenuAction = async (action: 'rename' | 'delete' | 'share' | 'copy' | 'export') => {
    if (!itemMenu) {
      return;
    }

    if (itemMenu.entityType === 'canvas') {
      await handleCanvasMenuAction(action, itemMenu.entityId);
    } else if (action === 'rename' || action === 'delete' || action === 'share') {
      await handleTransformationMapMenuAction(action, itemMenu.entityId);
    }

    setItemMenu(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.entityType === 'canvas') {
        await deleteCanvas(deleteConfirm.id);
        showToast('Canvas deleted successfully', 'success');
      } else {
        await deleteTransformationMap({
          mapId: deleteConfirm.id as Id<"transformationMaps">,
          confirmDelete: true,
        });
        if (activeTransformationMap?._id === deleteConfirm.id) {
          router.push('/transformation-map');
        }
        showToast('Transformation map deleted successfully', 'success');
      }
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete item:', error);
      showToast(
        deleteConfirm.entityType === 'canvas' ? 'Failed to delete canvas' : 'Failed to delete transformation map',
        'error'
      );
      setDeleteConfirm(null);
    }
  };

  // Update URL when canvas changes and select it
  const handleSelectCanvas = (canvasId: string) => {
    setCurrentCanvasId(canvasId);
    router.push(`/c/${canvasId}`);
  };

  const handleSelectTransformationMap = (slug: string) => {
    router.push(`/transformation-map?map=${encodeURIComponent(slug)}`);
  };

  const handleSelectCanvasWorkspace = () => {
    const targetCanvasId =
      (currentCanvasId && canvases.some((canvas) => canvas._id === currentCanvasId) ? currentCanvasId : null) ??
      canvases[0]?._id;
    setIsCanvasPanelOpen(true);
    router.push(targetCanvasId ? `/c/${targetCanvasId}` : '/');
  };

  const handleSelectTransformationWorkspace = () => {
    const targetMapSlug = activeTransformationMap?.slug ?? transformationMaps[0]?.slug;
    setIsTransformationPanelOpen(true);
    router.push(targetMapSlug ? `/transformation-map?map=${encodeURIComponent(targetMapSlug)}` : '/transformation-map');
  };

  const handleCreateCanvas = async () => {
    const title = prompt('Enter canvas name:');
    if (!title?.trim()) return;

    try {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const canvasId = await createCanvas(title.trim(), slug);
      handleSelectCanvas(canvasId);
      showToast('Canvas created successfully', 'success');
    } catch (error) {
      console.error('Failed to create canvas:', error);
      showToast('Failed to create canvas', 'error');
    }
  };

  const handleExportYaml = async (canvasId: string) => {
    const canvas = canvases.find((c) => c._id === canvasId);
    if (!canvas) {
      showToast('Canvas not found', 'error');
      return;
    }

    let agentsToExport = agents;
    if (canvasId === currentCanvasId) {
      if (isAgentsLoading) {
        showToast('Agents are still loading. Please try again in a moment.', 'info');
        return;
      }
    } else {
      try {
        agentsToExport = await convex.query(api.agents.list, { canvasId: canvasId as Id<"canvases"> });
      } catch (error) {
        console.error('Failed to load agents for YAML export:', error);
        showToast('Failed to export YAML', 'error');
        return;
      }
    }

    try {
      const yamlText = exportToYaml(canvas.title, agentsToExport, canvas.phases);
      const filename = `${slugifyTitle(canvas.title)}.yaml`;
      const blob = new Blob([yamlText], { type: 'text/yaml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Canvas exported to YAML', 'success');
    } catch (error) {
      console.error('Failed to export YAML:', error);
      showToast('Failed to export YAML', 'error');
    }
  };

  const itemMenuActions: Array<{
    action: SidebarMenuAction;
    label: string;
    icon: React.ComponentProps<typeof Icon>['name'];
    isDanger?: boolean;
    disabled?: boolean;
    tooltip?: string;
  }> = itemMenu?.entityType === 'canvas'
    ? [
        { action: 'share', label: 'Copy link', icon: 'share-2' },
        { action: 'export', label: 'Export as YAML', icon: 'download' },
        {
          action: 'copy',
          label: 'Copy to...',
          icon: 'copy',
          disabled: userOrgs.length <= 1,
          tooltip: userOrgs.length <= 1 ? 'You need access to other organizations to copy' : undefined,
        },
        { action: 'rename', label: 'Rename', icon: 'pencil' },
        { action: 'delete', label: 'Delete', icon: 'trash-2', isDanger: true },
      ]
    : [
        { action: 'share', label: 'Copy link', icon: 'share-2' },
        { action: 'rename', label: 'Rename', icon: 'pencil' },
        { action: 'delete', label: 'Delete', icon: 'trash-2', isDanger: true },
      ];

  return (
    <>
      <aside
        className={`sidebar ${effectiveSidebarCollapsed ? 'is-collapsed' : ''}`}
        style={{ '--sidebar-width': `${effectiveSidebarWidth}px` } as React.CSSProperties}
      >
        <div className="sidebar__header">
          <div className="sidebar__logo">
            <Icon name="layout-grid" />
          </div>
          <div className="sidebar__org-switcher" ref={orgDropdownRef}>
            {userOrgs.length > 1 ? (
              <>
                <Tooltip content="Switch organization" placement="bottom">
                  <button
                    className="sidebar__org-trigger"
                    onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                    aria-expanded={orgDropdownOpen}
                  >
                    <span className="sidebar__org-name">{isSwitchingOrg ? 'Switching...' : (currentOrg?.name || 'Loading...')}</span>
                    <span className="badge--beta">Beta</span>
                    <Icon name="chevron-down" className="sidebar__org-chevron" />
                  </button>
                </Tooltip>
                <div className={`sidebar__dropdown ${orgDropdownOpen ? 'open' : ''}`}>
                  {userOrgs.map((org) => (
                    <button
                      key={org.id}
                      className="sidebar__dropdown-item"
                      disabled={isSwitchingOrg}
                      onClick={async () => {
                        if (org.id === currentOrgId) {
                          setOrgDropdownOpen(false);
                          return;
                        }
                        setOrgDropdownOpen(false);
                        // Only sync if membership doesn't already exist in Convex
                        const hasMembership = convexMemberships.some(m => m.orgId === org.id);
                        if (!hasMembership) {
                          setIsSwitchingOrg(true);
                          try {
                            await syncMyMemberships();
                          } catch {
                            // Best-effort: continue switching even if sync fails
                          } finally {
                            setIsSwitchingOrg(false);
                          }
                        }
                        setCurrentOrgId(org.id);
                      }}
                    >
                      {org.name || org.id}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="sidebar__org-static">
                <span className="sidebar__org-name">{currentOrg?.name || 'Loading...'}</span>
                <span className="badge--beta">Beta</span>
              </div>
            )}
          </div>
          <Tooltip content="Collapse sidebar" placement="bottom">
            <button
              className="sidebar__collapse-btn"
              onClick={toggleSidebar}
            >
              <Icon name="panel-left-close" />
            </button>
          </Tooltip>
        </div>

        <div className="sidebar__section sidebar__section--grow">
          <div className="sidebar__accordion">
            <div className={`sidebar__accordion-section ${!isTransformationRoute ? 'is-current-view' : ''}`}>
              <div className="sidebar__accordion-header">
                <button
                  type="button"
                  className={`sidebar__accordion-link ${!isTransformationRoute ? 'is-active' : ''}`}
                  onClick={handleSelectCanvasWorkspace}
                >
                  <span className="sidebar__accordion-label">
                    <Icon name="layout-grid" />
                    <span>Canvases</span>
                  </span>
                  <span className="sidebar__accordion-meta">
                    <span className="sidebar__accordion-count">{canvases.length}</span>
                  </span>
                </button>
                <div className="sidebar__section-actions" ref={canvasActionsRef}>
                  <Tooltip content="Canvas actions" placement="bottom">
                    <button
                      type="button"
                      className="sidebar__action-btn"
                      onClick={() => setCanvasActionsOpen(!canvasActionsOpen)}
                      aria-expanded={canvasActionsOpen}
                    >
                      <Icon name="more-vertical" />
                    </button>
                  </Tooltip>
                  <div className={`sidebar__dropdown ${canvasActionsOpen ? 'open' : ''}`}>
                    <button
                      className="sidebar__dropdown-item"
                      onClick={() => {
                        handleCreateCanvas();
                        setCanvasActionsOpen(false);
                      }}
                    >
                      <Icon name="plus" />
                      <span>New canvas</span>
                    </button>
                    <button
                      className="sidebar__dropdown-item"
                      onClick={() => {
                        setIsImportModalOpen(true);
                        setCanvasActionsOpen(false);
                      }}
                    >
                      <Icon name="upload" />
                      <span>Import from YAML</span>
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className="sidebar__accordion-toggle"
                  onClick={() => setIsCanvasPanelOpen((open) => !open)}
                  aria-expanded={isCanvasPanelOpen}
                  aria-label={isCanvasPanelOpen ? 'Collapse canvases' : 'Expand canvases'}
                >
                  <Icon
                    name="chevron-down"
                    className={`sidebar__accordion-chevron ${isCanvasPanelOpen ? 'is-open' : ''}`}
                  />
                </button>
              </div>

              {isCanvasPanelOpen && (
                <div className="sidebar__accordion-panel">
                  <div className="sidebar__canvas-list">
                    {canvases.map((canvas) => (
                      <SidebarResourceItem
                        key={canvas._id}
                        iconName="file-text"
                        title={canvas.title}
                        isActive={currentCanvasId === canvas._id}
                        menuLabel="Canvas menu"
                        onSelect={() => handleSelectCanvas(canvas._id)}
                        onOpenMenu={(event) => handleCanvasContextMenu(event, canvas._id)}
                        onContextMenu={(event) => handleCanvasContextMenu(event, canvas._id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={`sidebar__accordion-section ${isTransformationRoute ? 'is-current-view' : ''}`}>
              <div className="sidebar__accordion-header">
                <button
                  type="button"
                  className={`sidebar__accordion-link ${isTransformationRoute ? 'is-active' : ''}`}
                  onClick={handleSelectTransformationWorkspace}
                >
                  <span className="sidebar__accordion-label">
                    <Icon name="compass" />
                    <span>Transformation Maps</span>
                  </span>
                  <span className="sidebar__accordion-meta">
                    <span className="sidebar__accordion-count">{transformationMaps.length}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="sidebar__accordion-toggle"
                  onClick={() => setIsTransformationPanelOpen((open) => !open)}
                  aria-expanded={isTransformationPanelOpen}
                  aria-label={isTransformationPanelOpen ? 'Collapse transformation maps' : 'Expand transformation maps'}
                >
                  <Icon
                    name="chevron-down"
                    className={`sidebar__accordion-chevron ${isTransformationPanelOpen ? 'is-open' : ''}`}
                  />
                </button>
              </div>

              {isTransformationPanelOpen && (
                <div className="sidebar__accordion-panel">
                  {transformationMaps.length === 0 ? (
                    <p className="sidebar__empty-hint">No transformation maps yet.</p>
                  ) : (
                    <div className="sidebar__canvas-list">
                      {transformationMaps.map((map) => {
                        const isActiveMap =
                          isTransformationRoute &&
                          activeTransformationMap !== null &&
                          activeTransformationMap.slug === map.slug;

                        return (
                          <SidebarResourceItem
                            key={map._id}
                            iconName="map"
                            title={map.title}
                            isActive={isActiveMap}
                            menuLabel="Transformation map menu"
                            onSelect={() => handleSelectTransformationMap(map.slug)}
                            onOpenMenu={(event) => handleTransformationMapContextMenu(event, map._id)}
                            onContextMenu={(event) => handleTransformationMapContextMenu(event, map._id)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="sidebar__user" ref={userMenuRef}>
          <div className="sidebar__user-avatar">
            {getUserInitials()}
          </div>
          <div className="sidebar__user-info">
            <span className="sidebar__user-name">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="sidebar__user-email">{user?.email}</span>
          </div>
          <Tooltip content="User menu" placement="top">
            <button
              className="sidebar__user-menu-btn"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-expanded={userMenuOpen}
            >
              <Icon name="more-vertical" />
            </button>
          </Tooltip>
          {userMenuOpen && (
          <div className="sidebar__dropdown sidebar__dropdown--up open">
            {/* Theme Selection */}
            <div className="sidebar__dropdown-header">Theme</div>
            <button
              className={`sidebar__dropdown-item ${themePreference === 'system' ? 'is-active' : ''}`}
              onClick={() => { setThemePreference('system'); setUserMenuOpen(false); }}
              role="menuitemradio"
              aria-checked={themePreference === 'system'}
            >
              <Icon name={SYSTEM_THEME_OPTION.icon} />
              <span>{SYSTEM_THEME_OPTION.label}</span>
              {themePreference === 'system' && <Icon name="check" className="sidebar__dropdown-check" />}
            </button>
            {THEME_VALUES.map((theme) => (
              <button
                key={theme}
                className={`sidebar__dropdown-item ${themePreference === theme ? 'is-active' : ''}`}
                onClick={() => { setThemePreference(theme); setUserMenuOpen(false); }}
                role="menuitemradio"
                aria-checked={themePreference === theme}
              >
                <Icon name={THEMES[theme].icon} />
                <span>{THEMES[theme].label}</span>
                {themePreference === theme && <Icon name="check" className="sidebar__dropdown-check" />}
              </button>
            ))}
            <div className="sidebar__dropdown-divider" />
            {isOrgAdmin && (
              <button
                className="sidebar__dropdown-item"
                onClick={() => {
                  setIsMembersModalOpen(true);
                  setUserMenuOpen(false);
                }}
              >
                <Icon name="users" />
                <span>Members</span>
              </button>
            )}
            {isOrgAdmin && (
              <button
                className="sidebar__dropdown-item"
                onClick={() => {
                  setIsMcpModalOpen(true);
                  setUserMenuOpen(false);
                }}
              >
                <Icon name="key-round" />
                <span>MCP Access</span>
              </button>
            )}
            <button
              className="sidebar__dropdown-item"
              onClick={handleSyncMemberships}
              disabled={isSyncing}
            >
              <Icon name="refresh-cw" className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Syncing...' : 'Sync memberships'}</span>
            </button>
            <button
              className="sidebar__dropdown-item"
              onClick={() => {
                setIsFeedbackModalOpen(true);
                setUserMenuOpen(false);
              }}
            >
              <Icon name="message-square" />
              <span>Send feedback</span>
            </button>
            <button
              className="sidebar__dropdown-item"
              onClick={() => {
                signOut();
                setUserMenuOpen(false);
              }}
            >
              <Icon name="log-out" />
              <span>Sign out</span>
            </button>
          </div>
          )}
        </div>

        <ImportYamlModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
        />

        {currentOrgId && isOrgAdmin && isMembersModalOpen && (
          <MembersWidget
            isOpen={isMembersModalOpen}
            onClose={() => setIsMembersModalOpen(false)}
            orgId={currentOrgId}
          />
        )}

        {currentOrgId && isOrgAdmin && isMcpModalOpen && (
          <McpAccessModal
            isOpen={isMcpModalOpen}
            onClose={() => setIsMcpModalOpen(false)}
            workosOrgId={currentOrgId}
            canvases={canvases.map((canvas) => ({ _id: canvas._id, title: canvas.title }))}
          />
        )}

        <FeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
        />

        <div
          className={`sidebar__resize-handle ${isDragging ? 'is-dragging' : ''}`}
          {...resizeHandleProps}
        />
      </aside>

      {/* Item Context Menu */}
      {itemMenu && (
        <div
          ref={menuRef}
          className="context-menu open"
          style={{
            position: 'fixed',
            left: itemMenu.x,
            top: itemMenu.y,
            zIndex: 1000,
          }}
        >
          {itemMenuActions.map((menuAction) => {
            const button = (
              <button
                key={menuAction.action}
                className={`context-menu__item ${menuAction.isDanger ? 'context-menu__item--danger' : ''}`}
                onClick={() => handleMenuAction(menuAction.action)}
                disabled={menuAction.disabled}
              >
                <Icon name={menuAction.icon} />
                <span>{menuAction.label}</span>
              </button>
            );

            if (!menuAction.tooltip) {
              return button;
            }

            return (
              <Tooltip
                key={menuAction.action}
                content={menuAction.tooltip}
                placement="left"
                disabled={!menuAction.disabled}
              >
                {button}
              </Tooltip>
            );
          })}
        </div>
      )}

      {/* Rename Modal */}
      {renameCanvas && (
        <CanvasRenameModal
          isOpen={true}
          canvasId={renameCanvas.id}
          currentTitle={renameCanvas.title}
          onClose={() => setRenameCanvas(null)}
        />
      )}

      {renameTransformationMap && (
        <TransformationMapRenameModal
          isOpen={true}
          mapId={renameTransformationMap.id}
          currentTitle={renameTransformationMap.title}
          onClose={() => setRenameTransformationMap(null)}
        />
      )}

      {/* Copy Canvas Modal */}
      {copyCanvas && (
        <CopyCanvasModal
          isOpen={true}
          canvasId={copyCanvas.id}
          canvasTitle={copyCanvas.title}
          onClose={() => setCopyCanvas(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={true}
          title={deleteConfirm.entityType === 'canvas' ? 'Delete Canvas' : 'Delete Transformation Map'}
          message={
            deleteConfirm.entityType === 'canvas'
              ? `Are you sure you want to delete "${deleteConfirm.title}"? This will also delete all agents in this canvas. This action cannot be undone.`
              : `Are you sure you want to delete "${deleteConfirm.title}"? This will also delete all departments, services, analyses, pressures, and objectives in this transformation map. This action cannot be undone.`
          }
          confirmLabel="Delete"
          confirmVariant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </>
  );
}
