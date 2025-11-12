import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  // Optional: ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

/**
 * Metadata key used to mark routes as public (no JWT required).
 * Example:
 *   @Public()
 *   @Post('login') ...
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Public() decorator
 * ------------------
 * Apply this to controller methods (or an entire controller class) to bypass the
 * JwtAuthGuard for that route. Useful for /auth/login, health checks, etc.
 *
 * NOTE: Keep your public surface area very small.
 */
export const Public = (): MethodDecorator & ClassDecorator =>
  (target: object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<any>) => {
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, descriptor ? descriptor.value : target);
    return descriptor ?? (target as any);
  };

/**
 * JwtAuthGuard
 * ------------
 * - Validates the presence and validity of a Bearer token using the Passport "jwt" strategy.
 * - Attaches the decoded user payload to req.user (done by Passport).
 * - Skips protection for routes decorated with @Public().
 *
 * Typical usage:
 *   // in main (global guard) or at controller level:
 *   @UseGuards(JwtAuthGuard)
 *
 * Combined with RBAC:
 *   JwtAuthGuard ensures the caller is authenticated.
 *   An additional RBAC guard (e.g., RbacGuard) ensures the caller is authorized for the action.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * canActivate
   * -----------
   * If a route is marked @Public(), allow access without JWT.
   * Otherwise, defer to Passport's AuthGuard('jwt') to validate the token.
   */
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Calls into JwtStrategy.validate() on success, and sets req.user
    return super.canActivate(context);
  }

  /**
   * handleRequest
   * -------------
   * Uniformly handle errors or missing users after Passport runs.
   * If token is invalid/expired/missing → throw 401.
   * Return the user payload on success (Passport assigns it to req.user).
   */
  handleRequest(err: any, user: any /*, info?: any, context?: any, status?: any */) {
    if (err || !user) {
      // You can inspect "info" for finer-grained messages if desired.
      throw err || new UnauthorizedException('Invalid or missing authentication token');
    }
    return user;
  }
}
