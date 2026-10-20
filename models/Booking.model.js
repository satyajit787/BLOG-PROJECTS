const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    serviceName: {
      type: String,
      required: true,
      trim: true
    },
    requestedDateTime: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending'
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
