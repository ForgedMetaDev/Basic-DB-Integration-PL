const Student = require('../models/Student');
const mysqlPool = require('../config/mysql');

// GET /students
// Fetch all students from the database with Redis Caching
const getStudents = async (req, res) => {
    try {
        const redisClient = req.redisClient; // Extract Redis from the request object

        // 1. Check if the students data is already in the cache
        const cachedStudents = await redisClient.get('students_cache');

        if (cachedStudents) {
            // CACHE HIT: Return the data directly from Redis
            console.log('Serving from Redis Cache...');
            return res.json(JSON.parse(cachedStudents));
        }

        // 2. CACHE MISS: If not in cache, fetch from MongoDB
        console.log('Serving from MongoDB...');
        const students = await Student.find({});

        // 3. Save the result to Redis for future requests
        // EX: 3600 sets an expiration time of 3600 seconds (1 hour)
        await redisClient.set('students_cache', JSON.stringify(students), {
            EX: 3600 
        });

        res.json(students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error fetching students' });
    }
};

// PUT /students/:id/attendance
const updateAttendance = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const attendanceValue = req.body.attendance !== undefined ? req.body.attendance : !student.attendance;
        student.attendance = attendanceValue;

        const updatedStudent = await student.save();

        const attendanceDate = req.body.date || new Date().toISOString().split('T')[0];
        const status = attendanceValue ? 'Present' : 'Absent';
        const studentId = student.rollNumber || student._id.toString();

        const mysqlQuery = `
            INSERT INTO attendance (student_id, date, status)
            VALUES (?, ?, ?)
        `;

        await mysqlPool.execute(mysqlQuery, [studentId, attendanceDate, status]);

        // 4. IMPORTANT: Invalidate (delete) the cache when data changes!
        // Because the data in DB changed, the cached list of students is now outdated.
        await req.redisClient.del('students_cache');
        console.log('Cache invalidated due to data update.');

        res.json(updatedStudent);
    } catch (error) {
        console.error('Error updating attendance:', error);
        res.status(500).json({ message: 'Server Error updating attendance' });
    }
};

module.exports = {
    getStudents,
    updateAttendance
};