import React, { type ReactNode } from "react";
import type { AdminSection } from "../../lib/types";
import { useSystemClock } from "../../hooks/useSystemClock";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { OfflineOverlay } from "../OfflineOverlay";
import { ThemeToggle } from "../ThemeToggle";
import {
  LayoutDashboard,
  BarChart3,
  Calendar,
  List,
  Users,
  UserPlus,
  LogOut,
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

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <OfflineOverlay isOnline={isOnline} />

      {/* Ambient orb behind sidebar (dark mode only) */}
      <div className="pointer-events-none absolute top-[10%] left-[-5%] h-[25vw] w-[25vw] rounded-full bg-maroon-500/5 blur-[100px] dark:bg-maroon-600/10 mix-blend-screen dark:block hidden" />

      {/* Title Bar — frosted glass */}
      <div className="relative z-30 flex h-12 shrink-0 items-center justify-between bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl border-b border-zinc-200 dark:border-white/10 px-5 text-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-maroon-500 to-maroon-700 text-[10px] font-bold text-white shadow-md">
            V
          </div>
          <span className="font-bold tracking-wider text-zinc-900 dark:text-zinc-100">VOTE Admin</span>
          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
          <span className={`flex items-center gap-1.5 text-xs font-medium ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
          <span className="text-zinc-500 dark:text-zinc-400 text-xs">{adminEmail}</span>
          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
          <span className="font-mono tabular-nums text-xs text-zinc-500 dark:text-zinc-400">{time}</span>
        </div>
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        {/* Sidebar — frosted glass */}
        <div className="w-60 shrink-0 bg-white/60 dark:bg-zinc-900/40 backdrop-blur-2xl border-r border-zinc-200 dark:border-white/10 flex flex-col z-10">
          <div className="flex-1 py-3">
            {NAV_ITEMS.map(({ section, label, icon: Icon }, idx) => (
              <React.Fragment key={section}>
                {idx === 0 && (
                  <div className="px-5 pb-1 pt-3">
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
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl text-left text-sm font-medium transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-500
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

          {/* Logout */}
          <div className="p-3 border-t border-zinc-200 dark:border-white/10">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-hidden bg-zinc-50 dark:bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  );
}
