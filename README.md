# L1: Secure Authentication & Role-Based Access Control with a Service Booking System

## Project Overview
This project implements a secure authentication and authorization system using JSON Web Tokens (JWT) along with a role-based service booking management system built with Node.js, Express, and MongoDB (Mongoose).

It provides user registration, login, token refresh mechanism, and role-based access control (RBAC) separating regular **Users** from **Admins**. Users can book and manage their own service appointments (with business rules preventing edits after approval), while Admins have full access to view, approve, reject, and delete any booking.

---

## Features
- **User Authentication**:
  - Secure registration (`POST /signup`) with password hashing via `bcrypt`.
  - Login (`POST /login`) generating short-lived access tokens (15 minutes) and long-lived refresh tokens (7 days).
  - Refresh token rotation (`POST /refresh`) to generate fresh access tokens without requiring re-login.
  - Default role assigned as `"user"` unless explicitly specified as `"admin"`.
- **Role-Based Access Control (RBAC)**:
  - Custom JWT verification middleware (`auth.middleware.js`).
  - Role validation middleware (`role.middleware.js`).
  - Strict route guarding ensuring unauthorized users cannot access admin endpoints.
- **Service Booking System (CRUD & Business Logic)**:
  - Create service appointments (e.g., plumbing, car repair, cleaning) with default status `"pending"`.
  - Regular users can view, update, and cancel **only their own bookings**.
  - **Business Rules Enforced**: Users can update or cancel bookings **only while status is "pending"**. Once approved or rejected by an admin, user modifications are strictly rejected with HTTP `400 Bad Request`.
  - Admins can view all bookings (with populated user info), approve (`PATCH /bookings/:id/approve`), reject (`PATCH /bookings/:id/reject`), or delete any booking (`DELETE /bookings/:id`).

---

## Project Structure
The codebase follows standard MVC architecture, segregating models, controllers, routes, middlewares, and configuration:

```
service-booking-rbac/
├── config/
│   └── db.js                 # MongoDB connection configuration
├── controllers/
│   ├── auth.controller.js    # Authentication & token refresh logic
│   └── booking.controller.js # Service booking CRUD & RBAC business logic
├── middlewares/
│   ├── auth.middleware.js    # JWT verification & user authentication
│   └── role.middleware.js    # Role-based access control (RBAC) guard
├── models/
│   ├── User.model.js         # User schema (username, email, password, role)
│   ├── Booking.model.js      # Booking schema (serviceName, requestedDateTime, status, userId)
│   └── Blacklist.model.js    # Token blacklist model for session invalidation
├── routes/
│   ├── auth.routes.js        # Auth endpoints (/signup, /login, /refresh)
│   └── booking.routes.js     # Protected booking endpoints
├── api.test.js               # Comprehensive automated test suite (20 unit/integration tests)
├── postman_collection.json   # Ready-to-import Postman collection
├── index.js                  # Main Express application entrypoint
├── package.json              # Project dependencies & scripts
├── .env                      # Environment variables
├── .env.example              # Sample environment template
└── README.md                 # Project documentation
```

---

## Installation & Setup

### 1. Clone or Open Project Directory
```bash
cd service-booking-rbac
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory (or use `.env.example`):
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/service_booking_db
JWT_SECRET=super_secret_access_jwt_key_2026
JWT_REFRESH_SECRET=super_secret_refresh_jwt_key_2026
```

### 4. Start the Application
- **Production mode:**
  ```bash
  npm start
  ```
- **Development mode (with auto-reload):**
  ```bash
  npm run dev
  ```

### 5. Run Automated Tests
The project includes 20 automated tests verifying authentication, token refresh, RBAC protection, and business rules:
```bash
npm test
```

---

## API Documentation

### Authentication Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/signup` | Public | Register new user (default role: `"user"`) |
| `POST` | `/login` | Public | Authenticate user & return `accessToken` (15m) + `refreshToken` (7d) |
| `POST` | `/refresh` | Public | Issue fresh access token using a valid refresh token |

#### Example: `POST /signup`
Request Body:
```json
{
  "username": "kavish_patel",
  "email": "kavish@example.com",
  "password": "Password@123",
  "role": "user"
}
```
Response (`201 Created`):
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "6724fa10b...",
    "username": "kavish_patel",
    "email": "kavish@example.com",
    "role": "user"
  }
}
```

#### Example: `POST /login`
Request Body:
```json
{
  "email": "kavish@example.com",
  "password": "Password@123"
}
```
Response (`200 OK`):
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "user": {
    "id": "6724fa10b...",
    "username": "kavish_patel",
    "email": "kavish@example.com",
    "role": "user"
  }
}
```

#### Example: `POST /refresh`
Request Body:
```json
{
  "refreshToken": "eyJhbGciOi..."
}
```
Response (`200 OK`):
```json
{
  "message": "Access token refreshed successfully",
  "accessToken": "eyJhbGciOi..."
}
```

---

### Service Booking Endpoints (Protected with JWT)

All booking endpoints require the header:
```
Authorization: Bearer <accessToken>
```

| Method | Endpoint | Allowed Role | Description & Business Rules |
| :--- | :--- | :--- | :--- |
| `POST` | `/bookings` | `user`, `admin` | Create a new service booking (status default: `"pending"`) |
| `GET` | `/bookings` | `user`, `admin` | Users view their own bookings; Admins view all bookings |
| `PUT` | `/bookings/:id` | `user` | Update booking details (**only if status is "pending"**) |
| `DELETE` | `/bookings/:id` | `user`, `admin` | Users cancel their own booking (**only if pending**); Admins delete any booking |
| `PATCH` | `/bookings/:id/approve` | `admin` | Admin approves a booking (status becomes `"approved"`) |
| `PATCH` | `/bookings/:id/reject` | `admin` | Admin rejects a booking (status becomes `"rejected"`) |

#### Example: `POST /bookings`
Request Body:
```json
{
  "serviceName": "Car Repair",
  "requestedDateTime": "2026-11-15T10:00:00Z"
}
```
Response (`201 Created`):
```json
{
  "message": "Booking created successfully",
  "booking": {
    "_id": "6724fb23c...",
    "serviceName": "Car Repair",
    "requestedDateTime": "2026-11-15T10:00:00.000Z",
    "status": "pending",
    "userId": "6724fa10b...",
    "createdAt": "2026-10-20T12:00:00.000Z"
  }
}
```

#### Example: `PUT /bookings/:id` (Update Booking)
Request Body:
```json
{
  "serviceName": "Car Repair & Engine Tuning",
  "requestedDateTime": "2026-11-16T14:00:00Z"
}
```
*Note: If the booking is already approved or rejected, the API responds with `400 Bad Request`:*
```json
{
  "message": "Cannot update booking: Only pending bookings can be modified"
}
```

#### Example: `PATCH /bookings/:id/approve` (Admin Only)
Response (`200 OK`):
```json
{
  "message": "Booking approved successfully",
  "booking": {
    "_id": "6724fb23c...",
    "status": "approved"
  }
}
```
*If a normal user attempts this route, the API responds with `403 Forbidden`:*
```json
{
  "message": "Access denied: You do not have permission for this resource"
}
```

---

## Testing with Postman
Import the file `postman_collection.json` into Postman to run tests interactively.
The collection includes pre-configured requests for signup, login, refresh tokens, booking creation, role checks, and admin approvals.
