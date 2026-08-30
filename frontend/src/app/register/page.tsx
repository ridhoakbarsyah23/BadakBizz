"use client"

import { apiUrl } from "@/lib/api"
import React, { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useAuth } from "@/context/AuthContext"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, Loader2 } from "lucide-react"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== passwordConfirmation) {
      setError("Konfirmasi kata sandi tidak sama.")
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch(apiUrl("/api/register"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          password_confirmation: passwordConfirmation,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        login(data.access_token || data.token, data.user)
      } else {
        const validationMessage = data.errors
          ? Object.values(data.errors).flat().join(" ")
          : null
        setError(validationMessage || data.message || "Registrasi gagal. Silakan coba lagi.")
      }
    } catch {
      setError("Terjadi kesalahan jaringan. Silakan coba lagi.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative grid min-h-dvh w-full place-items-center overflow-hidden bg-slate-50 px-4 py-6 sm:px-6">
      <div className="pointer-events-none absolute left-0 top-0 -z-10 h-80 w-full origin-top-left -skew-y-6 bg-primary/5 sm:h-[28rem]" />

      <motion.section
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="z-10 w-full max-w-md overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl"
      >
        <div className="px-5 py-6 sm:px-8 sm:py-7 lg:px-10">
          <div className="mb-6 flex flex-col items-center text-center">
            <img
              src="/BadakBizz.jpeg"
              alt="BadakBizz Logo"
              className="mb-3 h-12 w-12 rounded-2xl object-cover shadow-xl shadow-primary/30 sm:h-14 sm:w-14"
            />
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Buat Akun
            </h2>
            <p className="mt-1.5 text-sm font-medium text-slate-500 sm:text-base">
              Daftar untuk mulai memakai BadakBizz POS.
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-center text-sm font-bold text-red-600"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Nama Lengkap</label>
              <Input
                type="text"
                placeholder="Nama Anda"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-slate-50 font-medium transition-all focus-visible:bg-white focus-visible:ring-primary"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Alamat Email</label>
              <Input
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-slate-50 font-medium transition-all focus-visible:bg-white focus-visible:ring-primary"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Kata Sandi</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 pr-12 font-medium transition-all focus-visible:bg-white focus-visible:ring-primary"
                  required
                  minLength={6}
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

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">Konfirmasi Kata Sandi</label>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Ulangi kata sandi"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-slate-50 font-medium transition-all focus-visible:bg-white focus-visible:ring-primary"
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="mt-4 h-12 w-full rounded-xl text-base font-black shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Membuat Akun...
                </>
              ) : (
                "Daftar"
              )}
            </Button>
          </form>

          <p className="mt-5 border-t border-slate-100 pt-4 text-center text-sm font-semibold text-slate-500">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-black text-primary hover:text-primary/80">
              Masuk
            </Link>
          </p>
        </div>
      </motion.section>
    </main>
  )
}
