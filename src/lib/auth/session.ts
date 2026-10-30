import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { verifyToken, TokenPayload } from './jwt';

export const AUTH_COOKIE_NAME = 'schemesathi_session';

export async function getCurrentUser(req?: NextRequest): Promise<TokenPayload | null> {
  let token: string | undefined;

  if (req) {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      const cookieHeader = req.cookies.get(AUTH_COOKIE_NAME);
      token = cookieHeader?.value;
    }
  } else {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    } catch {
      // In non-request contexts
      token = undefined;
    }
  }

  if (!token) return null;
  return await verifyToken(token);
}

export async function requireAuth(req?: NextRequest): Promise<TokenPayload> {
  const user = await getCurrentUser(req);
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export async function requireAdmin(req?: NextRequest): Promise<TokenPayload> {
  const user = await requireAuth(req);
  if (user.role !== 'ADMIN') {
    throw new Error('FORBIDDEN');
  }
  return user;
}
