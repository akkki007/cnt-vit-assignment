const express = require('express');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { uploadResource: uploadMiddleware } = require('../middleware/upload');
const { uploadResource, listByClassroom } = require('../controllers/resourceController');

const router = express.Router();

router.use(auth);

router.post('/classroom/:classroomId', role('teacher'), uploadMiddleware.single('file'), uploadResource);
router.get('/classroom/:classroomId', listByClassroom);

module.exports = router;
