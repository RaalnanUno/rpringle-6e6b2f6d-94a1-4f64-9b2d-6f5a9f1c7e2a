import { Controller, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

import { AuthService } from './auth.service';
import { Public } from './jwt-auth.guard'; // bypass JWT guard only for login

/**
 * DTO for login request body.
 * Using class-validator here gives good validation errors automatically.
 */
class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

/**
 * AuthController
 * ---------------
 * - /auth/login returns a signed JWT token if credentials are valid.
 * - Protected routes everywhere else use JwtAuthGuard + RbacGuard.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public() // login must be public (not authenticated yet)
  @Post('login')
  @ApiBody({ type: LoginDto })
  async login(@Body() dto: LoginDto) {
    // Delegates to AuthService to validate + sign JWT
    return this.auth.login(dto.email, dto.password);
  }
}
