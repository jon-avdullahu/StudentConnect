const UserModel = require('../models/userModel');

exports.listStudents = async (req, res) => {
  try {
    const search = req.query.search ? String(req.query.search).trim().slice(0, 120) : '';
    const limit = Math.min(parseInt(req.query.limit, 10) || 48, 80);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const rows = await UserModel.listPublicStudents({
      excludeUserId: req.userId,
      search,
      limit,
      offset,
    });
    res.json(rows);
  } catch (err) {
    console.error('listStudents:', err);
    res.status(500).json({ error: 'Failed to load students.' });
  }
};

exports.getPublicStudent = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id.' });

    const row = await UserModel.getPublicStudentById(id);
    if (!row) return res.status(404).json({ error: 'Student not found.' });

    res.json(row);
  } catch (err) {
    console.error('getPublicStudent:', err);
    res.status(500).json({ error: 'Failed to load profile.' });
  }
};
