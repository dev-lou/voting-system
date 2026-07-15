import React, { type ReactNode } from "react";
import type { AdminSection } from "../../lib/types";
import { useSystemClock } from "../../hooks/useSystemClock";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { OfflineOverlay } from "../OfflineOverlay";
import { ThemeToggle } from "../ThemeToggle";
import { InstallPrompt } from "../InstallPrompt";
import {
  LayoutDashboard,
  BarChart3,
  Calendar,
  List,
  Users,
  UserPlus,
  LogOut,
  History,
  type LucideIcon,
} from "lucide-react";

interface AdminLayoutProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  adminEmail: string;
  onLogout: () => void;
  children: ReactNode;
}

const NAV_ITEMS: { section: AdminSection; label: string; icon: LucideIcon }[] = [
  { section: "overview", label: "Dashboard", icon: LayoutDashboard },
  { section: "results", label: "Results", icon: BarChart3 },
  { section: "elections", label: "Elections", icon: Calendar },
  { section: "positions", label: "Positions", icon: List },
  { section: "candidates", label: "Candidates", icon: Users },
  { section: "voters", label: "Voters", icon: UserPlus },
  { section: "audit", label: "Audit Log", icon: History },
];

export function AdminLayout({
  activeSection,
  onSectionChange,
  adminEmail,
  onLogout,
  children,
}: AdminLayoutProps) {
  const time = useSystemClock();
  const { isOnline } = useNetworkStatus();

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-zinc-50 dark:bg-[#09090b]">
      <OfflineOverlay isOnline={isOnline} />

      {/* Ambient orb behind sidebar (dark mode only) */}
      <div className="pointer-events-none absolute top-[10%] left-[-5%] z-0 h-[25vw] w-[25vw] rounded-full bg-maroon-500/5 blur-[100px] dark:bg-maroon-600/10 mix-blend-screen dark:block hidden" />

      {/* ─── Main Content Area ─── */}
      <div className="relative flex flex-1 overflow-hidden p-3 gap-4">
        {/* Left Sidebar (Glass Floating) */}
        <nav className="relative z-20 flex w-[260px] shrink-0 flex-col overflow-hidden rounded-2xl bg-white/60 dark:bg-zinc-900/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] ring-1 ring-zinc-200/50 dark:ring-white/10 backdrop-blur-3xl" role="navigation" aria-label="Admin navigation">
          
          {/* Title and macOS dots */}
          <div className="flex items-center gap-4 px-5 pt-5 pb-2">
            <div className="group flex items-center gap-2">
              <button aria-label="Minimize" className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-300 dark:bg-zinc-700 hover:bg-red-500 transition-colors cursor-default" />
              <button aria-label="Maximize" className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-300 dark:bg-zinc-700 hover:bg-yellow-500 transition-colors cursor-default" />
              <button aria-label="Fullscreen" onClick={toggleFullScreen} className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-300 dark:bg-zinc-700 hover:bg-green-500 transition-colors cursor-pointer" />
            </div>
            <span className="font-bold tracking-wider text-zinc-900 dark:text-zinc-100">VOTE Admin</span>
          </div>

          <div className="flex-1 py-3 overflow-y-auto scrollbar-thin">
            {NAV_ITEMS.map(({ section, label, icon: Icon }, idx) => (
              <React.Fragment key={section}>
                {idx === 0 && (
                  <div className="px-5 pb-1 pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                      Reports
                    </span>
                  </div>
                )}
                {idx === 2 && (
                  <div className="px-5 pb-1 pt-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                      Management
                    </span>
                  </div>
                )}
                <button
                  onClick={() => onSectionChange(section)}
                  role="tab"
                  aria-selected={activeSection === section}
                  aria-label={`${label} section`}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSectionChange(section); } }}
                  className={`
                    flex w-[calc(100%-1.5rem)] items-center gap-3 px-4 py-2.5 mx-3 rounded-xl text-left text-sm font-medium transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-500
                    ${activeSection === section
                      ? 'bg-maroon-50 dark:bg-maroon-700/20 text-maroon-700 dark:text-maroon-400 ring-1 ring-maroon-500/30 shadow-[0_0_12px_rgba(244,63,110,0.08)]'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-white/5'
                    }
                  `}
                >
                  <Icon className={`h-[18px] w-[18px] ${activeSection === section ? 'text-maroon-600 dark:text-maroon-400' : 'text-zinc-400 dark:text-zinc-600'}`} strokeWidth={1.8} />
                  {label}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Profile & Settings (Bottom of Sidebar) */}
          <div className="p-4 border-t border-zinc-200 dark:border-white/10 space-y-4">
            {/* Admin Info */}
            <div className="flex flex-col gap-1 px-1">
              <span className="text-zinc-600 dark:text-zinc-300 text-xs font-semibold truncate">{adminEmail}</span>
              <div className="flex items-center justify-between text-[11px]">
                <span className={`flex items-center gap-1.5 font-medium ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]'}`} />
                  {isOnline ? 'Online' : 'Offline'}
                </span>
                <span className="font-mono tabular-nums text-zinc-400 dark:text-zinc-500">{time}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Theme</span>
                <ThemeToggle />
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">App</span>
                <InstallPrompt />
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={onLogout}
              aria-label="Sign out of admin panel"
              tabIndex={0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-500/10 dark:hover:bg-red-500/20 transition-all cursor-pointer shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            >
              <LogOut className="h-[16px] w-[16px]" strokeWidth={2} />
              Sign Out
            </button>
          </div>
        </nav>

        {/* Main content pane (Glass Floating) */}
        <main className="relative z-10 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white/40 dark:bg-zinc-900/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] ring-1 ring-zinc-200/50 dark:ring-white/10 backdrop-blur-3xl" role="main" aria-label="Admin panel content">
          {children}
        </main>
      </div>
    </div>
  );
}
