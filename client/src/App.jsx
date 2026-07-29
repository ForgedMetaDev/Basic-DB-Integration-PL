import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [newStudent, setNewStudent] = useState({
    name: '',
    rollNumber: '',
    department: '',
    semester: '',
    section: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Function to fetch students from the backend
  const fetchStudents = async () => {
    try {
      // Assuming backend runs on localhost:5000
      const response = await axios.get('http://localhost:5000/students');
      setStudents(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to fetch students. Is the server running?');
      setLoading(false);
    }
  };

  // Fetch students on component mount
  useEffect(() => {
    fetchStudents();
  }, []);

  // Function to handle attendance toggle
  const handleAttendanceChange = async (id, currentStatus) => {
    try {
      // Optimistically update the UI for snappiness (optional but good UX)
      setStudents(students.map(student => 
        student._id === id ? { ...student, attendance: !currentStatus } : student
      ));

      // Send the update to the backend
      await axios.put(`http://localhost:5000/students/${id}/attendance`, {
        attendance: !currentStatus
      });
      
    } catch (err) {
      console.error('Error updating attendance:', err);
      // Revert UI on failure by refetching all students
      fetchStudents();
      alert('Failed to update attendance.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewStudent(prev => ({ ...prev, [name]: value }));
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await axios.post('http://localhost:5000/students', newStudent);
      setNewStudent({
        name: '',
        rollNumber: '',
        department: '',
        semester: '',
        section: ''
      });
      fetchStudents(); // Refresh the list
    } catch (err) {
      console.error('Error adding student:', err);
      setSubmitError('Failed to add student. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <h1>Student Attendance</h1>
      
      <div className="add-student-section">
        <h2>Add New Student</h2>
        {submitError && <p className="error">{submitError}</p>}
        <form onSubmit={handleAddStudent} className="add-student-form">
          <input type="text" name="name" placeholder="Name" value={newStudent.name} onChange={handleInputChange} required />
          <input type="text" name="rollNumber" placeholder="Roll Number" value={newStudent.rollNumber} onChange={handleInputChange} required />
          <input type="text" name="department" placeholder="Department" value={newStudent.department} onChange={handleInputChange} required />
          <input type="number" name="semester" placeholder="Semester" value={newStudent.semester} onChange={handleInputChange} required />
          <input type="text" name="section" placeholder="Section" value={newStudent.section} onChange={handleInputChange} required />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add Student'}
          </button>
        </form>
      </div>

      {loading && <p>Loading students...</p>}
      {error && <p className="error">{error}</p>}
      
      {!loading && !error && students.length === 0 && (
        <p>No students found. Please import the CSV file into MongoDB.</p>
      )}

      {!loading && !error && students.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Roll Number</th>
              <th>Student Name</th>
              <th>Department</th>
              <th>Semester</th>
              <th>Section</th>
              <th>Attendance</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student._id}>
                <td>{student.rollNumber}</td>
                <td>{student.name}</td>
                <td>{student.department}</td>
                <td>{student.semester}</td>
                <td>{student.section}</td>
                <td>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={student.attendance}
                      onChange={() => handleAttendanceChange(student._id, student.attendance)}
                    />
                    <span className="slider"></span>
                  </label>
                  <span className="attendance-text">
                    {student.attendance ? 'Present' : 'Absent'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
