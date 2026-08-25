# SecureDelivery — Project Context

## Overview

SecureDelivery is a delivery-quality monitoring platform focused on establishments that require consistent delivery quality and want to prove, with data, the conditions under which a product was transported until it reached the customer.

The product is not primarily a fleet-tracking solution. Its main goal is to monitor delivery quality and cargo integrity.

The core product question is:

> Can we reliably determine whether something happened during a delivery that may have compromised the cargo, and provide enough evidence to audit that conclusion later?

The MVP uses a smartphone as the primary IoT device. The phone will be physically fixed with tape to a flat horizontal surface on the delivery box during tests, allowing the team to simulate the orientation of a future dedicated IoT device and test angle, acceleration, impact and fall detection in realistic conditions.

The MVP does not include temperature monitoring.

---

## Product Principles

SecureDelivery should prioritize:

1. Delivery-quality evidence over driver surveillance.
2. Cargo integrity over driving-style classification.
3. Reliable telemetry over high-frequency network traffic.
4. Local event detection on the IoT device.
5. Offline-first operation.
6. Store-and-forward synchronization.
7. Idempotent writes.
8. Auditability of detected events.
9. Clear customer isolation.
10. A simple MVP architecture that can evolve without requiring a rewrite.

A courier may perform an unusual maneuver without compromising the cargo. SecureDelivery should care about what happened to the cargo and SmartBox, not about judging the maneuver itself.

---

## SmartBox Concept

`Device` is the canonical technical domain term.

Use `Device` in:

- API routes
- backend modules
- persistence entities
- cross-repository contracts
- logs
- telemetry/event ownership
- identifiers such as `deviceId`

`SmartBox` is the product-facing label displayed to users.

In the MVP:

```text
Product UI: SmartBox
Technical entity: Device
Implementation: Flutter application on a smartphone mounted horizontally on the delivery box
```

Future:

```text
Product UI: SmartBox
Technical entity: Device
Implementation: dedicated IoT hardware
```

The Device contract must remain independent from the current smartphone implementation.

Shared communication contracts are defined under:

```text
docs/contracts/
```

## Main System Areas

SecureDelivery is initially divided into three repositories:

```text
securedelivery-server
securedelivery-mobile
securedelivery-dashboard
```

### SecureDelivery Server

Central backend and source of truth for the platform.

Main responsibilities:

- authentication
- authorization
- RBAC
- users
- customers
- administrators
- Devices
- Device activation
- deliveries
- telemetry
- events
- event evidence
- speed and distance operational KPIs
- device health
- support tickets
- realtime support chat
- realtime dashboard updates
- persistence
- idempotency
- auditability
- background processing

### SecureDelivery Mobile

Acts as the primary IoT device in the MVP.

Main responsibilities:

- collect smartphone sensor data
- collect GPS location
- collect battery state
- collect connectivity state
- perform event detection locally
- persist telemetry locally
- persist events locally
- preserve evidence associated with events
- batch telemetry
- store-and-forward
- retry synchronization
- operate in background while monitoring is enabled

### SecureDelivery Dashboard

Management and monitoring interface for platform users.

Main responsibilities:

- user and RBAC management
- customer management
- administrator management
- Device management presented as SmartBoxes in the UI
- Device activation flows presented as SmartBox activation
- Device monitoring presented as SmartBox monitoring
- customer-scoped monitoring
- global operational monitoring for administrators
- event visualization
- external Google Maps links
- support tickets
- realtime support chat

---

# RBAC

The MVP has three main roles:

```text
SUPER_ADMIN
ADMIN
CUSTOMER
```

Authorization must be enforced by the backend.

The dashboard may hide or disable actions according to permissions, but frontend behavior must never be considered a security boundary.

---

## SUPER_ADMIN

A Super Administrator has all Administrator capabilities.

Additional capabilities:

- create Super Administrators
- create Administrators
- create Customers
- change roles of Administrators and Customers
- reset passwords of Administrators and Customers
- activate Administrators and Customers
- deactivate Administrators and Customers

Restrictions:

- cannot reset the password of another Super Administrator
- cannot deactivate another Super Administrator
- cannot deactivate their own user
- privileged actions should be auditable

A Super Administrator must not be able to accidentally lock themselves out through self-deactivation.

---

## ADMIN

Administrators manage customers, administrators, SmartBoxes and support operations.

Capabilities include:

- create Customers
- edit Customers
- activate Customers
- deactivate Customers
- create Administrators
- manage Administrators within allowed RBAC rules
- create SmartBoxes
- edit SmartBoxes
- deactivate SmartBoxes
- remove SmartBoxes from active operation
- associate SmartBoxes with Customers through the activation flow
- inspect SmartBoxes by Customer
- inspect all SmartBoxes globally
- view last known GPS location
- view connectivity
- view battery
- view device health
- view last communication time
- inspect delivery events
- provide customer support
- view support tickets
- assume ticket ownership
- participate in realtime ticket conversations
- close or resolve tickets

