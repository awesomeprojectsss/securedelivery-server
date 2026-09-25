import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes passwords with the configured Argon2id policy', async () => {
    const hash = await service.hash('a-strong-password-123');

    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,p=1,t=2\$/);
    await expect(service.verify('a-strong-password-123', hash)).resolves.toBe(
      true,
    );
  });

  it('uses the same verification path for missing users and wrong passwords', async () => {
    await expect(
      service.verify('a-strong-password-123', undefined),
    ).resolves.toBe(false);
  });

  it('falls back to dummy verification for malformed stored hashes', async () => {
    await expect(service.verify('a-strong-password-123', 'not-a-hash')).resolves
      .toBe(false);
  });
});
