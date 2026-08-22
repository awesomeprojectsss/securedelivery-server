# AGENTS.md — SecureDelivery Server

## Purpose of This File

This file defines how AI coding agents must work inside the SecureDelivery Server repository.

It does not replace the project architecture documentation.

Before changing code, agents must understand both:

- `../project.md` or the repository-local project context if copied here
- `docs/architecture.md`

The project context explains what SecureDelivery is.

The architecture document explains how this repository is structured.

This file defines how agents should operate within those boundaries.

---

## Required Project Context

SecureDelivery is a delivery-quality monitoring platform.

The MVP uses a smartphone mounted horizontally on a SmartBox as the primary IoT device.

The mobile application performs sensor collection, local event detection, durable local storage, batching and store-and-forward synchronization.

The server is the central source of truth.

The MVP does not include temperature monitoring, dedicated ESP32 hardware, Iridium or full route tracking.

`SmartBox` is a logical domain entity and must not be coupled to the smartphone implementation.

---

## Technology Baseline

The backend MVP uses:

- NestJS
- TypeScript
- PostgreSQL
- Redis
- BullMQ
- WebSocket
- Docker
- Docker Compose

Redis and BullMQ are intentionally part of the MVP architecture and should be preserved unless an explicit architectural decision changes this.

The backend should begin as a modular monolith.

Do not introduce microservices only because the system may scale later.

---

## Agent Workflow

Before implementing changes:

1. Read this `AGENTS.md`.
2. Read `docs/architecture.md` when the task affects system behavior, module boundaries, data flow, persistence, realtime, queues, authorization or infrastructure.
3. Inspect the existing implementation before introducing new abstractions.
4. Follow existing NestJS conventions and repository patterns.
5. Keep changes scoped to the requested task.
6. Do not perform unrelated refactors.
7. Do not expand MVP scope without explicit instruction.
8. Add or update meaningful automated tests.
9. Run relevant tests, linting and type checking before considering the task complete.
10. Update architecture documentation when architecture changes.
11. Create or update an ADR when a meaningful architectural decision changes.

---

## Architectural Decision Records

Meaningful architectural decisions must be documented under:

```text
docs/decisions/
```

Create or update an ADR when a change affects topics such as:

- architectural style
- module boundaries
- persistence strategy
- authentication
- authorization
- RBAC
- telemetry ingestion
- idempotency
- queue strategy
- Redis usage
- BullMQ usage
- realtime communication
- event processing
- SmartBox lifecycle
- activation strategy
- external integration strategy

Do not create ADRs for routine bug fixes, naming changes, small refactors or implementation details that already follow an accepted decision.

Do not silently overwrite architectural history.

If an accepted ADR is replaced, mark it as superseded and reference the new ADR.

Do not silently violate an accepted ADR.

---

## Architecture Rules

The backend is the source of truth for persistent business state.

Prefer explicit modules with clear ownership.

Expected domains include:

- Auth
- RBAC
- Users
- Customers
- SmartBoxes
- SmartBoxActivation
- Deliveries
- Telemetry
- Events
- DeviceHealth
- Support
- Realtime
- Jobs
- Audit

Exact module names may evolve.

Avoid circular dependencies.

Avoid giant cross-domain services.

Controllers should remain thin.

Business logic belongs in application/domain services.

Persistence logic belongs behind repository or persistence abstractions where practical.

Infrastructure should not define business behavior.

---

## RBAC and Authorization

The main roles are:

```text
SUPER_ADMIN
ADMIN
CUSTOMER
```

Authorization must be enforced on the backend.

Never rely on dashboard visibility to protect privileged operations.

Important rules include:

### SUPER_ADMIN

Can:

- create Super Administrators
- create Administrators
- create Customers
- change roles of Administrators and Customers
- reset passwords of Administrators and Customers
- activate/deactivate Administrators and Customers
- perform Administrator operations

Cannot:

- reset another Super Administrator's password
- deactivate another Super Administrator
- deactivate their own account

### ADMIN

Can manage:

- Customers
- Administrators according to RBAC rules
- SmartBoxes
- SmartBox operations
- SmartBox monitoring
- support tickets

### CUSTOMER

Can access only Customer-owned data.

Tenant isolation must be implemented in backend authorization and queries.

Never rely on frontend filtering for tenant isolation.

---

## SmartBox Rules

`SmartBox` is a logical domain entity.

It must not depend on the implementation details of the mobile app.

The smartphone is only the MVP IoT device implementation.

SmartBox historical traceability should be preserved.

Prefer soft deletion or historical deactivation instead of destructive deletion when records already reference the SmartBox.

Do not silently delete telemetry, events or delivery history when a SmartBox is removed from active use.

---

## SmartBox Activation

QR-based activation should use a secure activation mechanism.

Do not expose only raw internal identifiers as activation credentials.

Activation must be validated by the backend.

The implementation should support:

- pending activation
- token validation
- Customer association
- activation timestamp
- invalid/expired token handling

Do not allow arbitrary Customers to claim SmartBoxes without authorization and token validation.

---

## Telemetry Ingestion

Mobile connectivity is unreliable.

Assume telemetry may:

- arrive late
- arrive more than once
- arrive out of order
- arrive in batches
- be retried after a timeout

Telemetry ingestion must be idempotent.

Use stable client-generated identifiers such as `telemetryBatchId`.

