# Gym Slot Booking System

A full-stack gym reservation application built with Node.js, Express, React, PostgreSQL, MongoDB, and Redis. The system is designed to handle high-concurrency booking requests safely, ensuring that slot capacity limits are strictly enforced without overbooking or race conditions.

---

## Architecture Overview

The system uses a layered architecture with clear separation of concerns across transactional storage, caching, and background logging:

```
[ React Client (Vite + Tailwind) ]
                |
           REST APIs
                |
[ Node.js / Express Backend ]
   ├── Redis (Read cache for slot availability + Rate limiting)
   ├── PostgreSQL (Source of truth for Users, Slots, and Bookings)
   └── MongoDB (Asynchronous activity and audit logs)
```

### Core Tech Stack
- **Frontend**: React 18, React Router v6, Tailwind CSS, Axios
- **Backend**: Node.js, Express.js
- **Primary Database**: PostgreSQL 15 (ACID transactions, Row-Level Locking)
- **Secondary Database**: MongoDB 6 (Audit & activity logs)
- **Cache & Rate Limiting**: Redis 7
- **Authentication**: JWT (JSON Web Tokens) with `bcrypt` password hashing
- **Infrastructure**: Docker & Docker Compose

---

## Concurrency Control & Database Locking

The primary technical challenge in this application is preventing race conditions when multiple users attempt to book the final available spot in a slot simultaneously.

### The Problem: Read-Check-Write Race Condition
In a standard non-locked flow:
1. User A and User B query the database simultaneously when `booked_count = 9` (capacity = 10).
2. Both requests see that 1 spot is available.
3. Both proceed to insert a booking and increment `booked_count`.
4. `booked_count` becomes 11, violating the business constraint.

### The Solution: PostgreSQL Row-Level Locking (`FOR UPDATE`)

To prevent this, booking transactions acquire an exclusive row-level lock on the target slot row before reading or updating its capacity.

```sql
BEGIN;

-- 1. Acquire an exclusive lock on the slot row.
-- Any other concurrent transaction attempting to read this row FOR UPDATE
-- will block until this transaction commits or rolls back.
SELECT id, capacity, booked_count 
FROM slots 
WHERE id = $1 
FOR UPDATE;

-- 2. Verify capacity in application logic:
-- If booked_count >= capacity, execute ROLLBACK and return HTTP 409 Conflict.

-- 3. Insert active booking record.
INSERT INTO bookings (user_id, slot_id, status) 
VALUES ($2, $1, 'ACTIVE');

-- 4. Atomically increment the booked count.
UPDATE slots 
SET booked_count = booked_count + 1, updated_at = CURRENT_TIMESTAMP 
WHERE id = $1;

COMMIT;
```

### Duplicate Booking Prevention
To ensure a user cannot book the same slot twice concurrently, a partial unique index is enforced at the database level:

```sql
CREATE UNIQUE INDEX unique_active_booking 
ON bookings (user_id, slot_id) 
WHERE status = 'ACTIVE';
```

If a user sends two simultaneous requests for the same slot, the second insert will raise a unique constraint violation (`code: 23505`), which the application catches and translates into an `HTTP 409 Conflict` response.

---

## Database Schemas

### PostgreSQL (Relational Data)

#### `users`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, default `uuid_generate_v4()` |
| `name` | VARCHAR(255) | NOT NULL |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL |
| `password_hash` | VARCHAR(255) | NOT NULL |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

#### `slots`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, default `uuid_generate_v4()` |
| `date` | DATE | NOT NULL |
| `start_time` | TIME | NOT NULL |
| `end_time` | TIME | NOT NULL |
| `capacity` | INT | DEFAULT 10 |
| `booked_count` | INT | DEFAULT 0 |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

#### `bookings`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | UUID | PRIMARY KEY, default `uuid_generate_v4()` |
| `user_id` | UUID | REFERENCES `users(id)` ON DELETE CASCADE |
| `slot_id` | UUID | REFERENCES `slots(id)` ON DELETE CASCADE |
| `status` | ENUM | `'ACTIVE'`, `'CANCELLED'` (DEFAULT `'ACTIVE'`) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `cancelled_at` | TIMESTAMP | NULL |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

### MongoDB (Activity / Audit Logs)

Activity logs are decoupled from PostgreSQL to ensure audit writes do not block the core transaction path:

```json
{
  "_id": "ObjectId(...)",
  "userId": "uuid-string",
  "action": "BOOK_SLOT",
  "slotId": "uuid-string",
  "bookingId": "uuid-string",
  "timestamp": "2026-08-26T10:00:00.000Z",
  "metadata": {}
}
```

Logged events include:
- `USER_REGISTER`
- `USER_LOGIN`
- `BOOK_SLOT`
- `CANCEL_BOOKING`

---

## Redis Caching Strategy

1. **Read Path (`GET /api/slots`)**:
   - Checks Redis under the key `slots:all`.
   - If present (cache hit), returns the cached JSON string directly.
   - If missing (cache miss), queries PostgreSQL, populates Redis with a 60-second TTL, and returns the result.

