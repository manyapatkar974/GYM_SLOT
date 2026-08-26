# 🏋️ FitSlot — High-Concurrency Gym Slot Booking System

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-v4-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-v18-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

A production-grade, full-stack **Gym Slot Booking System** engineered from scratch to guarantee strict concurrency safety and zero-overbooking under heavy simultaneous booking requests.

---

## 📑 Table of Contents
1. [System Overview](#-system-overview)
2. [Key Features](#-key-features)
3. [Architecture & Technology Stack](#-architecture--technology-stack)
4. [Critical Concurrency Strategy](#-critical-concurrency-strategy)
5. [Database Design](#-database-design)
6. [API Specification](#-api-specification)
7. [Installation & Setup](#-installation--setup)
8. [Running the Concurrency Test](#-running-the-concurrency-test)
9. [Caching & Activity Logging Strategy](#-caching--activity-logging-strategy)
10. [High Availability & Scalability (100x Traffic)](#-high-availability--scalability-100x-traffic)
11. [Design Trade-offs & Future Scope](#-design-trade-offs--future-scope)

---

## 🎯 System Overview

FitSlot provides real-time gym slot discovery, remaining capacity tracking, and slot reservations. Each gym slot has a fixed maximum capacity of **10 participants**.

### The Concurrency Problem:
When a slot has 1 spot remaining and multiple users attempt to book at the exact same millisecond:
- ❌ **Naive Implementations**: Suffer from *Read-Check-Write race conditions*, resulting in `booked_count > capacity` (overbooking).
- ✅ **FitSlot Implementation**: Uses **PostgreSQL Row-Level Locking (`SELECT ... FOR UPDATE`)** inside an atomic transaction to serialize write attempts, ensuring **exactly 1** booking succeeds, all other simultaneous requests are rejected with `HTTP 409 Conflict`, and capacity never exceeds 10.

---

## ✨ Key Features

- **Authentication & Security**: Secure user registration and login with bcrypt password hashing and JWT token issuance.
- **Real-Time Slot Discovery**: View session timings, live participant count, and visual capacity progress meters.
- **Concurrency-Safe Booking**: Atomic database transactions that guarantee capacity limits under extreme load.
- **One-Click Cancellation**: Release booked spots and safely restore slot capacity in real-time.
- **My Bookings Dashboard**: Chronological booking history with active/cancelled status badges.
- **Multi-Tier Caching**: High-frequency slot reads cached in Redis with instant cache invalidation on mutations.
- **Asynchronous Audit Logging**: Non-transactional activity logs streamed to MongoDB (`REGISTER`, `LOGIN`, `BOOK_SLOT`, `CANCEL_BOOKING`).
- **Rate Limiting**: Redis-backed write rate limiting to prevent spam and DDoS attempts.
- **Modern UI**: Light Purple/Lavender aesthetic built with Tailwind CSS, featuring split-screen auth and responsive layouts.

---

## 🏗 Architecture & Technology Stack

```
                                  +-------------------+
                                  |   React.js Client  |
                                  |  (Vite + Tailwind)|
                                  +---------+---------+
                                            |
                                       HTTP / REST
                                            |
                                  +---------v---------+
                                  |  Express.js Server|
                                  |  (Node.js Backend)|
                                  +---+-------+-----+--+
                                      |       |     |
                 +--------------------+       |     +--------------------+
                 | (Cache & RateLimit)|       | (ACID Transactions)      | (Audit Logs)
                 v                            v                          v
       +-------------------+       +-------------------+       +-------------------+
       |    Redis Cache    |       |    PostgreSQL     |       |      MongoDB      |
       |  (slots:all / TTL)|       | (Primary Truth DB)|       |  (Activity Logs)  |
       +-------------------+       +-------------------+       +-------------------+
```

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18 (Vite), Tailwind CSS, Axios | User interface, auth state, responsive dashboard |
| **Backend API** | Node.js, Express.js | REST APIs, authentication middleware, business logic |
| **Primary Database** | PostgreSQL 15 | Strict ACID storage for Users, Slots, and Bookings |
| **Secondary Database**| MongoDB 6 (Mongoose) | High-throughput write-heavy activity and audit logs |
| **In-Memory Cache** | Redis 7 | Sub-millisecond slot queries & API rate limiting |
| **Containerization** | Docker, Docker Compose | Multi-container isolated environment setup |

---

## 🔒 Critical Concurrency Strategy

### The Race Condition Scenario
Assume Slot #1 has `capacity = 10` and `booked_count = 9` (1 spot remaining). 3 concurrent requests (User A, User B, User C) arrive simultaneously.

```
Request A (t=0) ---> Read: booked_count=9 (Pass) ---> Write: booked_count=10 (OK)
Request B (t=0) ---> Read: booked_count=9 (Pass) ---> Write: booked_count=11 (OVERBOOKED!)
Request C (t=0) ---> Read: booked_count=9 (Pass) ---> Write: booked_count=12 (OVERBOOKED!)
```

### The Solution: Row-Level Locking (`FOR UPDATE`)
FitSlot utilizes PostgreSQL's row-level lock within an explicit transaction:

```sql
BEGIN;

-- 1. Lock the specific slot row exclusively
SELECT capacity, booked_count 
FROM slots 
WHERE id = $1 
FOR UPDATE;

-- 2. Evaluate capacity in application logic
-- If booked_count >= capacity => ROLLBACK and return HTTP 409

-- 3. Create booking record
INSERT INTO bookings (user_id, slot_id, status) 
VALUES ($2, $1, 'ACTIVE');

-- 4. Increment booked count safely
UPDATE slots 
SET booked_count = booked_count + 1 
WHERE id = $1;

COMMIT;
```

### Why this guarantees correctness:
1. When Request A executes `SELECT ... FOR UPDATE`, it places an exclusive lock on that slot's row.
2. Requests B and C are forced into a blocked state at the database level until Request A completes (`COMMIT` or `ROLLBACK`).
3. When Request A commits, Request B unblocks, reads the freshly updated `booked_count = 10`, fails the capacity check, and rolls back with `HTTP 409 Conflict`.
4. Request C follows, also reading `booked_count = 10`, and fails cleanly.
5. **Partial Unique Index**: A unique index on `(user_id, slot_id) WHERE status = 'ACTIVE'` guarantees a single user cannot hold duplicate active bookings for the same slot.

---

## 🗄 Database Design

### PostgreSQL Schema (Relational Source of Truth)

```sql
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Slots Table
CREATE TABLE slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INT DEFAULT 10,
  booked_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings Table
CREATE TYPE booking_status AS ENUM ('ACTIVE', 'CANCELLED');

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES slots(id) ON DELETE CASCADE,
  status booking_status DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes & Constraints
CREATE UNIQUE INDEX unique_active_booking 
ON bookings (user_id, slot_id) 
WHERE status = 'ACTIVE';
```

### MongoDB Schema (Audit & Activity Logs)

```javascript
{
  "_id": ObjectId("..."),
  "userId": "uuid-of-user",
  "action": "BOOK_SLOT", // REGISTER | LOGIN | BOOK_SLOT | CANCEL_BOOKING
  "slotId": "uuid-of-slot",
  "bookingId": "uuid-of-booking",
  "timestamp": ISODate("2026-08-26T10:00:00Z"),
  "metadata": {}
}
```

---

## 📡 API Specification

### Authentication Endpoints
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user (name, email, password) | No |
| `POST` | `/api/auth/login` | Authenticate credentials & return JWT | No |

### Slot Endpoints
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/slots` | List all slots (Redis cached, 60s TTL) | No |
| `GET` | `/api/slots/:id` | Get slot details by ID | No |

### Booking Endpoints
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/bookings` | Book slot (Rate-limited, Row-Level Locked) | **Yes (Bearer JWT)** |
| `GET` | `/api/bookings/my` | Retrieve active & past bookings of logged-in user | **Yes (Bearer JWT)** |
| `DELETE`| `/api/bookings/:id` | Cancel active booking & release spot | **Yes (Bearer JWT)** |

### Health Check
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status |

---

## 🚀 Installation & Setup

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (with WSL 2 enabled on Windows)
- [Node.js (v18+)](https://nodejs.org/)

### 1. Clone the Repository
```bash
git clone https://github.com/manyapatkar974/GYM_SLOT.git
cd GYM_SLOT
```

### 2. Start Infrastructure via Docker Compose
Starts PostgreSQL (Port 5432), MongoDB (Port 27017), and Redis (Port 6379):
```bash
docker compose up -d
```

### 3. Backend Setup
```bash
cd backend
npm install

# Initialize PostgreSQL tables and indexes
npm run db:init

# Seed initial gym slots (6:00 AM to 8:00 PM)
npm run db:seed

# Start the API server
npm run start
```
*API runs on `http://localhost:5000`.*

### 4. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*React app will open at `http://localhost:5173`.*

---

## 🧪 Running the Concurrency Test

FitSlot includes an automated test to empirically prove the row-locking mechanism eliminates race conditions.

```bash
cd backend
npm run test:concurrency
```

### What this test does:
1. Creates a temporary slot with `capacity = 10` and `booked_count = 9` (only 1 remaining spot).
2. Spawns 3 unique users (`User A`, `User B`, `User C`).
3. Sends 3 concurrent booking requests using `Promise.all()`.
4. **Verifies assertions:**
   - Exactly **1 request** receives `SUCCESS`.
   - Exactly **2 requests** receive `FAILED: FULL` (HTTP 409).
   - Final PostgreSQL slot record has `booked_count = 10` and `available = 0`.

---

## ⚡ Caching & Activity Logging Strategy

### Redis Cache Invalidation
- High-frequency query `GET /api/slots` is cached in Redis under key `slots:all` with a 60-second TTL.
- Whenever a booking or cancellation transaction succeeds, the cache keys `slots:all` and `slots:{slotId}` are invalidated immediately (`DEL`).
- **Resilience**: Redis is strictly a cache. If Redis experiences downtime, the application falls back to querying PostgreSQL directly, maintaining consistency.

### MongoDB Activity Logging
- All state changes (`REGISTER`, `LOGIN`, `BOOK_SLOT`, `CANCEL_BOOKING`) are recorded asynchronously in MongoDB.
- Keeps audit logging decoupled from PostgreSQL transactions, avoiding latency penalties on critical booking paths.

---

## 📈 High Availability & Scalability (100x Traffic)

To scale this architecture to handle hundreds of thousands of concurrent users:

```
                          +-------------------+
                          |  Cloudflare CDN   | (DDoS protection, Static assets)
                          +---------+---------+
                                    |
                          +---------v---------+
                          |   Load Balancer   | (NGINX / AWS ALB)
                          +----+----+----+----+
                               |    |    |
        +----------------------+    |    +----------------------+
        |                           |                           |
+-------v-------+           +-------v-------+           +-------v-------+
| Node Instance |           | Node Instance |           | Node Instance |
+-------+-------+           +-------+-------+           +-------+-------+
        |                           |                           |
        +-------------------+-------+-------+-------------------+
                            |               |
                    +-------v-------+       |
                    | Redis Cluster |       |
                    +---------------+       |
                                            |
        +-----------------------------------+-------------------+
        | (Write Traffic)                                       | (Read Traffic)
+-------v-------+                                       +-------v-------+
|  PostgreSQL   |                                       |  PostgreSQL   |
| Primary Node  +-----------------Replication-----------> Read Replicas |
+---------------+                                       +---------------+
```

1. **Horizontal API Scaling**: Stateless Express instances behind an Application Load Balancer.
2. **Database Read Replicas**: Route `GET /api/slots` queries to read replicas while directing write transactions (`FOR UPDATE`) exclusively to the Primary node.
3. **Connection Pooling**: Use **PgBouncer** to pool database connections across multiple backend instances.
4. **Redis Distributed Locks**: For cross-microservice synchronization where needed.

---

## ⚖️ Design Trade-offs & Future Scope

### Key Architectural Decisions:
- **Raw SQL Pool over ORM**: We intentionally used the `pg` client instead of heavy ORMs (Prisma, TypeORM) to have direct, explicit control over `BEGIN`, `SELECT ... FOR UPDATE`, and `COMMIT/ROLLBACK` lifecycle hooks.
- **Dual Database Strategy**: PostgreSQL guarantees ACID integrity for bookings, while MongoDB provides flexible schema storage for high-volume logs.

### Future Improvements:
- [ ] Implement WebSocket / Server-Sent Events (SSE) for live slot availability updates.
- [ ] Add Waitlist queue mechanism using Redis Streams.
- [ ] Email notifications upon booking confirmation and cancellations.
