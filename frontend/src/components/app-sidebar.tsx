"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Tags, 
  ArrowRightLeft, 
  Users, 
  BarChart3, 
  Settings,
  LogOut,
  X
} from "lucide-react";
import { Button } from "@heroui/react";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, adminOnly: true },
  { title: "POS", url: "/pos", icon: ShoppingBag, adminOnly: false },
  { title: "Transactions", url: "/transactions", icon: ArrowRightLeft, adminOnly: false },
  { title: "Products", url: "/products", icon: Package, adminOnly: true },
  { title: "Categories", url: "/categories", icon: Tags, adminOnly: true },
  { title: "Inventory", url: "/inventory", icon: ArrowRightLeft, adminOnly: true },
  { title: "Customers", url: "/customers", icon: Users, adminOnly: true },
  { title: "Reports", url: "/reports", icon: BarChart3, adminOnly: true },
];

export function AppSidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [roleId, setRoleId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const match = document.cookie.match(new RegExp('(^| )kivo_role_id=([^;]+)'));
    if (match) setRoleId(match[2]);
  }, []);

  const filteredItems = navItems.filter(item => {
    if (roleId === '2' && item.adminOnly) return false;
    return true;
  });

  return (
    <aside 
      className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-background border-r border-default-200 transform transition-transform duration-200 ease-in-out flex flex-col ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      <div className="flex items-center justify-between h-16 px-6 border-b border-default-200 shrink-0">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <ShoppingBag className="w-6 h-6" />
          <span>Kivo POS</span>
        </div>
        <Button 
          isIconOnly 
          variant="tertiary" 
          className="lg:hidden -mr-2"
          onPress={() => setIsOpen(false)}
        >
          <X className="w-5 h-5 text-default-600" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <div className="text-xs font-semibold text-default-500 uppercase tracking-wider mb-2 px-3">
          Menu Utama
        </div>
        {filteredItems.map((item) => {
          const isActive = pathname === item.url || pathname.startsWith(`${item.url}/`) && item.url !== "/";
          
          return (
            <Button
              key={item.title}
              variant={isActive ? "secondary" : "tertiary"}
              className="w-full justify-start font-medium h-11"
              onPress={() => {
                router.push(item.url);
                setIsOpen(false);
              }}
            >
              <item.icon className="w-5 h-5 mr-2" />
              {item.title}
            </Button>
          );
        })}
      </div>

      <div className="p-4 border-t border-default-200 shrink-0 space-y-2">
        {roleId !== '2' && (
          <Button
            variant="tertiary"
            className="w-full justify-start font-medium h-11"
            onPress={() => {
              router.push("/settings");
              setIsOpen(false);
            }}
          >
            <Settings className="w-5 h-5 mr-2" />
            Settings
          </Button>
        )}
        <Button 
          variant="danger-soft" 
          className="w-full justify-start font-medium h-11"
          onPress={() => {
            document.cookie = "kivo_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "kivo_role_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            window.location.href = "/login";
          }}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
