const UserModel = require('../models/userModel');

const MAX_BIO = 2000;
const MAX_HOBBY_LEN = 48;
const MAX_HOBBIES = 24;
const MAX_ROOMMATE_NOTE = 800;
const MAX_INTERESTS = 500;

function normalizePreferences(raw) {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = {};

  let hobbies = raw.hobbies;
  if (typeof hobbies === 'string') {
    hobbies = hobbies
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (Array.isArray(hobbies)) {
    out.hobbies = hobbies
      .slice(0, MAX_HOBBIES)
      .map((h) => String(h).trim().slice(0, MAX_HOBBY_LEN))
      .filter(Boolean);
  } else {
    out.hobbies = [];
  }

  if (raw.roommate_note != null) {
    out.roommate_note = String(raw.roommate_note).trim().slice(0, MAX_ROOMMATE_NOTE);
  }
  if (raw.interests != null) {
    out.interests = String(raw.interests).trim().slice(0, MAX_INTERESTS);
  }

  return out;
}

exports.getMyProfile = async (req, res) => {
  try {
    const row = await UserModel.findProfileById(req.userId);
    if (!row) return res.status(404).json({ error: 'User not found.' });
    if (row.role !== 'student') {
      return res.status(403).json({ error: 'Profile settings are only available for student accounts.' });
    }
    res.json({
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      university: row.university,
      role: row.role,
      bio: row.bio,
      preferences: row.preferences || {},
      created_at: row.created_at,
    });
  } catch (err) {
    console.error('getMyProfile:', err);
    res.status(500).json({ error: 'Failed to load profile.' });
  }
};

exports.patchMyProfile = async (req, res) => {
  try {
    const existingRow = await UserModel.findProfileById(req.userId);
    if (!existingRow) return res.status(404).json({ error: 'User not found.' });
    if (existingRow.role !== 'student') {
      return res.status(403).json({ error: 'Profile settings are only available for student accounts.' });
    }

    const { full_name, university, bio, preferences } = req.body;
    const updates = {};
    if (full_name != null) {
      const n = String(full_name).trim();
      if (n.length < 2) return res.status(400).json({ error: 'Name is too short.' });
      if (n.length > 255) return res.status(400).json({ error: 'Name is too long.' });
      updates.full_name = n;
    }
    if (university !== undefined) {
      updates.university = university ? String(university).trim().slice(0, 255) : null;
    }
    if (bio !== undefined) {
      updates.bio = bio ? String(bio).trim().slice(0, MAX_BIO) : null;
    }
    if (preferences !== undefined) {
      if (typeof preferences !== 'object' || preferences === null || Array.isArray(preferences)) {
        return res.status(400).json({ error: 'Invalid preferences object.' });
      }
      const prev =
        existingRow?.preferences &&
        typeof existingRow.preferences === 'object' &&
        !Array.isArray(existingRow.preferences)
          ? existingRow.preferences
          : {};
      const merged = { ...prev, ...preferences };
      const norm = normalizePreferences(merged);
      if (norm === null) return res.status(400).json({ error: 'Invalid preferences object.' });
      updates.preferences = norm;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    const row = await UserModel.updateProfile(req.userId, updates);
    if (!row) return res.status(404).json({ error: 'User not found.' });

    res.json({
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      university: row.university,
      role: row.role,
      bio: row.bio,
      preferences: row.preferences || {},
      created_at: row.created_at,
    });
  } catch (err) {
    console.error('patchMyProfile:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
};
