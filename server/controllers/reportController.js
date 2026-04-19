const ReportModel = require('../models/reportModel');
const UserModel = require('../models/userModel');

exports.getAllReports = async (req, res) => {
  try {
    const adminCheck = await UserModel.findById(req.userId);
    if (!adminCheck || adminCheck.role !== 'admin') {
      return res.status(403).json({ error: 'Admins only' });
    }

    const reports = await ReportModel.getAll(req.query.status);
    res.json(reports);
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
};

exports.updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const adminCheck = await UserModel.findById(req.userId);
    if (!adminCheck || adminCheck.role !== 'admin') {
      return res.status(403).json({ error: 'Admins only' });
    }

    if (!['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const report = await ReportModel.updateStatus(id, status);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    
    res.json(report);
  } catch (err) {
    console.error('Error updating report:', err);
    res.status(500).json({ error: 'Failed to update report' });
  }
};

const VALID_ENTITY_TYPES = ['listing', 'user', 'message'];
const MAX_REASON_LENGTH = 2000;

exports.createReport = async (req, res) => {
  try {
    const { reported_entity_type, entity_id, reason } = req.body;
    if (!reported_entity_type || !entity_id || !reason) {
      return res.status(400).json({ error: 'Missing required report fields' });
    }
    if (!VALID_ENTITY_TYPES.includes(reported_entity_type)) {
      return res.status(400).json({ error: `Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}` });
    }
    const id = parseInt(entity_id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid entity id.' });
    }
    if (String(reason).length > MAX_REASON_LENGTH) {
      return res.status(400).json({ error: `Reason must be under ${MAX_REASON_LENGTH} characters.` });
    }

    const report = await ReportModel.createReport(req.userId, reported_entity_type, id, String(reason).trim());
    res.status(201).json(report);
  } catch (err) {
    console.error('Error creating report:', err);
    res.status(500).json({ error: 'Failed to create report' });
  }
};
