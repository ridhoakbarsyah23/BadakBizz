"use client"

import { apiUrl } from "@/lib/api"
import React, { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { AppFooter } from "@/components/app-footer"
import { useAuth } from "@/context/AuthContext"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  BarChart3,
  CircleAlert,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react"

const featureHighlights = [
  {
    icon: Zap,
    title: "Transaksi lebih cepat",
    description: "Alur kasir ringkas untuk pelayanan tanpa hambatan.",
  },
  {
    icon: PackageCheck,
    title: "Stok selalu terpantau",
    description: "Perubahan persediaan tercatat di setiap transaksi.",
  },
  {
    icon: BarChart3,
    title: "Laporan siap dibaca",
    description: "Pantau penjualan dan performa bisnis dengan mudah.",
  },
]

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const res = await fetch(apiUrl("/api/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (res.ok) {
        login(data.access_token || data.token, data.user)
      } else {
        setError(data.message || "Email atau kata sandi tidak sesuai.")
      }
    } catch {
      setError("Terjadi kesalahan jaringan. Silakan coba lagi.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative flex h-dvh min-h-0 w-full overflow-hidden bg-slate-950 [@media(max-height:560px)]:overflow-y-auto">
      <div className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
        <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl" />
        <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
      </div>

      <section className="relative hidden h-full min-h-0 w-[48%] overflow-hidden bg-gradient-to-br from-blue-700 via-blue-800 to-slate-950 px-10 py-10 text-white lg:flex xl:px-16 xl:py-12 [@media(max-height:800px)]:py-6">
        <div className="absolute -left-24 top-1/3 h-80 w-80 rounded-full border border-white/10" />
        <div className="absolute -left-10 top-1/3 h-56 w-56 rounded-full border border-white/10" />
        <div className="absolute -right-24 -top-20 h-80 w-80 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 translate-x-1/3 translate-y-1/3 rounded-full bg-blue-400/20 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="relative z-10 flex w-full max-w-2xl flex-col"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-1.5 shadow-2xl shadow-blue-950/30 backdrop-blur [@media(max-height:700px)]:p-1">
              <img
                src="/BadakBizz.jpeg"
                alt="Logo BadakBizz"
                loading="lazy"
                decoding="async"
                className="h-12 w-12 rounded-xl object-cover [@media(max-height:700px)]:h-10 [@media(max-height:700px)]:w-10"
              />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight">BadakBizz POS</p>
              <p className="text-xs font-semibold text-blue-100/75">Your Biz, But Stronger</p>
            </div>
          </div>

          <div className="my-auto py-8 [@media(max-height:800px)]:py-4 [@media(max-height:680px)]:py-2">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1.5 text-xs font-bold text-cyan-100 backdrop-blur [@media(max-height:800px)]:mb-3 [@media(max-height:680px)]:py-1">
              <Sparkles className="h-3.5 w-3.5" />
              Sistem operasional terintegrasi
            </div>
            <h1 className="max-w-xl text-4xl font-black leading-[1.08] tracking-[-0.04em] xl:text-5xl [@media(max-height:800px)]:text-4xl [@media(max-height:680px)]:text-3xl">
              Kasir lebih cepat.
              <span className="block bg-gradient-to-r from-cyan-200 to-blue-200 bg-clip-text text-transparent">
                Bisnis lebih terkontrol.
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-sm font-medium leading-6 text-blue-100/75 xl:text-base xl:leading-7 [@media(max-height:800px)]:mt-3 [@media(max-height:800px)]:text-sm [@media(max-height:800px)]:leading-6">
              Jalankan penjualan, pantau stok, dan baca laporan harian dari ruang kerja yang dirancang untuk operasional toko Anda.
            </p>

            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 [@media(max-height:800px)]:mt-4 [@media(max-height:700px)]:gap-2">
              {featureHighlights.map(({ icon: Icon, title, description }) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 backdrop-blur-sm xl:p-4 [@media(max-height:800px)]:p-3 [@media(max-height:680px)]:p-2.5">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-cyan-100 xl:mb-3 [@media(max-height:800px)]:mb-2">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <p className="text-sm font-extrabold">{title}</p>
                  <p className="mt-1 hidden text-xs leading-5 text-blue-100/65 xl:block [@media(max-height:850px)]:hidden">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-blue-100/60">
            <ShieldCheck className="h-4 w-4 text-cyan-200" />
            Akses aman untuk setiap peran di toko Anda
          </div>
        </motion.div>
      </section>

      <section className="relative z-10 flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50/95 px-4 sm:px-8 lg:bg-slate-50 xl:px-12 [@media(max-height:560px)]:min-h-[560px]">
        <div className="flex min-h-0 flex-1 items-center justify-center py-3 sm:py-5 [@media(max-height:800px)]:py-2">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.08 }}
            className="w-full max-w-md"
          >
            <div className="mb-4 flex items-center justify-center gap-3 lg:hidden [@media(max-height:760px)]:mb-2">
              <img
                src="/BadakBizz.jpeg"
                alt="Logo BadakBizz"
                loading="lazy"
                decoding="async"
                className="h-11 w-11 rounded-xl object-cover shadow-lg shadow-blue-500/25 [@media(max-height:700px)]:h-9 [@media(max-height:700px)]:w-9"
              />
              <div className="text-left">
                <p className="font-black tracking-tight text-slate-900">BadakBizz POS</p>
                <p className="text-[11px] font-semibold text-slate-500">Your Biz, But Stronger</p>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/80 bg-white p-5 shadow-2xl shadow-slate-950/10 sm:p-7 lg:border-slate-200/80 lg:p-8 [@media(max-height:800px)]:p-5 [@media(max-height:650px)]:p-4">
              <div className="mb-5 sm:mb-6 [@media(max-height:800px)]:mb-4 [@media(max-height:650px)]:mb-3">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-blue-700 [@media(max-height:800px)]:mb-2 [@media(max-height:650px)]:py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                  Akses BadakBizz
                </div>
                <h2 className="text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl [@media(max-height:800px)]:text-2xl">
                  Selamat datang kembali
                </h2>
                <p className="mt-1.5 text-sm font-medium leading-6 text-slate-500 [@media(max-height:650px)]:mt-1 [@media(max-height:650px)]:text-xs [@media(max-height:650px)]:leading-5">
                  Masuk menggunakan akun yang telah terdaftar untuk mengakses sistem.
                </p>
              </div>

              {error && (
                <motion.div
                  id="login-error"
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700"
                >
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 [@media(max-height:800px)]:space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-bold text-slate-700">
                    Alamat email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="nama@badakbiz.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? "login-error" : undefined}
                      className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 font-medium transition-all placeholder:text-slate-400 hover:border-slate-300 focus-visible:bg-white focus-visible:ring-blue-500/20 sm:h-12 [@media(max-height:800px)]:h-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="password" className="text-sm font-bold text-slate-700">
                      Kata sandi
                    </label>
                    <span className="text-[11px] font-semibold text-slate-400">Peka huruf besar/kecil</span>
                  </div>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Masukkan kata sandi"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? "login-error" : undefined}
                      className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 pr-12 font-medium transition-all placeholder:text-slate-400 hover:border-slate-300 focus-visible:bg-white focus-visible:ring-blue-500/20 sm:h-12 [@media(max-height:800px)]:h-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                      title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-sm font-black shadow-lg shadow-blue-600/20 transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-blue-600/30 sm:h-12 sm:text-base [@media(max-height:800px)]:h-10 [@media(max-height:800px)]:text-sm"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      Memproses akses...
                    </>
                  ) : (
                    <>
                      Masuk ke sistem
                      <ArrowRight className="h-4.5 w-4.5" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] font-semibold text-slate-500 [@media(max-height:800px)]:mt-3">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Akses sistem dibatasi sesuai peran pengguna
              </div>

              <p className="mt-4 text-center text-xs font-semibold text-slate-500 [@media(max-height:800px)]:mt-3">
                Belum memiliki akun?{" "}
                <Link href="/register" className="font-black text-blue-700 transition-colors hover:text-blue-900 hover:underline">
                  Daftar sekarang
                </Link>
              </p>
            </div>
          </motion.div>
        </div>

        <div className="mx-auto w-full max-w-md shrink-0 pb-1">
          <AppFooter compact />
        </div>
      </section>
    </main>
  )
}
