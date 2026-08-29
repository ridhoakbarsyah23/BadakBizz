"use client"

import { apiUrl } from "@/lib/api"
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch(apiUrl('/api/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (res.ok) {
        login(data.access_token || data.token, data.user)
      } else {
        setError(data.message || 'Kredensial tidak valid')
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Silakan coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-96 bg-primary/5 -skew-y-6 transform origin-top-left -z-10" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden z-10"
      >
        <div className="p-8 sm:p-12">
          <div className="flex flex-col items-center text-center mb-10">
            <img src="/BadakBiz.jpeg" alt="BadakBiz Logo" className="w-16 h-16 rounded-2xl shadow-xl shadow-primary/30 object-cover mb-6" />
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Selamat Datang</h2>
            <p className="text-slate-500 mt-2 font-medium">Silakan masuk ke akun BadakBiz Anda.</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-red-50 text-red-600 text-sm p-4 rounded-xl font-bold mb-6 border border-red-100 flex items-center justify-center text-center"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Alamat Email</label>
              <Input
                type="email"
                placeholder="admin@badakbiz.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-primary focus-visible:bg-white transition-all font-medium"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Kata Sandi</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl bg-slate-50 border-slate-200 pr-12 focus-visible:ring-primary focus-visible:bg-white transition-all font-medium"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 text-slate-400 hover:text-slate-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-14 rounded-xl font-black text-lg mt-4 shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  Sedang Masuk...
                </>
              ) : (
                "Masuk"
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">Akses Cepat (Demo)</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group text-center"
                onClick={() => { setEmail('admin@badakbiz.com'); setPassword('password'); }}
              >
                <div className="font-black text-slate-900 group-hover:text-primary">Admin</div>
              </div>
              <div
                className="p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group text-center"
                onClick={() => { setEmail('cashier@badakbiz.com'); setPassword('password'); }}
              >
                <div className="font-black text-slate-900 group-hover:text-primary">Kasir</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
