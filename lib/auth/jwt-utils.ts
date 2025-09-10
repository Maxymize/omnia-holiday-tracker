import { SignJWT, jwtVerify } from 'jose';

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
export async function generateTokens(userId: string, email: string, role: 'employee' | 'admin') {
  const secret = new TextEncoder().encode(getJWTSecret());

  // Access token (short-lived)
  const accessToken = await new SignJWT({ 
    userId, 
    email, 
    role,
    type: 'access'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);

  // Refresh token (longer-lived)
  const refreshToken = await new SignJWT({ 
    userId, 
    email,
    type: 'refresh'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);

  return { 
    accessToken, 
    refreshToken,
    expiresIn: 3600 // 1 hour in seconds
  };
}

// Verify JWT token
export async function verifyToken(token: string): Promise<JWTPayload> {
  const secret = new TextEncoder().encode(getJWTSecret());
  
  console.log('🔍 JWT Debug - verifyToken called:', {
    tokenLength: token?.length,
    tokenStart: token?.substring(0, 20),
    secretExists: !!getJWTSecret(),
    secretStart: getJWTSecret()?.substring(0, 10)
  });
  
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256']
    });
    
    // Cast the payload to our expected interface
    const decoded = payload as unknown as JWTPayload;
    
    console.log('✅ JWT Debug - Token verified successfully:', {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      type: decoded.type,
      exp: decoded.exp,
      iat: decoded.iat
    });
    
    return decoded;
  } catch (error: any) {
    console.log('❌ JWT Debug - verifyToken error:', {
      errorName: error.constructor.name,
      errorMessage: error.message,
      isJWTError: error.name === 'JWTExpired' || error.name === 'JWTInvalid',
      isExpired: error.name === 'JWTExpired',
      fullError: error
    });
    
    if (error.name === 'JWTExpired') {
      throw new Error('Token scaduto');
    }
    if (error.name === 'JWTInvalid' || error.name === 'JWSSignatureVerificationFailed') {
      throw new Error('Token non valido');
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
export async function verifyAuthHeader(authHeader: string | undefined): Promise<JWTPayload> {
  const token = extractToken(authHeader);
  return await verifyToken(token);
}

// NEW: Unified authentication function that checks both cookies and Authorization header
export async function verifyAuthFromRequest(event: any): Promise<JWTPayload> {
  console.log('🔍 JWT Debug - Checking multiple auth sources:', {
    hasCookies: !!event.headers.cookie,
    hasAuthHeader: !!event.headers.authorization,
    cookiePreview: event.headers.cookie?.substring(0, 50) + '...' || 'none'
  });

  // First try to get token from cookies (production method)
  if (event.headers.cookie) {
    try {
      const cookies = event.headers.cookie.split(';').reduce((acc: any, cookie: string) => {
        const [name, value] = cookie.trim().split('=');
        acc[name] = value;
        return acc;
      }, {});
      
      if (cookies['auth-token']) {
        console.log('🍪 JWT Debug - Found token in cookies, attempting verification');
        const payload = await verifyToken(cookies['auth-token']);
        console.log('✅ JWT Debug - Cookie authentication successful');
        return payload;
      }
    } catch (error) {
      console.log('🍪 JWT Debug - Cookie authentication failed:', error);
      // Continue to try Authorization header
    }
  }

  // Fall back to Authorization header (development method)
  if (event.headers.authorization) {
    try {
      console.log('🔑 JWT Debug - Trying Authorization header as fallback');
      const payload = await verifyAuthHeader(event.headers.authorization);
      console.log('✅ JWT Debug - Authorization header authentication successful');
      return payload;
    } catch (error) {
      console.log('🔑 JWT Debug - Authorization header authentication failed:', error);
      throw error;
    }
  }

  throw new Error('No valid authentication token found in cookies or Authorization header');
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
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const payload = await verifyToken(refreshToken);
  
  // Verify it's a refresh token
  requireRefreshToken(payload);
  
  // Generate new access token using JOSE
  const secret = new TextEncoder().encode(getJWTSecret());
  const newAccessToken = await new SignJWT({
    userId: payload.userId, 
    email: payload.email, 
    role: payload.role,
    type: 'access'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
  
  return newAccessToken;
}

// Require admin access - throws error if not admin
export function requireAdminAccess(payload: JWTPayload): void {
  requireAccessToken(payload);
  
  if (payload.role !== 'admin') {
    throw new Error('Admin access required');
  }
}

// Get user info from token (for middleware) - supports both header and direct token
export async function getUserFromToken(authHeader: string | undefined, directToken?: string) {
  try {
    let token = directToken;
    
    console.log('🔍 JWT Debug - getUserFromToken:', {
      hasAuthHeader: !!authHeader,
      hasDirectToken: !!directToken,
      authHeaderPrefix: authHeader?.substring(0, 10),
      directTokenPrefix: directToken?.substring(0, 10)
    });
    
    // If no direct token provided, try to extract from auth header
    if (!token && authHeader) {
      token = extractToken(authHeader);
    }
    
    if (!token) {
      console.log('❌ JWT Debug - No token available');
      return null;
    }
    
    console.log('🔍 JWT Debug - Token found, attempting verification');
    const payload = await verifyToken(token);
    console.log('✅ JWT Debug - Token verified:', {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      type: payload.type
    });
    
    requireAccessToken(payload);
    console.log('✅ JWT Debug - Access token requirements passed');
    
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    };
  } catch (error: any) {
    console.log('❌ JWT Debug - Error:', error.message);
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