SmartBox removal should preserve historical traceability. The initial architectural recommendation is soft deletion rather than destructive deletion.

---

## CUSTOMER

Customers can access only their own data.

Capabilities include:

- view their SmartBoxes
- request a SmartBox
- activate a SmartBox
- validate a SmartBox through QR Code activation
- monitor SmartBox health
- monitor battery
- monitor connectivity
- view latest known location
- open the latest location in Google Maps through an external link
- inspect events associated with deliveries
- open support tickets
- participate in realtime support chat

Tenant isolation must be guaranteed by the backend.

A Customer must never be able to access SmartBoxes, deliveries, events, tickets or users belonging to another Customer.

---

# Device Lifecycle

The Device is created by an Administrator and later activated by a Customer. The Dashboard presents the Device as a SmartBox.

Suggested conceptual lifecycle:

```text
CREATED
    ↓
PENDING_ACTIVATION
    ↓
ACTIVE
    ↓
INACTIVE
```

Historical records should be retained.

A Device may also have a soft-deleted state internally if needed.

---

## Device Activation

The MVP uses QR Code activation.

The QR Code is exposed by the mobile application during the MVP.

Conceptual flow:

```text
Administrator creates Device
            ↓
Device enters PENDING_ACTIVATION
            ↓
Customer scans QR Code
            ↓
Activation token is validated
            ↓
Device is associated with Customer
            ↓
Device becomes ACTIVE
```

The QR Code should not simply expose an internal Device identifier.

Prefer a secure activation token with an explicit lifecycle and expiration strategy.

The exact token design may evolve.

---

# Device Monitoring

Administrators need two operational views.

## Customer View

An Administrator can select a Customer and view all Devices associated with that Customer (displayed as SmartBoxes).

For each Device, the platform should expose operational information such as:

- latest known location
- connectivity
- battery
- health
- last communication
- status
- recent events

## Global View

Administrators can inspect all Devices from all Customers to monitor platform-wide device health.

This view is intended for support and operations.

---

# Location

The MVP does not implement full route tracking.

Location is collected primarily to answer:

> Where was the SmartBox when a relevant event occurred?

and:

> What is the latest known location of the SmartBox?

The dashboard can expose an external Google Maps link using the last recorded latitude and longitude.

The MVP does not require route reconstruction or a full Google Maps Platform integration.

Future versions may introduce route visualization, origin and destination tracking, event markers along routes and other logistics capabilities.

---

# Mobile IoT Monitoring

The smartphone acts as the IoT device during the MVP.

The test phone will be mounted horizontally on a flat surface of the SmartBox.

This provides a known physical orientation that can be used to test:

- acceleration
- angle changes
- inclination
- strong impacts
- falls
- abnormal movements
- possible cargo compromise

The implementation should remain device-oriented so a dedicated IoT device can replace the smartphone later.

---

## Monitoring Control

The mobile application must allow monitoring to be explicitly enabled or disabled.

Conceptually:

```text
MONITORING_OFF
MONITORING_ON
```

When monitoring is disabled:

- continuous sensor monitoring should stop
- background monitoring should stop where possible
- energy consumption should be minimized

When monitoring is enabled:

- required sensors are sampled
- event detection runs
- telemetry is persisted locally
- synchronization runs according to policy
- critical events are persisted immediately

---

# Sensor Collection

Sensor acquisition, normal telemetry and network transmission have intentionally different rates.

Initial MVP profile:

```text
Raw IMU sampling:                50 Hz (~20 ms)
Event detection:                 high-frequency local processing
GPS / ground-speed observation:  up to 1 Hz
Normal server telemetry:         1-minute summary
Network batch:                   normally every 1 minute
```

Raw IMU data is primarily Device-local.

The Server does not normally receive continuous accelerometer/gyroscope history when no relevant event is detected.

The Device keeps a rolling high-frequency buffer so abnormal events can preserve precise evidence.

Temperature remains outside the MVP.

# Edge Event Detection

Event detection is performed on the Device.

The backend is not responsible for re-running Device detection algorithms from the normal telemetry stream.

Conceptual pipeline:

```text
High-frequency sensors
   ↓
Sensor Collector
   ↓
Event Detection Engine
   ↓
Event + Evidence
   ↓
Local Durable Persistence
   ↓
Sync Engine
```

Initial Device-generated event types use namespaced strings:

```text
motion.strong_impact
motion.critical_inclination
motion.possible_fall
motion.abnormal_movement
```

Event types are intentionally extensible.

New event detectors should normally be deployable on the Device without requiring a backend contract change.

