const express = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const Classroom = require('../models/Classroom');
const {
  createClassroom,
  listMyClassrooms,
  getClassroom,
  joinClassroom,
  removeStudent,
} = require('../controllers/classroomController');

const router = express.Router();

router.use(auth);

router.post(
  '/',
  role('teacher'),
  [
    body('name').trim().notEmpty().withMessage('Classroom name is required.'),
    body('category').isIn(Classroom.CATEGORIES).withMessage('Invalid category.'),
  ],
  createClassroom
);

router.get('/', listMyClassrooms);
router.post('/join', role('student'), joinClassroom);
router.get('/:id', getClassroom);
router.delete('/:id/students/:studentId', role('teacher'), removeStudent);

module.exports = router;
