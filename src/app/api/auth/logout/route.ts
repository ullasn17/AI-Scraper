import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    path: '/',
    maxAge: 0,
  });
  return response;
}
