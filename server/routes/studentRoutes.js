const express = require('express');
const router = express.Router();
const { getStudents, updateAttendance, createStudent } = require('../controllers/studentController');

// Route to get all students
router.get('/', getStudents);

// Route to create a new student
router.post('/', createStudent);

// Route to update a student's attendance
router.put('/:id/attendance', updateAttendance);

module.exports = router;
