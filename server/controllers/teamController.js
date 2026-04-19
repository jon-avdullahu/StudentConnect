const { pool } = require('../db');
const TeamModel = require('../models/teamModel');
const UserModel = require('../models/userModel');
const MessageModel = require('../models/messageModel');

const INVITE_LINE =
  'Team invite: hunt for housing together as a 2-person group. Tap Join team if you are in.';

const TEAM_COMPLETE_LINE =
  'Team complete — you are a 2-person group (2/2). You can browse listings and message landlords together or on your own.';

exports.getMine = async (req, res) => {
  try {
    const me = await UserModel.findById(req.userId);
    if (!me || me.role !== 'student') {
      return res.json({ team: null });
    }
    const team = await TeamModel.getMyTeamPayload(req.userId);
    res.json({ team });
  } catch (err) {
    console.error('getMine team:', err);
    res.status(500).json({ error: 'Failed to load team.' });
  }
};

exports.invite = async (req, res) => {
  try {
    const peerId = parseInt(req.body.peer_id, 10);
    const inviterId = req.userId;
    if (!Number.isFinite(peerId) || peerId === inviterId) {
      return res.status(400).json({ error: 'Invalid peer.' });
    }

    const inviter = await UserModel.findById(inviterId);
    const peer = await UserModel.findById(peerId);
    if (!inviter || inviter.role !== 'student' || !peer || peer.role !== 'student') {
      return res.status(403).json({ error: 'Only students can form roommate teams.' });
    }

    if (await TeamModel.userInFullTeam(inviterId)) {
      return res.status(400).json({ error: 'You are already in a full team (2/2).' });
    }
    if (await TeamModel.userInFullTeam(peerId)) {
      return res.status(400).json({ error: 'That student is already in a full team.' });
    }
    if (await TeamModel.sameFullTeam(inviterId, peerId)) {
      return res.status(400).json({ error: 'You are already teammates.' });
    }
    if (await TeamModel.findPendingInviteBetween(inviterId, peerId)) {
      return res.status(400).json({ error: 'You already invited this student.' });
    }
    if (await TeamModel.inviterHasPendingOutstandingTeam(inviterId)) {
      return res.status(400).json({ error: 'You already have a pending team invitation. Wait for a response.' });
    }
    if (await TeamModel.inviteeHasPendingInvite(peerId)) {
      return res.status(400).json({ error: 'That student already has a pending team invitation.' });
    }

    const messaged = await TeamModel.hasMessagedTogether(inviterId, peerId);
    if (!messaged) {
      return res.status(400).json({ error: 'Exchange at least one message before sending a team invite.' });
    }

    const { teamId, invitationId } = await TeamModel.createTeamAndInvitation(inviterId, peerId);

    const msg = await MessageModel.createMessage(inviterId, peerId, null, INVITE_LINE, 'team_invite', {
      invitation_id: invitationId,
      team_id: teamId,
    });

    await TeamModel.attachMessageToInvitation(invitationId, msg.id);

    res.status(201).json({ invitation_id: invitationId, team_id: teamId, message: msg });
  } catch (err) {
    console.error('team invite:', err);
    res.status(500).json({ error: 'Failed to send team invite.' });
  }
};

exports.decline = async (req, res) => {
  try {
    const invitationId = parseInt(req.params.invitationId, 10);
    if (!Number.isFinite(invitationId)) {
      return res.status(400).json({ error: 'Invalid invitation.' });
    }
    const me = await UserModel.findById(req.userId);
    if (!me || me.role !== 'student') {
      return res.status(403).json({ error: 'Only students can decline invitations.' });
    }

    const result = await TeamModel.declineInvitation(invitationId, req.userId);
    if (!result.ok) {
      return res.status(400).json({ error: 'Invitation is not valid or already handled.' });
    }

    await MessageModel.createMessage(req.userId, result.inviter_id, null, 'Team invitation declined.', 'team_system', {
      team_id: result.team_id,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('team decline:', err);
    res.status(500).json({ error: 'Failed to decline invitation.' });
  }
};

exports.cancel = async (req, res) => {
  try {
    const invitationId = parseInt(req.params.invitationId, 10);
    if (!Number.isFinite(invitationId)) {
      return res.status(400).json({ error: 'Invalid invitation.' });
    }
    const me = await UserModel.findById(req.userId);
    if (!me || me.role !== 'student') {
      return res.status(403).json({ error: 'Only students can cancel invitations.' });
    }

    const result = await TeamModel.cancelInvitation(invitationId, req.userId);
    if (!result.ok) {
      return res.status(400).json({ error: 'Invitation is not valid or already handled.' });
    }

    await MessageModel.createMessage(req.userId, result.invitee_id, null, 'Team invitation cancelled.', 'team_system', {
      team_id: result.team_id,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('team cancel:', err);
    res.status(500).json({ error: 'Failed to cancel invitation.' });
  }
};

exports.accept = async (req, res) => {
  try {
    const invitationId = parseInt(req.params.invitationId, 10);
    const inviteeId = req.userId;
    if (!Number.isFinite(invitationId)) {
      return res.status(400).json({ error: 'Invalid invitation.' });
    }

    const me = await UserModel.findById(inviteeId);
    if (!me || me.role !== 'student') {
      return res.status(403).json({ error: 'Only students can join a team.' });
    }

    const existingTeam = await pool.query(`SELECT 1 FROM team_members WHERE user_id = $1 LIMIT 1`, [inviteeId]);
    if (existingTeam.rowCount > 0) {
      return res.status(400).json({
        error: 'You already belong to a team. One team at a time is supported.',
      });
    }

    const result = await TeamModel.acceptInvitation(invitationId, inviteeId);
    if (!result.ok) {
      if (result.reason === 'full') {
        return res.status(409).json({ error: 'This team is already full.' });
      }
      return res.status(400).json({ error: 'Invitation is not valid or already handled.' });
    }

    const { inviter_id: inviterId, invitee_id: acceptedInvitee } = result;
    await MessageModel.createMessage(acceptedInvitee, inviterId, null, TEAM_COMPLETE_LINE, 'team_system', {
      team_id: result.team_id,
    });

    const team = await TeamModel.getMyTeamPayload(inviteeId);
    res.json({ ok: true, team });
  } catch (err) {
    console.error('team accept:', err);
    res.status(500).json({ error: 'Failed to join team.' });
  }
};
