const express = require('express');
const router = express.Router();
const { registerStudent, getStudentProfile, getAllStudents, updateStudentProfile, deleteStudentProfile } = require('../controllers/studentController');

router.post('/', registerStudent);                    // POST /api/students/
router.get('/:uid', getStudentProfile);               // GET /api/students/:uid
router.put('/:uid', updateStudentProfile);            // PUT /api/students/:uid
router.delete('/:uid', deleteStudentProfile);         // DELETE /api/students/:uid
router.get('/', getAllStudents);                      // GET /api/students/

module.exports = router;
