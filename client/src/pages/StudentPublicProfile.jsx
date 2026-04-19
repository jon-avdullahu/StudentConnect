import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchStudentPublic } from '../api';
import { useLocale } from '../context/LocaleContext';
import ReportModal from '../components/ReportModal';

function readUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function hobbyChips(prefs) {
  if (!prefs || !Array.isArray(prefs.hobbies)) return [];
  return prefs.hobbies.filter(Boolean);
}

export default function StudentPublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLocale();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReport, setShowReport] = useState(false);

  const myId = readUser()?.id;
  const numericId = parseInt(id, 10);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login', { replace: true, state: { from: `/students/${id}` } });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchStudentPublic(numericId);
        if (!cancelled) setProfile(data);
      } catch (e) {
        if (!cancelled) {
          setProfile(null);
          setError(e.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, numericId, navigate]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 animate-pulse space-y-4">
        <div className="h-24 bg-slate-100 rounded-[2rem]" />
        <div className="h-40 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-black text-slate-900 mb-2">{t('studentProfile.notFound')}</h1>
        <p className="text-slate-500 font-medium mb-8">{error || t('studentProfile.notFoundSub')}</p>
        <Link to="/roommates" className="font-bold text-blue-600 hover:text-blue-700">
          {t('studentProfile.backRoommates')}
        </Link>
      </div>
    );
  }

  const isSelf = myId != null && Number(myId) === Number(profile.id);
  const prefs = profile.preferences && typeof profile.preferences === 'object' ? profile.preferences : {};

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 pb-24">
      <Link to="/roommates" className="text-sm font-bold text-slate-500 hover:text-blue-600 mb-6 inline-block">
        ← {t('studentProfile.backRoommates')}
      </Link>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-blue-50 to-slate-50 px-8 py-10 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-blue-500/30">
              {(profile.full_name || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{profile.full_name}</h1>
              {profile.university && <p className="text-slate-600 font-bold mt-1">{profile.university}</p>}
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {isSelf && (
            <div className="text-sm font-bold text-blue-800 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              {t('studentProfile.thisIsYou')}{' '}
              <Link to="/settings" className="underline hover:no-underline">
                {t('studentProfile.editProfile')}
              </Link>
            </div>
          )}

          {profile.bio && (
            <div>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-2">{t('studentProfile.about')}</h2>
              <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
            </div>
          )}

          {prefs.interests && (
            <div>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-2">{t('studentProfile.interests')}</h2>
              <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{prefs.interests}</p>
            </div>
          )}

          {hobbyChips(prefs).length > 0 && (
            <div>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-3">{t('studentProfile.hobbies')}</h2>
              <div className="flex flex-wrap gap-2">
                {hobbyChips(prefs).map((h) => (
                  <span
                    key={h}
                    className="text-sm font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {prefs.roommate_note && (
            <div>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-2">{t('studentProfile.roommate')}</h2>
              <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{prefs.roommate_note}</p>
            </div>
          )}

          {!isSelf && (
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <Link
                to={`/messages/${profile.id}`}
                state={{ peerName: profile.full_name }}
                className="flex-1 text-center font-bold py-4 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all"
              >
                {t('roommates.message')}
              </Link>
            </div>
          )}

          {!isSelf && myId && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowReport(true)}
                className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
              >
                {t('report.button')}
              </button>
            </div>
          )}
          {showReport && (
            <ReportModal entityType="user" entityId={profile.id} onClose={() => setShowReport(false)} />
          )}
        </div>
      </div>
    </div>
  );
}
