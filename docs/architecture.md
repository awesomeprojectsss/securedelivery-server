# SecureDelivery Server Architecture

## 1. Purpose

The SecureDelivery Server is the central backend and authoritative data source for the SecureDelivery platform.

It receives data from the mobile IoT application, persists business state, enforces RBAC and tenant isolation, processes background work, exposes APIs to the monitoring dashboard and supports realtime interactions.

---

## 2. Project Context

SecureDelivery monitors delivery quality and cargo integrity.

The MVP uses a smartphone mounted horizontally on a SmartBox as the primary IoT device.

The mobile application:

- collects sensor data
- detects abnormal events locally
- persists telemetry locally
- batches telemetry
- stores events and evidence locally
- synchronizes using store-and-forward

The server must assume mobile connectivity is unreliable.

Temperature monitoring is outside the MVP.

Full route tracking is outside the MVP.

---

## 3. Technology Baseline

The backend MVP uses:

- NestJS
- TypeScript
- PostgreSQL
- Redis
- BullMQ
- WebSocket
- Docker
- Docker Compose

Redis and BullMQ are intentionally included in the MVP because the system should support asynchronous workloads and future growth without forcing a premature architecture rewrite.

The backend remains a modular monolith in the MVP.

---

## 4. Architectural Style

```text
Modular Monolith
```

NestJS modules represent explicit domain or application boundaries.

Initial domains may include:

```text
Auth
RBAC
Users
Customers
SmartBoxes
SmartBoxActivation
Deliveries
Telemetry
Events
DeviceHealth
Support
Realtime
Jobs
Audit
```

Module names may change as implementation evolves.

The architecture should favor explicit ownership and low coupling.

---

## 5. High-Level System Context

```text
┌─────────────────────────────┐
│ SecureDelivery Mobile IoT   │
│                             │
│ Sensors                     │
│ Event Detection             │
│ Local Storage               │
│ Store-and-Forward           │
└──────────────┬──────────────┘
               │
               │ HTTPS / protocol to be finalized
               ▼
┌─────────────────────────────┐
│ SecureDelivery Server       │
│                             │
│ NestJS                      │
│ Auth / RBAC                 │
│ Customers                   │
│ SmartBoxes                  │
│ Deliveries                  │
│ Telemetry                   │
│ Events                      │
│ Support                     │
│ Realtime                    │
│ Jobs                        │
└───────┬───────────┬─────────┘
        │           │
        ▼           ▼
 PostgreSQL       Redis
                    │
                    ▼
                  BullMQ

               │
               │ REST / WebSocket
               ▼
┌─────────────────────────────┐
│ SecureDelivery Dashboard    │
└─────────────────────────────┘
```

---

## 6. Dependency Direction

A preferred conceptual dependency direction is:

```text
Controllers / Gateways
        ↓
Application Services
        ↓
Domain Rules
        ↓
Repository Interfaces
        ↓
Infrastructure / Persistence
        ↓
PostgreSQL / Redis / External Services
```

Exact layering may remain pragmatic within NestJS.

Important rules:

- controllers should remain thin
- gateways should not own business rules
- persistence should not define domain policy
- business logic should not be scattered across infrastructure adapters
- circular dependencies should be avoided

---

## 7. RBAC

Main roles:

```text
SUPER_ADMIN
ADMIN
CUSTOMER
```

The server is responsible for authorization.

### SUPER_ADMIN

Has all Administrator capabilities and can additionally:

- create Super Administrators
- create Administrators
- create Customers
- change roles of Administrators and Customers
- reset passwords of Administrators and Customers
- activate/deactivate Administrators and Customers

Restrictions:

- cannot reset passwords of other Super Administrators
- cannot deactivate other Super Administrators
- cannot deactivate their own account

Privileged actions should be auditable.

### ADMIN

Can manage:

- Customers
- Administrators within allowed policy
- SmartBoxes
- SmartBox operational visibility
- support tickets
- ticket ownership
- customer support interactions

