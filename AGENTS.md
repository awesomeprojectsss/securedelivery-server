# AGENTS.md — SecureDelivery Server

## Purpose of This File

This file defines how AI coding agents must work inside the SecureDelivery Server repository.

It does not replace the project architecture documentation.

Before changing code, agents must understand both:

- `../docs/project.md`
- `docs/architecture.md`

The project context explains what SecureDelivery is.

The architecture document explains how this repository is structured.

This file defines how agents should operate within those boundaries.

---

## Required Project Context

SecureDelivery is a delivery-quality monitoring platform.

The MVP uses a smartphone mounted horizontally on the delivery box as the primary IoT implementation of a Device.

The mobile application performs sensor collection, local event detection, durable local storage, batching and store-and-forward synchronization.

The server is the central source of truth.

The MVP does not include temperature monitoring, dedicated ESP32 hardware, Iridium or full route tracking.

`Device` is the canonical technical domain entity. `SmartBox` is only a product-facing UI label.

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

## Shared Contract Policy

Before implementing or changing communication between repositories, read:

- `../docs/contracts/README.md`
- `../docs/contracts/openapi.yaml`
- `../docs/contracts/asyncapi.yaml` when realtime is involved
- relevant contract documentation under `../docs/contracts/`
- shared ADRs under `../docs/decisions/`

The contracts under `../docs/contracts/` are authoritative.

Do not invent, duplicate or silently modify cross-repository payloads.

When changing a shared contract:

1. update the canonical contract first;
2. evaluate backward compatibility;
3. update the server implementation;
4. regenerate/update typed clients when generation is configured;
5. update affected consumers;
6. update tests;
7. update architecture documentation and ADRs when required.

`Device` is the canonical technical term.

Do not use `SmartBox` in API paths, backend DTOs, persistence entities or cross-repository contract schemas.

`SmartBox` is a product-facing UI label only.

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
- Device lifecycle
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
- Devices
- DeviceActivation
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
- Devices
- Device operations
- Device monitoring
- support tickets

### CUSTOMER

Can access only Customer-owned data.

Tenant isolation must be implemented in backend authorization and queries.

Never rely on frontend filtering for tenant isolation.

---

## Device Rules

`Device` is a logical domain entity.

It must not depend on the implementation details of the mobile app.

The smartphone is only the MVP IoT device implementation.

Device historical traceability should be preserved.

Prefer soft deletion or historical deactivation instead of destructive deletion when records already reference the Device.

Do not silently delete telemetry, events or delivery history when a Device is removed from active use.

---

## Device Activation

QR-based activation should use a secure activation mechanism.

Do not expose only raw internal identifiers as activation credentials.

Activation must be validated by the backend.

The implementation should support:

- pending activation
- token validation
- Customer association
- activation timestamp
- invalid/expired token handling

Do not allow arbitrary Customers to claim Devices without authorization and token validation.

---

## Telemetry Ingestion

The Server receives compact, idempotent telemetry batches.

Normal telemetry is period-summary based, initially one minute.

Do not require continuous normal raw accelerometer/gyroscope samples.

Normal period summaries should support:

- Device operational state;
- latest valid location;
- distance traveled;
- moving duration;
- stopped duration;
- maximum speed;
- future generic business-value observations.

The Server derives average moving speed using accumulated distance and moving duration.

The Server must preserve original Device timestamps and batch idempotency.

High-frequency raw motion samples belong primarily to event evidence.

## Navigation and Speed KPI Rules

Speed is an MVP operational signal.

Canonical stored summary observations:

```text
navigation.distance.traveled
navigation.moving.duration
navigation.stopped.duration
navigation.speed.maximum
```

Do not calculate delivery average speed as an unweighted average of period averages.

Use:

```text
average moving speed = sum(distance) / sum(moving duration)
```

Motion event attributes may include:

```text
navigation.speed.at_event
navigation.speed.average_5s_before
navigation.speed.maximum_10s_before
navigation.moving
```

These values support correlation analysis.

Do not present correlation as proven causality in server-generated analytics or APIs.

## Event Ingestion

Events are detected on the mobile IoT device.

The backend persists and processes them.

Every event should have a stable unique identifier such as `eventId`.

Repeated transmission of the same event must not produce duplicate logical events.

Events should preserve their associated evidence.

Do not reduce an event to only an event type if the mobile payload includes audit evidence.

---

## Extensible Telemetry Contract

Telemetry ingestion must validate the generic versioned envelope defined in `../docs/contracts/telemetry.md`.

Sensor measurements are generic observations:

```json
{
  "key": "motion.orientation.pitch",
  "value": 42.7,
  "unit": "deg"
}
```

Do not introduce sensor-specific shared DTO fields such as:

- `accelerometerX`
- `accelerometerY`
- `temperature`
- `humidity`

The server must not reject a valid telemetry batch merely because an observation key is unknown.

Known observation keys may receive specialized indexing or processing without making generic ingestion depend on that knowledge.

## Extensible Device Event Contract

