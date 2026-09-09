"use client";

import { apiUrl } from "@/lib/api"
import React from "react";
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
  Loader2,
  Edit3,
  Armchair,
  CalendarClock,
  CircleAlert,
  Eye,
  EyeOff,
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
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

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
      { title: "Data Produk", url: "/products", icon: Package, roles: ['admin'] },
      { title: "Kategori", url: "/categories", icon: Tags, roles: ['admin'] },
      { title: "Manajemen Stok", url: "/inventory", icon: ArrowRightLeft, roles: ['admin'] },
      { title: "Manajemen Meja", url: "/tables", icon: Armchair, roles: ['admin'] },
    ]
  },
  {
    label: "Orang",
    items: [
      { title: "Pelanggan", url: "/customers", icon: Users, roles: ['admin', 'cashier'] },
      { title: "Data Karyawan", url: "/staff", icon: UserCog, roles: ['admin'] },
    ]
  },
  {
    label: "Laporan",
    items: [
      { title: "Riwayat Transaksi", url: "/transactions", icon: History, roles: ['admin', 'cashier'] },
      { title: "Shift Kasir", url: "/shifts", icon: CalendarClock, roles: ['admin'] },
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
  const [isEditProfileOpen, setIsEditProfileOpen] = React.useState(false);
  const [editName, setEditName] = React.useState("");
  const [editEmail, setEditEmail] = React.useState("");
  const [editPassword, setEditPassword] = React.useState("");
  const [showEditPassword, setShowEditPassword] = React.useState(false);
  const [profileError, setProfileError] = React.useState("");
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  
  // Update form when user data is available
  React.useEffect(() => {
    if (user) {
      setEditName(user.name || "");
      setEditEmail(user.email || "");
    }
  }, [user]);

  const { token, login } = useAuth(); // Need login to update context user
  
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileError("");
    try {
      const res = await fetch(apiUrl('/api/profile'), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          password: editPassword || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Profil belum dapat diperbarui.");
      
      // Update local storage and context
      if (data.user) {
        login(token!, data.user); 
      }
      setIsEditProfileOpen(false);
      setEditPassword("");
      setShowEditPassword(false);
    } catch (err: any) {
      setProfileError(err.message || "Terjadi kesalahan saat memperbarui profil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] transform flex-col border-r border-slate-200/70 bg-white shadow-xl shadow-slate-950/5 transition-transform duration-300 ease-in-out lg:static lg:w-[17rem] lg:max-w-none lg:shadow-none ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
    >
      <div className="flex h-[4.5rem] shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/BadakBizz.jpeg"
            alt="Logo BadakBizz"
            loading="lazy"
            decoding="async"
            className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-lg shadow-blue-500/20"
          />
          <div className="min-w-0">
            <p className="truncate text-base font-black tracking-tight text-slate-900">BadakBizz</p>
            <p className="truncate text-[10px] font-extrabold uppercase tracking-[0.14em] text-blue-600">Point of Sale</p>
          </div>
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

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {navGroups.map((group, idx) => {
          // Filter items based on role
          const filteredItems = group.items.filter(item => item.roles.includes(userRole));

          if (filteredItems.length === 0) return null; // Hide group if no items for this role

          return (
            <div key={idx} className="space-y-1">
              <div className="mb-1.5 px-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                {group.label}
              </div>
              {filteredItems.map((item) => {
                const isActive = pathname === item.url || (pathname.startsWith(`${item.url}/`) && item.url !== "/");

                return (
                  <Button
                    key={item.title}
                    variant="tertiary"
                    className={`h-10 w-full min-w-0 justify-start rounded-xl px-3 text-sm font-bold transition-all ${isActive ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/15' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
                    onPress={() => {
                      router.push(item.url);
                      setIsOpen(false);
                    }}
                  >
                    <item.icon className={`mr-3 h-[18px] w-[18px] shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="min-w-0 truncate">{item.title}</span>
                  </Button>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-2.5 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-700">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="line-clamp-1 text-sm font-black text-slate-800">{user?.name}</p>
            <p className="truncate text-[11px] font-semibold capitalize text-slate-500">{user?.role?.name}</p>
          </div>
          <Button 
            variant="tertiary" 
            isIconOnly 
            size="sm" 
            className="h-8 w-8 rounded-lg"
            onPress={() => setIsEditProfileOpen(true)}
          >
            <Edit3 className="w-4 h-4 text-slate-500" />
          </Button>
        </div>

        {userRole === 'admin' && (
          <Button
            variant="tertiary"
            className="mb-1 h-9 w-full min-w-0 justify-start rounded-xl px-3 text-sm font-bold text-slate-600 hover:bg-slate-100"
            onPress={() => {
              router.push("/settings");
              setIsOpen(false);
            }}
          >
            <Settings className="w-4 h-4 mr-3 shrink-0 text-slate-400" />
            <span className="min-w-0 truncate">Pengaturan Toko</span>
          </Button>
        )}
        <Button
          variant="danger-soft"
          className="h-9 w-full min-w-0 justify-start rounded-xl px-3 text-sm font-bold"
          onPress={() => setIsLogoutOpen(true)}
        >
          <LogOut className="w-4 h-4 mr-3 shrink-0" />
          <span className="min-w-0 truncate">Keluar</span>
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

      <Dialog
        open={isEditProfileOpen}
        onOpenChange={(open) => {
          setIsEditProfileOpen(open)
          if (!open) {
            setEditPassword("")
            setShowEditPassword(false)
            setProfileError("")
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] rounded-2xl sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Perbarui Profil</DialogTitle>
            <DialogDescription>
              Pastikan informasi akun tetap akurat dan dapat digunakan untuk mengakses sistem.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {profileError && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label htmlFor="profile-name" className="text-sm font-semibold">Nama lengkap</label>
              <Input 
                id="profile-name"
                name="name"
                autoComplete="name"
                placeholder="Masukkan nama lengkap"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-11 rounded-xl"
                disabled={isSavingProfile}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="profile-email" className="text-sm font-semibold">Alamat email</label>
              <Input 
                id="profile-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="nama@bisnis.com"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="h-11 rounded-xl"
                disabled={isSavingProfile}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="profile-password" className="text-sm font-semibold">Kata sandi baru <span className="font-medium text-slate-400">(opsional)</span></label>
              <div className="relative">
                <Input
                  id="profile-password"
                  name="new-password"
                  type={showEditPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Masukkan kata sandi baru"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="h-11 rounded-xl pr-12"
                  disabled={isSavingProfile}
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword((visible) => !visible)}
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                  aria-label={showEditPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  title={showEditPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  disabled={isSavingProfile}
                >
                  {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs font-medium text-slate-500">Kosongkan kolom ini jika kata sandi tidak ingin diubah.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="tertiary" onPress={() => setIsEditProfileOpen(false)} isDisabled={isSavingProfile}>Batal</Button>
            <Button onPress={handleSaveProfile} isDisabled={isSavingProfile} className="bg-primary text-white hover:bg-primary/90 font-bold rounded-xl">
              {isSavingProfile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isSavingProfile ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
