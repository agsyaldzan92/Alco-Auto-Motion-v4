import React, { useState, useRef, useEffect } from 'react';
import { Menu, Sun, Moon, Monitor, Download, ChevronDown, Sparkles } from 'lucide-react';
import { ApiKeyControl } from './ApiKeyControl';
import { ThemeMode } from '../hooks/useTheme';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  onOpenApiKeyModal: () => void;
  hasPlan?: boolean;
  onOpenExportModal?: () => void;
  isProcessing?: boolean;
  activeTab?: 'input' | 'analysis' | 'edit_preview';
  onSelectTab?: (tab: 'input' | 'analysis' | 'edit_preview') => void;
  theme?: ThemeMode;
  resolvedTheme?: 'light' | 'dark';
  onThemeChange?: (theme: ThemeMode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
  onOpenApiKeyModal,
  hasPlan,
  onOpenExportModal,
  isProcessing,
  theme = 'dark',
  onThemeChange,
}) => {
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setIsThemeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getThemeIcon = (t: ThemeMode | string) => {
    if (t === 'light') return <Sun className="w-3.5 h-3.5 text-amber-500" />;
    if (t === 'dark') return <Moon className="w-3.5 h-3.5 text-blue-400" />;
    return <Monitor className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />;
  };

  return (
    <header id="alco-header" className="bg-[var(--card)] border-b border-[var(--border)] sticky top-0 z-40 h-14 flex items-center px-4 justify-between select-none">
      {/* Left: Mobile Toggle + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border)] text-[var(--fg-app)] hover:bg-[var(--secondary)] transition-colors"
          title="Open Navigation"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div>
          <h1 className="text-sm font-bold tracking-tight text-[var(--fg-app)] flex items-center gap-2">
            <span>Auto Motion Studio</span>
            <span className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-semibold uppercase tracking-wider bg-blue-500/15 text-blue-500 border border-blue-500/20 rounded">
              V4 Engine
            </span>
          </h1>
          <p className="text-[11px] text-[var(--muted-foreground)] hidden sm:block">
            AI Video Editing Director & Motion Engine
          </p>
        </div>
      </div>

      {/* Right: API Key + Theme Control + Export Button */}
      <div className="flex items-center gap-2.5">
        {/* Processing Indicator */}
        {isProcessing && (
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-500 text-xs font-semibold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            <span>AI Active...</span>
          </div>
        )}

        {/* API Key Control */}
        <ApiKeyControl onOpenModal={onOpenApiKeyModal} />

        {/* Theme Selector Popover */}
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => setIsThemeOpen(!isThemeOpen)}
            className="alco-control flex items-center gap-1.5 px-2.5 h-8 text-xs font-medium cursor-pointer"
            title="Switch Visual Theme"
          >
            {getThemeIcon(theme)}
            <span className="capitalize hidden sm:inline">{theme}</span>
            <ChevronDown className="w-3 h-3 text-[var(--muted-foreground)]" />
          </button>

          {isThemeOpen && (
            <div className="absolute right-0 mt-1 w-32 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg p-1 z-50 space-y-0.5">
              {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    onThemeChange?.(mode);
                    setIsThemeOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md capitalize transition-colors ${
                    theme === mode
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-[var(--fg-app)] hover:bg-[var(--secondary)]'
                  }`}
                >
                  {getThemeIcon(mode)}
                  <span>{mode}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Export Button Header Quick Access */}
        {hasPlan && onOpenExportModal && (
          <button
            onClick={onOpenExportModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        )}
      </div>
    </header>
  );
};
