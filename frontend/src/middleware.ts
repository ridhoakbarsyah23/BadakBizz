import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Simple check for MVP: if there's no auth token cookie, redirect to /login
  // Once Laravel login API is fully integrated, you can set this cookie in the frontend
  const authToken = request.cookies.get('kivo_auth_token')
  const isLoginPage = request.nextUrl.pathname === '/login'

  if (!authToken && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (authToken && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
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
