const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const bookingRoutes = require('./routes/booking.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// standard middleware
app.use(cors());
app.use(express.json());

// health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Service Booking RBAC API is running' });
});

// mount routes directly as per assignment requirements
app.use('/', authRoutes);
app.use('/', bookingRoutes);

// mount routes under /api prefix for flexibility
app.use('/api', authRoutes);
app.use('/api', bookingRoutes);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// start the express server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

// start server only if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;
