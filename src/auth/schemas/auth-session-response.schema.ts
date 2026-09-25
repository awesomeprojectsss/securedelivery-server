import { z } from 'zod';
import { authUserResponseSchema } from './auth-user-response.schema.js';

export const authSessionResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int(),
  user: authUserResponseSchema,
});

export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>;
