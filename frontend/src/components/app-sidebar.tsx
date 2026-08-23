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
  UserCog,
  History,
  ClipboardList
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

const navGroups = [
  {
    label: "Menu Utama",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: ['admin'] },
      { title: "Kasir (POS)", url: "/pos", icon: ShoppingBag, roles: ['admin', 'cashier'] },
    ]
  },
  {
    label: "Katalog & Stok",
    items: [
      { title: "Data Produk", url: "/products", icon: Package, roles: ['admin', 'cashier'] },
      { title: "Kategori", url: "/categories", icon: Tags, roles: ['admin', 'cashier'] },
      { title: "Manajemen Stok", url: "/inventory", icon: ArrowRightLeft, roles: ['admin', 'cashier'] },
    ]
  },
  {
    label: "Orang",
    items: [
      { title: "Pelanggan", url: "/customers", icon: Users, roles: ['admin'] },
      { title: "Data Karyawan", url: "/staff", icon: UserCog, roles: ['admin'] },
    ]
  },
  {
    label: "Laporan",
    items: [
      { title: "Riwayat Transaksi", url: "/transactions", icon: History, roles: ['admin', 'cashier'] },
      { title: "Laporan Shift", url: "/shifts", icon: ClipboardList, roles: ['admin'] },
      { title: "Laporan Keuangan", url: "/reports", icon: BarChart3, roles: ['admin'] },
    ]
  }
];

export function AppSidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const userRole = user?.role?.slug || 'cashier'; // Default to cashier if undefined to be safe

  const [isLogoutOpen, setIsLogoutOpen] = React.useState(false);

  return (
    <aside 
      className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 shadow-sm transform transition-transform duration-300 ease-in-out flex flex-col ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      <div className="flex items-center justify-between h-16 px-6 border-b border-slate-100 shrink-0 bg-white">
        <div className="flex items-center gap-2 font-black text-xl text-primary tracking-tight">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shadow-primary/20">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <span>Kivo POS</span>
        </div>
        <Button 
          isIconOnly 
          variant="tertiary" 
          className="lg:hidden -mr-2"
          onPress={() => setIsOpen(false)}
        >
          <X className="w-5 h-5 text-slate-500" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
        {navGroups.map((group, idx) => {
          // Filter items based on role
          const filteredItems = group.items.filter(item => item.roles.includes(userRole));
          
          if (filteredItems.length === 0) return null; // Hide group if no items for this role

          return (
            <div key={idx} className="space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">
                {group.label}
              </div>
              {filteredItems.map((item) => {
                const isActive = pathname === item.url || (pathname.startsWith(`${item.url}/`) && item.url !== "/");
                
                return (
                  <Button
                    key={item.title}
                    variant={isActive ? "secondary" : "tertiary"}
                    className={`w-full justify-start font-semibold h-11 px-3 ${isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:text-slate-900'}`}
                    onPress={() => {
                      router.push(item.url);
                      setIsOpen(false);
                    }}
                  >
                    <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                    {item.title}
                  </Button>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-100 shrink-0 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 line-clamp-1">{user?.name}</p>
            <p className="text-xs font-semibold text-slate-500 capitalize">{user?.role?.name}</p>
          </div>
        </div>
        
        {userRole === 'admin' && (
          <Button
            variant="tertiary"
            className="w-full justify-start font-semibold h-10 text-slate-600 mb-1"
            onPress={() => {
              router.push("/settings");
              setIsOpen(false);
            }}
          >
            <Settings className="w-4 h-4 mr-3 text-slate-400" />
            Pengaturan Toko
          </Button>
        )}
        <Button 
          variant="danger-soft" 
          className="w-full justify-start font-semibold h-10"
          onPress={() => setIsLogoutOpen(true)}
        >
          <LogOut className="w-4 h-4 mr-3" />
          Keluar (Sign Out)
        </Button>
      </div>

      <AlertDialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Keluar</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin keluar dari aplikasi? Anda harus login kembali untuk masuk.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl font-semibold">Batal</AlertDialogCancel>
            <AlertDialogAction 
              className="rounded-xl font-bold bg-red-600 hover:bg-red-700"
              onClick={() => {
                setIsLogoutOpen(false)
                logout()
              }}
            >
              Ya, Keluar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