Preserve device timestamps separately from server ingestion timestamps when relevant.

Do not use request arrival time as a substitute for event occurrence time.

---

## Event Ingestion

Events are detected on the mobile IoT device.

The backend persists and processes them.

Every event should have a stable unique identifier such as `eventId`.

Repeated transmission of the same event must not produce duplicate logical events.

Events should preserve their associated evidence.

Do not reduce an event to only an event type if the mobile payload includes audit evidence.

---

## Idempotency

Every retriable write path must consider idempotency.

For telemetry and events, duplicate protection should use both:

- application-level handling where needed
- database uniqueness constraints where practical

Do not rely only on "check then insert" logic when concurrency can violate the invariant.

The system should safely handle the case where the mobile client retries because the server persisted data but the response was lost.

---

## PostgreSQL

PostgreSQL is the primary persistent source of truth.

Schema changes must use migrations.

Important business invariants should be enforced at database level when practical.

Index intentionally around real query patterns.

Likely index candidates include:

- customerId
- smartBoxId
- deliveryId
- telemetry timestamp
- event timestamp
- event type
- ticketId
- lastSeenAt

Avoid speculative indexing without query evidence.

---

## Redis

Redis is infrastructure, not the persistent source of truth.

Allowed uses include:

- BullMQ
- transient coordination
- cache
- realtime support
- temporary operational state

Do not persist irreplaceable business data only in Redis.

---

## BullMQ

BullMQ is intentionally part of the MVP and should remain available for background work.

Suitable use cases include:

- event post-processing
- alert processing
- support notifications
- KPI recalculation
- retryable jobs
- asynchronous operational tasks

Do not put every operation behind BullMQ.

Synchronous writes that need immediate persistence should remain synchronous where appropriate.

Queues must not obscure transaction boundaries or make correctness harder without a real benefit.

---

## WebSocket

WebSocket can support:

- dashboard realtime updates
- SmartBox operational status updates
- event updates
- support ticket chat

Persistent state must always remain retrievable through regular APIs.

WebSocket is a realtime transport, not a database.

Do not design clients that require every WebSocket frame to remain correct.

Reconnects should recover state through authoritative server reads where needed.

---

## Support Tickets

Ticket message history must be persisted.

Realtime delivery may use WebSocket, but message correctness cannot depend on transient socket delivery.

Administrators should be able to assume ticket ownership.

Customer access must remain tenant-scoped.

---

## Location

The MVP does not implement full route tracking.

The server stores only location data needed by current product requirements, such as:

- latest known SmartBox location
- event-associated location

Avoid adding complete route reconstruction unless explicitly requested.

External Google Maps links can be generated from latitude and longitude.

---

## Auditability

Privileged operations should be auditable.

Examples include:

- role changes
- password resets
- user activation/deactivation
- SmartBox activation
- SmartBox reassignment
- support ownership changes
- destructive or soft-delete operations

Do not log secrets, passwords or sensitive tokens.

---

## Security

Never trust client input.

Validate:

- authentication
- authorization
- device identity
- ownership
- payload structure
- identifiers
- activation tokens

Never store secrets in source code.

Use environment variables or proper secret management.

Avoid logging:

- passwords
- tokens
- authorization headers
- unnecessary precise location data

---

## TypeScript

Use strict TypeScript.

Avoid:

- `any`
- unsafe casts
- duplicated DTOs
- duplicated enums
- magic strings
- giant service classes
- business logic in controllers

Prefer:

- explicit DTOs
- validated inputs
- typed domain models
- typed repository contracts
- explicit error handling

---

## Testing

Prioritize automated tests for:

- RBAC
- tenant isolation
- SmartBox activation
- telemetry idempotency
- event idempotency
- duplicate retry scenarios
- delivery ownership
- event evidence persistence
- support ticket authorization
- queue processors
- realtime authorization
- critical domain state transitions

Use unit tests for isolated behavior and integration/e2e tests for critical flows.

Do not write meaningless tests only to increase coverage numbers.

---

## Development Standards

Use:

- Git
- GitHub
- Pull Requests
- Code Review
- Conventional Commits
- automated tests
- linting
- formatting
- TypeScript

Branch strategy may follow GitFlow or another team-approved workflow.

Do not introduce a new team workflow without explicit agreement.

---

## Conventional Commits Examples

```text
feat(smartboxes): add qr activation flow
feat(telemetry): add idempotent batch ingestion
feat(events): persist event evidence
feat(support): add realtime ticket messages
fix(rbac): prevent super admin self-deactivation
fix(telemetry): deduplicate retried batches
refactor(events): isolate event processing
test(auth): cover customer tenant isolation
docs: document smartbox lifecycle
```

---

## Out of Scope for MVP

Do not implement unless explicitly requested:

- temperature monitoring
- ESP32 integration
- dedicated GNSS hardware
- Iridium
- satellite communication
- full route tracking
- route reconstruction
- Google Maps route platform integration
- iFood
- Rappi
- ERP integrations
- machine learning
- microservices
- Kubernetes

---

## Completion Criteria

Before considering a task complete:

1. Code follows repository conventions.
2. Relevant tests pass.
3. Lint/type checks pass when available.
4. Authorization implications were considered.
5. Idempotency was considered for retriable writes.
6. Persistence invariants were considered.
7. No unrelated refactor was introduced.
8. Architecture documentation was updated if required.
9. ADRs were updated if an architectural decision changed.
