"use client";

import { useState, useMemo } from "react";
import { Sidebar } from "./sidebar";
import { SidebarContext } from "./sidebar-context";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const ctx = useMemo(() => ({ openMobile: () => setMobileOpen(true) }), []);

  return (
    <SidebarContext.Provider value={ctx}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
        <main className="flex flex-1 flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-y-auto">{children}</div>
        </main>

        {/* Mobile backdrop */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </div>
    </SidebarContext.Provider>
  );
}
