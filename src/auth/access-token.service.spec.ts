import { jwtVerify } from 'jose';
import { ACCESS_TOKEN_TTL_SECONDS } from './auth.constants.js';
import { AccessTokenService } from './access-token.service.js';

describe('AccessTokenService', () => {
  const secret = 'test-only-access-token-secret-with-32-bytes';
  const previousSecret = process.env['AUTH_ACCESS_TOKEN_SECRET'];

  beforeEach(() => {
    process.env['AUTH_ACCESS_TOKEN_SECRET'] = secret;
  });

  afterAll(() => {
    if (previousSecret === undefined) {
      delete process.env['AUTH_ACCESS_TOKEN_SECRET'];
    } else {
      process.env['AUTH_ACCESS_TOKEN_SECRET'] = previousSecret;
    }
  });

  it('issues a short-lived JWT with the authenticated user context', async () => {
    const token = await new AccessTokenService().issue({
      id: 'b7d64508-dab6-4a3f-98f7-3997b5355ea8',
      sessionId: 'f59ff6fd-f4d1-4b0b-8e43-10ca755d44be',
      role: 'CUSTOMER',
      customerId: 'aec7143a-cf0d-47d3-a056-888dc247505d',
      mustChangePassword: true,
    });
    const { payload, protectedHeader } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      { issuer: 'securedelivery-server', audience: 'securedelivery-api' },
    );

    expect(protectedHeader).toMatchObject({ alg: 'HS256', typ: 'JWT' });
    expect(payload).toMatchObject({
      sub: 'b7d64508-dab6-4a3f-98f7-3997b5355ea8',
      sid: 'f59ff6fd-f4d1-4b0b-8e43-10ca755d44be',
      tokenUse: 'user_access',
      role: 'CUSTOMER',
      customerId: 'aec7143a-cf0d-47d3-a056-888dc247505d',
      mustChangePassword: true,
      iss: 'securedelivery-server',
      aud: 'securedelivery-api',
    });
    expect(payload.exp! - payload.iat!).toBe(ACCESS_TOKEN_TTL_SECONDS);
  });
});
