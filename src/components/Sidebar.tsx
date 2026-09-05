import React, { useState, useEffect } from 'react';
import {
  Wand2,
  Video,
  Layers,
  PlayCircle,
  Key,
  Download,
  PanelLeftClose,
  PanelLeft,
  X,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  activeTab: 'input' | 'analysis' | 'edit_preview';
  onSelectTab: (tab: 'input' | 'analysis' | 'edit_preview') => void;
  hasPlan: boolean;
  isProcessing: boolean;
  onOpenApiKeyModal: () => void;
  onOpenExportModal?: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const STORAGE_KEY = 'alco_sidebar_collapsed';

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  hasPlan,
  isProcessing,
  onOpenApiKeyModal,
  onOpenExportModal,
  isMobileOpen,
  onMobileClose,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'true';
    } catch (_) {
      return false;
    }
  });

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch (_) {}
  };

  const handleNavClick = (tab: 'input' | 'analysis' | 'edit_preview') => {
    if ((tab === 'analysis' || tab === 'edit_preview') && !hasPlan && !isProcessing) {
      return;
    }
    onSelectTab(tab);
    onMobileClose();
  };

  const navItems = [
    {
      id: 'input' as const,
      label: 'Input',
      subtitle: 'Video & Script Setup',
      icon: Video,
      disabled: false,
    },
    {
      id: 'analysis' as const,
      label: 'AI Analysis',
      subtitle: 'Funnel & Scene Breakdown',
      icon: Layers,
      disabled: !hasPlan && !isProcessing,
      badge: hasPlan ? 'Ready' : undefined,
    },
    {
      id: 'edit_preview' as const,
      label: 'Edit & Preview',
      subtitle: 'Interactive Editing Workspace',
      icon: PlayCircle,
      disabled: !hasPlan && !isProcessing,
      badge: hasPlan ? 'LIVE' : undefined,
    },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between p-3 select-none">
      {/* Top Section: Brand & Navigation */}
      <div className="space-y-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between h-11 px-2 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Wand2 className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm tracking-tight truncate text-[var(--fg-app)]">
                  ALCO <span className="font-normal text-blue-500 text-xs">Auto Motion</span>
                </span>
                <span className="text-[10px] text-[var(--muted-foreground)] truncate font-medium">
                  AI Video Editor
                </span>
              </div>
            )}
          </div>

          {/* Desktop Toggle Collapse Button */}
          <button
            onClick={toggleCollapse}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-md text-[var(--muted-foreground)] hover:text-[var(--fg-app)] hover:bg-[var(--secondary)] transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={onMobileClose}
            className="md:hidden flex items-center justify-center w-7 h-7 rounded-md text-[var(--muted-foreground)] hover:text-[var(--fg-app)] hover:bg-[var(--secondary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {!isCollapsed && (
            <div className="alco-section-label px-2.5 py-1 text-[10px]">NAVIGATION</div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isDisabled = item.disabled;

            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => handleNavClick(item.id)}
                disabled={isDisabled}
                title={isCollapsed ? `${item.label} (${item.subtitle})` : undefined}
                className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-left transition-all relative ${
                  isActive
                    ? 'bg-blue-600 text-white font-medium shadow-xs'
                    : isDisabled
                    ? 'opacity-40 cursor-not-allowed text-[var(--muted-foreground)]'
                    : 'text-[var(--fg-app)] hover:bg-[var(--secondary)]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-blue-500'}`} />

                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold truncate">{item.label}</span>
                      {item.badge && !isActive && (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-blue-500/15 text-blue-500 border border-blue-500/20">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] truncate ${isActive ? 'text-blue-100' : 'text-[var(--muted-foreground)]'}`}>
                      {item.subtitle}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Quick Tools */}
      <div className="space-y-2 pt-3 border-t border-[var(--border)]">
        {!isCollapsed && (
          <div className="alco-section-label px-2.5 text-[10px]">QUICK TOOLS</div>
        )}

        {/* Export Video Button */}
        <button
          onClick={() => {
            if (hasPlan && onOpenExportModal) {
              onOpenExportModal();
              onMobileClose();
            }
          }}
          disabled={!hasPlan}
          title={isCollapsed ? 'Export Video' : undefined}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            hasPlan
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs cursor-pointer'
              : 'opacity-40 cursor-not-allowed bg-[var(--secondary)] text-[var(--muted-foreground)]'
          }`}
        >
          <Download className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="truncate">Export Video</span>}
        </button>

        {/* Gemini API Key Button */}
        <button
          onClick={() => {
            onOpenApiKeyModal();
            onMobileClose();
          }}
          title={isCollapsed ? 'Gemini API Key' : undefined}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--fg-app)] bg-[var(--secondary)] hover:bg-[var(--muted)] border border-[var(--border)] transition-colors cursor-pointer"
        >
          <Key className="w-4 h-4 shrink-0 text-amber-500" />
          {!isCollapsed && <span className="truncate">Gemini API Key</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop In-Flow Sidebar */}
      <aside
        className={`hidden md:block shrink-0 bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] transition-all duration-200 z-30 ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
          />

          {/* Drawer Content */}
          <aside className="relative w-64 max-w-[80vw] bg-[var(--sidebar)] h-full border-r border-[var(--sidebar-border)] shadow-xl z-50 flex flex-col">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
