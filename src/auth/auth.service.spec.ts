import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { db } from '../prisma/db.js';
import { ACCESS_TOKEN_TTL_SECONDS } from './auth.constants.js';
import { AccessTokenService } from './access-token.service.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password.service.js';

type TestUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER';
  customerId: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  mustChangePassword: boolean;
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
  customer: { status: 'ACTIVE' | 'INACTIVE' } | null;
};

const activeCustomerUser: TestUser = {
  id: 'b7d64508-dab6-4a3f-98f7-3997b5355ea8',
  name: 'Test User',
  email: 'person@example.com',
  passwordHash: 'argon-hash',
  role: 'CUSTOMER' as const,
  customerId: 'aec7143a-cf0d-47d3-a056-888dc247505d',
  status: 'ACTIVE' as const,
  mustChangePassword: false,
  theme: 'SYSTEM' as const,
  customer: { status: 'ACTIVE' as const },
};

function makeService(options?: {
  user?: TestUser | null;
  passwordMatches?: boolean;
}) {
  const first = vi.fn().mockResolvedValue(options?.user ?? null);
  const include = vi.fn().mockReturnValue({ first });
  const where = vi.fn().mockReturnValue({ include });
  const createSession = vi.fn().mockResolvedValue({});
  const database = {
    orm: {
      public: {
        User: { where },
        AuthSession: { create: createSession },
      },
    },
  } as unknown as typeof db;
  const passwords = {
    verify: vi.fn().mockResolvedValue(options?.passwordMatches ?? true),
  } as unknown as PasswordService;
  const accessTokens = {
    issue: vi.fn().mockResolvedValue('signed-access-token'),
  } as unknown as AccessTokenService;

  return {
    service: new AuthService(database, passwords, accessTokens),
    where,
    include,
    first,
    createSession,
    passwords,
    accessTokens,
  };
}

describe('AuthService.login', () => {
  it('creates an authenticated session using the canonical public user shape', async () => {
    const setup = makeService({ user: activeCustomerUser });

    const result = await setup.service.login({
      email: 'PERSON@EXAMPLE.COM',
      password: 'a-strong-password-123',
    });

    expect(setup.where).toHaveBeenCalledWith({ email: 'person@example.com' });
    expect(setup.passwords.verify).toHaveBeenCalledWith(
      'a-strong-password-123',
      'argon-hash',
    );
    expect(setup.accessTokens.issue).toHaveBeenCalledWith({
      id: activeCustomerUser.id,
      sessionId: expect.any(String),
      role: 'CUSTOMER',
      customerId: activeCustomerUser.customerId,
      mustChangePassword: false,
    });
    expect(result).toEqual({
      accessToken: 'signed-access-token',
      refreshToken: expect.any(String),
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      user: {
        id: activeCustomerUser.id,
        name: activeCustomerUser.name,
        email: activeCustomerUser.email,
        role: 'CUSTOMER',
        customerId: activeCustomerUser.customerId,
        status: 'ACTIVE',
        mustChangePassword: false,
        theme: 'SYSTEM',
      },
    });

    const storedSession = setup.createSession.mock.calls[0]?.[0];
    expect(storedSession).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        userId: activeCustomerUser.id,
        refreshTokenHash: createHash('sha256')
          .update(result.refreshToken)
          .digest('hex'),
        expiresAt: expect.any(String),
      }),
    );
    expect(storedSession?.refreshTokenHash).not.toBe(result.refreshToken);
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it.each(['ADMIN', 'SUPER_ADMIN'] as const)(
    'allows platform-wide %s accounts without Customer scope',
    async (role) => {
      const user: TestUser = {
        ...activeCustomerUser,
        role,
        customerId: null,
        customer: null,
      };
      const setup = makeService({ user });

      const result = await setup.service.login({
        email: 'person@example.com',
        password: 'a-strong-password-123',
      });

      expect(result.user.role).toBe(role);
      expect(result.user.customerId).toBeNull();
      expect(setup.createSession).toHaveBeenCalledOnce();
    },
  );

  it.each([
    ['unknown account', null, true],
    ['incorrect password', activeCustomerUser, false],
    ['inactive user', { ...activeCustomerUser, status: 'INACTIVE' }, true],
    [
      'inactive customer',
      { ...activeCustomerUser, customer: { status: 'INACTIVE' } },
      true,
    ],
    ['customer without tenant', { ...activeCustomerUser, customer: null }, true],
    [
      'platform account scoped to a customer',
      { ...activeCustomerUser, role: 'ADMIN' as const },
      true,
    ],
  ])('rejects %s without creating a session', async (_case, user, passwordMatches) => {
    const setup = makeService({
      user: user as TestUser | null,
      passwordMatches: passwordMatches as boolean,
    });

    await expect(
      setup.service.login({
        email: 'person@example.com',
        password: 'a-strong-password-123',
      }),
    ).rejects.toMatchObject({
      message: 'Authentication failed.',
      status: 401,
    });
    expect(setup.createSession).not.toHaveBeenCalled();
    expect(setup.accessTokens.issue).not.toHaveBeenCalled();
  });

  it('performs a dummy password verification for unknown accounts', async () => {
    const setup = makeService({ user: null });

    await expect(
      setup.service.login({
        email: 'missing@example.com',
        password: 'a-strong-password-123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(setup.passwords.verify).toHaveBeenCalledWith(
      'a-strong-password-123',
      undefined,
    );
  });
});
