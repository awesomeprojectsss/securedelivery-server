import {
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { db } from '../prisma/db.js';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  AUTH_DATABASE,
  REFRESH_TOKEN_TTL_SECONDS,
} from './auth.constants.js';
import { AccessTokenService } from './access-token.service.js';
import { PasswordService } from './password.service.js';
import type { LoginRequest } from './schemas/login-request.schema.js';
import type { AuthSessionResponse } from './schemas/auth-session-response.schema.js';

const INVALID_CREDENTIALS = 'Authentication failed.';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_DATABASE) private readonly database: typeof db,
    private readonly passwords: PasswordService,
    private readonly accessTokens: AccessTokenService,
  ) {}

  async login(input: LoginRequest): Promise<AuthSessionResponse> {
    const email = input.email.trim().toLowerCase();
    const user = await this.database.orm.public.User.where({ email })
      .include('customer', (customer) => customer.select('status'))
      .first();

    const passwordMatches = await this.passwords.verify(
      input.password,
      user?.passwordHash,
    );
    if (!user || !passwordMatches || !this.isActiveAndWellScoped(user)) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const sessionId = randomUUID();
    const refreshToken = randomBytes(32).toString('base64url');
    const refreshTokenHash = createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    const accessToken = await this.accessTokens.issue({
      id: user.id,
      sessionId,
      role: user.role,
      customerId: user.customerId,
      mustChangePassword: user.mustChangePassword,
    });
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1_000,
    ).toISOString();

    await this.database.orm.public.AuthSession.create({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        customerId: user.customerId,
        status: user.status,
        mustChangePassword: user.mustChangePassword,
        theme: user.theme,
      },
    };
  }

  private isActiveAndWellScoped(user: {
    status: string;
    role: string;
    customerId: string | null;
    customer: { status: string } | null;
  }): boolean {
    if (user.status !== 'ACTIVE') return false;

    if (user.role === 'CUSTOMER') {
      return user.customerId !== null && user.customer?.status === 'ACTIVE';
    }

    return (
      (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') &&
      user.customerId === null
    );
  }
}
