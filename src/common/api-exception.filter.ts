import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

interface HttpRequestWithId {
  id?: string;
}

interface HttpResponse {
  status(code: number): { send(body: unknown): unknown };
}

const ERROR_DETAILS: Record<number, { code: string; message: string }> = {
  [HttpStatus.BAD_REQUEST]: {
    code: 'BAD_REQUEST',
    message: 'Request validation failed.',
  },
  [HttpStatus.UNAUTHORIZED]: {
    code: 'UNAUTHORIZED',
    message: 'Authentication failed.',
  },
  [HttpStatus.FORBIDDEN]: {
    code: 'FORBIDDEN',
    message: 'You are not allowed to perform this action.',
  },
  [HttpStatus.NOT_FOUND]: { code: 'NOT_FOUND', message: 'Resource not found.' },
  [HttpStatus.CONFLICT]: {
    code: 'CONFLICT',
    message: 'The request conflicts with the current resource state.',
  },
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<HttpRequestWithId>();
    const response = http.getResponse<HttpResponse>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const details = ERROR_DETAILS[statusCode] ?? {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    };

    response.status(statusCode).send({
      statusCode,
      ...details,
      requestId: request.id ?? randomUUID(),
      timestamp: new Date().toISOString(),
    });
  }
}