Device-generated event types are open namespaced strings.

Examples:

```text
motion.strong_impact
motion.critical_inclination
motion.possible_fall
motion.abnormal_movement
```

Do not implement Device-generated event types as a closed backend enum.

The server validates and persists the common envelope:

- eventId
- monitoringSessionId
- eventType
- severity
- occurredAt
- location
- detector
- attributes
- evidence

The server must not reject an event only because `eventType` is unknown.

`severity` remains a closed platform enum.

The Device owns event-detection algorithms; the server does not need to understand or re-run them.

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
- deviceId
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
- Device operational status updates
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

- latest known Device location
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
- Device activation
- Device reassignment
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
- Device activation
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

## Technology Best Practices

Follow official NestJS, TypeScript, PostgreSQL, Redis and BullMQ conventions and established ecosystem best practices.

Before introducing a custom abstraction, verify whether the framework or platform already provides an idiomatic solution.

Do not blindly apply patterns from unrelated frameworks.

Prefer simple, explicit and framework-native solutions unless the documented SecureDelivery architecture requires otherwise.

---

## NestJS Engineering Guidelines

- Keep controllers thin.
- Controllers must not contain business logic.
- Use NestJS modules to represent clear domain or application boundaries.
- Avoid circular module dependencies.
- Do not use `forwardRef()` as a default fix for poor boundaries.
- Use DTOs for external request boundaries.
- Validate untrusted input consistently.
- Do not expose persistence entities directly as public API contracts.
- Keep domain decisions separate from infrastructure concerns.
- Prefer dependency injection through explicit contracts.
- Avoid giant services with unrelated responsibilities.
- Keep side effects explicit.
- Use transactions when multiple persistent writes must succeed atomically.
- Keep queue producers and processors focused and observable.
- Prefer configuration through validated environment configuration instead of scattered `process.env` reads.
- Centralize cross-cutting concerns such as logging, exception mapping and authentication rather than duplicating them across modules.
- Use guards, interceptors, pipes and filters for their intended NestJS responsibilities instead of embedding those concerns into controllers.
- Keep API contracts predictable and version consciously when breaking changes become necessary.

---

## PostgreSQL and Persistence Guidelines

- Use migrations for every schema change.
- Never depend on undocumented manual production database modifications.
- Enforce critical invariants with database constraints.
- Use unique constraints for idempotency where appropriate.
- Add indexes based on real access patterns.
- Avoid N+1 query patterns.
- Avoid unbounded queries, especially for telemetry, events, tickets and audit data.
- Use pagination for collections that may grow.
- Preserve historical records unless an explicit retention decision permits deletion.
- Use transactions intentionally, keeping them as short as practical.
- Do not store derived cache-like state as the only authoritative copy of business data.
- Review query plans and indexes before speculative database redesign.

---

## Redis Guidelines

- Redis is not the authoritative persistent database.
- Use Redis for BullMQ, transient coordination, caching and ephemeral realtime infrastructure where justified.
- Do not store irreplaceable business state only in Redis.
- Use explicit TTLs for cache entries where stale data is possible.
- Avoid introducing cache complexity without evidence that it is needed.
- Cache invalidation rules must be explicit and testable.

---

## BullMQ Guidelines

- Queue jobs must be idempotent whenever they may be retried.
- Assume a worker can execute the same logical job more than once.
- Use stable job identifiers where duplicate scheduling would be harmful.
- Configure retry and backoff intentionally.
- Keep queue payloads minimal and prefer identifiers over copying large authoritative business objects.
- Do not store authoritative business state only inside job payloads.
- Do not enqueue work that must participate in the same ACID transaction unless the architecture explicitly handles the boundary.
- Log failures with enough contextual identifiers for investigation.
- Distinguish retryable failures from permanent failures.
- Keep workers independently testable from controllers.
- Do not route every operation through a queue just because BullMQ is available.

---

## Realtime Guidelines

- WebSocket messages are realtime signals, not persistent truth.
- Persist authoritative state before or as part of a reliable publication flow.
- Clients must be able to reconcile state through regular APIs.
- Do not assume every WebSocket frame is received exactly once.
- Authenticate and authorize socket connections and sensitive realtime channels.
- Design realtime events with stable names and typed payload contracts.

---

## Testing Strategy

Prefer:

- unit tests for isolated domain and application rules;
- integration tests for PostgreSQL repositories, Redis/BullMQ integration and infrastructure boundaries;
- e2e tests for critical API, authentication, authorization and tenant-isolation flows.

Prioritize tests for behavior that would create data corruption, authorization bypass, duplicated telemetry/events or broken operational flows.

Mocks should not hide important integration risks.

Use real infrastructure in integration/e2e environments when practical, especially for database constraints and queue semantics.

---

## Human Developer Documentation

Human developers should also read:

- `docs/development-guide.pt-BR.md`
- `docs/git-workflow.pt-BR.md`

These files define practical development conventions and the Git/GitHub workflow for the repository.

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
