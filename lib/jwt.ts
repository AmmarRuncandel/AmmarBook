import { SignJWT, jwtVerify, JWTPayload } from 'jose';

const accessSecret = new TextEncoder().encode(process.env.JWT_SECRET!);
const refreshSecret = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET!);

export type Role = 'admin' | 'user';

export function isValidRole(role: unknown): role is Role {
  return role === 'admin' || role === 'user';
}

export interface AccessTokenPayload extends JWTPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

export interface RefreshTokenPayload extends JWTPayload {
  userId: string;
}

export async function signAccessToken(payload: {
  userId: string;
  email: string;
  name: string;
  role: Role;
}) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(accessSecret);
}

export async function signRefreshToken(payload: { userId: string }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(refreshSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, accessSecret);
  return payload as AccessTokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, refreshSecret);
  return payload as RefreshTokenPayload;
}
