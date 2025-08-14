import jwt, { SignOptions } from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'employee' | 'admin';
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

// JWT configuration
const JWT_CONFIG = {
  accessTokenExpiry: '1h',
  refreshTokenExpiry: '7d',
  algorithm: 'HS256' as const
};

// Get JWT secret from environment
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

// Generate access and refresh tokens
export function generateTokens(userId: string, email: string, role: 'employee' | 'admin') {
  const secret = getJWTSecret();

  // Access token (short-lived)
  const accessToken = jwt.sign(
    { 
      userId, 
      email, 
      role,
      type: 'access'
    },
    secret,
    { expiresIn: '1h' }
  );

  // Refresh token (longer-lived)
  const refreshToken = jwt.sign(
    { 
      userId, 
      email,
      type: 'refresh'
    },
    secret,
    { expiresIn: '7d' }
  );

  return { 
    accessToken, 
    refreshToken,
    expiresIn: 3600 // 1 hour in seconds
  };
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload {
  const secret = getJWTSecret();
  
  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: [JWT_CONFIG.algorithm]
    }) as JWTPayload;
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Token non valido');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token scaduto');
    }
    throw new Error('Errore di verifica token');
  }
}

// Extract token from Authorization header
export function extractToken(authHeader: string | undefined): string {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Token mancante o formato non valido');
  }
  
  return authHeader.split(' ')[1];
}

// Verify token from Authorization header
export function verifyAuthHeader(authHeader: string | undefined): JWTPayload {
  const token = extractToken(authHeader);
  return verifyToken(token);
}

// Check if user has admin role
export function requireAdmin(payload: JWTPayload): void {
  if (payload.role !== 'admin') {
    throw new Error('Accesso negato: privilegi amministratore richiesti');
  }
}

// Check if token is access token
export function requireAccessToken(payload: JWTPayload): void {
  if (payload.type !== 'access') {
    throw new Error('Tipo di token non valido: richiesto token di accesso');
  }
}

// Check if token is refresh token
export function requireRefreshToken(payload: JWTPayload): void {
  if (payload.type !== 'refresh') {
    throw new Error('Tipo di token non valido: richiesto token di refresh');
  }
}

// Refresh access token using refresh token
export function refreshAccessToken(refreshToken: string): string {
  const payload = verifyToken(refreshToken);
  
  // Verify it's a refresh token
  requireRefreshToken(payload);
  
  // Generate new access token
  const secret = getJWTSecret();
  const newAccessToken = jwt.sign(
    { 
      userId: payload.userId, 
      email: payload.email, 
      role: payload.role,
      type: 'access'
    },
    secret,
    { expiresIn: '1h' }
  );
  
  return newAccessToken;
}

// Require admin access - throws error if not admin
export function requireAdminAccess(payload: JWTPayload): void {
  requireAccessToken(payload);
  
  if (payload.role !== 'admin') {
    throw new Error('Admin access required');
  }
}

// Get user info from token (for middleware)
export function getUserFromToken(authHeader: string | undefined) {
  try {
    const payload = verifyAuthHeader(authHeader);
    requireAccessToken(payload);
    
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    };
  } catch (error) {
    return null;
  }
}

// Create secure cookie options for tokens
export function createTokenCookies(accessToken: string, refreshToken: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return [
    `auth-token=${accessToken}; HttpOnly; ${isProduction ? 'Secure;' : ''} SameSite=Strict; Max-Age=3600; Path=/`,
    `refresh-token=${refreshToken}; HttpOnly; ${isProduction ? 'Secure;' : ''} SameSite=Strict; Max-Age=604800; Path=/`
  ];
}