import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  // /dashboard/view is a public read-only shared link
  if (pathname.startsWith('/dashboard/view')) return NextResponse.next();
  if (!req.auth) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }
});

export const config = {
  // :path+ means one or more segments — excludes /dashboard itself (local/anonymous mode)
  matcher: ['/dashboard/:path+', '/api/dashboards/:path*'],
};
