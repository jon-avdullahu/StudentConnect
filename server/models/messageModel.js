const { pool } = require('../db');
const TeamModel = require('./teamModel');

class MessageModel {
  /** All messages between landlord and any member of a roommate team (one shared "group" thread). */
  static async getLandlordTeamThread(landlordId, teamId) {
    const result = await pool.query(
      `WITH mids AS (SELECT user_id FROM team_members WHERE team_id = $2)
       SELECT m.*, u.full_name AS sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE (
         (m.sender_id = $1 AND m.receiver_id IN (SELECT user_id FROM mids))
         OR (m.sender_id IN (SELECT user_id FROM mids) AND m.receiver_id = $1)
       )
       ORDER BY m.timestamp ASC`,
      [landlordId, teamId]
    );
    return result.rows;
  }

  /** If this student is on a team that has sent a team-tagged message to the landlord, return that team id. */
  static async resolveLandlordTeamForStudent(landlordId, studentId) {
    const r = await pool.query(
      `SELECT m.team_id
       FROM messages m
       INNER JOIN team_members tm ON tm.team_id = m.team_id AND tm.user_id = $2
       WHERE m.receiver_id = $1 AND m.team_id IS NOT NULL
       ORDER BY m.timestamp DESC
       LIMIT 1`,
      [landlordId, studentId]
    );
    return r.rows[0]?.team_id ?? null;
  }

