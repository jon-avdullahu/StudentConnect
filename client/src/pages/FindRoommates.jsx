import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchStudents } from '../api';
import { useLocale } from '../context/LocaleContext';

function readUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isStudent(u) {
  return u && String(u.role || '').toLowerCase().trim() === 'student';
}

function hobbyChips(prefs) {
  if (!prefs || !Array.isArray(prefs.hobbies)) return [];
  return prefs.hobbies.filter(Boolean).slice(0, 8);
}

export default function FindRoommates() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login', { replace: true, state: { from: '/roommates' } });
      return;
    }
    const u = readUser();
    if (!isStudent(u)) {
      navigate('/', { replace: true });
      return;
    }
  }, [navigate]);

  useEffect(() => {
    if (!localStorage.getItem('token') || !isStudent(readUser())) return;

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchStudents({ search: q.trim() });
        if (!cancelled) setStudents(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setStudents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const tmr = setTimeout(run, q.trim() ? 320 : 0);
    return () => {
      cancelled = true;
      clearTimeout(tmr);
    };
  }, [q]);

  if (!localStorage.getItem('token') || !isStudent(readUser())) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 pb-24">
      <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">{t('roommates.title')}</h1>
      <p className="text-slate-500 font-medium text-lg mb-8 max-w-2xl">{t('roommates.subtitle')}</p>

      <div className="mb-10 max-w-xl">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('roommates.searchPh')}
          aria-label={t('roommates.searchPh')}
          className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-medium shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
        />
      </div>

      {error && (
        <div className="mb-6 text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3" role="alert">{error}</div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 rounded-[2rem] bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-slate-100">
          <p className="text-slate-600 font-medium">{t('roommates.empty')}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {students.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 flex flex-col hover:shadow-lg hover:border-blue-100 transition-all"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-lg font-black shrink-0">
                  {(s.full_name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="font-black text-slate-900 truncate">{s.full_name}</h2>
                  {s.university && <p className="text-sm text-slate-500 font-semibold truncate">{s.university}</p>}
                </div>
              </div>
              {s.bio && <p className="text-sm text-slate-600 line-clamp-3 mb-3 font-medium leading-relaxed">{s.bio}</p>}
              {s.preferences?.interests && (
                <p className="text-xs text-slate-500 line-clamp-2 mb-3 font-medium">{s.preferences.interests}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mb-5 mt-auto">
                {hobbyChips(s.preferences).map((h) => (
                  <span
                    key={h}
                    className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80"
                  >
                    {h}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/students/${s.id}`}
                  className="flex-1 text-center text-sm font-bold py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {t('roommates.view')}
                </Link>
                <Link
                  to={`/messages/${s.id}`}
                  state={{ peerName: s.full_name }}
                  className="flex-1 text-center text-sm font-bold py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  {t('roommates.message')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
