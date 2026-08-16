"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button, Input, Card, TextField, Label } from "@heroui/react"
import { Store, Mail, Lock, Loader2 } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("http://localhost:8000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Login failed")
      }

      // Set cookie and redirect
      document.cookie = `kivo_auth_token=${data.token}; path=/; max-age=86400`
      document.cookie = `kivo_role_id=${data.user.role_id}; path=/; max-age=86400`
      
      const destination = data.user.role_id === 1 ? "/" : "/pos";
      router.push(destination)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-default-50 p-4">
      <div className="w-full max-w-md space-y-8">
        
        {/* Logo and Brand */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner">
            <Store className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-default-900">Kivo POS</h1>
            <p className="text-default-500 mt-1">Sell. Track. Grow.</p>
          </div>
        </div>

        {/* Login Form */}
        <Card className="shadow-lg border-none">
          <Card.Header className="flex flex-col gap-1 px-6 pt-6 pb-2 items-center">
            <h2 className="text-2xl font-semibold">Welcome back</h2>
            <p className="text-sm text-default-500">
              Enter your credentials to access the store.
            </p>
          </Card.Header>
          <form onSubmit={handleLogin}>
            <Card.Content className="gap-6 px-6 py-4 flex flex-col">
              {error && (
                <div className="p-3 bg-danger-50 text-danger-500 text-sm rounded-md text-center">
                  {error}
                </div>
              )}
              
              <TextField 
                id="email" 
                isRequired 
                value={email}
                onChange={setEmail}
                isDisabled={isLoading}
                className="flex flex-col gap-2"
              >
                <Label>Email</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 z-10"><Mail className="w-4 h-4 text-default-400" /></span>
                  <Input 
                    type="email" 
                    placeholder="admin@kivo.com"
                    className="pl-9 w-full"
                  />
                </div>
              </TextField>
              
              <TextField 
                id="password" 
                isRequired 
                value={password}
                onChange={setPassword}
                isDisabled={isLoading}
                className="flex flex-col gap-2"
              >
                <div className="flex justify-between items-center">
                  <Label>Password</Label>
                  <Link href="#" className="text-xs text-primary hover:underline font-medium">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 z-10"><Lock className="w-4 h-4 text-default-400" /></span>
                  <Input 
                    type="password" 
                    placeholder="Enter your password"
                    className="pl-9 w-full"
                  />
                </div>
              </TextField>
            </Card.Content>
            <Card.Footer className="flex flex-col gap-4 px-6 pb-6 pt-2">
              <Button 
                variant="primary" 
                className="w-full font-medium text-base h-12" 
                type="submit" 
                isPending={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
              <div className="text-sm text-center text-default-500">
                Don't have an account?{" "}
                <Link href="#" className="text-primary hover:underline font-medium">
                  Contact Admin
                </Link>
              </div>
            </Card.Footer>
          </form>
        </Card>

      </div>
    </div>
  )
}
