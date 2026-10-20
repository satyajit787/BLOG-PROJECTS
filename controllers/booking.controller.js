const Booking = require('../models/Booking.model');

// POST /bookings - create a new service booking (default status: pending)
const createBooking = async (req, res) => {
  try {
    const { serviceName, requestedDateTime, requestedDate, requestedTime } = req.body;

    if (!serviceName) {
      return res.status(400).json({ message: 'Service name is required' });
    }

    // support requestedDateTime directly or combined date & time
    const dateTimeInput = requestedDateTime || (requestedDate ? (requestedTime ? `${requestedDate}T${requestedTime}` : requestedDate) : null);

    if (!dateTimeInput) {
      return res.status(400).json({ message: 'Requested date and time are required' });
    }

    const parsedDate = new Date(dateTimeInput);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date/time format' });
    }

    const newBooking = new Booking({
      serviceName: serviceName.trim(),
      requestedDateTime: parsedDate,
      status: 'pending',
      userId: req.user._id
    });

    await newBooking.save();

    res.status(201).json({
      message: 'Booking created successfully',
      booking: newBooking
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating booking', error: error.message });
  }
};

// GET /bookings - users view their own bookings, admins view all bookings
const getBookings = async (req, res) => {
  try {
    let bookings;

    // role-based filtering: admins see all bookings, users see only their own
    if (req.user.role === 'admin') {
      bookings = await Booking.find()
        .populate('userId', 'username email role')
        .sort({ createdAt: -1 });
    } else {
      bookings = await Booking.find({ userId: req.user._id })
        .sort({ createdAt: -1 });
    }

    res.status(200).json({
      message: 'Bookings fetched successfully',
      count: bookings.length,
      bookings
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching bookings', error: error.message });
  }
};

// PUT /bookings/:id - users can update their bookings only if status is pending
const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceName, requestedDateTime, requestedDate, requestedTime } = req.body;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // check if booking belongs to logged in user (admins can also edit, but users only own)
    if (req.user.role !== 'admin' && booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied: You can only update your own bookings' });
    }

    // business logic: only pending bookings can be updated
    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot update booking: Only pending bookings can be modified' });
    }

    if (serviceName) {
      booking.serviceName = serviceName.trim();
    }

    const dateTimeInput = requestedDateTime || (requestedDate ? (requestedTime ? `${requestedDate}T${requestedTime}` : requestedDate) : null);
    if (dateTimeInput) {
      const parsedDate = new Date(dateTimeInput);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date/time format' });
      }
      booking.requestedDateTime = parsedDate;
    }

    await booking.save();

    res.status(200).json({
      message: 'Booking updated successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating booking', error: error.message });
  }
};

// DELETE /bookings/:id - users cancel their own booking (if pending), admins delete any booking
const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // if admin, permanently delete the booking
    if (req.user.role === 'admin') {
      await Booking.findByIdAndDelete(id);
      return res.status(200).json({
        message: 'Booking deleted successfully by admin',
        booking
      });
    }

    // for normal users: must own the booking
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied: You can only cancel your own bookings' });
    }

    // business logic: users can cancel only if status is pending
    if (booking.status !== 'pending') {
      return res.status(400).json({ message: 'Cannot cancel booking: Only pending bookings can be cancelled' });
    }

    // update status to cancelled
    booking.status = 'cancelled';
    await booking.save();

    res.status(200).json({
      message: 'Booking cancelled successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting/cancelling booking', error: error.message });
  }
};

// PATCH /bookings/:id/approve - admin approves a booking
const approveBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = 'approved';
    await booking.save();

    res.status(200).json({
      message: 'Booking approved successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error approving booking', error: error.message });
  }
};

// PATCH /bookings/:id/reject - admin rejects a booking
const rejectBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = 'rejected';
    await booking.save();

    res.status(200).json({
      message: 'Booking rejected successfully',
      booking
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error rejecting booking', error: error.message });
  }
};

module.exports = {
  createBooking,
  getBookings,
  updateBooking,
  deleteBooking,
  approveBooking,
  rejectBooking
};
