"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Store, Eye, EyeOff, CheckCircle2 } from 'lucide-react'

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
      const res = await fetch('http://localhost:8000/api/login', {
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
        setError(data.message || 'Invalid credentials')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-white">
      {/* Left side - Image/Branding (Hidden on mobile) */}
      <div className="hidden lg:flex w-[55%] bg-slate-900 relative overflow-hidden items-center justify-center">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0 opacity-40 mix-blend-overlay bg-cover bg-center transition-transform duration-10000 hover:scale-105"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2000&auto=format&fit=crop")' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent z-10" />
        
        {/* Content */}
        <div className="relative z-20 w-full max-w-xl px-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-10">
              <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <Store className="w-7 h-7 text-white" />
              </div>
              <span className="text-4xl font-black tracking-tight">Kivo POS</span>
            </div>
            
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              Manage your business with confidence.
            </h1>
            <p className="text-slate-300 text-lg mb-12 max-w-md leading-relaxed">
              A comprehensive point of sale system designed to streamline your daily operations, track inventory, and boost your sales.
            </p>
            
            <div className="space-y-5">
              {[
                "Real-time inventory tracking",
                "Detailed sales analytics & reporting",
                "Multi-role staff management"
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-slate-200 font-medium text-lg">{feature}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 sm:p-12 lg:p-16">
        <div className="w-full max-w-sm">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="mb-10">
              <div className="lg:hidden w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
                <Store className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome back</h2>
              <p className="text-slate-500 mt-2">Please enter your details to sign in.</p>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-50 text-red-600 text-sm p-4 rounded-xl font-semibold mb-6 border border-red-100 flex items-center"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Email Address</label>
                <Input 
                  type="email" 
                  placeholder="admin@kivo.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-primary focus-visible:bg-white transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">Password</label>
                </div>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl bg-slate-50 border-slate-200 pr-12 focus-visible:ring-primary focus-visible:bg-white transition-all"
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
                className="w-full h-12 rounded-xl font-bold text-base mt-2 shadow-lg shadow-primary/25 transition-transform hover:scale-[1.01] active:scale-[0.99]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-10 pt-6 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Click to autofill</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div 
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group" 
                  onClick={() => { setEmail('admin@kivo.com'); setPassword('password'); }}
                >
                  <div className="font-bold text-slate-900 group-hover:text-primary">Admin</div>
                  <div className="text-slate-500 text-xs mt-0.5">admin@kivo.com</div>
                </div>
                <div 
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group" 
                  onClick={() => { setEmail('cashier@kivo.com'); setPassword('password'); }}
                >
                  <div className="font-bold text-slate-900 group-hover:text-primary">Cashier</div>
                  <div className="text-slate-500 text-xs mt-0.5">cashier@kivo.com</div>
                </div>
              </div>
            </div>

          </motion.div>
        </div>
      </div>
    </div>
  )
}
