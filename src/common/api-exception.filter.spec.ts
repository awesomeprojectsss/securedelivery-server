import { HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter.js';

describe('ApiExceptionFilter', () => {
  it('returns the canonical generic error envelope for authentication failures', () => {
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ send });
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ id: 'req-123' }),
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;

    new ApiExceptionFilter().catch(
      new HttpException('account-specific details', HttpStatus.UNAUTHORIZED),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(send).toHaveBeenCalledWith({
      statusCode: HttpStatus.UNAUTHORIZED,
      code: 'UNAUTHORIZED',
      message: 'Authentication failed.',
      requestId: 'req-123',
      timestamp: expect.any(String),
    });
    expect(send.mock.calls[0]?.[0]).not.toHaveProperty('account');
  });
});
