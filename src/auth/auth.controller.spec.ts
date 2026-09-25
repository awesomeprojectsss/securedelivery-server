import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import type { LoginRequest } from './schemas/login-request.schema.js';
import type { AuthSessionResponse } from './schemas/auth-session-response.schema.js';

describe('AuthController', () => {
  let controller: AuthController;
  const login = vi.fn();

  beforeEach(async () => {
    login.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: { login },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates the validated login request to AuthService', async () => {
    const input: LoginRequest = {
      email: 'person@example.com',
      password: 'a-strong-password-123',
    };
    const session: AuthSessionResponse = {
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 900,
      user: {
        id: 'b7d64508-dab6-4a3f-98f7-3997b5355ea8',
        name: 'Test User',
        email: 'person@example.com',
        role: 'CUSTOMER',
        customerId: 'aec7143a-cf0d-47d3-a056-888dc247505d',
        status: 'ACTIVE',
        mustChangePassword: false,
      },
    };
    login.mockResolvedValue(session);

    await expect(controller.login(input)).resolves.toBe(session);
    expect(login).toHaveBeenCalledWith(input);
  });
});
