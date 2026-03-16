import { useState, useEffect } from "react";
import type { AdminSection } from "../../lib/types";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { OverviewPanel } from "../../components/admin/OverviewPanel";
import { ElectionsPanel } from "../../components/admin/ElectionsPanel";
import { PositionsPanel } from "../../components/admin/PositionsPanel";
import { CandidatesPanel } from "../../components/admin/CandidatesPanel";
import { VotersPanel } from "../../components/admin/VotersPanel";
import { ResultsPanel } from "../../components/admin/ResultsPanel";
import { ADMIN_SESSION_KEY } from "../../App";

interface AdminDashboardProps {
  onLogout: () => void;
}

/**
 * Root admin page. Manages the active panel state and passes it to
 * AdminLayout. All data fetching happens inside the individual panels.
 */
export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [adminEmail, setAdminEmail] = useState<string>("");

  useEffect(() => {
    // Admin email is stored in sessionStorage — no Supabase Auth session for admins
    setAdminEmail(sessionStorage.getItem(ADMIN_SESSION_KEY) ?? "admin");
  }, []);

  function renderPanel() {
    switch (activeSection) {
      case "overview":   return <OverviewPanel />;
      case "elections":  return <ElectionsPanel />;
      case "positions":  return <PositionsPanel />;
      case "candidates": return <CandidatesPanel />;
      case "voters":     return <VotersPanel />;
      case "results":    return <ResultsPanel />;
    }
  }

  return (
    <AdminLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      adminEmail={adminEmail}
      onLogout={onLogout}
    >
      {renderPanel()}
    </AdminLayout>
  );
}
