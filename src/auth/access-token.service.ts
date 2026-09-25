import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SignJWT } from 'jose';
import { ACCESS_TOKEN_TTL_SECONDS } from './auth.constants.js';

export interface AccessTokenSubject {
  id: string;
  sessionId: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER';
  customerId: string | null;
  mustChangePassword: boolean;
}

@Injectable()
export class AccessTokenService {
  async issue(user: AccessTokenSubject): Promise<string> {
    const secret = process.env['AUTH_ACCESS_TOKEN_SECRET'];
    if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
      throw new InternalServerErrorException(
        'Authentication is not configured',
      );
    }

    return new SignJWT({
      tokenUse: 'user_access',
      sid: user.sessionId,
      role: user.role,
      customerId: user.customerId,
      mustChangePassword: user.mustChangePassword,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer('securedelivery-server')
      .setAudience('securedelivery-api')
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
      .sign(new TextEncoder().encode(secret));
  }
}
