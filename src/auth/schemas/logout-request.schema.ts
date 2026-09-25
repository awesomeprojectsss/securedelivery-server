import { z } from 'zod';

export const logoutRequestSchema = z.strictObject({
  refreshToken: z.string().min(1),
});

export type LogoutRequest = z.infer<typeof logoutRequestSchema>;
