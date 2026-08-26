# System Design Document: FitSlot Gym Reservation Platform
**2-Day System Design & Build Challenge (MERN + PostgreSQL + Redis)**  
**Author:** Manya Patkar  
**Repository:** [github.com/manyapatkar974/GYM_SLOT](https://github.com/manyapatkar974/GYM_SLOT)  
**Date:** August 2026  

---

## 1. Problem Understanding & Assumptions

### 1.1 Problem Statement
The objective is to design and build a high-concurrency gym slot reservation engine where users can discover scheduled sessions, reserve open slots, and cancel bookings. Each slot has a strictly enforced capacity limit of **10 participants**.

### 1.2 Core Concurrency Challenge
The primary technical hurdle occurs when a slot has only 1 remaining opening (`booked_count = 9`, `capacity = 10`) and multiple users attempt to book at the exact same millisecond. 
- In an unmanaged system, concurrent threads simultaneously read `booked_count = 9`, pass the capacity check, insert duplicate bookings, and increment capacity to 11 or higher (Read-Check-Write race condition).
- Our system must guarantee that **exactly one** booking succeeds, all competing requests are cleanly rejected with `HTTP 409 Conflict`, and `booked_count` never exceeds 10 or goes negative.

### 1.3 Key Assumptions
1. Fixed slot capacity of 10 users per session.
2. Users cannot hold more than one active booking for the same slot.
3. Cancellations must immediately free up slot capacity and invalidate caches.
4. Relational integrity is strictly required for financial/reservation accuracy; audit trails can be eventually consistent.

---

## 2. High-Level Design (HLD)

The system is architected as a decoupled, multi-tier platform separating read-heavy caching, transactional state, and background telemetry.

```
                              +-------------------------+
                              |   React Client (Vite)   |
                              +------------+------------+
                                           |
                                      HTTPS / REST
                                           |
                              +------------v------------+
                              |  Express.js API Gateway |
                              +----+-------+-------+----+
                                   |       |       |
              +--------------------+       |       +--------------------+
              | (Read Cache / Limit)       | (ACID Transactions)        | (Async Audit Logs)
              v                            v                            v
    +-------------------+        +-------------------+        +-------------------+
    |    Redis Cache    |        |    PostgreSQL     |        |      MongoDB      |
    |  (slots:all / 60s)|        | (Source of Truth) |        |  (Activity Logs)  |
    +-------------------+        +-------------------+        +-------------------+
```

### Component Breakdown
1. **Client Tier (React 18 + Tailwind CSS)**: Responsive dashboard with live capacity meters and active booking management.
2. **Application Tier (Node.js + Express.js)**: Stateless REST API enforcing input validation, JWT authentication, and transactional business logic.
3. **Primary Database (PostgreSQL 15)**: Relational source of truth handling Users, Slots, and Bookings via ACID transactions and row-level locks.
4. **Cache & Rate Limiter (Redis 7)**: Ephemeral in-memory store caching hot slot queries (`slots:all`) and applying write rate-limiting.
5. **Secondary Database (MongoDB 6)**: Non-relational document store for high-throughput, non-blocking user activity and audit logging.

---

## 3. Database Architecture & Storage Rationale

### 3.1 PostgreSQL (Relational Source of Truth)
PostgreSQL was selected for core transactional entities because gym reservations require strict ACID guarantees, foreign-key constraints, and pessimistic locking primitives.

#### Table: `users`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, default `uuid_generate_v4()` | Unique user identifier |
| `name` | VARCHAR(255) | NOT NULL | Full name of the user |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Unique login email address |
| `password_hash` | VARCHAR(255) | NOT NULL | `bcrypt` hashed password |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account update timestamp |

#### Table: `slots`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, default `uuid_generate_v4()` | Unique slot identifier |
| `date` | DATE | NOT NULL | Scheduled slot date |
| `start_time` | TIME | NOT NULL | Slot start time (e.g. 06:00:00) |
| `end_time` | TIME | NOT NULL | Slot end time (e.g. 07:00:00) |
| `capacity` | INT | DEFAULT 10 | Maximum attendees allowed (10) |
| `booked_count` | INT | DEFAULT 0 | Current active attendees |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Last updated timestamp |

#### Table: `bookings`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, default `uuid_generate_v4()` | Unique booking identifier |
| `user_id` | UUID | FOREIGN KEY (`users.id`) ON DELETE CASCADE | Reserving user |
| `slot_id` | UUID | FOREIGN KEY (`slots.id`) ON DELETE CASCADE | Target slot |
| `status` | ENUM | `'ACTIVE'`, `'CANCELLED'` | Current booking state |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Reservation timestamp |
| `cancelled_at` | TIMESTAMP | NULL | Cancellation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Modification timestamp |

**Indexes & Constraints:**
```sql
-- Prevents duplicate simultaneous active bookings for the same user & slot
CREATE UNIQUE INDEX unique_active_booking 
ON bookings (user_id, slot_id) 
WHERE status = 'ACTIVE';

CREATE INDEX idx_slots_date_time ON slots (date, start_time);
CREATE INDEX idx_bookings_user_id ON bookings (user_id);
```

---

### 3.2 MongoDB (Asynchronous Activity & Audit Logs)
MongoDB was selected for activity logs because audit logs are write-heavy, append-only, and do not require relational joins. Writing logs to MongoDB ensures logging operations do not contend for PostgreSQL connection pool slots.

#### Collection: `activity_logs`
```json
{
  "_id": "ObjectId('65d8f1e29c8e1a0012ab34cd')",
  "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "action": "BOOK_SLOT",
  "slotId": "8a32b384-2191-4df2-bc6d-74d1a29367c1",
  "bookingId": "c71120f2-e567-4f11-9a76-0bf17cb3d119",
  "timestamp": "2026-08-26T10:00:00.000Z",
  "metadata": {}
}
```
*Monitored events:* `USER_REGISTER`, `USER_LOGIN`, `BOOK_SLOT`, `CANCEL_BOOKING`.

---

## 4. Concurrency Strategy & Mathematical Correctness

### 4.1 The Mechanism: Row-Level Locking (`FOR UPDATE`)
To serialize booking attempts without application-level bottlenecks, FitSlot uses PostgreSQL's row-level lock within an explicit transaction.

```
Request 1 (User A) ──► [ BEGIN ] ──► [ SELECT ... FOR UPDATE (Lock Granted) ] ──► [ INSERT & UPDATE ] ──► [ COMMIT ] (Lock Released)
                                                   ▲
Request 2 (User B) ──► [ BEGIN ] ──► [ SELECT ... FOR UPDATE (BLOCKED WAITING) ] ────────────────────────► [ Capacity Check Fails ] ──► [ ROLLBACK (409) ]
```

### 4.2 Step-by-Step Transaction Flow
```sql
BEGIN;

-- Step 1: Acquire exclusive row-level lock on the target slot row
SELECT id, capacity, booked_count 
FROM slots 
WHERE id = $1 
FOR UPDATE;

-- Step 2: In-Transaction Capacity Check (Inside Node.js Service)
-- If (booked_count >= capacity) => ROLLBACK & throw HTTP 409 Conflict

-- Step 3: Insert Active Booking Record
-- Protected by partial unique index against duplicate bookings by the same user
INSERT INTO bookings (user_id, slot_id, status) 
VALUES ($2, $1, 'ACTIVE');

-- Step 4: Atomically increment slot booked count
UPDATE slots 
SET booked_count = booked_count + 1, updated_at = CURRENT_TIMESTAMP 
WHERE id = $1;

-- Step 5: Commit and release row lock
COMMIT;
```

### 4.3 Invariant Guarantees
1. **Safety**: `booked_count <= capacity` holds under all interleavings.
2. **Liveness**: Lock duration is strictly confined to the execution of 2 SQL statements (~2–5ms), preventing connection pool starvation.
3. **Idempotence / Duplicate Prevention**: If the same user fires two simultaneous requests, the unique partial index raises PostgreSQL error code `23505`, triggering a clean rollback and `HTTP 409`.

---

## 5. Redis Caching & Invalidation Architecture

```
[ Incoming Read: GET /api/slots ]
                │
         Is key in Redis?
         ├── YES (Cache Hit) ──► Return JSON immediately (< 2ms)
         └── NO (Cache Miss) ──► Query PostgreSQL ──► Write to Redis (60s TTL) ──► Return Data
```

### Strategy Summary:
- **Key Pattern**: `slots:all` (all slots) and `slots:{slotId}` (individual slot).
- **TTL**: 60 seconds (prevents stale drift in edge cases).
- **Write-Through Invalidation**: Every successful `bookSlot()` and `cancelBooking()` transaction executes `redisClient.del(['slots:all', 'slots:' + slotId])` immediately upon commit.
- **Fail-Safe Fallback**: Redis is wrapped in non-blocking try/catch handlers. If Redis goes down, the backend falls back to direct PostgreSQL reads with zero service degradation.
- **Rate Limiting**: Applied on `POST /api/bookings` at 15 requests/minute per IP.

---

## 6. REST API Contract

All responses conform to a standardized JSON schema:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation description",
  "data": {}
}
```

| Method | Endpoint | Auth | Request Body | Success Response | Error Codes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | No | `{ name, email, password }` | `201 Created` + JWT token & user | `400`, `409` |
| `POST` | `/api/auth/login` | No | `{ email, password }` | `200 OK` + JWT token & user | `400`, `401` |
| `GET` | `/api/slots` | No | None | `200 OK` + Array of slots | `500` |
| `GET` | `/api/slots/:id` | No | None | `200 OK` + Slot object | `404` |
| `POST` | `/api/bookings` | **Yes** | `{ slotId }` | `201 Created` + Booking record | `400`, `401`, `404`, `409`, `429` |
| `GET` | `/api/bookings/my` | **Yes** | None | `200 OK` + User bookings array | `401` |
| `DELETE` | `/api/bookings/:id` | **Yes** | None | `200 OK` + Cancelled status | `400`, `401`, `404` |
| `GET` | `/api/health` | No | None | `200 OK` + Service statuses | `503` |

---

## 7. Security & Non-Functional Requirements

### 7.1 Security Architecture
- **Authentication**: Stateless Bearer JWT with 24-hour expiration.
- **Password Protection**: Salted hashing with `bcrypt` (10 rounds). Plaintext passwords are never logged or stored.
- **Input Sanitization**: Dedicated `validationMiddleware.js` enforcing RFC-compliant email regex, string trimming, and password strength checks.
- **Injection Prevention**: 100% parameterized SQL queries via `pg` pool; NoSQL sanitization via structured Mongoose schemas.
- **Secrets Isolation**: All credentials loaded from `.env` with `.env.example` templates committed.

### 7.2 Scalability (100x Traffic Growth)
If traffic surges by 100x:
1. **Stateless Clustering**: Horizontal scaling of Node.js instances behind an NGINX / AWS Application Load Balancer.
2. **Connection Pooling**: Implementation of **PgBouncer** to pool database connections across tens of backend replicas.
3. **Database Read Replicas**: Direct all `GET /api/slots` queries to PostgreSQL read replicas, reserving the primary master solely for write transactions (`FOR UPDATE`).
4. **Redis Sharding**: Transition from standalone Redis to a Redis Cluster with replication.

---

## 8. Limitations & Trade-offs

| Design Choice | Rationale | Trade-off |
| :--- | :--- | :--- |
| **Native `pg` Pool over ORM** | Explicit, granular control over transaction scopes and row locks without ORM overhead. | Requires manual query writing and migration maintenance. |
| **Pessimistic Locking (`FOR UPDATE`)** | Guarantees zero overbooking under peak burst contention without retry loops. | Competing requests briefly serialize at the database level (~2ms). |
| **Dual Database Pattern** | Decouples high-volume audit logging from transactional PostgreSQL connections. | Requires managing two separate database infrastructures. |

---

## 9. Verification & Concurrency Test Results

The system includes an automated stress-testing suite (`backend/concurrency-test.js`) verifying the concurrent locking mechanism.

### Test Protocol
1. Slot created with `capacity = 10` and `booked_count = 9` (1 spot remaining).
2. Three concurrent booking requests dispatched simultaneously using `Promise.all()`.
3. Database asserts that:
   - Exactly **1 request** receives `201 Created`.
   - Exactly **2 requests** receive `409 Conflict (Slot Full)`.
   - Final PostgreSQL row `booked_count` is **strictly 10**.

```
📊 Concurrent Request Execution Results:
┌─────────┬─────────────────┬───────────┬────────────────────────────┬────────────┐
│ (index) │      user       │  status   │           reason           │ durationMs │
├─────────┼─────────────────┼───────────┼────────────────────────────┼────────────┤
│    0    │ 'Athlete One'   │ 'SUCCESS' │ 'BOOKED_CONFIRMED (201)'   │     12     │
│    1    │ 'Athlete Two'   │ 'FAILED'  │ 'SLOT_FULL (409 Conflict)' │     15     │
│    2    │ 'Athlete Three' │ 'FAILED'  │ 'SLOT_FULL (409 Conflict)' │     16     │
└─────────┴─────────────────┴───────────┴────────────────────────────┴────────────┘

🔍 Verification Assertions:
   - Expected Successes: 1 | Actual: 1
   - Expected Rejections: 2 | Actual: 2
   - Final Slot Booked Count: 10 / 10

✅ TEST PASSED: Zero overbooking detected. Row-level locks verified!
```
