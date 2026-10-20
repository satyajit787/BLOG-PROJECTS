const express = require('express');
const {
  createBooking,
  getBookings,
  updateBooking,
  deleteBooking,
  approveBooking,
  rejectBooking
} = require('../controllers/booking.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

// protect all booking routes with jwt authentication
router.use(authMiddleware);

// routes accessible to users (with role-based checks inside controllers)
router.post('/bookings', createBooking);
router.get('/bookings', getBookings);
router.put('/bookings/:id', updateBooking);
router.delete('/bookings/:id', deleteBooking);

// admin-only routes
router.patch('/bookings/:id/approve', roleMiddleware(['admin']), approveBooking);
router.patch('/bookings/:id/reject', roleMiddleware(['admin']), rejectBooking);

module.exports = router;
