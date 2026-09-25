import { z } from 'zod';

export const userRoleSchema = z.enum(['SUPER_ADMIN', 'ADMIN', 'CUSTOMER']);
export const userStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export const themeSchema = z.enum(['LIGHT', 'DARK', 'SYSTEM']);

export const authUserResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  role: userRoleSchema,
  customerId: z.uuid().nullable(),
  status: userStatusSchema,
  mustChangePassword: z.boolean(),
  theme: themeSchema.optional(),
});

export type AuthUserResponse = z.infer<typeof authUserResponseSchema>;
