import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../entities/user.entity';

/**
 * Shape of the JWT payload we issue in AuthService.login()
 * Keep this minimal—only what guards/UI need.
 */
export interface JwtPayload {
  sub: string | number; // user id (standard "subject" claim)
  role: string; // 'Owner' | 'Admin' | 'Viewer'
  orgId: string | number; // organization id for scoping
  email: string; // convenience for UI/logging
  iat?: number; // issued at (added by jwt)
  exp?: number; // expiration (added by jwt)
}

/**
 * JwtStrategy
 * -----------
 * - Tells Passport how to extract & verify the JWT (from Authorization: Bearer ...)
 * - On success, `validate()` runs, and whatever it returns becomes `req.user`
 * - We also verify that the user still exists and is active.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>
  ) {
    super({
      // Read the token from the Authorization header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Fail if token is expired
      ignoreExpiration: false,
      // Verify signature using the secret; keep in sync with AuthModule JwtModule config
      secretOrKey: process.env.JWT_SECRET,
      algorithms: ['HS256'],
    });
  }

  /**
   * validate(payload)
   * -----------------
   * Called AFTER the token is cryptographically verified.
   * Typical options:
   *  A) Return the payload as-is (fastest).
   *  B) Look up the user to ensure they still exist / are active (safer).
   *
   * We choose (B) here. If the user is gone or disabled, reject with 401.
   * The returned object becomes `req.user`.
   */
  async validate(payload: JwtPayload) {
    // Try to find the user. We only need a few fields for guards/UI.
    const user = await this.users.findOne({
      where: { id: payload.sub, isActive: true },
      select: ['id', 'email', 'role', 'orgId', 'isActive'],
    });

    if (!user) {
      // Token is valid, but the backing account is not—treat as unauthorized.
      throw new UnauthorizedException('User not found or inactive');
    }

    // Keep `req.user` compact; mirrors what your guards expect
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      // You can forward token timing if a guard/log needs it:
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}