2. **Write Invalidation (`POST /api/bookings`, `DELETE /api/bookings/:id`)**:
   - Once the database transaction commits successfully, the cache keys `slots:all` and `slots:{slotId}` are deleted immediately.
   - Subsequent reads will fetch fresh data from PostgreSQL and re-warm the cache.

3. **Resilience & Fallback**:
   - Redis is treated strictly as an ephemeral cache. If Redis goes down, the application logs a warning and queries PostgreSQL directly without downtime or transactional inconsistency.

4. **Rate Limiting**:
   - Booking requests are rate-limited per IP using an in-memory/Redis-backed sliding window limiter (15 requests/minute) to mitigate spam.

---

## API Reference

All successful responses follow the format:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Description",
  "data": {}
}
```

Error responses follow the format:
```json
{
  "success": false,
  "statusCode": 409,
  "message": "This gym slot has reached maximum capacity (10/10)"
}
```

### Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user | No |
| `POST` | `/api/auth/login` | Login and receive JWT | No |
| `GET` | `/api/slots` | Get all slots with live availability (Cached) | No |
| `GET` | `/api/slots/:id` | Get single slot details | No |
| `POST` | `/api/bookings` | Book a gym slot (Row-locked transaction) | Yes (`Bearer <token>`) |
| `GET` | `/api/bookings/my` | Get all bookings for the logged-in user | Yes (`Bearer <token>`) |
| `DELETE` | `/api/bookings/:id` | Cancel an active booking and free up capacity | Yes (`Bearer <token>`) |
| `GET` | `/api/health` | Service health status and DB connection checks | No |

---

## Local Setup & Running

### Prerequisites
- [Docker Desktop](https://www.docker.com/) (running with WSL 2 on Windows)
- [Node.js](https://nodejs.org/) (v18 or higher)

### 1. Clone the repository
```bash
git clone https://github.com/manyapatkar974/GYM_SLOT.git
cd GYM_SLOT
```

### 2. Start PostgreSQL, MongoDB, and Redis
```bash
docker compose up -d
```

Verify containers are running:
```bash
docker compose ps
```

### 3. Initialize and Start the Backend
```bash
cd backend
npm install

# Run database schema migrations
npm run db:init

# Seed initial slots (6:00 AM - 8:00 PM)
npm run db:seed

# Start server
npm run start
```
The server will be running on `http://localhost:5000`.

### 4. Start the Frontend
In a separate terminal window:
```bash
cd frontend
npm install
npm run dev
```
The frontend will be running on `http://localhost:5173`.

---

## Concurrency Test Suite

An automated concurrency verification script is included in `backend/concurrency-test.js`.

### How to Run:
```bash
cd backend
npm run test:concurrency
```

### Test Workflow:
1. Inserts a test slot with `capacity = 10` and `booked_count = 9` (exactly 1 spot open).
2. Provisions 3 distinct test users.
3. Dispatches 3 booking requests concurrently using `Promise.all()`.
4. Asserts that:
   - Exactly **1 request** receives a `201 Created` status.
   - Exactly **2 requests** receive a `409 Conflict` (Slot Full) status.
   - The database row in PostgreSQL has `booked_count = 10` (no overbooking).
5. Cleans up the test records.

---

## Design Decisions & Trade-offs

1. **Direct `pg` Pool vs. Heavy ORM**:
   - Used the native `pg` client instead of ORMs like Prisma or TypeORM. This provides explicit, deterministic control over `BEGIN`, `SELECT ... FOR UPDATE`, and `COMMIT/ROLLBACK` lifecycle states without ORM abstraction overhead.

2. **Dual-Database Pattern (PostgreSQL + MongoDB)**:
   - PostgreSQL is reserved exclusively for transactional consistency (Users, Slots, Bookings).
   - High-throughput write events (Audit Logs) are delegated to MongoDB, preventing log writes from contending for relational database connection pool slots.

3. **Cache Invalidation over Cache-Aside with Long TTL**:
   - To keep slot counts accurate, write operations explicitly invalidate Redis keys immediately after transaction commit, ensuring subsequent reads reflect accurate capacity without waiting for TTL expiration.

---

## Scalability Considerations (100x Traffic)

To scale this system to handle 100x traffic:
1. **Load Balancing**: Deploy multiple stateless Node.js backend instances behind an Application Load Balancer (e.g., NGINX, AWS ALB).
2. **Connection Pooling**: Place a connection pooler like **PgBouncer** in front of PostgreSQL to manage thousands of concurrent client connections without exhausting database resources.
3. **Database Read Replicas**: Route `GET /api/slots` cache misses to read replicas, reserving the primary PostgreSQL instance exclusively for write transactions (`FOR UPDATE`).
4. **Distributed Redis Cluster**: Shard Redis across multiple nodes for high availability and distributed rate limiting.
