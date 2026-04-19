import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiUrl } from '../api';
import { useLocale } from '../context/LocaleContext';

export default function Register() {
  const { t } = useLocale();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('student');
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', university: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const payload = { ...formData, role };
      const res = await fetch(apiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('studentconnect-auth'));
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full bg-white p-12 rounded-[2.5rem] shadow-2xl shadow-blue-500/10 border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 -ml-16 -mt-16 w-64 h-64 rounded-full bg-sky-50 blur-3xl opacity-60"></div>
        <div className="absolute bottom-0 right-0 -mr-16 -mb-16 w-64 h-64 rounded-full bg-blue-50 blur-3xl opacity-60"></div>
        
        <div className="relative z-10 text-center mb-10">
           <div className="mx-auto w-16 h-16 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center shadow-inner mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">{t('register.title')}</h2>
          <p className="text-slate-500 font-medium">{t('register.subtitle')}</p>
        </div>
        
        {error && <div className="relative z-10 bg-red-50 border border-red-100 text-red-600 px-5 py-4 rounded-2xl mb-8 text-sm font-bold shadow-sm" role="alert">{error}</div>}
        
        {step === 1 ? (
          <div className="relative z-10 animate-fade-in">
            <p className="text-sm font-bold text-slate-700 block mb-4 text-center">{t('register.rolePrompt')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <button 
                onClick={() => setRole('student')}
                className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center gap-3 ${role === 'student' ? 'border-sky-500 bg-sky-50 shadow-md shadow-sky-500/10' : 'border-slate-100 bg-white hover:border-sky-200'}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${role === 'student' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M11.7 2.805a.75.75 0 0 1 .6 0A60.65 60.65 0 0 1 22.83 8.72a.75.75 0 0 1-.231 1.337 49.94 49.94 0 0 0-9.902 3.912l-.003.002c-.874.494-1.949.494-2.823 0l-.003-.002a49.94 49.94 0 0 0-9.902-3.912.75.75 0 0 1-.231-1.337A60.65 60.65 0 0 1 11.7 2.805Z" /><path d="M13.06 15.473a48.45 48.45 0 0 1-7.666-3.282c-.134 1.414.22 2.843 1.012 3.963l-2.324 2.324a.75.75 0 0 0 1.06 1.06l2.096-2.096a5.332 5.332 0 0 0 6.144 0l2.096 2.096a.75.75 0 0 0 1.06-1.06l-2.324-2.324c.792-1.12.146-2.55.012-3.963a48.45 48.45 0 0 1-7.666 3.282 3.13 3.13 0 0 1-2.096 0Z" /></svg>
                </div>
                <div>
                  <h3 className={`font-bold ${role === 'student' ? 'text-sky-900' : 'text-slate-700'}`}>{t('register.student')}</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{t('register.studentHint')}</p>
                </div>
              </button>
              
              <button 
                onClick={() => setRole('landlord')}
                className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center gap-3 ${role === 'landlord' ? 'border-sky-500 bg-sky-50 shadow-md shadow-sky-500/10' : 'border-slate-100 bg-white hover:border-sky-200'}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${role === 'landlord' ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M3 2.25a.75.75 0 0 0 0 1.5v16.5h-.75a.75.75 0 0 0 0 1.5H21a.75.75 0 0 0 0-1.5h-.75V3.75a.75.75 0 0 0 0-1.5h-15ZM10.5 15h3v4.5h-3V15Zm-2.25-9h-.75v1.5h.75V6Zm0 3h-.75v1.5h.75V9Zm0 3h-.75v1.5h.75V12Zm4.5-6h-.75v1.5h.75V6Zm0 3h-.75v1.5h.75V9Zm0 3h-.75v1.5h.75V12Zm4.5-6h-.75v1.5h.75V6Zm0 3h-.75v1.5h.75V9Zm0 3h-.75v1.5h.75V12Z" clipRule="evenodd" /></svg>
                </div>
                <div>
                  <h3 className={`font-bold ${role === 'landlord' ? 'text-sky-900' : 'text-slate-700'}`}>{t('register.landlord')}</h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{t('register.landlordHint')}</p>
                </div>
              </button>
            </div>
            
            <button 
              onClick={() => setStep(2)}
              className="w-full bg-sky-600 text-white font-bold py-4 px-4 rounded-2xl shadow-xl shadow-sky-500/30 hover:bg-sky-700 hover:shadow-2xl hover:shadow-sky-500/40 transition-all hover:-translate-y-1 active:scale-[0.98] text-lg"
            >
              {t('register.continue')} {"->"}
            </button>
          </div>
        ) : (
          <form className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in" onSubmit={handleRegister}>
            <div className="md:col-span-2">
              <label htmlFor="reg-fullname" className="text-sm font-bold text-slate-700 block mb-2 px-1">{t('register.fullName')}</label>
              <input 
                id="reg-fullname"
                type="text" required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" 
                placeholder={t('register.fullNamePh')}
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="reg-email" className="text-sm font-bold text-slate-700 block mb-2 px-1">{t('register.email')}</label>
              <input 
                id="reg-email"
                type="email" required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" 
                placeholder={role === 'student' ? t('register.emailStudentPh') : t('register.emailLandlordPh')}
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className={role === 'student' ? '' : 'md:col-span-2'}>
              <label htmlFor="reg-password" className="text-sm font-bold text-slate-700 block mb-2 px-1">{t('register.password')}</label>
              <input 
                id="reg-password"
                type="password" required minLength="6"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" 
                placeholder={t('register.passwordPh')}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
            {role === 'student' && (
              <div>
                <label htmlFor="reg-university" className="text-sm font-bold text-slate-700 block mb-2 px-1 text-nowrap">{t('register.university')}</label>
                <input 
                  id="reg-university"
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" 
                  placeholder={t('register.universityPh')}
                  value={formData.university}
                  onChange={(e) => setFormData({...formData, university: e.target.value})}
                />
              </div>
            )}
            
            <div className="md:col-span-2 flex items-center justify-between mt-4">
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="text-slate-500 font-bold hover:text-slate-700 bg-slate-100 hover:bg-slate-200 py-3 px-6 rounded-xl transition-all"
              >
                {t('register.back')}
              </button>
              <button 
                type="submit" 
                disabled={isLoading}
                className="bg-sky-600 flex-1 ml-4 text-white font-bold py-4 px-4 rounded-xl shadow-xl shadow-sky-500/30 hover:bg-sky-700 hover:shadow-2xl hover:shadow-sky-500/40 transition-all active:scale-[0.98] text-lg disabled:opacity-70 disabled:pointer-events-none"
              >
                {isLoading ? t('register.submitting') : t('register.submit')}
              </button>
            </div>
          </form>
        )}
        
        <p className="relative z-10 text-center text-sm font-bold text-slate-500 mt-10">
          {t('register.hasAccount')} <Link to="/login" className="text-sky-600 hover:text-sky-700 transition-colors bg-sky-50 px-3 py-1.5 rounded-lg ml-1">{t('register.signInLink')}</Link>
        </p>
      </div>
    </div>
  );
}
