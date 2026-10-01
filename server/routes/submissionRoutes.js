const express = require('express');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { uploadSubmission } = require('../middleware/upload');
const {
  submitAssignment,
  getMySubmission,
  listByAssignment,
  getSubmission,
  gradeSubmission,
} = require('../controllers/submissionController');

const router = express.Router();

router.use(auth);

router.post(
  '/assignment/:assignmentId',
  role('student'),
  uploadSubmission.array('files', 5),
  submitAssignment
);
router.get('/assignment/:assignmentId/mine', role('student'), getMySubmission);
router.get('/assignment/:assignmentId/roster', role('teacher'), listByAssignment);
router.get('/:id', getSubmission);
router.put('/:id/grade', role('teacher'), gradeSubmission);

module.exports = router;
