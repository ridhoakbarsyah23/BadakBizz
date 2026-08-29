"use client"

import { apiUrl } from "@/lib/api"
import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Cookies from 'js-cookie'

type User = {
  id: number
  name: string
  email: string
  role?: {
    slug: string
    name: string
  }
}

type AuthContextType = {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  hasRole: (roleSlug: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check for token in cookies on mount
    const storedToken = Cookies.get('token')
    if (storedToken) {
      setToken(storedToken)
      fetchUser(storedToken)
    } else {
      setIsLoading(false)
      if (pathname !== '/login') {
        router.push('/login')
      }
    }
  }, [pathname, router])

  const fetchUser = async (authToken: string) => {
    try {
      const res = await fetch(apiUrl('/api/me'), {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json'
        }
      })
      
      if (res.ok) {
        const userData = await res.json()
        setUser(userData)
        // Set user role to cookie for middleware to use
        Cookies.set('user_role', userData.role?.slug || '', { expires: 7 })
      } else {
        // Token might be invalid
        logout()
      }
    } catch (error) {
      console.error('Failed to fetch user', error)
      logout()
    } finally {
      setIsLoading(false)
    }
  }

  const login = (newToken: string, newUser: User) => {
    Cookies.set('token', newToken, { expires: 7 })
    Cookies.set('user_role', newUser.role?.slug || '', { expires: 7 })
    setToken(newToken)
    setUser(newUser)
    
    if (newUser.role?.slug === 'cashier') {
      router.push('/pos')
    } else {
      router.push('/')
    }
  }

  const logout = () => {
    Cookies.remove('token')
    Cookies.remove('user_role')
    setToken(null)
    setUser(null)
    router.push('/login')
  }

  const hasRole = (roleSlug: string) => {
    return user?.role?.slug === roleSlug
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
