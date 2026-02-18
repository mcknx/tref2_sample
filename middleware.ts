import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
    const response = await updateSession(request)

    if (response.status >= 300 && response.status < 400) {
        return response
    }

    const { pathname } = request.nextUrl
    const hasAdminSession = request.cookies.get('admin_session')?.value === '1'

    if (pathname.startsWith('/admin')) {
        if (pathname === '/admin/login') {
            if (hasAdminSession) {
                const url = request.nextUrl.clone()
                url.pathname = '/admin'
                url.search = ''
                return NextResponse.redirect(url)
            }
            return response
        }

        if (!hasAdminSession) {
            const url = request.nextUrl.clone()
            url.pathname = '/admin/login'
            url.searchParams.set('next', pathname)
            return NextResponse.redirect(url)
        }
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
