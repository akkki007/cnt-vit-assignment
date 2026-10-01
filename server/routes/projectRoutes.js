const express = require('express');
const auth = require('../middleware/auth');
const {
  createProject,
  listByClassroom,
  getProject,
  updateProjectStage,
} = require('../controllers/projectController');

const router = express.Router();

router.use(auth);

router.post('/classroom/:classroomId', createProject);
router.get('/classroom/:classroomId', listByClassroom);
router.get('/:id', getProject);
router.put('/:id/stage', updateProjectStage);

module.exports = router;
