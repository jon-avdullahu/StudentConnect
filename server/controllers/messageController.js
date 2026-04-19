const { pool } = require('../db');
const MessageModel = require('../models/messageModel');
const ListingModel = require('../models/listingModel');
const UserModel = require('../models/userModel');
const TeamModel = require('../models/teamModel');

async function enrichThreadWithInvitationStatus(rows) {
  const ids = [];
  for (const m of rows) {
    const meta = m.metadata;
    if (m.message_type === 'team_invite' && meta && meta.invitation_id != null) {
      ids.push(Number(meta.invitation_id));
    }
  }
  if (ids.length === 0) return rows;
  const unique = [...new Set(ids.filter((n) => Number.isFinite(n)))];
  if (unique.length === 0) return rows;
  const result = await pool.query(`SELECT id, status FROM team_invitations WHERE id = ANY($1::int[])`, [unique]);
  const map = new Map(result.rows.map((r) => [r.id, r.status]));
  return rows.map((m) => {
    const meta = m.metadata;
    if (m.message_type !== 'team_invite' || !meta || meta.invitation_id == null) return m;
    return {
      ...m,
      invitation_status: map.get(Number(meta.invitation_id)) || 'unknown',
    };
  });
}

async function enrichThreadWithTeamLabels(rows) {
  const teamIds = [...new Set(rows.map((r) => r.team_id).filter((id) => id != null))];
  if (teamIds.length === 0) return rows;
  const result = await pool.query(
    `SELECT tm.team_id, u.full_name, u.id
     FROM team_members tm
     INNER JOIN users u ON u.id = tm.user_id
     WHERE tm.team_id = ANY($1::int[])
     ORDER BY tm.team_id, tm.joined_at ASC`,
    [teamIds]
  );
  const byTeam = new Map();
  for (const row of result.rows) {
    if (!byTeam.has(row.team_id)) byTeam.set(row.team_id, []);
    byTeam.get(row.team_id).push(row.full_name);
  }
  return rows.map((m) => {
    if (m.team_id == null) return m;
    const names = byTeam.get(m.team_id) || [];
    return {
      ...m,
      team_pair_label: names.filter(Boolean).join(' & '),
    };
  });
}

exports.getRecentConversations = async (req, res) => {
  try {
    const conversations = await MessageModel.getRecentConversations(req.userId);
    res.json(conversations);
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

exports.getThread = async (req, res) => {
  try {
    const { chatUserId } = req.params;
    const otherId = parseInt(chatUserId, 10);
    if (!Number.isFinite(otherId) || otherId === req.userId) {
      return res.status(400).json({ error: 'Invalid conversation user.' });
    }
    const teamQ = req.query.team;
    const rawThread = await MessageModel.getThread(req.userId, otherId, { teamId: teamQ });
    const withInvites = await enrichThreadWithInvitationStatus(rawThread);
    const thread = await enrichThreadWithTeamLabels(withInvites);

    const unreadIds = thread
      .filter(msg => msg.receiver_id === req.userId && !msg.is_read)
      .map(msg => msg.id);

    if (unreadIds.length > 0) {
      await MessageModel.markAsRead(unreadIds);
    }
    res.json(thread);
  } catch (err) {
    console.error('Error fetching thread:', err);
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
};

exports.createMessage = async (req, res) => {
  try {
    const { receiver_id, listing_id, content, as_team: asTeamRaw } = req.body;
    const asTeam = asTeamRaw === true || asTeamRaw === 'true';
    if (!receiver_id || !content) {
      return res.status(400).json({ error: 'Receiver ID and content are required' });
    }

    const receiverId = parseInt(receiver_id, 10);
    if (!Number.isFinite(receiverId) || receiverId === req.userId) {
      return res.status(400).json({ error: 'Invalid receiver.' });
    }

    const text = String(content).trim();
    if (!text) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }
    if (text.length > 5000) {
      return res.status(400).json({ error: 'Message is too long.' });
    }

    const sender = await UserModel.findById(req.userId);
    const receiver = await UserModel.findById(receiverId);
    if (!sender || !receiver) {
      return res.status(400).json({ error: 'Invalid participant.' });
    }

    let listingFk = null;
    if (listing_id != null && listing_id !== '') {
      const lid = parseInt(listing_id, 10);
      if (!Number.isFinite(lid)) {
        return res.status(400).json({ error: 'Invalid listing.' });
      }
      const listing = await ListingModel.getById(lid);
      if (!listing) {
        return res.status(404).json({ error: 'Listing not found.' });
      }
      if (sender.role === 'student') {
        if (receiver.role !== 'landlord') {
          return res.status(400).json({ error: 'Invalid recipient for a listing message.' });
        }
        if (Number(listing.owner_id) !== receiverId) {
          return res.status(400).json({ error: 'You can only contact the owner of that listing.' });
        }
        listingFk = lid;
      } else if (sender.role === 'landlord') {
        if (receiver.role !== 'student') {
          return res.status(400).json({ error: 'Invalid recipient for a listing reply.' });
        }
        if (Number(listing.owner_id) !== req.userId) {
          return res.status(400).json({ error: 'That listing is not yours.' });
        }
        listingFk = lid;
      } else {
        return res.status(403).json({ error: 'Only students and landlords can use listing messages.' });
      }
    } else {
      if (sender.role === 'student' && receiver.role === 'student') {
        /* roommate DM */
      } else if (sender.role === 'landlord' && receiver.role === 'student') {
        /* landlord follow-up without listing id */
      } else if (sender.role === 'student' && receiver.role === 'landlord') {
        return res.status(403).json({
          error:
            'Chat without a listing is only between students (for roommates). To reach a landlord, use Message on their listing.',
        });
      } else {
        return res.status(403).json({ error: 'Invalid conversation.' });
      }
    }

    if (asTeam && !listingFk) {
      return res.status(400).json({
        error: 'Team messaging is only available when you include a listing with the landlord.',
      });
    }

    let teamIdForMessage = null;
    if (listingFk && asTeam && sender.role === 'student') {
      const tinfo = await TeamModel.getMyTeamPayload(req.userId);
      if (!tinfo || !tinfo.full) {
        return res.status(400).json({
          error:
            'You can only message as a team when your roommate group is complete (2/2).',
        });
      }
      teamIdForMessage = tinfo.id;
    }

    const msg = await MessageModel.createMessage(req.userId, receiverId, listingFk, text, 'text', null, teamIdForMessage);
    const enriched = (await enrichThreadWithTeamLabels([msg]))[0];
    res.status(201).json(enriched);
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
};
