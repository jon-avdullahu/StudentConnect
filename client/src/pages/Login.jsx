import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useLocale } from '../context/LocaleContext';

export default function Login() {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = typeof location.state?.from === 'string' ? location.state.from : '/';

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('studentconnect-auth'));
      navigate(from.startsWith('/') ? from : '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-transparent">
      <div className="max-w-md w-full bg-white p-12 rounded-[2.5rem] shadow-2xl shadow-blue-500/10 border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-50 blur-3xl opacity-60"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-sky-50 blur-3xl opacity-60"></div>
        
        <div className="relative z-10 text-center mb-10">
          <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm0 8.625a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25ZM15.375 12a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0ZM7.5 10.875a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25Z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">{t('login.title')}</h2>
          <p className="text-slate-500 font-medium">{t('login.subtitle')}</p>
        </div>
        
        {error && <div className="relative z-10 bg-red-50 border border-red-100 text-red-600 px-5 py-4 rounded-2xl mb-8 text-sm font-bold shadow-sm" role="alert">{error}</div>}
        
        <form className="relative z-10 space-y-7" onSubmit={handleLogin}>
          <div>
            <label htmlFor="login-email" className="text-sm font-bold text-slate-700 block mb-2 px-1">{t('login.email')}</label>
            <input 
              id="login-email"
              type="email" 
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" 
              placeholder={t('login.emailPh')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="login-password" className="text-sm font-bold text-slate-700 block mb-2 px-1">{t('login.password')}</label>
            <input 
              id="login-password"
              type="password" 
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" 
              placeholder={t('login.passwordPh')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-4 px-4 rounded-2xl shadow-xl shadow-blue-500/30 hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-500/40 transition-all hover:-translate-y-1 active:scale-[0.98] text-lg disabled:opacity-70 disabled:pointer-events-none">
            {isLoading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>
        
        <p className="relative z-10 text-center text-sm font-bold text-slate-500 mt-10">
          {t('login.noAccount')} <Link to="/register" className="text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg ml-1">{t('login.joinLink')}</Link>
        </p>
      </div>
    </div>
  );
}