The exact algorithms and thresholds will evolve through real-device tests.

# Event Evidence

Every detected event must preserve enough data to explain why it was detected.

Conceptually:

```text
Event
 ├── eventId
 ├── eventType
 ├── severity
 ├── occurredAt
 ├── deviceId
 ├── monitoringSessionId
 ├── location
 ├── detector name/version
 ├── attributes[]
 └── evidence
      └── high-frequency observations[]
```

Initial evidence target:

```text
approximately 2 seconds before trigger
+
trigger/event interval
+
approximately 2 seconds after trigger
```

At a 50 Hz IMU baseline, this preserves motion detail at roughly 20 ms intervals.

The exact evidence window remains configurable.

Evidence supports:

- debugging
- auditing
- false-positive analysis
- algorithm calibration
- detector-version comparison
- future model improvement

# Telemetry Store-and-Forward

Normal telemetry is intentionally compact.

Conceptual flow:

```text
IMU 50 Hz                         GPS/speed up to 1 Hz
   │                                      │
   └──────────── Device processing ───────┘
                     │
           event detection + rolling buffer
                     │
            1-minute operational summary
                     │
              durable local storage
                     │
                batch / retry
                     │
              SecureDelivery Server
```

The normal one-minute summary contains operationally useful information such as:

- latest valid location;
- battery;
- connectivity;
- monitoring status;
- distance traveled in the period;
- moving duration;
- stopped duration;
- maximum speed.

The Server derives average moving speed from total distance and total moving duration.

High-frequency motion data is synchronized primarily as evidence when an event is detected.

Offline period summaries remain stored locally and are sent later through the same idempotent batch contract.

# MVP Navigation and Speed Telemetry

Speed is an official MVP telemetry capability.

Preferred source:

```text
GNSS / operating-system ground speed
```

The Device observes GPS/speed at up to 1 Hz but normally sends only one-minute aggregates to the Server.

Canonical normal telemetry metrics:

```text
navigation.distance.traveled   [m]
navigation.moving.duration     [s]
navigation.stopped.duration    [s]
navigation.speed.maximum       [m/s]
```

The Server derives:

```text
average moving speed =
total distance traveled / total moving duration
```

This supports KPIs such as:

- average moving speed;
- maximum speed;
- distance traveled;
- moving/stopped time;
- events per 100 km;
- event rate by speed range.

For detected motion events, the Device should attach reliable speed context when available:

```text
navigation.speed.at_event
navigation.speed.average_5s_before
navigation.speed.maximum_10s_before
navigation.moving
```

Speed correlation must not be presented as proven causality without additional evidence.

Initial movement/stopped threshold:

```text
1.5 m/s (~5.4 km/h)
```

The threshold is configurable and subject to calibration.

Full route tracking remains outside the MVP.

# Offline-First Requirements

Mobile connectivity is considered unreliable by design.

The system must tolerate:

- no internet
- temporary disconnections
- backend unavailability
- timeouts
- duplicated transmissions
- delayed transmissions
- out-of-order arrival
- batch retransmission

The mobile application must use store-and-forward.

Data generated while offline must retain the correct original timestamps.

---

# Idempotency

Telemetry and event delivery must be idempotent.

The mobile application must generate stable unique identifiers before transmission.

Examples:

```text
batchId
eventId
```

If the same payload is transmitted multiple times because an acknowledgement was lost, the backend must persist the logical record only once.

Idempotency must not depend only on application code.

Important uniqueness guarantees should also be enforced with database constraints where practical.

---

# Timestamps

Client timestamps and server ingestion timestamps represent different facts and should not be conflated.

The system should preserve:

- when data was generated on the device
- when an event occurred
- when the server received the data

Use UTC for backend persistence unless an explicit future decision changes this.

---

# Support Tickets

Customers can request support through the dashboard.

A support ticket should support:

- creation
- status
- conversation history
- assignment
- Administrator ownership
- realtime messages
- resolution/closure

Administrators can assume a ticket conversation and interact with the Customer in realtime.

The exact chat transport may be implemented through WebSocket.

Persistent message history must not depend on WebSocket delivery.

---

# Shared Repository Contracts

Cross-repository communication is defined under:

```text
docs/contracts/
```

The canonical contracts include:

- `openapi.yaml` for HTTP
- `asyncapi.yaml` for realtime events
- `common.md` for shared conventions
- `telemetry.md` for the extensible telemetry protocol
- `events.md` for the extensible Device event protocol
- `versioning.md` for compatibility rules

Core rules:

1. `Device` is the canonical technical term.
2. `SmartBox` is a product-facing UI label.
3. Sensor and derived telemetry measurements use generic namespaced observations.
4. Device-generated `eventType` values are open namespaced strings.
5. Unknown valid observation keys and event types must remain ingestible.
6. Clients must not invent payloads independently from the canonical contract.
7. Breaking contract changes must be explicitly versioned and coordinated.

