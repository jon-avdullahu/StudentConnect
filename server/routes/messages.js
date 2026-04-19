const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const messageController = require('../controllers/messageController');

const router = express.Router();

router.get('/', authMiddleware, messageController.getRecentConversations);
router.get('/:chatUserId', authMiddleware, messageController.getThread);
router.post('/', authMiddleware, messageController.createMessage);

module.exports = router;