### CUSTOMER

Can access only their own tenant data.

Tenant boundaries must be enforced at server level.

---

## 8. Multi-Tenancy

Customer isolation is a server invariant.

Tenant-owned resources include, at minimum:

- SmartBoxes
- deliveries
- telemetry
- events
- tickets

Queries and authorization rules must prevent cross-customer access.

Frontend filtering is not an authorization mechanism.

---

## 9. SmartBox Domain

`SmartBox` is a logical domain entity.

The SmartBox represents the monitored delivery container.

In the MVP, the attached IoT device is a smartphone.

The SmartBox model should not depend on mobile-specific implementation details.

Suggested conceptual attributes may include:

```text
id
code
status
customerId
activatedAt
lastSeenAt
lastLatitude
lastLongitude
batteryLevel
connectivityStatus
healthStatus
createdAt
updatedAt
deletedAt
```

The final persistence model should be derived from implementation needs rather than copied blindly from this list.

---

## 10. SmartBox Lifecycle

Suggested logical lifecycle:

```text
CREATED
    ↓
PENDING_ACTIVATION
    ↓
ACTIVE
    ↓
INACTIVE
```

Soft deletion may exist separately for historical retention.

A SmartBox with historical deliveries, events or telemetry should not be destructively removed without an explicit retention decision.

---

## 11. QR Activation Flow

```text
Administrator creates SmartBox
            ↓
SmartBox enters pending activation
            ↓
Mobile application exposes QR Code
            ↓
Customer scans activation QR Code
            ↓
Server validates activation token
            ↓
Customer association is persisted
            ↓
SmartBox becomes active
```

Activation tokens should have an explicit lifecycle.

Avoid exposing raw internal IDs as activation credentials.

---

## 12. Telemetry Model

The mobile application samples sensors every second.

The mobile application initially batches telemetry every minute.

The server receives logical telemetry batches rather than requiring one network request per sensor sample.

Conceptually:

```text
TelemetryBatch
 ├── telemetryBatchId
 ├── SmartBox
 ├── delivery
 ├── startedAt
 ├── finishedAt
 ├── samples[]
 └── receivedAt
```

This is conceptual and may evolve.

---

## 13. Telemetry Ingestion

The ingestion path must assume:

- retries
- duplicates
- delayed batches
- out-of-order batches
- connectivity gaps

Conceptual flow:

```text
Mobile Local Storage
        ↓
Sync Attempt
        ↓
Telemetry API
        ↓
Authentication / Authorization
        ↓
Validation
        ↓
Idempotency Check / Constraint
        ↓
PostgreSQL Persistence
        ↓
Optional Async Processing
        ↓
BullMQ
        ↓
Realtime / KPI / Alert Updates
```

The synchronous path should remain as small as practical while still guaranteeing correctness.

---

## 14. Idempotency

Telemetry batches and events require stable client-generated identifiers.

Examples:

```text
telemetryBatchId
eventId
```

The server should be able to safely receive the same logical request multiple times.

Database uniqueness constraints should protect critical invariants where practical.

A lost HTTP response after successful persistence must not cause duplicate data when the mobile client retries.

---

## 15. Event Model

Events are detected on the mobile device.

Initial event categories may include:

```text
STRONG_IMPACT
CRITICAL_INCLINATION
POSSIBLE_FALL
ABNORMAL_MOVEMENT
```

An event should preserve enough evidence to explain why it was detected.

Conceptually:

```text
Event
 ├── eventId
 ├── SmartBox
 ├── delivery
 ├── type
 ├── occurredAt
 ├── latitude
 ├── longitude
 ├── evidence
 └── receivedAt
```

Evidence may contain raw or derived sensor samples relevant to the event.

---

## 16. Event Processing

Persistence and acknowledgement of the event should not require all downstream work to finish synchronously.

BullMQ may process tasks such as:

- alert creation
- operational notifications
- KPI updates
- event enrichment
- support or dashboard notifications

