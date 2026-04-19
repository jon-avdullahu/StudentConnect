const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const studentsController = require('../controllers/studentsController');

const router = express.Router();

router.get('/', authMiddleware, studentsController.listStudents);
router.get('/:id', authMiddleware, studentsController.getPublicStudent);

module.exports = router;
