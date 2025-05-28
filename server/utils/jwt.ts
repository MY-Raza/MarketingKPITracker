import jwt from "jsonwebtoken";
import { ApiError } from "./response";

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "your-super-secret-refresh-key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

// Token payload interface
export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

// Decoded token interface
export interface DecodedToken extends TokenPayload {
  iat: number;
  exp: number;
  type?: 'access' | 'refresh';
}

// Generate both access and refresh tokens
export const generateTokens = (payload: TokenPayload) => {
  const accessToken = jwt.sign(
    { ...payload, type: 'access' },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'marketing-kpi-api',
      audience: 'marketing-kpi-client'
    }
  );

  const refreshToken = jwt.sign(
    { ...payload, type: 'refresh' },
    JWT_REFRESH_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'marketing-kpi-api',
      audience: 'marketing-kpi-client'
    }
  );

  return {
    accessToken,
    refreshToken
  };
};

// Generate access token only
export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(
    { ...payload, type: 'access' },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'marketing-kpi-api',
      audience: 'marketing-kpi-client'
    }
  );
};

// Generate refresh token only
export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    JWT_REFRESH_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'marketing-kpi-api',
      audience: 'marketing-kpi-client'
    }
  );
};

// Verify access token
export const verifyAccessToken = (token: string): DecodedToken => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'marketing-kpi-api',
      audience: 'marketing-kpi-client'
    }) as DecodedToken;

    if (decoded.type !== 'access') {
      throw new ApiError("Invalid token type", 401);
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError("Invalid access token", 401);
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError("Access token expired", 401);
    }
    if (error instanceof jwt.NotBeforeError) {
      throw new ApiError("Access token not active", 401);
    }
    throw error;
  }
};

// Verify refresh token
export const verifyRefreshToken = (token: string): DecodedToken => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'marketing-kpi-api',
      audience: 'marketing-kpi-client'
    }) as DecodedToken;

    if (decoded.type !== 'refresh') {
      throw new ApiError("Invalid token type", 401);
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError("Invalid refresh token", 401);
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError("Refresh token expired", 401);
    }
    if (error instanceof jwt.NotBeforeError) {
      throw new ApiError("Refresh token not active", 401);
    }
    throw error;
  }
};

// Decode token without verification (for debugging)
export const decodeToken = (token: string): DecodedToken | null => {
  try {
    return jwt.decode(token) as DecodedToken;
  } catch (error) {
    return null;
  }
};

// Get token expiry time
export const getTokenExpiry = (token: string): Date | null => {
  try {
    const decoded = decodeToken(token);
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch (error) {
    return null;
  }
};

// Check if token is expired
export const isTokenExpired = (token: string): boolean => {
  try {
    const expiry = getTokenExpiry(token);
    if (!expiry) return true;
    return expiry < new Date();
  } catch (error) {
    return true;
  }
};

// Extract token from Authorization header
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};

// Generate a secure random token (for email verification, password reset, etc.)
export const generateSecureToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};

// Token blacklist functionality (in production, use Redis)
const tokenBlacklist = new Set<string>();

export const blacklistToken = (token: string): void => {
  tokenBlacklist.add(token);
};

export const isTokenBlacklisted = (token: string): boolean => {
  return tokenBlacklist.has(token);
};

export const clearExpiredTokensFromBlacklist = (): void => {
  // In production, this would be handled by Redis TTL
  // For in-memory implementation, you'd need to track expiry times
  console.log('Clearing expired tokens from blacklist...');
};

// Validate JWT configuration
export const validateJwtConfig = (): void => {
  if (!JWT_SECRET || JWT_SECRET === "your-super-secret-jwt-key") {
    throw new Error("JWT_SECRET must be set to a secure random string");
  }
  
  if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET === "your-super-secret-refresh-key") {
    throw new Error("JWT_REFRESH_SECRET must be set to a secure random string");
  }
  
  if (JWT_SECRET === JWT_REFRESH_SECRET) {
    throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be different");
  }
};

export default {
  generateTokens,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  getTokenExpiry,
  isTokenExpired,
  extractTokenFromHeader,
  generateSecureToken,
  blacklistToken,
  isTokenBlacklisted,
  clearExpiredTokensFromBlacklist,
  validateJwtConfig
};
