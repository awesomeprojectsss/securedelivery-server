import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

// Used only to perform a password verification when an email is not found.
// This keeps the login path closer in cost without representing an account.
const MISSING_ACCOUNT_HASH =
  '$argon2id$v=19$m=19456,p=1,t=2$T/AplEYS+G+KBMOuDccZzA$bqFXAdhPJQNHeoIggJeCyclGz+aJYscwp4h+mrWbUzs';

@Injectable()
export class PasswordService {
  hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  async verify(password: string, passwordHash?: string): Promise<boolean> {
    try {
      return await argon2.verify(
        passwordHash ?? MISSING_ACCOUNT_HASH,
        password,
      ) && passwordHash !== undefined;
    } catch {
      // Malformed legacy hashes are treated exactly like incorrect credentials.
      await argon2.verify(MISSING_ACCOUNT_HASH, password);
      return false;
    }
  }
}
