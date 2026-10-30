import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'schemesathi-super-secure-production-secret-key-2026'
);

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
}

export async function signToken(payload: TokenPayload, expiresIn = '7d'): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as 'USER' | 'ADMIN',
    };
  } catch {
    return null;
  }
}
