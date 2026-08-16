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
        <div className="flex h-16 items-center border-b border-default-200 px-4 bg-background lg:hidden shrink-0">
          <Button 
            isIconOnly 
            variant="tertiary" 
            onPress={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-6 h-6 text-default-600" />
          </Button>
          <span className="font-bold ml-4 text-default-800 text-lg">Kivo POS</span>
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
