import { Module } from '@nestjs/common';
import { db } from '../prisma/db.js';
import { AccessTokenService } from './access-token.service.js';
import { AUTH_DATABASE } from './auth.constants.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password.service.js';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenService,
    PasswordService,
    { provide: AUTH_DATABASE, useValue: db },
  ],
})
export class AuthModule {}
