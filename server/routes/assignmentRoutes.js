const express = require('express');
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const {
  createAssignment,
  listByClassroom,
  getAssignment,
  updateAssignment,
  deleteAssignment,
} = require('../controllers/assignmentController');

const router = express.Router();

router.use(auth);

const validateAssignment = [
  body('title').trim().notEmpty().withMessage('Title is required.'),
  body('description').trim().notEmpty().withMessage('Description is required.'),
  body('stage').trim().notEmpty().withMessage('Stage is required.'),
  body('maxMarks').isFloat({ min: 1 }).withMessage('Max marks must be a positive number.'),
  body('deadline').isISO8601().withMessage('A valid deadline date is required.'),
];

router.post('/classroom/:classroomId', role('teacher'), validateAssignment, createAssignment);
router.get('/classroom/:classroomId', listByClassroom);
router.get('/:id', getAssignment);
router.put('/:id', role('teacher'), updateAssignment);
router.delete('/:id', role('teacher'), deleteAssignment);

module.exports = router;
