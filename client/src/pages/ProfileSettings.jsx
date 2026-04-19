import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchMyProfile, patchMyProfile, mergeStoredUser } from '../api';
import { useLocale } from '../context/LocaleContext';

function readStoredUser() {
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

export default function ProfileSettings() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [fullName, setFullName] = useState('');
  const [university, setUniversity] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState('');
  const [roommateNote, setRoommateNote] = useState('');
  const [hobbiesLine, setHobbiesLine] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login', { replace: true, state: { from: '/settings' } });
      return;
    }
    if (!isStudent(readStoredUser())) {
      navigate('/', { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const p = await fetchMyProfile();
        if (cancelled) return;
        if (String(p.role || '').toLowerCase().trim() !== 'student') {
          navigate('/', { replace: true });
          return;
        }
        setFullName(p.full_name || '');
        setUniversity(p.university || '');
        setBio(p.bio || '');
        const prefs = p.preferences && typeof p.preferences === 'object' ? p.preferences : {};
        setInterests(prefs.interests || '');
        setRoommateNote(prefs.roommate_note || '');
        const h = Array.isArray(prefs.hobbies) ? prefs.hobbies : [];
        setHobbiesLine(h.join(', '));
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const data = await patchMyProfile({
        full_name: fullName.trim(),
        university: university.trim() || null,
        bio: bio.trim() || null,
        preferences: {
          interests: interests.trim(),
          roommate_note: roommateNote.trim(),
          hobbies: hobbiesLine,
        },
      });
      mergeStoredUser({
        full_name: data.full_name,
        university: data.university,
      });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 animate-pulse space-y-6">
        <div className="h-10 bg-slate-100 rounded-xl w-1/2" />
        <div className="h-32 bg-slate-100 rounded-2xl" />
        <div className="h-24 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 pb-24">
      <Link to="/" className="text-sm font-bold text-slate-500 hover:text-blue-600 mb-6 inline-block">
        ← {t('settings.back')}
      </Link>
      <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{t('settings.title')}</h1>
      <p className="text-slate-500 font-medium mb-10">{t('settings.subtitle')}</p>

      {error && (
        <div className="mb-6 text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3" role="alert">{error}</div>
      )}
      {saved && (
        <div className="mb-6 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          {t('settings.saved')}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 md:p-10">
        <div>
          <label htmlFor="settings-fullname" className="text-sm font-bold text-slate-700 block mb-2">{t('settings.fullName')}</label>
          <input
            id="settings-fullname"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="settings-university" className="text-sm font-bold text-slate-700 block mb-2">{t('settings.university')}</label>
          <input
            id="settings-university"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            placeholder={t('settings.universityPh')}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="settings-bio" className="text-sm font-bold text-slate-700 block mb-2">{t('settings.bio')}</label>
          <textarea
            id="settings-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder={t('settings.bioPh')}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 resize-none leading-relaxed"
          />
        </div>
        <div>
          <label htmlFor="settings-interests" className="text-sm font-bold text-slate-700 block mb-2">{t('settings.interests')}</label>
          <textarea
            id="settings-interests"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            rows={3}
            placeholder={t('settings.interestsPh')}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 resize-none leading-relaxed"
          />
        </div>
        <div>
          <label htmlFor="settings-hobbies" className="text-sm font-bold text-slate-700 block mb-2">{t('settings.hobbies')}</label>
          <input
            id="settings-hobbies"
            value={hobbiesLine}
            onChange={(e) => setHobbiesLine(e.target.value)}
            placeholder={t('settings.hobbiesPh')}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <p className="text-xs text-slate-400 font-medium mt-2 px-1">{t('settings.hobbiesHint')}</p>
        </div>
        <div>
          <label htmlFor="settings-roommate" className="text-sm font-bold text-slate-700 block mb-2">{t('settings.roommateNote')}</label>
          <textarea
            id="settings-roommate"
            value={roommateNote}
            onChange={(e) => setRoommateNote(e.target.value)}
            rows={3}
            placeholder={t('settings.roommateNotePh')}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 resize-none leading-relaxed"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/25 hover:bg-blue-700 disabled:opacity-60 transition-all"
        >
          {saving ? t('settings.saving') : t('settings.save')}
        </button>
      </form>
    </div>
  );
}
