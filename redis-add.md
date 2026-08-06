# Adding Redis alongside MongoDB in an Express Server

This guide explains how to properly integrate Redis caching into your existing MongoDB-backed Express application. Caching with Redis significantly improves read performance by storing frequently accessed data in-memory.

## Prerequisites
1. Ensure you have a Redis server running locally or accessible remotely. You can install it on your machine, run it via Docker, or use a managed service like Redis Cloud.
2. An existing Express server with MongoDB integration.

## 1. Install Redis Package
Navigate to your server directory and install the Redis Node.js client:

```bash
cd server
npm install redis
```

## 2. Update Server Configuration (`server.js`)
You need to initialize the Redis client, connect to the Redis server, and optionally make it available to your route handlers.

```javascript
// server/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const studentRoutes = require('./routes/studentRoutes');

// Import the createClient function from the redis package
const { createClient } = require('redis');

const app = express();

// Initialize Redis Client
// Pass a connection string if your Redis server isn't running on the default localhost:6379
// e.g., createClient({ url: 'redis://alice:foobared@awesome.redis.server:6380' })
const redisClient = createClient();

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Connected to Redis successfully!'));

// Connect to Redis asynchronously before starting the server
(async () => {
    await redisClient.connect();
})();

// Connect to MongoDB
connectDB();

app.use(cors());
app.use(express.json());

// [Optional but Recommended] Middleware to make Redis available in the request object
// This avoids needing to export/import the redisClient in every controller file
app.use((req, res, next) => {
    req.redisClient = redisClient;
    next();
});

// Setup Routes
app.use('/students', studentRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

## 3. Implement Caching Logic in Controllers
When retrieving data, first check the cache. If it's a "cache miss", fetch the data from MongoDB and save it to the cache before returning the response. For write operations (Create, Update, Delete), make sure to invalidate (delete) the relevant cache.

```javascript
// server/controllers/studentController.js
const Student = require('../models/Student');

// Fetch all students (Read)
const getStudents = async (req, res) => {
    try {
        const redisClient = req.redisClient;

        // 1. Check Cache
        const cachedStudents = await redisClient.get('students_cache');

        if (cachedStudents) {
            // CACHE HIT: Return data from Redis
            console.log('Serving from Redis Cache...');
            return res.json(JSON.parse(cachedStudents));
        }

        // 2. CACHE MISS: Fetch from MongoDB
        console.log('Serving from MongoDB...');
        const students = await Student.find({});

        // 3. Save the result to Redis for future requests
        // EX: 3600 means expire in 3600 seconds (1 hour)
        await redisClient.set('students_cache', JSON.stringify(students), {
            EX: 3600 
        });

        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching students' });
    }
};

// Update Student (Write/Update)
const updateAttendance = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const attendanceValue = req.body.attendance !== undefined ? req.body.attendance : !student.attendance;
        student.attendance = attendanceValue;

        const updatedStudent = await student.save();

        // 4. IMPORTANT: Invalidate (delete) the cache when data changes!
        await req.redisClient.del('students_cache');
        console.log('Cache invalidated due to data update.');

        res.json(updatedStudent);
    } catch (error) {
        console.error('Error updating attendance:', error);
        res.status(500).json({ message: 'Server Error updating attendance' });
    }
};

// Create Student (Write)
const createStudent = async (req, res) => {
    try {
        const { name, rollNumber, department, semester, section } = req.body;
        
        const newStudent = new Student({
            name, rollNumber, department, semester, section, attendance: false
        });

        const savedStudent = await newStudent.save();

        // 5. IMPORTANT: Invalidate cache when new data is added
        await req.redisClient.del('students_cache');
        console.log('Cache invalidated due to new student added.');

        res.status(201).json(savedStudent);
    } catch (error) {
        console.error('Error creating student:', error);
        res.status(500).json({ message: 'Server Error creating student' });
    }
};

module.exports = {
    getStudents,
    updateAttendance,
    createStudent
};
```

## Tips and Best Practices
1. **Cache Granularity:** Be mindful of what you cache. `students_cache` is a simple global cache, but if you have user-specific data or filtered lists (like `students_by_department`), you should use dynamic keys like `students_cache:department:${dept_id}`.
2. **Error Handling:** When dealing with Redis, wrap logic in try/catch or fall back gracefully to MongoDB if the Redis server goes down. In a robust production environment, a Redis failure shouldn't crash your server; it should just increase database load by falling back to cache misses.
3. **Data Expiration (TTL):** Always set a TTL (Time To Live, e.g., the `EX: 3600` option) on cache data to ensure that stale data naturally expires, even if your manual cache invalidation fails.
