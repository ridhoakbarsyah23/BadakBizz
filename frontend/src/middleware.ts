import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Simple check for MVP: if there's no auth token cookie, redirect to /login
  // Once Laravel login API is fully integrated, you can set this cookie in the frontend
  const authToken = request.cookies.get('kivo_auth_token')
  const roleId = request.cookies.get('kivo_role_id')?.value
  const isLoginPage = request.nextUrl.pathname === '/login'

  // Not logged in -> must go to /login
  if (!authToken && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Already logged in -> cannot go to /login
  if (authToken && isLoginPage) {
    const destination = roleId === '1' ? '/' : '/pos'
    return NextResponse.redirect(new URL(destination, request.url))
  }

  // Role based protection
  if (authToken && roleId === '2') { // Cashier
    const adminOnlyRoutes = ['/', '/settings', '/inventory', '/products', '/categories', '/customers', '/reports']
    if (adminOnlyRoutes.includes(request.nextUrl.pathname)) {
      return NextResponse.redirect(new URL('/pos', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
