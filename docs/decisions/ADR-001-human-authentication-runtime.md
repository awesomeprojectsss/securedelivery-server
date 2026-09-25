# ADR-001: Human Authentication Runtime

## Status

Accepted

This decision implements the human-authentication boundaries in shared ADR-009
and the account-status rules in shared ADR-013. It does not change the OpenAPI
contract.

## Context

The Server must authenticate human users while keeping user sessions separate
from Device credentials. Login must not reveal whether an account exists, and
Customer users must not enter an inactive tenant.

## Decision

- Hash passwords with Argon2id using `m=19456 KiB`, `t=2`, and `p=1`; rely on
  Argon2's per-hash salt and encoded parameters. These are the [OWASP-recommended
  minimum profile](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
  and should be load-tested against production capacity.
- Normalize login email with trim and lowercase before lookup. User-write
  workflows must persist the same canonical form.
- Perform a dummy Argon2id verification for unknown accounts. Return the same
  generic `401` contract response for unknown users, incorrect passwords,
  inactive users, inactive Customers, and invalid user/Customer scope.
- Issue an `HS256` access JWT with `iss=securedelivery-server`,
  `aud=securedelivery-api`, a 15-minute lifetime, role, Customer context, and a
  session identifier (`sid`). The signing key comes from
  `AUTH_ACCESS_TOKEN_SECRET` and must contain at least 32 UTF-8 bytes.
- Generate a 256-bit opaque refresh token, return it only in the response body,
  store only its SHA-256 digest, and expire its persisted session after 30 days.
- Do not cache the login response. Do not expose password hashes, refresh-token
  digests, or database fields in the public `AuthSession` response.
- Future human access guards must validate `sid` against the persisted session
  so logout, account deactivation, and administrative revocation take effect.

## Consequences

- Access tokens remain short-lived; changing the signing secret invalidates all
  outstanding access tokens signed with the prior secret.
- Session revocation is authoritative in persistence. A signature-only guard
  would violate this decision and the Trello authentication/session criteria.
- Refresh rotation, logout, guards, and revocation handlers are separate work;
  issuing the initial session does not complete those flows.
