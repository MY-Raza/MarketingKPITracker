import bcrypt from "bcryptjs";
import { storage } from "../storage";
import { generateTokens, verifyRefreshToken } from "../utils/jwt";
import { ApiError } from "../utils/response";
import { logger } from "../utils/logger";
import type { InsertUser } from "@shared/schema";

export class AuthService {
  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const { email, password, firstName, lastName } = userData;

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      throw new ApiError("User already exists with this email", 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await storage.createUser({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'USER',
      isActive: true
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await storage.createRefreshToken({
      token: refreshToken,
      userId: user.id,
      expiresAt
    });

    logger.info('User registered successfully', { userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900 // 15 minutes in seconds
      }
    };
  }

  async login(email: string, password: string) {
    // Find user
    const user = await storage.getUserByEmail(email);
    if (!user || !user.isActive) {
      throw new ApiError("Invalid credentials", 401);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new ApiError("Invalid credentials", 401);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await storage.createRefreshToken({
      token: refreshToken,
      userId: user.id,
      expiresAt
    });

    logger.info('User logged in successfully', { userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 900 // 15 minutes in seconds
      }
    };
  }

  async refreshToken(refreshTokenValue: string) {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshTokenValue);
    
    // Check if refresh token exists in database
    const storedToken = await storage.getRefreshToken(refreshTokenValue);
    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new ApiError("Invalid or expired refresh token", 401);
    }

    // Get user
    const user = await storage.getUser(storedToken.userId);
    if (!user || !user.isActive) {
      throw new ApiError("User not found or inactive", 401);
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Delete old refresh token and create new one
    await storage.deleteRefreshToken(refreshTokenValue);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await storage.createRefreshToken({
      token: newRefreshToken,
      userId: user.id,
      expiresAt
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900 // 15 minutes in seconds
    };
  }

  async logout(refreshTokenValue: string) {
    if (refreshTokenValue) {
      await storage.deleteRefreshToken(refreshTokenValue);
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new ApiError("User not found", 404);
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw new ApiError("Current password is incorrect", 401);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await storage.updateUser(userId, {
      password: hashedPassword
    });

    // Invalidate all refresh tokens for security
    await storage.deleteUserRefreshTokens(userId);

    logger.info('User changed password', { userId });
  }
}
