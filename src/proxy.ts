import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveAccess } from '@/lib/auth/access';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Define route lists
  const isProtectedRoute = 
    path.startsWith('/dashboard') || 
    path.startsWith('/profile/edit') || 
    path.startsWith('/chat') || 
    path.startsWith('/subscription') || 
    path.startsWith('/verify');
  const isAdminRoute = path.startsWith('/admin') && path !== '/admin/login';

  // Retrieve auth token from cookies
  const token = request.cookies.get('sb-access-token')?.value;

  const access = await resolveAccess(token);
  const isLoggedIn = Boolean(access && !access.mfaRequired);

  // Handle redirect if not authenticated
  if (isProtectedRoute && !isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const response = NextResponse.redirect(url);
    const secureFlag = request.nextUrl.protocol === 'https:' ? '; Secure' : '';
    response.headers.set('Set-Cookie', `sb-access-token=; path=/; max-age=0; SameSite=Lax${secureFlag}`);
    return response;
  }

  if (isAdminRoute && !isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    const response = NextResponse.redirect(url);
    const secureFlag = request.nextUrl.protocol === 'https:' ? '; Secure' : '';
    response.headers.set('Set-Cookie', `sb-access-token=; path=/; max-age=0; SameSite=Lax${secureFlag}`);
    return response;
  }

  // Role-based Access Control checks
  if (isLoggedIn) {
    // 1. Admin/Moderator protection (level >= 3 required)
    if (isAdminRoute && !access?.isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = access?.mfaRequired ? '/admin/login' : '/dashboard';
      return NextResponse.redirect(url);
    }

    // Members may open the inbox; database policies restrict each conversation.
    // Free members can only reply after receiving a paid member's message.
  }

  const response = NextResponse.next();

  // Add Compliance Security HTTP Headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://checkout.razorpay.com; frame-src https://api.razorpay.com https://checkout.razorpay.com https://maps.google.com https://www.google.com; frame-ancestors 'none';"
  );
  
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
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
};