Shared cross-repository architectural decisions are stored under:

```text
docs/decisions/
```

# Backend Technology Baseline

The backend MVP uses:

- NestJS
- TypeScript
- PostgreSQL
- Redis
- BullMQ
- WebSocket
- Docker
- Docker Compose

Redis and BullMQ are intentionally retained in the MVP.

They should support asynchronous processing and help the architecture evolve toward larger scale without forcing premature microservices.

The MVP backend should still begin as a modular monolith.

Redis is not the source of truth.

PostgreSQL remains the primary persistent database.

BullMQ should be used when asynchronous work provides a clear benefit, such as:

- event processing
- alert processing
- support notifications
- background synchronization-related tasks
- KPI recalculation
- operational jobs
- retryable server-side work

Do not route every operation through a queue without reason.

---

# Dashboard and Mobile Technologies

The technology baseline is now defined for both client applications.

## SecureDelivery Dashboard

The web dashboard uses:

- Next.js
- TypeScript

The exact frontend architecture may still evolve through explicit architectural decisions, including topics such as:

- routing conventions
- rendering strategy
- state management
- data-fetching strategy
- WebSocket client strategy
- component library / design system
- authentication token handling
- testing strategy
- deployment strategy

Do not replace Next.js with another frontend framework without an explicit architectural decision.

## SecureDelivery Mobile

The mobile IoT application uses:

- Flutter
- Dart

The exact mobile architecture may still evolve through explicit architectural decisions, including topics such as:

- target mobile platforms
- state management
- local durable persistence
- background execution
- sensor plugins
- GPS/location integration
- secure storage
- transport protocol
- retry strategy implementation
- QR/deep-link implementation
- testing strategy

Do not replace Flutter with another mobile framework without an explicit architectural decision.

---

# Development Standards

The project should use:

- Git
- GitHub
- Pull Requests
- Code Review
- Conventional Commits
- automated tests
- documentation

The branch strategy may use GitFlow or another strategy agreed by the team.

Do not silently introduce a different team workflow.

---

# Repository Development Documentation

Each SecureDelivery repository must maintain three complementary documentation layers:

- `AGENTS.md`: operational instructions for AI coding agents.
- `docs/architecture.md`: current architecture, boundaries and technical decisions of that repository.
- `docs/development-guide.pt-BR.md`: practical engineering guidance for human developers.
- `docs/git-workflow.pt-BR.md`: Git, GitHub, branching, Pull Request, review and release workflow for human developers.

Human-facing development workflow documentation is written in Brazilian Portuguese.

AI-agent operational documentation remains in English for consistency with the engineering toolchain.

The development guides must prefer idiomatic, framework-native solutions and official conventions over unnecessary custom abstractions.

The Git workflow uses `develop` as the integration branch and `main` as the stable/release branch. All implementation work must occur on isolated branches and reach `develop` through Pull Requests and Code Review before promotion to `main`.

# MVP Scope

The MVP should focus on:

- RBAC
- user management
- customer management
- administrator management
- Device management (displayed as SmartBox in the UI)
- QR-based Device activation (displayed as SmartBox activation)
- mobile IoT monitoring
- 50 Hz raw IMU sampling with configurable rates
- on-Device event detection
- 1-minute compact telemetry summaries with local durable store-and-forward
- 1-minute normal telemetry summaries/batching
- store-and-forward
- retry
- idempotent telemetry ingestion
- idempotent event ingestion
- event evidence
- speed and distance operational KPIs
- latest location
- battery
- connectivity
- health
- support tickets
- realtime support chat
- monitoring dashboard
- event visualization
- external Google Maps location links

---

# Explicitly Outside the MVP

Unless a future decision changes scope, the MVP does not include:

- temperature monitoring
- DS18B20
- ESP32 as the primary device
- dedicated GNSS hardware
- Iridium
- satellite communication
- full route tracking
- route reconstruction
- Google Maps Platform route integration
- iFood integration
- Rappi integration
- ERP integration
- machine learning
- advanced driver scoring
- Kubernetes
- microservices
- dedicated hardware production
- large-scale logistics operations

---

# Future Evolution

Potential future areas include:

- dedicated SmartBox IoT hardware
- independent cellular connectivity
- satellite connectivity
- Iridium
- Google Maps route visualization
- route event markers
- external delivery-platform integrations
- logistics integrations
- multi-unit enterprise operations
- device fleet operations
- large-scale infrastructure
- Kubernetes where justified
- commercial plans
- hardware manufacturing
- logistics and reverse logistics
- device provisioning standards
- calibration processes
- operational support standards

These are future possibilities, not MVP requirements.
