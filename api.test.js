const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('./index');

jest.setTimeout(60000);

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('L1: Secure Authentication & Role-Based Access Control Booking System Tests', () => {
  let userToken;
  let userRefreshToken;
  let adminToken;
  let bookingId;
  let cancelBookingId;
  let adminDeleteBookingId;

  // 1. Authentication Tests
  describe('Authentication Routes', () => {
    test('POST /signup - should register a new user with default role "user"', async () => {
      const res = await request(app)
        .post('/signup')
        .send({
          username: 'rahul_sharma',
          email: 'rahul@example.com',
          password: 'Password@123'
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe('user');
      expect(res.body.user.password).toBeUndefined(); // password should never be returned
    });

    test('POST /signup - should register an admin when role is explicitly "admin"', async () => {
      const res = await request(app)
        .post('/signup')
        .send({
          username: 'admin_boss',
          email: 'admin@example.com',
          password: 'AdminPassword@123',
          role: 'admin'
        });

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe('admin');
    });

    test('POST /signup - should fail when registering with an existing email', async () => {
      const res = await request(app)
        .post('/signup')
        .send({
          username: 'rahul_duplicate',
          email: 'rahul@example.com',
          password: 'Password@123'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already exists/i);
    });

    test('POST /login - should authenticate user and return access & refresh tokens', async () => {
      const res = await request(app)
        .post('/login')
        .send({
          email: 'rahul@example.com',
          password: 'Password@123'
        });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      userToken = res.body.accessToken;
      userRefreshToken = res.body.refreshToken;
    });

    test('POST /login - should fail with wrong password', async () => {
      const res = await request(app)
        .post('/login')
        .send({
          email: 'rahul@example.com',
          password: 'WrongPassword'
        });

      expect(res.status).toBe(401);
    });

    test('POST /login - should authenticate admin and return tokens', async () => {
      const res = await request(app)
        .post('/login')
        .send({
          email: 'admin@example.com',
          password: 'AdminPassword@123'
        });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      adminToken = res.body.accessToken;
    });

    test('POST /refresh - should generate new access token using valid refresh token', async () => {
      const res = await request(app)
        .post('/refresh')
        .send({
          refreshToken: userRefreshToken
        });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
    });

    test('POST /refresh - should fail with invalid refresh token', async () => {
      const res = await request(app)
        .post('/refresh')
        .send({
          refreshToken: 'invalid_token_sample'
        });

      expect(res.status).toBe(401);
    });
  });

  // 2. Service Booking Tests
  describe('Service Booking Routes & RBAC Business Logic', () => {
    test('POST /bookings - should fail without authentication token', async () => {
      const res = await request(app)
        .post('/bookings')
        .send({
          serviceName: 'Plumbing Service',
          requestedDateTime: '2026-11-10T14:00:00Z'
        });

      expect(res.status).toBe(401);
    });

    test('POST /bookings - user can create a booking with status "pending"', async () => {
      const res = await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          serviceName: 'Plumbing Repair',
          requestedDateTime: '2026-11-10T14:00:00Z'
        });

      expect(res.status).toBe(201);
      expect(res.body.booking).toBeDefined();
      expect(res.body.booking.status).toBe('pending');
      bookingId = res.body.booking._id;
    });

    test('GET /bookings - user can view only their own bookings', async () => {
      const res = await request(app)
        .get('/bookings')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.bookings)).toBe(true);
      expect(res.body.bookings.length).toBe(1);
      expect(res.body.bookings[0]._id).toBe(bookingId);
    });

    test('PUT /bookings/:id - user can update their own booking when pending', async () => {
      const res = await request(app)
        .put(`/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          serviceName: 'Plumbing & Pipe Repair'
        });

      expect(res.status).toBe(200);
      expect(res.body.booking.serviceName).toBe('Plumbing & Pipe Repair');
    });

    test('GET /bookings - admin can view all bookings', async () => {
      const res = await request(app)
        .get('/bookings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.bookings.length).toBeGreaterThanOrEqual(1);
      expect(res.body.bookings[0].userId).toBeDefined();
    });

    test('PATCH /bookings/:id/approve - normal user CANNOT approve a booking (RBAC check)', async () => {
      const res = await request(app)
        .patch(`/bookings/${bookingId}/approve`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    test('PATCH /bookings/:id/approve - admin can approve any booking', async () => {
      const res = await request(app)
        .patch(`/bookings/${bookingId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.booking.status).toBe('approved');
    });

    test('PUT /bookings/:id - user CANNOT update a booking once it is approved', async () => {
      const res = await request(app)
        .put(`/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          serviceName: 'Attempt to change after approval'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/pending/i);
    });

    test('DELETE /bookings/:id - user CANNOT cancel a booking once it is approved', async () => {
      const res = await request(app)
        .delete(`/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/pending/i);
    });

    test('DELETE /bookings/:id - user can cancel their own booking when pending', async () => {
      // create another booking to test user cancellation
      const createRes = await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          serviceName: 'Car Repair',
          requestedDateTime: '2026-11-15T10:00:00Z'
        });

      cancelBookingId = createRes.body.booking._id;

      const deleteRes = await request(app)
        .delete(`/bookings/${cancelBookingId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.booking.status).toBe('cancelled');
    });

    test('DELETE /bookings/:id - admin can delete any booking from database', async () => {
      // create a third booking for admin deletion test
      const createRes = await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          serviceName: 'Cleaning Service',
          requestedDateTime: '2026-11-20T09:00:00Z'
        });

      adminDeleteBookingId = createRes.body.booking._id;

      const deleteRes = await request(app)
        .delete(`/bookings/${adminDeleteBookingId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toMatch(/deleted/i);
    });

    test('PATCH /bookings/:id/reject - admin can reject a booking', async () => {
      // create another booking to test admin rejection
      const createRes = await request(app)
        .post('/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          serviceName: 'AC Maintenance',
          requestedDateTime: '2026-11-25T11:00:00Z'
        });

      const rejectBookingId = createRes.body.booking._id;

      const rejectRes = await request(app)
        .patch(`/bookings/${rejectBookingId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.booking.status).toBe('rejected');
    });
  });
});
