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
  X,
  UserCog
} from "lucide-react";
import { Button } from "@heroui/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { useAuth } from "@/context/AuthContext";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: ['admin'] },
  { title: "POS", url: "/pos", icon: ShoppingBag, roles: ['admin', 'cashier'] },
  { title: "Transactions", url: "/transactions", icon: ArrowRightLeft, roles: ['admin', 'cashier'] },
  { title: "Products", url: "/products", icon: Package, roles: ['admin', 'cashier'] },
  { title: "Categories", url: "/categories", icon: Tags, roles: ['admin', 'cashier'] },
  { title: "Inventory", url: "/inventory", icon: ArrowRightLeft, roles: ['admin', 'cashier'] },
  { title: "Customers", url: "/customers", icon: Users, roles: ['admin'] },
  { title: "Staff", url: "/staff", icon: UserCog, roles: ['admin'] },
  { title: "Shift Reports", url: "/shifts", icon: BarChart3, roles: ['admin'] },
  { title: "Reports", url: "/reports", icon: BarChart3, roles: ['admin'] },
];

export function AppSidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const userRole = user?.role?.slug || 'cashier'; // Default to cashier if undefined to be safe

  const filteredItems = navItems.filter(item => item.roles.includes(userRole));

  const [isLogoutOpen, setIsLogoutOpen] = React.useState(false);

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
        <div className="mb-4 px-2">
          <p className="text-sm font-bold text-slate-800">{user?.name}</p>
          <p className="text-xs font-medium text-slate-500 capitalize">{user?.role?.name}</p>
        </div>
        {userRole === 'admin' && (
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
          onPress={() => setIsLogoutOpen(true)}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sign Out
        </Button>
      </div>

      <AlertDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You will need to log in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setIsLogoutOpen(false)
              logout()
            }}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
