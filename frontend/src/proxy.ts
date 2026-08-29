import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const role = request.cookies.get('user_role')?.value
  const path = request.nextUrl.pathname

  // Public paths that don't require authentication
  const isPublicPath = path === '/login'

  // If user is logged in and tries to access login page, redirect to dashboard/pos
  if (isPublicPath && token) {
    if (role === 'cashier') {
      return NextResponse.redirect(new URL('/pos', request.url))
    }
    return NextResponse.redirect(new URL('/', request.url))
  }

  // If user is not logged in and tries to access protected routes, redirect to login
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Restrict cashier from accessing admin pages
  if (role === 'cashier') {
    const adminRoutes = ['/', '/settings', '/staff', '/shifts', '/reports', '/products', '/categories', '/inventory', '/tables']
    if (adminRoutes.some(route => path === route || path.startsWith(`${route}/`))) {
      return NextResponse.redirect(new URL('/pos', request.url))
    }
  }

  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images (static files)
     */
    '/((?!api|_next/static|_next/image|.*\\.png$|.*\\.jpeg$|.*\\.jpg$|.*\\.svg$|favicon.ico).*)',
  ],
}
