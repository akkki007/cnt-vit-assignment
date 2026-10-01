const express = require('express');
const auth = require('../middleware/auth');
const { listMine, markRead, markAllRead } = require('../controllers/notificationController');

const router = express.Router();

router.use(auth);

router.get('/', listMine);
router.put('/:id/read', markRead);
router.put('/read-all', markAllRead);

module.exports = router;
