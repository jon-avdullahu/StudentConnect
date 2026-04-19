import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useLocale } from '../context/LocaleContext';
import { useTeam } from '../context/TeamContext';

function readUserFromStorage() {
  try {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) return null;
    return JSON.parse(userData);
  } catch {
    return null;
  }
}

function isStudentRole(user) {
  if (!user) return false;
  const r = user.role;
  if (r == null || r === '') return false;
  return String(r).toLowerCase().trim() === 'student';
}

export default function Navbar() {
  const { t } = useLocale();
  const { team } = useTeam();
  const [user, setUser] = useState(() => readUserFromStorage());
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setUser(readUserFromStorage());
  }, [location.pathname, location.key]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'user' || e.key === 'token' || e.key === null) setUser(readUserFromStorage());
    };
    const onAuth = () => setUser(readUserFromStorage());
    window.addEventListener('storage', onStorage);
    window.addEventListener('studentconnect-auth', onAuth);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('studentconnect-auth', onAuth);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('studentconnect-auth'));
    setUser(null);
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center transition-transform hover:scale-105 active:scale-95 duration-200">
          <img src="/logo.png" alt={t('nav.logoAlt')} className="h-12 w-auto object-contain drop-shadow-sm" />
        </Link>

        <div className="flex flex-wrap justify-center gap-1 sm:gap-0 bg-slate-50 border border-slate-200 p-1.5 rounded-full shadow-sm max-w-[min(100%,42rem)]">
          <Link to="/" className="px-4 sm:px-6 py-2 text-sm font-semibold text-slate-600 hover:text-blue-600 rounded-full hover:bg-white hover:shadow-sm transition-all">
            {t('nav.explore')}
          </Link>
          {isStudentRole(user) && (
            <Link
              to="/roommates"
              className="px-4 sm:px-6 py-2 text-sm font-semibold text-slate-600 hover:text-blue-600 rounded-full hover:bg-white hover:shadow-sm transition-all"
            >
              {t('nav.roommates')}
            </Link>
          )}
          {!isStudentRole(user) && (
            <Link to="/create" className="px-4 sm:px-6 py-2 text-sm font-semibold text-slate-600 hover:text-blue-600 rounded-full hover:bg-white hover:shadow-sm transition-all">
              {t('nav.postListing')}
            </Link>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-2 sm:space-x-3">
              {isStudentRole(user) && (
                <Link
                  to="/settings"
                  className="text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-2 sm:px-3 py-2 rounded-full transition-all"
                >
                  {t('nav.profile')}
                </Link>
              )}
              <Link
                to="/messages"
                className="text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-2 sm:px-4 py-2 rounded-full transition-all"
              >
                {t('nav.messages')}
              </Link>
              {isStudentRole(user) && team && (
                <span
                  className={`inline-flex text-[11px] sm:text-xs font-black px-2 sm:px-2.5 py-1 rounded-full border whitespace-nowrap ${
                    team.full
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-900 border-amber-200'
                  }`}
                  title={team.full ? t('nav.teamFullHint') : t('nav.teamOpenHint')}
                >
                  {t('nav.teamPill', { n: team.member_count, max: 2 })}
                  {team.full ? ` ${t('nav.teamFullSuffix')}` : ''}
                </span>
              )}
              <span className="text-sm font-semibold text-slate-700 hidden sm:block">
                {t('nav.hey', { name: (user.full_name || '').split(' ')[0] || '' })}
              </span>
              <button onClick={handleLogout} className="text-sm font-bold text-slate-600 hover:text-red-500 hover:bg-red-50 px-5 py-2 rounded-full transition-colors border border-transparent hover:border-red-100">
                {t('nav.logOut')}
              </button>
            </div>
          ) : (
            <div className="flex space-x-2">
              <Link to="/login" className="text-sm font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-5 py-2.5 rounded-full transition-all">
                {t('nav.signIn')}
              </Link>
              <Link to="/register" className="text-sm font-bold bg-blue-600 text-white px-6 py-2.5 rounded-full shadow-md shadow-blue-500/30 hover:bg-blue-700 hover:shadow-lg transition-all active:scale-95">
                {t('nav.joinNow')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
