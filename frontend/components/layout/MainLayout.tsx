"use client";

import React, { useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { SettingsPanel } from "@/components/layout/SettingsPanel";
import { AddContentModal } from "@/components/layout/AddContentModal";

interface MainLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  fullscreen?: boolean;
}

export default function MainLayout({
  children,
  pageTitle,
  fullscreen = false,
}: MainLayoutProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addContentOpen, setAddContentOpen] = useState(false);

  return (
    <SidebarProvider
      defaultOpen={true}
      style={
        {
          "--sidebar-width": "240px",
          "--sidebar-width-icon": "4rem",
        } as React.CSSProperties
      }
    >
      <div className="flex min-h-screen bg-background">
        <AppSidebar
          onSettingsClick={() => setSettingsOpen(true)}
          onAddContentClick={() => setAddContentOpen(true)}
        />

        <SidebarInset className="flex-1">
          {fullscreen ? (
            children
          ) : (
            <div className="container mx-auto p-6 space-y-6">
              {pageTitle && (
                <div className="mb-6">
                  <h1 className="text-2xl font-bold">{pageTitle}</h1>
                </div>
              )}
              {children}
            </div>
          )}
        </SidebarInset>

        {/* Settings Panel */}
        <SettingsPanel
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />

        {/* Add Content Modal */}
        <AddContentModal
          open={addContentOpen}
          onClose={() => setAddContentOpen(false)}
        />
      </div>
    </SidebarProvider>
  );
}
