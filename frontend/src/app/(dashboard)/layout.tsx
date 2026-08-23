"use client";

import React, { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@heroui/react";
import { Menu } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-default-50">
      <AppSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <main className="flex flex-1 flex-col overflow-hidden relative">
        {/* Mobile Header */}
        <div className="flex h-16 items-center border-b border-slate-100 px-4 bg-white lg:hidden shrink-0 shadow-sm z-10">
          <Button 
            isIconOnly 
            variant="tertiary" 
            onPress={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-6 h-6 text-slate-700" />
          </Button>
          <div className="flex items-center gap-2 font-black text-lg text-primary tracking-tight ml-4">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center shadow-md shadow-primary/20">
              <span className="text-white text-xs">K</span>
            </div>
            <span>Kivo POS</span>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
      
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
