const { pool } = require('../db');

class TeamModel {
  /** Team where user is a member (most recent if multiple — should be at most one with our rules). */
  static async getTeamForUser(userId) {
    const result = await pool.query(
      `SELECT t.id, t.created_at,
        (SELECT COUNT(*)::int FROM team_members tm WHERE tm.team_id = t.id) AS member_count
       FROM teams t
       INNER JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = $1
       ORDER BY t.id DESC
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  static async getTeamMembers(teamId) {
    const result = await pool.query(
      `SELECT u.id, u.full_name
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = $1
       ORDER BY tm.joined_at ASC`,
      [teamId]
    );
    return result.rows;
  }

  static async userInFullTeam(userId) {
    const row = await this.getTeamForUser(userId);
    if (!row) return false;
    return row.member_count >= 2;
  }

  /** Both users already in the same team with 2 members */
  static async sameFullTeam(userA, userB) {
    const result = await pool.query(
      `SELECT t.id
       FROM teams t
       JOIN team_members tm1 ON tm1.team_id = t.id AND tm1.user_id = $1
       JOIN team_members tm2 ON tm2.team_id = t.id AND tm2.user_id = $2
       WHERE (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) >= 2
       LIMIT 1`,
      [userA, userB]
    );
    return result.rows[0] || null;
  }

  /** Pending invitation from inviter to invitee */
  static async findPendingInviteBetween(inviterId, inviteeId) {
    const result = await pool.query(
      `SELECT ti.*
       FROM team_invitations ti
       WHERE ti.inviter_id = $1 AND ti.invitee_id = $2 AND ti.status = 'pending'
       ORDER BY ti.id DESC
       LIMIT 1`,
      [inviterId, inviteeId]
    );
    return result.rows[0] || null;
  }

  /** Inviter already has a 1-member team with a pending invite they sent (cannot start another team). */
  static async inviterHasPendingOutstandingTeam(inviterId) {
    const result = await pool.query(
      `SELECT t.id
       FROM teams t
       INNER JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = $1
       WHERE (SELECT COUNT(*)::int FROM team_members tm2 WHERE tm2.team_id = t.id) = 1
         AND EXISTS (
           SELECT 1 FROM team_invitations ti
           WHERE ti.team_id = t.id AND ti.status = 'pending' AND ti.inviter_id = $1
         )
       LIMIT 1`,
      [inviterId]
    );
    return result.rows[0] || null;
  }

  static async inviteeHasPendingInvite(inviteeId) {
    const result = await pool.query(
      `SELECT 1 FROM team_invitations WHERE invitee_id = $1 AND status = 'pending' LIMIT 1`,
      [inviteeId]
    );
    return result.rowCount > 0;
  }

  static async getMyTeamPayload(userId) {
    const team = await this.getTeamForUser(userId);
    if (!team) return null;
    const members = await this.getTeamMembers(team.id);
    return {
      id: team.id,
      member_count: team.member_count,
      full: team.member_count >= 2,
      members,
    };
  }

  static async hasMessagedTogether(a, b) {
    const result = await pool.query(
      `SELECT 1 FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)
       LIMIT 1`,
      [a, b]
    );
    return result.rowCount > 0;
  }

  static async createTeamAndInvitation(inviterId, inviteeId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const teamRes = await client.query(`INSERT INTO teams DEFAULT VALUES RETURNING id`);
      const teamId = teamRes.rows[0].id;

      await client.query(`INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)`, [teamId, inviterId]);

      const invRes = await client.query(
        `INSERT INTO team_invitations (team_id, inviter_id, invitee_id, status)
         VALUES ($1, $2, $3, 'pending') RETURNING id`,
        [teamId, inviterId, inviteeId]
      );
      const invitationId = invRes.rows[0].id;

      await client.query('COMMIT');
      return { teamId, invitationId };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async attachMessageToInvitation(invitationId, messageId) {
    await pool.query(`UPDATE team_invitations SET message_id = $2 WHERE id = $1`, [invitationId, messageId]);
  }

  static async getInvitationById(id) {
    const result = await pool.query(`SELECT * FROM team_invitations WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }

  static async declineInvitation(invitationId, inviteeId) {
    const inv = await this.getInvitationById(invitationId);
    if (!inv || inv.status !== 'pending' || inv.invitee_id !== inviteeId) {
      return { ok: false, reason: 'invalid' };
    }
    await pool.query(`UPDATE team_invitations SET status = 'declined' WHERE id = $1`, [invitationId]);
    return { ok: true, inviter_id: inv.inviter_id, invitee_id: inv.invitee_id, team_id: inv.team_id };
  }

  static async cancelInvitation(invitationId, inviterId) {
    const inv = await this.getInvitationById(invitationId);
    if (!inv || inv.status !== 'pending' || inv.inviter_id !== inviterId) {
      return { ok: false, reason: 'invalid' };
    }
    await pool.query(`UPDATE team_invitations SET status = 'cancelled' WHERE id = $1`, [invitationId]);
    return { ok: true, inviter_id: inv.inviter_id, invitee_id: inv.invitee_id, team_id: inv.team_id };
  }

  static async acceptInvitation(invitationId, inviteeId) {
    const inv = await this.getInvitationById(invitationId);
    if (!inv || inv.status !== 'pending' || inv.invitee_id !== inviteeId) return { ok: false, reason: 'invalid' };

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const lock = await client.query(`SELECT team_id, inviter_id, invitee_id, status FROM team_invitations WHERE id = $1 FOR UPDATE`, [
        invitationId,
      ]);
      const row = lock.rows[0];
      if (!row || row.status !== 'pending' || row.invitee_id !== inviteeId) {
        await client.query('ROLLBACK');
        return { ok: false, reason: 'invalid' };
      }
      const cnt = await client.query(`SELECT COUNT(*)::int AS c FROM team_members WHERE team_id = $1`, [row.team_id]);
      if (cnt.rows[0].c >= 2) {
        await client.query('ROLLBACK');
        return { ok: false, reason: 'full' };
      }
      await client.query(`UPDATE team_invitations SET status = 'accepted' WHERE id = $1`, [invitationId]);
      await client.query(
        `INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)
         ON CONFLICT (team_id, user_id) DO NOTHING`,
        [row.team_id, inviteeId]
      );
      await client.query('COMMIT');
      return { ok: true, team_id: row.team_id, inviter_id: row.inviter_id, invitee_id: row.invitee_id };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

module.exports = TeamModel;