The exact job taxonomy should evolve with implementation.

---

## 17. PostgreSQL

PostgreSQL is the primary persistent source of truth.

It stores authoritative business state.

All schema evolution should happen through migrations.

Important constraints should exist at database level where practical.

Likely persistent domains include:

- users
- roles
- customers
- SmartBoxes
- activation state
- deliveries
- telemetry
- events
- event evidence
- support tickets
- support messages
- audit records

---

## 18. Redis

Redis supports infrastructure concerns.

Expected uses include:

- BullMQ
- temporary coordination
- cache where justified
- realtime-related ephemeral state

Redis must not be the sole storage location for irreplaceable business data.

---

## 19. BullMQ

BullMQ remains part of the MVP.

It exists to decouple background work from core request latency and provide a clear path for future workload scaling.

Do not use queues where a synchronous operation is simpler and more correct.

Good queue candidates include:

- alert processing
- asynchronous KPI work
- support notifications
- retryable operational jobs
- event post-processing

---

## 20. Realtime Communication

WebSocket supports realtime dashboard behavior.

Potential channels include:

- SmartBox status
- new events
- connectivity changes
- support chat
- ticket updates

Persistent correctness must not depend on receiving every WebSocket message.

Clients should be able to recover authoritative state through regular APIs.

---

## 21. Support Tickets

Support tickets are persistent domain entities.

A ticket supports:

- Customer ownership
- status
- message history
- Administrator assignment
- Administrator takeover
- realtime conversation
- resolution

Ticket messages must be persisted before or as part of reliable realtime publication.

---

## 22. Device Health

The server should expose operational health information for SmartBoxes.

Possible fields include:

- lastSeenAt
- battery level
- connectivity
- last known location
- monitoring state
- synchronization state
- health status

The exact health model should be refined during implementation.

---

## 23. Location

The MVP does not reconstruct routes.

Location is used for:

- latest known SmartBox position
- event-associated position

The dashboard may generate external Google Maps links using stored coordinates.

Full route storage and Google Maps Platform integration are future concerns.

---

## 24. Audit

Privileged administrative actions should produce audit records where appropriate.

Examples:

- role changes
- password resets
- user activation/deactivation
- SmartBox activation
- SmartBox reassignment
- SmartBox deactivation/deletion
- support ownership changes

Audit design should avoid storing secrets.

---

## 25. Security Boundaries

The backend must validate:

- user authentication
- device authentication
- role authorization
- Customer ownership
- SmartBox ownership
- activation token validity
- payload structure

Clients are never trusted by default.

---

## 26. Scalability Direction

The server must be able to evolve beyond the MVP without requiring immediate microservices.

Current scalability strategy:

- modular monolith
- stateless NestJS application instances where practical
- PostgreSQL as authoritative storage
- Redis for shared ephemeral infrastructure
- BullMQ for background workloads
- WebSocket designed with future horizontal scaling in mind

Future changes may introduce:

- managed PostgreSQL
- managed Redis
- cloud queues
- horizontal API scaling
- horizontal workers
- Kubernetes
- event-driven integrations
- dedicated telemetry storage

These are future decisions and should not be implemented prematurely.

---

## 27. Architecture Decision Records

Architectural decisions should be recorded in:

```text
docs/decisions/
```

Recommended initial ADR topics:

- Smartphone as MVP IoT Device
- SmartBox as Logical Domain Entity
- On-Device Event Detection
- Offline Store-and-Forward
- Idempotent Telemetry and Event Ingestion
- Modular Monolith Backend
- Redis and BullMQ in the MVP
- QR-Based SmartBox Activation
- No Full Route Tracking in MVP
- Soft Deletion for Historical SmartBoxes

---

## 28. Explicit Non-Goals

The MVP server does not need to implement:

- temperature
- ESP32
- Iridium
- satellite networking
- route reconstruction
- Google Maps route APIs
- external delivery platforms
- machine learning
- microservices
- Kubernetes
