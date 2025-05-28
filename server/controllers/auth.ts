import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { storage } from "../storage";
import { authenticateToken } from "../middleware/auth";
import { validateRequest } from "../middleware/validation";
import { asyncHandler } from "../middleware/error";
import { generateTokens, verifyRefreshToken } from "../utils/jwt";
import { successResponse, ApiError } from "../utils/response";
import { authValidators } from "../validators";
import { logger } from "../utils/logger";

const router = Router();

// Register new user
router.post(
  "/register",
  validateRequest(authValidators.register),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName } = req.body;

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

    res.status(201).json(successResponse({
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
    }, "User registered successfully"));
  })
);

// Login user
router.post(
  "/login",
  validateRequest(authValidators.login),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

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

    res.json(successResponse({
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
    }, "Login successful"));
  })
);

// Refresh access token
router.post(
  "/refresh",
  validateRequest(authValidators.refresh),
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Check if refresh token exists in database
    const storedToken = await storage.getRefreshToken(refreshToken);
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
    await storage.deleteRefreshToken(refreshToken);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await storage.createRefreshToken({
      token: newRefreshToken,
      userId: user.id,
      expiresAt
    });

    res.json(successResponse({
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900 // 15 minutes in seconds
    }, "Token refreshed successfully"));
  })
);

// Logout user
router.post(
  "/logout",
  authenticateToken,
  validateRequest(authValidators.logout),
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await storage.deleteRefreshToken(refreshToken);
    }

    logger.info('User logged out', { userId: req.user!.id });

    res.json(successResponse(null, "Logout successful"));
  })
);

// Get current user profile
router.get(
  "/me",
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await storage.getUser(req.user!.id);
    if (!user) {
      throw new ApiError("User not found", 404);
    }

    res.json(successResponse({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    }, "User profile retrieved successfully"));
  })
);

// Update user profile
router.put(
  "/me",
  authenticateToken,
  validateRequest(authValidators.updateProfile),
  asyncHandler(async (req: Request, res: Response) => {
    const { firstName, lastName } = req.body;

    const updatedUser = await storage.updateUser(req.user!.id, {
      firstName,
      lastName
    });

    res.json(successResponse({
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role
    }, "Profile updated successfully"));
  })
);

// Change password
router.put(
  "/change-password",
  authenticateToken,
  validateRequest(authValidators.changePassword),
  asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;

    const user = await storage.getUser(req.user!.id);
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
    await storage.updateUser(user.id, {
      password: hashedPassword
    });

    // Invalidate all refresh tokens for security
    await storage.deleteUserRefreshTokens(user.id);

    logger.info('User changed password', { userId: user.id });

    res.json(successResponse(null, "Password changed successfully"));
  })
);

export default router;
