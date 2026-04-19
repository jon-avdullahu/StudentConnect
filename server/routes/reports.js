const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

const router = express.Router();

router.get('/', authMiddleware, reportController.getAllReports);
router.put('/:id/status', authMiddleware, reportController.updateReportStatus);
router.post('/', authMiddleware, reportController.createReport);

module.exports = router;
