# SecureDelivery Server Architecture

## 1. Purpose

The SecureDelivery Server is the central backend and authoritative data source for the SecureDelivery platform.

It receives data from the mobile IoT application, persists business state, enforces RBAC and tenant isolation, processes background work, exposes APIs to the monitoring dashboard and supports realtime interactions.

---

## 2. Project Context

SecureDelivery monitors delivery quality and cargo integrity.

The MVP uses a smartphone mounted horizontally on the delivery box as the primary IoT implementation of a Device.

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

`Device` is the canonical technical term. `SmartBox` is the product-facing Dashboard label.

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

## Engineering Practice Boundary

This architecture document defines SecureDelivery-specific boundaries and decisions.

Framework-level implementation guidance is defined in the repository `AGENTS.md`.

Human developers should also follow:

- `docs/development-guide.pt-BR.md`
- `docs/git-workflow.pt-BR.md`

Implementations should remain idiomatic to NestJS, TypeScript, PostgreSQL, Redis and BullMQ and should prefer official/framework-native solutions over unnecessary custom abstractions.


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
Devices
DeviceActivation
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
│ Devices                  │
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
- Devices
- Device operational visibility
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

- Devices
- deliveries
- telemetry
- events
- tickets

Queries and authorization rules must prevent cross-customer access.

Frontend filtering is not an authorization mechanism.

---

## 9. Device Domain

`Device` is a logical domain entity.

The Device represents the monitored delivery container.

In the MVP, the attached IoT device is a smartphone.

The Device model should not depend on mobile-specific implementation details.

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

## 10. Device Lifecycle

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

A Device with historical deliveries, events or telemetry should not be destructively removed without an explicit retention decision.

---

## 11. QR Activation Flow

```text
Administrator creates Device
            ↓
Device enters pending activation
            ↓
Mobile application exposes QR Code
            ↓
Customer scans activation QR Code
            ↓
Server validates activation token
            ↓
Customer association is persisted
            ↓
Device becomes active
```

Activation tokens should have an explicit lifecycle.

Avoid exposing raw internal IDs as activation credentials.

---

## 12. Telemetry Model

SecureDelivery uses lean normal telemetry.

The Device performs high-frequency motion acquisition locally.

Initial profile:

```text
Raw IMU:                      50 Hz, Device-local
GPS / ground speed:           up to 1 Hz, Device-local
normal Server telemetry:      one-minute period summaries
network batch:                normally every minute
event evidence:               high-frequency around relevant events
```

Normal telemetry does not contain the continuous raw IMU stream.

Conceptually:

```text
TelemetryBatch
 ├── schemaVersion
 ├── batchId
 ├── monitoringSessionId
 └── periods[]
      ├── periodStartedAt
      ├── periodFinishedAt
      ├── deviceState
      ├── lastLocation
      └── observations[]
```

MVP navigation summary observations:

```text
navigation.distance.traveled
navigation.moving.duration
navigation.stopped.duration
navigation.speed.maximum
```

Average moving speed is derived from accumulated distance and moving duration.

Unknown valid Observation keys remain accepted.

## Shared Device Protocol

Canonical contracts are defined under the workspace:

```text
../docs/contracts/
```

The protocol separates:

### Platform-understood metadata

- Device identity
- monitoring session
- timestamps
- location
- battery
- connectivity
- monitoring status

### Extensible sensor observations

Generic namespaced:

```text
key + value + optional unit
```

### Extensible Device-generated events

Open namespaced `eventType` strings inside a stable common envelope.

This allows new sensors and event detectors to be deployed on Devices without requiring corresponding server contract changes.

Generic ingestion must accept unknown valid observation keys and unknown valid event types.

## 13. Telemetry Ingestion

Endpoint family:

```text
POST /api/v1/devices/{deviceId}/telemetry/batches
```

Ingestion responsibilities:

1. authenticate Device/request;
2. validate the shared versioned envelope;
3. validate Device/session relationship;
4. enforce `batchId` idempotency;
5. persist compact telemetry period summaries;
6. update operational Device state where appropriate;
7. update latest valid location;
8. derive/index KPI data when justified;
9. schedule asynchronous downstream work when needed.

Do not reject a valid batch because it contains a new valid Observation key.

Do not require raw normal accelerometer/gyroscope samples.

Offline Devices may send multiple pending period summaries in a single batch.

## Navigation and Speed Analytics

Speed is an MVP operational signal.

Preferred source is Device-reported GNSS/operating-system ground speed, summarized before ingestion.

The Server stores/derives sufficient data for:

- monitored distance;
- moving duration;
- stopped duration;
- average moving speed;
- maximum speed;
- events per 100 km;
- event correlation by speed range.

Canonical derivation:

```text
average moving speed = total distance / total moving duration
```

Do not average one-minute speed averages.

Motion events may contain:

```text
navigation.speed.at_event
navigation.speed.average_5s_before
navigation.speed.maximum_10s_before
navigation.moving
```

These attributes are contextual/correlational and must not automatically be interpreted as causal proof.

## 14. Idempotency

Telemetry batches and events require stable client-generated identifiers.

Examples:

```text
batchId
eventId
```

The server should be able to safely receive the same logical request multiple times.

Database uniqueness constraints should protect critical invariants where practical.

A lost HTTP response after successful persistence must not cause duplicate data when the mobile client retries.

---

## 15. Event Model

Events are detected on the mobile device.

Initial Device-generated event types include:

```text
motion.strong_impact
motion.critical_inclination
motion.possible_fall
motion.abnormal_movement
```

`eventType` is an open namespaced string and must not become a closed server enum.

An event should preserve enough evidence to explain why it was detected.

Conceptually:

```text
Event
 ├── eventId
 ├── Device
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
- Devices
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

- Device status
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

The server should expose operational health information for Devices.

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

- latest known Device position
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
- Device activation
- Device reassignment
- Device deactivation/deletion
- support ownership changes

Audit design should avoid storing secrets.

---

## 25. Security Boundaries

The backend must validate:

- user authentication
- device authentication
- role authorization
- Customer ownership
- Device ownership
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
- Device as Logical Domain Entity
- On-Device Event Detection
- Offline Store-and-Forward
- Idempotent Telemetry and Event Ingestion
- Modular Monolith Backend
- Redis and BullMQ in the MVP
- QR-Based Device Activation
- No Full Route Tracking in MVP
- Soft Deletion for Historical Devices

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

## Shared Integration References

Cross-repository behavior is defined in:

- `../../docs/contracts/domain-model.md`
- `../../docs/contracts/integration-flows.md`
- `../../docs/contracts/kpis.md`
- `../../docs/contracts/openapi.yaml`
- `../../docs/contracts/asyncapi.yaml`
