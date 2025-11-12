import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../entities/user.entity';

/**
 * AuthService
 * -----------
 * Responsible for:
 * - Validating a user's credentials against the database
 * - Issuing JWT access tokens
 * - Providing small helpers for password hashing & comparison
 *
 * NOTE: This is "login" only (no refresh tokens). We'll keep it simple for dev.
 * In production, add refresh tokens, rotation, throttling, etc.
 */
@Injectable()
export class AuthService {

  constructor(
  private readonly jwt: JwtService,
  @InjectRepository(User) private readonly users: Repository<User>,
) {}

  /**
   * validateUser
   * ------------
   * Finds a user by email and verifies the provided password using bcrypt.
   * Returns the full User entity on success, or null on failure.
   *
   * @param email user email (unique)
   * @param password plaintext password from the login form
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    // 1) locate the user record (also ensure user is active if you track that)
    const user = await this.users.findOne({
      where: { email: email.toLowerCase().trim(), isActive: true },
      relations: ['organization'], // optional: if you often need org in JWT/UI
    });

    if (!user) return null;

    // 2) compare provided password vs stored hash
    const ok = await this.comparePassword(password, user.passwordHash);
    if (!ok) return null;

    return user;
  }

  /**
   * login
   * -----
   * Validates credentials and, if valid, signs a JWT access token.
   * The token payload includes minimal claims needed by the UI and RBAC guard.
   *
   * Returns:
   *  { accessToken, user: { id, email, displayName, role, orgId } }
   */
  async login(email: string, password: string): Promise<{
    accessToken: string;
    user: {
      id: string | number;
      email: string;
      displayName: string;
      role: string;
      orgId: string | number;
    };
  }> {
    const user = await this.validateUser(email, password);
    if (!user) {
      // Keep error generic to avoid username enumeration
      throw new UnauthorizedException('Invalid email or password');
    }

    // Keep the JWT payload minimal; avoid sensitive data
    const payload = {
      sub: user.id,              // standard JWT "subject" claim
      role: user.role,           // RBAC checks
      orgId: user.orgId,         // org scoping
      email: user.email,         // helpful for UI
    };

    // Sign the token (secret and expiration are configured in AuthModule)
    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user: this.toPublicUser(user),
    };
  }

  /**
   * toPublicUser
   * ------------
   * Strips sensitive fields (like passwordHash) and returns only what the UI needs.
   * Adjust as your UI grows. Keep it small to prevent overexposing data.
   */
  private toPublicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      orgId: user.orgId,
    };
  }

  /**
   * hashPassword
   * ------------
   * Utility for seeding or user creation flows.
   * Use a work factor (salt rounds) appropriate for your environment (10–12 is common).
   */
async hashPassword(plain: string, rounds = 10): Promise<string> {
  return bcrypt.hash(plain, rounds);
}

  /**
   * comparePassword
   * ---------------
   * Wraps bcrypt.compare for clarity and testability.
   */
async comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
}
