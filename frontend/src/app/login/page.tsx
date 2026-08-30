"use client"

import { apiUrl } from "@/lib/api"
import React, { useState } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/context/AuthContext"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Eye, EyeOff } from "lucide-react"

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
        setError(data.message || "Kredensial tidak valid")
      }
    } catch {
      setError("Terjadi kesalahan jaringan. Silakan coba lagi.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative grid h-dvh w-full place-items-center overflow-hidden bg-slate-50 px-4 py-3 sm:px-6 sm:py-4">
      <div className="pointer-events-none absolute left-0 top-0 -z-10 h-72 w-full origin-top-left -skew-y-6 bg-primary/5 sm:h-96" />

      <motion.section
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="z-10 w-full max-w-md overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl"
      >
        <div className="px-5 py-5 sm:px-8 sm:py-6 lg:px-10 lg:py-7 max-[700px]:py-4">
          <div className="mb-5 flex flex-col items-center text-center sm:mb-6 max-[700px]:mb-4">
            <img
              src="/BadakBizz.jpeg"
              alt="BadakBizz Logo"
              className="mb-3 h-12 w-12 rounded-2xl object-cover shadow-xl shadow-primary/30 sm:h-14 sm:w-14 max-[700px]:h-10 max-[700px]:w-10"
            />
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl max-[700px]:text-xl">
              Selamat Datang
            </h2>
            <p className="mt-1.5 text-sm font-medium text-slate-500 sm:text-base max-[700px]:text-xs">
              Silakan masuk ke akun BadakBizz Anda.
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-4 flex items-center justify-center rounded-xl border border-red-100 bg-red-50 p-3 text-center text-sm font-bold text-red-600 max-[700px]:p-2 max-[700px]:text-xs"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 max-[700px]:space-y-2.5">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 max-[700px]:text-xs">Alamat Email</label>
              <Input
                type="email"
                placeholder="admin@badakbiz.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 rounded-xl border-slate-200 bg-slate-50 font-medium transition-all focus-visible:bg-white focus-visible:ring-primary sm:h-11 max-[700px]:h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 max-[700px]:text-xs">Kata Sandi</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 rounded-xl border-slate-200 bg-slate-50 pr-12 font-medium transition-all focus-visible:bg-white focus-visible:ring-primary sm:h-11 max-[700px]:h-9"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="mt-3 h-11 w-full rounded-xl text-base font-black shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02] active:scale-[0.98] sm:h-12 max-[700px]:h-10"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Sedang Masuk...
                </>
              ) : (
                "Masuk"
              )}
            </Button>
          </form>

          <div className="mt-5 border-t border-slate-100 pt-4 sm:mt-6 sm:pt-5 max-[700px]:mt-4 max-[700px]:pt-3">
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400 max-[700px]:mb-2">
              Akses Cepat (Demo)
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm max-[700px]:gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center transition-all hover:border-primary/50 hover:bg-primary/5 group sm:p-3 max-[700px]:p-2"
                onClick={() => { setEmail("admin@badakbiz.com"); setPassword("password") }}
              >
                <span className="font-black text-slate-900 group-hover:text-primary">Admin</span>
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center transition-all hover:border-primary/50 hover:bg-primary/5 group sm:p-3 max-[700px]:p-2"
                onClick={() => { setEmail("cashier@badakbiz.com"); setPassword("password") }}
              >
                <span className="font-black text-slate-900 group-hover:text-primary">Kasir</span>
              </button>
            </div>
          </div>
        </div>
      </motion.section>
    </main>
  )
}
