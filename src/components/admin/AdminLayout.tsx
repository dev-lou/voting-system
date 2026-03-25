import React, { type ReactNode } from "react";
import type { AdminSection } from "../../lib/types";
import { useSystemClock } from "../../hooks/useSystemClock";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import { OfflineOverlay } from "../OfflineOverlay";
import { ThemeToggle } from "../ThemeToggle";

interface AdminLayoutProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  adminEmail: string;
  onLogout: () => void;
  children: ReactNode;
}

const NAV_ITEMS: { section: AdminSection; label: string; icon: ReactNode }[] = [
  {
    section: "overview",
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
      </svg>
    ),
  },
  {
    section: "results",
    label: "Results",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
  {
    section: "elections",
    label: "Elections",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
  },
  {
    section: "positions",
    label: "Positions",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Z" />
      </svg>
    ),
  },
  {
    section: "candidates",
    label: "Candidates",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Zm-13.5 0a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
  },
  {
    section: "voters",
    label: "Voters",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
  },
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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <OfflineOverlay isOnline={isOnline} />

      {/* Title Bar */}
      <div className="flex h-11 shrink-0 items-center justify-between bg-zinc-900 text-zinc-300 px-4 text-xs border-b border-zinc-800 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500 dark:opacity-80" />
            <div className="h-3 w-3 rounded-full bg-yellow-500 dark:opacity-80" />
            <div className="h-3 w-3 rounded-full bg-green-500 dark:opacity-80" />
          </div>
          <span className="text-zinc-600">|</span>
          <span className="font-bold tracking-wider">VOTE Admin</span>
          <span className="text-zinc-600">|</span>
          <span className={`flex items-center gap-1.5 ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* macOS-style window controls */}
          <div className="flex items-center gap-1.5 mr-2">
            <button aria-label="Close" className="flex h-3 w-3 items-center justify-center rounded-full bg-zinc-600 hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zinc-400">
              <svg className="h-1.5 w-1.5 text-zinc-900 opacity-50 hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <button aria-label="Minimize" className="flex h-3 w-3 items-center justify-center rounded-full bg-zinc-600 hover:bg-yellow-500 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zinc-400">
              <svg className="h-1.5 w-1.5 text-zinc-900 opacity-50 hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
            </button>
            <button aria-label="Maximize" className="flex h-3 w-3 items-center justify-center rounded-full bg-zinc-600 hover:bg-green-500 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zinc-400">
              <svg className="h-1.5 w-1.5 text-zinc-900 opacity-50 hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            </button>
          </div>
          <ThemeToggle />
          <span className="text-zinc-500 dark:text-zinc-400">{adminEmail}</span>
          <span className="tabular-nums text-zinc-500 dark:text-zinc-400">{time}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 bg-zinc-900 flex flex-col border-r border-zinc-800 dark:border-white/10">
          <div className="flex-1 py-3">
            {NAV_ITEMS.map(({ section, label, icon }, idx) => (
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
                    w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-500
                    ${activeSection === section
                      ? 'bg-maroon-700/90 text-white border-l-2 border-maroon-400'
                      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/60 border-l-2 border-transparent dark:hover:text-zinc-100'
                    }
                  `}
                >
                  <span className={activeSection === section ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}>
                    {icon}
                  </span>
                  {label}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Logout */}
          <div className="p-3 border-t border-zinc-800 dark:border-white/10">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-600 hover:text-red-400 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/60 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
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
