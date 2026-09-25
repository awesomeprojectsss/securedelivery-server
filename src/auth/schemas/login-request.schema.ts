import { z } from 'zod';

export const loginRequestSchema = z.strictObject({
  email: z.email(),
  password: z.string().min(12),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
