# Order System - NestJS Backend

A comprehensive order processing system built with **NestJS**, featuring idempotency, async order processing, inventory management, and payment processing with queue-based event handling.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Running the Application](#running-the-application)
7. [API Endpoints](#api-endpoints)
8. [Order Processing Flow](#order-processing-flow)
9. [Database Schema](#database-schema)
10. [Key Features](#key-features)
11. [Project Structure](#project-structure)

---

## Project Overview

The Order System is a production-ready backend service that handles end-to-end order management, including:

- **Order Creation** with idempotent request handling
- **Inventory Management** with reservation and release
- **Payment Processing** with retry logic
- **Async Processing** using Bull queue system
- **Event-Driven Architecture** for shipping and delivery workflows
- **Transactional Integrity** with database transactions

**Tech Stack:**
- NestJS 10.x
- TypeORM with PostgreSQL
- Bull Queue (Redis-backed)
- TypeScript 5.6

---

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                                │
│                    (OrdersController)                            │
└──────────────┬──────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────┐
│                      Service Layer                               │
│  ┌──────────────┬──────────────┬─────────────────────────────┐  │
│  │ OrdersService│InventoryServ │PaymentsService             │  │
│  └──────────────┴──────────────┴─────────────────────────────┘  │
└──────────────┬──────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────┐
│                    Queue Layer (Bull/Redis)                      │
│  ┌─────────────────┬──────────────────┬──────────────────────┐  │
│  │Order Processing │Order Shipping    │Dead Letter Queue     │  │
│  │Queue            │Queue             │(Error Handling)      │  │
│  └─────────────────┴──────────────────┴──────────────────────┘  │
└──────────────┬──────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────┐
│                    Data Layer (PostgreSQL)                       │
│  ┌──────────┬──────────────┬──────────┬────────────────┐        │
│  │ Orders   │ OrderItems   │Inventory │PaymentTransact.│        │
│  │          │Reservations  │Products  │IdempotencyKeys│        │
│  └──────────┴──────────────┴──────────┴────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

Before running the application, ensure you have:

- **Node.js** v20.11.0 or higher
- **npm** v10.9.7 or higher
- **PostgreSQL** v12+ running locally or accessible via network
- **Redis** running locally or accessible via network

**Verify installations:**
```bash
node --version
npm --version
psql --version
redis-cli --version
```

---

## Installation

### 1. Clone/Setup the Project

```bash
cd "Order System"
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- `@nestjs/core` - NestJS core framework
- `@nestjs/typeorm` - Database ORM
- `@nestjs/bull` - Queue management
- `typeorm` - TypeORM database toolkit
- `bull` - Redis-backed job queue
- `pg` - PostgreSQL client
- `class-validator` - DTO validation
- `class-transformer` - DTO transformation

---

## Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=order_system

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Application
NODE_ENV=development
```

### PostgreSQL Setup

If using PostgreSQL locally:

```bash
# Create the database
createdb order_system

# Or via psql
psql -U postgres -c "CREATE DATABASE order_system;"
```

**Note:** Tables will be auto-created by TypeORM with `synchronize: true` in `app.module.ts`

### Redis Setup

Start Redis server:

```bash
# If installed via Homebrew (macOS)
brew services start redis

# Or if Redis is installed globally
redis-server

# Or using Docker
docker run -d -p 6379:6379 redis:latest
```

---

## Running the Application

### Development Mode (with auto-restart)

```bash
npm run start:dev
```

### Production Mode

```bash
npm run build
npm start
```

### Expected Output

```
[Nest] 23504  - 04/20/2026, 11:47:48 AM     LOG [NestFactory] Starting Nest application...
[Nest] 23504  - 04/20/2026, 11:47:48 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized...
[Nest] 23504  - 04/20/2026, 11:47:48 AM     LOG [RoutesResolver] OrdersController {/orders}: +7ms
[Nest] 23504  - 04/20/2026, 11:47:48 AM     LOG [NestApplication] Nest application successfully started +90ms
Order system backend listening on http://localhost:3000
```

The application will:
1. Connect to PostgreSQL
2. Connect to Redis
3. Auto-create database tables
4. Seed sample products (SKU-001, SKU-002, SKU-003)
5. Start listening on `http://localhost:3000`

---

## API Endpoints

### 1. Create Order

**Endpoint:** `POST /orders`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "customerId": "CUST-12345",
  "paymentMethod": "CREDIT_CARD",
  "idempotencyKey": "unique-key-12345",
  "items": [
    {
      "productId": "<product-uuid>",
      "quantity": 2
    },
    {
      "productId": "<product-uuid>",
      "quantity": 1
    }
  ]
}
```

**Response (201):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "customerId": "CUST-12345",
  "paymentMethod": "CREDIT_CARD",
  "status": "CREATED",
  "totalAmount": 149.97,
  "items": [
    {
      "id": "item-uuid",
      "productId": "product-uuid",
      "quantity": 2,
      "unitPrice": 29.99
    }
  ],
  "idempotencyKey": "unique-key-12345",
  "createdAt": "2026-04-20T11:47:48.000Z",
  "updatedAt": "2026-04-20T11:47:48.000Z"
}
```

**Error Cases:**
- `400` - Missing idempotency key, product not found, or invalid input
- `409` - Duplicate idempotency key (already being processed)
- `500` - Database or queue errors

---

### 2. Get Order Details

**Endpoint:** `GET /orders/:id`

**Parameters:**
- `id` - Order UUID

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "customerId": "CUST-12345",
  "paymentMethod": "CREDIT_CARD",
  "status": "SHIPPED",
  "totalAmount": 149.97,
  "items": [...],
  "idempotencyKey": "unique-key-12345",
  "createdAt": "2026-04-20T11:47:48.000Z",
  "updatedAt": "2026-04-20T12:47:48.000Z"
}
```

**Status Transitions:** `CREATED` → `PAID` → `SHIPPED` → `DELIVERED`

---

### 3. Ship Order

**Endpoint:** `POST /orders/:id/ship`

**Parameters:**
- `id` - Order UUID

**Prerequisites:**
- Order status must be `PAID`

**Response (200):**
```json
{
  "id": "order-uuid",
  "status": "SHIPPED",
  "message": "Order shipped successfully"
}
```

---

### 4. Deliver Order

**Endpoint:** `POST /orders/:id/deliver`

**Parameters:**
- `id` - Order UUID

**Prerequisites:**
- Order status must be `SHIPPED`

**Response (200):**
```json
{
  "id": "order-uuid",
  "status": "DELIVERED",
  "message": "Order delivered successfully"
}
```

---

## Order Processing Flow

### Step-by-Step Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 1: CREATE ORDER (Synchronous)                                      │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. Client sends POST /orders with idempotencyKey                        │
│ 2. System validates idempotencyKey                                      │
│ 3. Compute request hash for idempotency tracking                        │
│ 4. Check if request was already processed                               │
│    - If YES (COMPLETED): Return cached response                         │
│    - If YES (PENDING): Return 409 Conflict error                        │
│    - If NO: Continue to step 5                                          │
│ 5. Start database transaction                                           │
│ 6. Create Order with status = CREATED                                   │
│ 7. For each item in the request:                                        │
│    - Verify product exists                                              │
│    - Calculate total amount (unitPrice × quantity)                      │
│    - Create OrderItem entity                                            │
│ 8. Reserve inventory for all items                                      │
│ 9. Save all changes to database                                         │
│ 10. Enqueue order for payment processing                                │
│ 11. Mark idempotencyKey as COMPLETED                                    │
│ 12. Return Order response (201 Created)                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 2: ORDER PROCESSING (Asynchronous - Bull Queue)                    │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. OrderProcessor picks up job from ORDER_PROCESSING_QUEUE              │
│ 2. Fetch order with relations (items, etc.)                             │
│ 3. Check order status (must be CREATED)                                 │
│ 4. Call PaymentsService.simulatePayment()                               │
│    - Simulate payment processing logic                                  │
│    - Return success or failure                                          │
│ 5a. If Payment SUCCESS:                                                 │
│     - Update order status to PAID                                       │
│     - Enqueue order for shipping (with 2000ms delay)                    │
│     - Log success                                                       │
│ 5b. If Payment FAILED:                                                  │
│     - Update order status to PAYMENT_FAILED                             │
│     - Release inventory reservation                                     │
│     - Send to Dead Letter Queue with failure reason                     │
│     - Log failure                                                       │
│ 6. Mark job as complete                                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 3: ORDER SHIPPING (Asynchronous - Bull Queue, Delayed)             │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. ShippingProcessor picks up job from ORDER_SHIPPING_QUEUE             │
│    (waits 2000ms after PAID status)                                     │
│ 2. Fetch order details                                                  │
│ 3. Check order status (must be PAID)                                    │
│ 4. Update order status to SHIPPED                                       │
│ 5. Log shipping information                                             │
│ 6. Mark job as complete                                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 4: MANUAL DELIVERY (Synchronous - API Call)                        │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. Client calls POST /orders/:id/deliver                                │
│ 2. Fetch order by ID                                                    │
│ 3. Validate order status (must be SHIPPED)                              │
│ 4. Update order status to DELIVERED                                     │
│ 5. Return updated order (200 OK)                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Timeline Example

```
Time    Event
─────────────────────────────────────────────────────────
T+0s    Client POST /orders → Order created (status: CREATED)
        ↓ Enqueued to ORDER_PROCESSING_QUEUE

T+0.5s  OrderProcessor processes payment → Status: PAID
        ↓ Enqueued to ORDER_SHIPPING_QUEUE with 2000ms delay

T+2.5s  ShippingProcessor executes → Status: SHIPPED
        ↓ Awaiting manual delivery via API

T+30s   Client POST /orders/:id/deliver → Status: DELIVERED
```

---

## Database Schema

### Tables Created Automatically

#### 1. **orders**
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  customerId VARCHAR(64),
  paymentMethod VARCHAR(64),
  status VARCHAR(24),
  totalAmount NUMERIC(12, 2),
  idempotencyKey VARCHAR(128),
  createdAt TIMESTAMP WITH TIME ZONE,
  updatedAt TIMESTAMP WITH TIME ZONE
);
```

#### 2. **order_items**
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  orderId UUID REFERENCES orders(id),
  productId VARCHAR(64),
  quantity INTEGER,
  unitPrice NUMERIC(12, 2)
);
```

#### 3. **products**
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  sku VARCHAR(64) UNIQUE,
  name VARCHAR(128),
  price NUMERIC(12, 2),
  totalStock INTEGER,
  availableStock INTEGER,
  version INTEGER
);
```

#### 4. **inventory_reservations**
```sql
CREATE TABLE inventory_reservations (
  id UUID PRIMARY KEY,
  orderId UUID REFERENCES orders(id),
  productId VARCHAR(64),
  quantity INTEGER,
  status VARCHAR(16)
);
```

#### 5. **payment_transactions**
```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY,
  orderId UUID REFERENCES orders(id),
  status VARCHAR(24),
  attempts INTEGER,
  failureReason TEXT,
  createdAt TIMESTAMP WITH TIME ZONE
);
```

#### 6. **idempotency_keys**
```sql
CREATE TABLE idempotency_keys (
  key VARCHAR(128) PRIMARY KEY,
  requestHash VARCHAR(128),
  responseData TEXT,
  status VARCHAR(16),
  createdAt TIMESTAMP WITH TIME ZONE
);
```

---

## Key Features

### 1. **Idempotency**
- Every order creation request must include a unique `idempotencyKey`
- Same idempotency key returns the same response (idempotent)
- Prevents duplicate orders from network retries
- Stores response data in `idempotency_keys` table

### 2. **Inventory Management**
- Reserves inventory when order is created
- Tracks reservation status (RESERVED/RELEASED)
- Releases inventory on payment failure
- Prevents overselling with version control

### 3. **Asynchronous Processing**
- Uses Bull queue with Redis backend
- Three separate queues:
  - `ORDER_PROCESSING_QUEUE` - Payment processing
  - `ORDER_SHIPPING_QUEUE` - Shipping operations (delayed)
  - `ORDER_DLQ_QUEUE` - Dead letter (failed jobs)

### 4. **Payment Processing**
- Simulated payment logic in PaymentsService
- Retry mechanism through queue system
- Tracks payment attempts and failure reasons
- Automatic rollback on payment failure

### 5. **Transaction Management**
- Database transactions for data consistency
- TypeORM QueryRunner for complex operations
- Automatic rollback on error

### 6. **Error Handling**
- Dead Letter Queue for failed jobs
- Comprehensive error messages
- Validation of inputs with class-validator
- HTTP error codes (400, 409, 500)

---

## Project Structure

```
src/
├── app.module.ts                    # Root module
├── app.service.ts                   # App initialization
├── main.ts                          # Application entry point
│
├── common/                          # Shared utilities
│   ├── common.module.ts
│   ├── entities/
│   │   └── idempotency-key.entity.ts
│   ├── enums/
│   │   └── order-status.enum.ts
│   └── services/
│       └── idempotency.service.ts
│
├── orders/                          # Order management
│   ├── orders.controller.ts         # API endpoints
│   ├── orders.service.ts            # Business logic
│   ├── orders.module.ts
│   ├── dto/
│   │   └── create-order.dto.ts
│   └── entities/
│       ├── order.entity.ts
│       └── order-item.entity.ts
│
├── inventory/                       # Inventory management
│   ├── inventory.service.ts
│   ├── inventory.module.ts
│   └── entities/
│       ├── product.entity.ts
│       └── inventory-reservation.entity.ts
│
├── payments/                        # Payment processing
│   ├── payments.service.ts
│   ├── payments.module.ts
│   └── entities/
│       └── payment-transaction.entity.ts
│
└── queue/                           # Job queue management
    ├── queue.service.ts
    ├── queue.module.ts
    ├── queue.constants.ts
    ├── order.processor.ts           # Order processing logic
    └── shipping.processor.ts        # Shipping logic
```

---

## Common Workflows

### Test the Complete Order Flow

1. **Get Product IDs** (from database):
```bash
# Connect to PostgreSQL
psql -U postgres -d order_system -c "SELECT id, sku, name FROM products;"
```

2. **Create an Order**:
```bash
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUST-001",
    "paymentMethod": "CREDIT_CARD",
    "idempotencyKey": "order-key-001",
    "items": [
      {
        "productId": "<product-uuid-from-step-1>",
        "quantity": 2
      }
    ]
  }'
```

3. **Check Order Status** (wait 2-3 seconds):
```bash
curl http://localhost:3000/orders/<order-id>
```
Status should be `PAID` (payment processing completed)

4. **Ship Order** (wait for automatic shipping, then manually):
```bash
curl -X POST http://localhost:3000/orders/<order-id>/ship
```

5. **Deliver Order**:
```bash
curl -X POST http://localhost:3000/orders/<order-id>/deliver
```

---

## Troubleshooting

### Application won't start
- **Issue:** "Cannot connect to PostgreSQL"
  - **Solution:** Ensure PostgreSQL is running and DB_HOST/DB_PORT are correct

- **Issue:** "Cannot connect to Redis"
  - **Solution:** Ensure Redis is running and REDIS_HOST/REDIS_PORT are correct

### Orders stuck in CREATED status
- **Issue:** Payment processing not completing
  - **Solution:** Check Bull queue jobs: `redis-cli`
  - Command: `llen bull:ORDER_PROCESSING_QUEUE:*`

### Duplicate order error
- **Issue:** 409 Conflict on order creation
  - **Solution:** Use a unique idempotencyKey for each order request

---

## Next Steps & Enhancements

- [ ] Add authentication and authorization
- [ ] Implement real payment gateway integration
- [ ] Add order cancellation workflow
- [ ] Implement email notifications
- [ ] Add order history and tracking
- [ ] Implement rate limiting
- [ ] Add comprehensive logging and monitoring
- [ ] Set up CI/CD pipeline

---

## License

This project is part of POC (Proof of Concept) development.

---

## Support

For issues or questions, please refer to the NestJS documentation:
- [NestJS Docs](https://docs.nestjs.com)
- [TypeORM Docs](https://typeorm.io)
- [Bull Queue Docs](https://github.com/OptimalBits/bull)
