const API_BASE = import.meta.env.VITE_API_URL || '';

export async function register({ email, password, fullName, university }) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, fullName, university }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  return data;
}

export async function login({ email, password }) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem('studentconnect_auth');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredAuth({ user, token }) {
  localStorage.setItem('studentconnect_auth', JSON.stringify({ user, token }));
}

export function clearStoredAuth() {
  localStorage.removeItem('studentconnect_auth');
}
