const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const studentRoutes = require('./routes/studentRoutes');

const { createClient } = require('redis');

// Initialize express app
const app = express();

// 2. Initialize and Connect Redis Client
const redisClient = createClient();

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Connected to Redis successfully!'));

// Connect to Redis asynchronously before starting the server
(async () => {
    await redisClient.connect();
})();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors()); // Allow cross-origin requests from React
app.use(express.json()); // Parse JSON bodies

// 3. Make Redis available to our routes (Optional but good practice)
// We attach it to the request object so controllers can access it easily.
app.use((req, res, next) => {
    req.redisClient = redisClient;
    next();
});

// API Routes
app.use('/students', studentRoutes);

// Simple root route
app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
