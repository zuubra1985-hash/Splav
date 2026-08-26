import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db/index.ts';
import { refreshTokens, revokedTokens } from '../db/schema.ts';
import { eq, and, gt, lte } from 'drizzle-orm';
import { UserRole } from '../types/index.ts';

const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY_DAYS = 30; // 30 days

export interface JwtTokenPayload {
  id: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
  jti: string;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// In-memory cache of revoked token hashes for sub-millisecond lookup
const revokedTokensCache = new Set<string>();

export async function isTokenRevoked(token: string): Promise<boolean> {
  const hash = hashToken(token);
  if (revokedTokensCache.has(hash)) {
    return true;
  }

  try {
    const revoked = await db
      .select()
      .from(revokedTokens)
      .where(eq(revokedTokens.tokenHash, hash));

    if (revoked.length > 0) {
      revokedTokensCache.add(hash);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error checking revoked token in DB (failing closed):', err);
    // P0-1: FAIL CLOSED — Never allow a token through on database error
    return true;
  }
}

export async function revokeToken(token: string, userId?: string, reason: string = 'logout'): Promise<void> {
  try {
    const hash = hashToken(token);
    revokedTokensCache.add(hash);

    let expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    try {
      const decoded = jwt.decode(token) as { exp?: number; id?: string };
      if (decoded?.exp) {
        expiresAt = new Date(decoded.exp * 1000);
      }
      if (!userId && decoded?.id) {
        userId = decoded.id;
      }
    } catch {}

    const id = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await db.insert(revokedTokens).values({
      id,
      tokenHash: hash,
      userId: userId || null,
      expiresAt,
      reason,
      createdAt: new Date()
    }).onConflictDoNothing();

    // Also mark refresh token as revoked if it exists
    await db.update(refreshTokens).set({
      revoked: true
    }).where(eq(refreshTokens.tokenHash, hash));
  } catch (err) {
    console.error('Error revoking token:', err);
  }
}

export async function generateTokenPair(
  user: { id: string; email: string; role: UserRole },
  jwtSecret: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const accessJti = crypto.randomUUID();
  const refreshJti = crypto.randomUUID();

  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
      jti: accessJti
    } as JwtTokenPayload,
    jwtSecret,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh',
      jti: refreshJti
    } as JwtTokenPayload,
    jwtSecret,
    { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` }
  );

  // Store refresh token in database strictly (P0-2: must throw on DB failure)
  const refreshHash = hashToken(refreshToken);
  const refreshId = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(refreshTokens).values({
    id: refreshId,
    tokenHash: refreshHash,
    userId: user.id,
    expiresAt,
    revoked: false,
    createdAt: new Date()
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 900 // 15 minutes in seconds
  };
}

export async function rotateRefreshToken(
  oldRefreshToken: string,
  jwtSecret: string,
  getUserById: (id: string) => Promise<{ id: string; email: string; role: string } | null>
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number; user: any } | null> {
  try {
    // 1. Verify token signature and type
    const decoded = jwt.verify(oldRefreshToken, jwtSecret) as JwtTokenPayload;
    if (decoded.type !== 'refresh') {
      return null;
    }

    // 2. Check if token is revoked in revoked_tokens or memory
    if (await isTokenRevoked(oldRefreshToken)) {
      return null;
    }

    const oldHash = hashToken(oldRefreshToken);

    // 3. Verify in refresh_tokens table
    const stored = await db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, oldHash), eq(refreshTokens.revoked, false)));

    if (stored.length === 0) {
      // Possible token reuse attack! Revoke all tokens for this user
      await revokeAllUserTokens(decoded.id);
      return null;
    }

    // 4. Verify user still exists in DB
    const user = await getUserById(decoded.id);
    if (!user) {
      return null;
    }

    // 5. Revoke old refresh token (rotation)
    await revokeToken(oldRefreshToken, user.id, 'rotated');

    // 6. Generate fresh new token pair
    const tokenPair = await generateTokenPair(
      { id: user.id, email: user.email, role: user.role as UserRole },
      jwtSecret
    );

    return {
      ...tokenPair,
      user
    };
  } catch (err) {
    console.warn('Refresh token verification failed:', err);
    return null;
  }
}

export async function revokeAllUserTokens(userId: string): Promise<void> {
  try {
    await db.update(refreshTokens).set({
      revoked: true
    }).where(eq(refreshTokens.userId, userId));
  } catch (err) {
    console.error('Error revoking all user tokens:', err);
  }
}

// Cleanup expired tokens from database
export async function cleanupExpiredTokens(): Promise<void> {
  try {
    const now = new Date();
    await db.delete(refreshTokens).where(lte(refreshTokens.expiresAt, now));
    await db.delete(revokedTokens).where(lte(revokedTokens.expiresAt, now));
  } catch (err) {
    console.warn('Cleanup expired tokens error:', err);
  }
}