  static async getRecentConversationsForLandlord(landlordId) {
    const teamRows = await pool.query(
      `SELECT DISTINCT team_id FROM messages WHERE receiver_id = $1 AND team_id IS NOT NULL`,
      [landlordId]
    );
    const teamIds = teamRows.rows.map((row) => row.team_id).filter((id) => id != null);

    const coveredStudentIds = new Set();
    const teamConvoRows = [];

    for (const tid of teamIds) {
      const members = await TeamModel.getTeamMembers(tid);
      const mids = members.map((m) => Number(m.id));
      if (mids.length === 0) continue;
      mids.forEach((id) => coveredStudentIds.add(id));

      const thread = await MessageModel.getLandlordTeamThread(landlordId, tid);
      if (thread.length === 0) continue;

      const last = thread[thread.length - 1];
      const anchor = Math.min(...mids);
      const names = members.map((m) => m.full_name).filter(Boolean).join(' & ');
      const unreadForMe = thread.some(
        (m) => Number(m.receiver_id) === Number(landlordId) && !m.is_read
      );

      teamConvoRows.push({
        other_user_id: anchor,
        other_user_name: names,
        last_message_id: last.id,
        last_message_content: last.content,
        last_message_time: last.timestamp,
        is_read: Number(last.receiver_id) === Number(landlordId) ? last.is_read : true,
        unread_for_me: unreadForMe,
        thread_team_id: tid,
      });
    }

    const query = `
      WITH ranked AS (
        SELECT
          CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS other_user_id,
          id,
          content,
          timestamp,
          is_read,
          sender_id,
          ROW_NUMBER() OVER (
            PARTITION BY CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END
            ORDER BY timestamp DESC
          ) AS rn
        FROM messages
        WHERE sender_id = $1 OR receiver_id = $1
      )
      SELECT
        r.other_user_id,
        u.full_name AS other_user_name,
        r.id AS last_message_id,
        r.content AS last_message_content,
        r.timestamp AS last_message_time,
        r.is_read,
        (r.sender_id <> $1 AND r.is_read = FALSE) AS unread_for_me
      FROM ranked r
      JOIN users u ON u.id = r.other_user_id
      WHERE r.rn = 1
      ORDER BY r.timestamp DESC
    `;
    const result = await pool.query(query, [landlordId]);

    const directRows = result.rows
      .filter((r) => !coveredStudentIds.has(Number(r.other_user_id)))
      .map((r) => ({ ...r, thread_team_id: null }));

    const combined = [...teamConvoRows, ...directRows];
    combined.sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time));
    return combined;
  }

  static async getRecentConversations(userId) {
    const roleRes = await pool.query(
      `SELECT LOWER(TRIM(role)) AS role FROM users WHERE id = $1`,
      [userId]
    );
    if (roleRes.rows[0]?.role === 'landlord') {
      return MessageModel.getRecentConversationsForLandlord(userId);
    }

    const query = `
      WITH ranked AS (
        SELECT
          CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS other_user_id,
          id,
          content,
          timestamp,
          is_read,
          sender_id,
          ROW_NUMBER() OVER (
            PARTITION BY CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END
            ORDER BY timestamp DESC
          ) AS rn
        FROM messages
        WHERE sender_id = $1 OR receiver_id = $1
      )
      SELECT
        r.other_user_id,
        u.full_name AS other_user_name,
        r.id AS last_message_id,
        r.content AS last_message_content,
        r.timestamp AS last_message_time,
        r.is_read,
        (r.sender_id <> $1 AND r.is_read = FALSE) AS unread_for_me
      FROM ranked r
      JOIN users u ON u.id = r.other_user_id
      WHERE r.rn = 1
      ORDER BY r.timestamp DESC
    `;
    const result = await pool.query(query, [userId]);
    const byPeer = new Map(result.rows.map((r) => [Number(r.other_user_id), { ...r, thread_team_id: null }]));

    const teamRow = await TeamModel.getTeamForUser(userId);
    if (teamRow && teamRow.member_count >= 2) {
      const members = await TeamModel.getTeamMembers(teamRow.id);
      const mids = members.map((m) => m.id);
      const ll = await pool.query(
        `SELECT DISTINCT receiver_id AS lid
         FROM messages
         WHERE team_id = $1 AND sender_id = ANY($2::int[])`,
        [teamRow.id, mids]
      );
      for (const row of ll.rows) {
        const lid = Number(row.lid);
        const thread = await MessageModel.getThread(userId, lid);
        if (thread.length === 0) continue;
        const last = thread[thread.length - 1];
        const nameRes = await pool.query('SELECT full_name FROM users WHERE id = $1', [lid]);
        const unreadForMe = thread.some(
          (m) => Number(m.receiver_id) === Number(userId) && !m.is_read
        );
        const newRow = {
          other_user_id: lid,
          other_user_name: nameRes.rows[0]?.full_name || 'Member',
          last_message_id: last.id,
          last_message_content: last.content,
          last_message_time: last.timestamp,
          is_read: Number(last.receiver_id) === Number(userId) ? last.is_read : true,
          unread_for_me: unreadForMe,
          thread_team_id: null,
        };
        const prev = byPeer.get(lid);
        if (!prev || new Date(last.timestamp) > new Date(prev.last_message_time)) {
          byPeer.set(lid, newRow);
        }
      }
    }

    return [...byPeer.values()].sort(
      (a, b) => new Date(b.last_message_time) - new Date(a.last_message_time)
    );
  }

  static async getThread(userId, chatUserId, opts = {}) {
    const viewerRes = await pool.query(
      `SELECT LOWER(TRIM(role)) AS role FROM users WHERE id = $1`,
      [userId]
    );
    const viewerRole = viewerRes.rows[0]?.role || '';

    const peerRes = await pool.query(
      `SELECT LOWER(TRIM(role)) AS role FROM users WHERE id = $1`,
      [chatUserId]
    );
    const peerRole = peerRes.rows[0]?.role || '';

    const simpleThread = async () => {
      const q = `
        SELECT m.*, u.full_name as sender_name
        FROM messages m
        JOIN users u ON u.id = m.sender_id
        WHERE (m.sender_id = $1 AND m.receiver_id = $2)
           OR (m.sender_id = $2 AND m.receiver_id = $1)
        ORDER BY m.timestamp ASC
      `;
      const result = await pool.query(q, [userId, chatUserId]);
      return result.rows;
    };

    if (viewerRole === 'landlord' && peerRole === 'student') {
      let teamId =
        opts.teamId != null && opts.teamId !== ''
          ? parseInt(opts.teamId, 10)
          : null;
      if (!Number.isFinite(teamId)) teamId = null;

      if (teamId != null) {
        const mem = await pool.query(
          `SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2`,
          [teamId, chatUserId]
        );
        if (mem.rowCount === 0) {
          teamId = null;
        }
      }

      if (teamId == null) {
        teamId = await MessageModel.resolveLandlordTeamForStudent(userId, chatUserId);
      }

      if (teamId != null) {
        return MessageModel.getLandlordTeamThread(userId, teamId);
      }
      return simpleThread();
    }

    if (peerRole !== 'landlord') {
      return simpleThread();
    }

    const teamRow = await TeamModel.getTeamForUser(userId);
    if (!teamRow || teamRow.member_count < 2) {
      return simpleThread();
    }

    const members = await TeamModel.getTeamMembers(teamRow.id);
    const mids = members.map((m) => m.id);
    const teamId = teamRow.id;

    const expanded = await pool.query(
      `SELECT m.*, u.full_name AS sender_name
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE (
         (m.sender_id = $1 AND m.receiver_id = $2)
         OR (m.sender_id = $2 AND m.receiver_id = $1)
         OR (
           m.team_id = $3
           AND m.receiver_id = $2
           AND m.sender_id = ANY($4::int[])
         )
         OR (
           m.sender_id = $2
           AND m.receiver_id = ANY($4::int[])
           AND (
             SELECT p.team_id
             FROM messages p
             WHERE p.sender_id = ANY($4::int[])
               AND p.receiver_id = $2
               AND p.timestamp < m.timestamp
             ORDER BY p.timestamp DESC
             LIMIT 1
           ) = $3
         )
       )
       ORDER BY m.timestamp ASC`,
      [userId, chatUserId, teamId, mids]
    );

    return expanded.rows;
  }

  static async markAsRead(unreadIds) {
    await pool.query(
      'UPDATE messages SET is_read = TRUE WHERE id = ANY($1::int[])',
      [unreadIds]
    );
  }

  static async createMessage(sender_id, receiver_id, listing_id, content, message_type = 'text', metadata = null, team_id = null) {
    const metaJson = metadata == null ? null : JSON.stringify(metadata);
    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, listing_id, content, message_type, metadata, team_id)
       VALUES ($1, $2, $3, $4, COALESCE($5, 'text'), $6::jsonb, $7) RETURNING *`,
      [sender_id, receiver_id, listing_id || null, content, message_type || 'text', metaJson, team_id || null]
    );
    return result.rows[0];
  }
}

module.exports = MessageModel;
