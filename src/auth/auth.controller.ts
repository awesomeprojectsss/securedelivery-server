import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import {
  type LoginRequest,
  loginRequestSchema,
} from './schemas/login-request.schema.js';
import type { AuthSessionResponse } from './schemas/auth-session-response.schema.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  login(
    @Body({ schema: loginRequestSchema }) input: LoginRequest,
  ): Promise<AuthSessionResponse> {
    return this.authService.login(input);
  }
}
