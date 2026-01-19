import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const isAuthPage =
    nextUrl.pathname.startsWith('/login') ||
    nextUrl.pathname.startsWith('/forgot-password')
  const isDashboard =
    nextUrl.pathname.startsWith('/dashboard') ||
    nextUrl.pathname.startsWith('/admin') ||
    nextUrl.pathname.startsWith('/cliente')
  const isAdminRoute =
    nextUrl.pathname.startsWith('/dashboard/admin') ||
    nextUrl.pathname.startsWith('/admin')

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  if (isDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  if (isAdminRoute && req.auth?.user?.role === 'CLIENT') {
    return NextResponse.redirect(new URL('/dashboard/cliente', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/cliente/:path*'],
}
