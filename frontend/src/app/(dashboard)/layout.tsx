"use client";

import React, { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { AppFooter } from "@/components/app-footer";
import { Button } from "@heroui/react";
import { Menu } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-slate-100/70">
      <AppSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="z-30 flex h-16 shrink-0 items-center border-b border-slate-200/70 bg-white/95 px-4 shadow-sm backdrop-blur lg:hidden">
          <Button
            isIconOnly
            variant="tertiary"
            onPress={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-6 h-6 text-slate-700" />
          </Button>
          <div className="ml-3 flex min-w-0 items-center gap-2.5">
            <img
              src="/BadakBizz.jpeg"
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              className="h-8 w-8 shrink-0 rounded-lg object-cover shadow-md shadow-blue-500/20"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-black tracking-tight text-slate-900">BadakBizz</p>
              <p className="truncate text-[10px] font-semibold text-slate-400">Sistem Operasional</p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 xl:p-7">
          <div className="mx-auto flex min-h-full w-full min-w-0 max-w-[1680px] flex-col">
            <div className="min-w-0 max-w-full flex-1">
              {children}
            </div>
            <AppFooter />
          </div>
        </div>
      </main>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[2px] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
