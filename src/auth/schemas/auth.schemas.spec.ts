import { authSessionResponseSchema } from './auth-session-response.schema.js';
import { loginRequestSchema } from './login-request.schema.js';
import { logoutRequestSchema } from './logout-request.schema.js';
import { refreshSessionRequestSchema } from './refresh-session-request.schema.js';

describe('Auth API schemas', () => {
  describe('loginRequestSchema', () => {
    it('accepts a canonical login request', () => {
      expect(
        loginRequestSchema.safeParse({
          email: 'user@example.com',
          password: '123456789012',
        }).success,
      ).toBe(true);
    });

    it.each([
      { email: 'invalid', password: '123456789012' },
      { email: 'user@example.com', password: 'short' },
      {
        email: 'user@example.com',
        password: '123456789012',
        unexpected: true,
      },
    ])('rejects a request outside the canonical contract', (input) => {
      expect(loginRequestSchema.safeParse(input).success).toBe(false);
    });
  });

  it.each([refreshSessionRequestSchema, logoutRequestSchema])(
    'requires one non-empty refresh token and rejects extra properties',
    (schema) => {
      expect(schema.safeParse({ refreshToken: 'token' }).success).toBe(true);
      expect(schema.safeParse({ refreshToken: '' }).success).toBe(false);
      expect(
        schema.safeParse({ refreshToken: 'token', unexpected: true }).success,
      ).toBe(false);
    },
  );

  it('accepts the canonical authentication response without exposing persistence fields', () => {
    const result = authSessionResponseSchema.safeParse({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 900,
      user: {
        id: '9f488de8-f02a-4a1a-89e3-6ece9dd7f1ce',
        name: 'SecureDelivery User',
        email: 'user@example.com',
        role: 'CUSTOMER',
        customerId: '10112117-bd07-40fb-b4d3-cd4ad8f997f8',
        status: 'ACTIVE',
        mustChangePassword: false,
        theme: 'SYSTEM',
        passwordHash: 'must-not-leak',
      },
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.user).not.toHaveProperty('passwordHash');
  });
});
