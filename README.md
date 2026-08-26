# Gym Slot Booking System

A full-stack Gym Slot Booking System built with React, Node.js, Express, PostgreSQL, MongoDB, and Redis. It enforces strict concurrency to prevent slot overbooking.

## Tech Stack
- **Frontend**: React (Vite), TailwindCSS
- **Backend**: Node.js, Express.js
- **Databases**: PostgreSQL (Transactional data), MongoDB (Activity Logs), Redis (Caching & Rate Limiting)
- **Infrastructure**: Docker Compose

## Concurrency Strategy
The most critical part of this application is ensuring that a slot with a capacity of 10 cannot be overbooked, even under heavy concurrent load. This is achieved using **PostgreSQL Row-Level Locking**.

When a booking request comes in, a transaction is started:
```sql
BEGIN;
SELECT capacity, booked_count FROM slots WHERE id = $1 FOR UPDATE;
-- Insert booking and update count if capacity allows
COMMIT;
```
The `FOR UPDATE` lock forces concurrent transactions targeting the same slot to wait until the first transaction commits or rolls back. This serializes updates for a given slot, completely eliminating race conditions.

## Setup Instructions

### 1. Start Infrastructure
Run the following to start PostgreSQL, MongoDB, and Redis:
```bash
docker compose up -d
```

### 2. Backend Setup
```bash
cd backend
npm install
npm run db:init
npm run db:seed
npm run start
```
The backend will run on `http://localhost:5000`.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will run on `http://localhost:5173`.

### 4. Concurrency Test
To prove that the concurrency locking works, a test script is provided. It creates a slot with 9/10 bookings and sends 3 simultaneous booking requests.
```bash
cd backend
npm run test:concurrency
```
**Expected Output:** One success, two "Slot is full" conflicts. Final capacity is exactly 10.

## Environment Variables (.env)
- `PORT=5000`
- `POSTGRES_USER=gym_user`
- `POSTGRES_PASSWORD=gym_password`
- `POSTGRES_DB=gym_db`
- `POSTGRES_HOST=localhost`
- `POSTGRES_PORT=5432`
- `MONGO_URI=mongodb://mongo_user:mongo_password@localhost:27017/gym_logs?authSource=admin`
- `REDIS_URL=redis://localhost:6379`
- `JWT_SECRET=super_secret_jwt_key_123`

## API Documentation
- `POST /api/auth/register`: Register user
- `POST /api/auth/login`: Login user
- `GET /api/slots`: Get all slots (Redis Cached)
- `GET /api/slots/:id`: Get slot by ID
- `POST /api/bookings`: Book a slot (Rate limited, locked via PG transaction)
- `GET /api/bookings/my`: List user's bookings
- `DELETE /api/bookings/:id`: Cancel a booking

## Trade-offs
- Used `pg` pool directly instead of an ORM like Prisma or Sequelize to have precise, raw control over `FOR UPDATE` transaction locks.
- MongoDB is used for fire-and-forget activity logs so it does not block the critical PostgreSQL transaction path.
