const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const teamController = require('../controllers/teamController');

const router = express.Router();

router.get('/mine', authMiddleware, teamController.getMine);
router.post('/invite', authMiddleware, teamController.invite);
router.post('/invitations/:invitationId/accept', authMiddleware, teamController.accept);
router.post('/invitations/:invitationId/decline', authMiddleware, teamController.decline);
router.post('/invitations/:invitationId/cancel', authMiddleware, teamController.cancel);

module.exports = router;
