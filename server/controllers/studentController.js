const Student = require('../models/Student');

// GET /students
// Fetch all students from the database
const getStudents = async (req, res) => {
    try {
        const students = await Student.find({});
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

        res.json(updatedStudent);
    } catch (error) {
        console.error('Error updating attendance:', error);
        res.status(500).json({ message: 'Server Error updating attendance' });
    }
};

// POST /students
const createStudent = async (req, res) => {
    try {
        const { name, rollNumber, department, semester, section } = req.body;
        
        const newStudent = new Student({
            name,
            rollNumber,
            department,
            semester,
            section,
            attendance: false
        });

        const savedStudent = await newStudent.save();

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