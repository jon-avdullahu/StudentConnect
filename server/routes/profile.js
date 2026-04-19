const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const profileController = require('../controllers/profileController');

const router = express.Router();

router.get('/', authMiddleware, profileController.getMyProfile);
router.patch('/', authMiddleware, profileController.patchMyProfile);

module.exports = router;
