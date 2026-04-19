const API_BASE = import.meta.env.VITE_API_URL || '';

/** Read body as text, then JSON; clear errors when the server returns HTML or an empty body (e.g. wrong proxy target). */
export async function parseJsonResponse(res) {
  const text = await res.text();
  if (!res.ok) {
    let detail = '';
    if (text) {
      try {
        const j = JSON.parse(text);
        detail = typeof j.error === 'string' ? j.error : typeof j.message === 'string' ? j.message : '';
      } catch {
        detail = text.slice(0, 280).trim();
      }
    }
    if (detail) throw new Error(detail);
    if (res.status === 403) {
      throw new Error(
        'Server returned 403 with an empty body. Your API may be on a different port than the Vite proxy (check VITE_API_PROXY_TARGET). On macOS, port 5000 is often used by AirPlay Receiver.'
      );
    }
    throw new Error(`Request failed (HTTP ${res.status}).`);
  }
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Server returned a non-JSON response.');
  }
}

export function getAuthHeaders(extra = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function fetchConversations() {
  const res = await fetch(`${API_BASE}/api/messages`, { headers: getAuthHeaders() });
  return parseJsonResponse(res);
}

export async function fetchMessageThread(chatUserId, { teamId } = {}) {
  const q = new URLSearchParams();
  if (teamId != null && teamId !== '') q.set('team', String(teamId));
  const qs = q.toString();
  const res = await fetch(`${API_BASE}/api/messages/${chatUserId}${qs ? `?${qs}` : ''}`, {
    headers: getAuthHeaders(),
  });
  return parseJsonResponse(res);
}

export async function sendChatMessage({ receiver_id, listing_id, content, as_team }) {
  const res = await fetch(`${API_BASE}/api/messages`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      receiver_id,
      listing_id: listing_id != null && listing_id !== '' ? listing_id : undefined,
      content,
      ...(as_team ? { as_team: true } : {}),
    }),
  });
  return parseJsonResponse(res);
}

export function notifyAuthUpdated() {
  window.dispatchEvent(new Event('studentconnect-auth'));
}

export function mergeStoredUser(partial) {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return;
    const u = JSON.parse(raw);
    Object.assign(u, partial);
    localStorage.setItem('user', JSON.stringify(u));
    notifyAuthUpdated();
  } catch {
    /* ignore */
  }
}

export async function fetchMyProfile() {
  const res = await fetch(`${API_BASE}/api/me/profile`, { headers: getAuthHeaders() });
  return parseJsonResponse(res);
}

export async function patchMyProfile(body) {
  const res = await fetch(`${API_BASE}/api/me/profile`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  return parseJsonResponse(res);
}

export async function fetchStudents({ search = '' } = {}) {
  const q = new URLSearchParams();
  if (search) q.set('search', search);
  const res = await fetch(`${API_BASE}/api/students?${q}`, { headers: getAuthHeaders() });
  return parseJsonResponse(res);
}

export async function fetchStudentPublic(id) {
  const res = await fetch(`${API_BASE}/api/students/${id}`, { headers: getAuthHeaders() });
  return parseJsonResponse(res);
}

export async function fetchMyTeam() {
  const res = await fetch(`${API_BASE}/api/teams/mine`, { headers: getAuthHeaders() });
  return parseJsonResponse(res);
}

export async function inviteToTeam(peer_id) {
  const res = await fetch(`${API_BASE}/api/teams/invite`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ peer_id }),
  });
  return parseJsonResponse(res);
}

export async function acceptTeamInvitation(invitationId) {
  const res = await fetch(`${API_BASE}/api/teams/invitations/${invitationId}/accept`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return parseJsonResponse(res);
}

export async function declineTeamInvitation(invitationId) {
  const res = await fetch(`${API_BASE}/api/teams/invitations/${invitationId}/decline`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return parseJsonResponse(res);
}

export function notifyTeamUpdated() {
  window.dispatchEvent(new Event('studentconnect-team'));
}
