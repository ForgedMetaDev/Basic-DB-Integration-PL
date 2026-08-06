const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const studentRoutes = require('./routes/studentRoutes');
const { connectRedis } = require('./config/redis');

// Initialize express app
const app = express();

// Connect to Redis and MongoDB before accepting traffic
(async () => {
    try {
        await connectRedis();
        await connectDB();
    } catch (error) {
        console.error('Startup initialization failed:', error);
    }
})();

// Middleware
app.use(cors());
app.use(express.json());

// Simple root route
app.get('/', (req, res) => {
    res.send('API is running...');
});

// API Routes
app.use('/students', studentRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
