import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { parseJsonResponse } from '../api';
import { useLocale } from '../context/LocaleContext';

function readAuthed() {
  try {
    return Boolean(localStorage.getItem('token'));
  } catch {
    return false;
  }
}

function readStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function CreateListing() {
  const { t } = useLocale();
  const [isAuthed, setIsAuthed] = useState(readAuthed);
  const [storedUser, setStoredUser] = useState(readStoredUser);
  const [formData, setFormData] = useState({ title: '', description: '', price: '' });
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const sync = () => {
      setIsAuthed(readAuthed());
      setStoredUser(readStoredUser());
    };
    sync();
    const onStorage = (e) => {
      if (e.key === 'token' || e.key === 'user' || e.key === null) sync();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const isStudent = storedUser?.role === 'student';

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Create new files array combining explicit new files to old
    const newFiles = [...files, ...selectedFiles];
    setFiles(newFiles);
    
    // Generate previews
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
    
    // Revoke the object URL to avoid memory leaks
    URL.revokeObjectURL(previews[indexToRemove]);
    setPreviews(previews.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAuthed(false);
      setError('');
      return;
    }
    if (readStoredUser()?.role === 'student') {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const payload = new FormData();
      payload.append('title', formData.title);
      payload.append('description', formData.description);
      payload.append('price', formData.price);
      
      files.forEach(file => {
        payload.append('photos', file);
      });

      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        body: payload
      });
      await parseJsonResponse(res);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthed) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-16 md:py-24">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 p-10 md:p-12 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-50 blur-3xl opacity-80 pointer-events-none" />
          <div className="relative z-10 text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner mx-auto mb-8">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-5 leading-tight">
              {t('create.gateTitle')}
            </h1>
            <p className="text-slate-600 font-medium leading-relaxed mb-10 text-base md:text-lg">
              {t('create.gateBody')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
              <Link
                to="/register"
                className="inline-flex justify-center items-center font-bold bg-blue-600 text-white px-8 py-4 rounded-2xl shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-[0.98]"
              >
                {t('create.gateRegister')}
              </Link>
              <Link
                to="/login"
                className="inline-flex justify-center items-center font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-8 py-4 rounded-2xl transition-all active:scale-[0.98]"
              >
                {t('nav.signIn')}
              </Link>
            </div>
            <p className="text-sm text-slate-500 font-medium mb-3">{t('create.gateStudentLine')}</p>
            <Link to="/" className="text-sm font-bold text-blue-600 hover:text-blue-700">
              {t('create.gateExplore')}
            </Link>
            <div className="mt-10 pt-8 border-t border-slate-100">
              <Link to="/" className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition-colors">
                ← {t('create.gateBack')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isStudent) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-16 md:py-24">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 p-10 md:p-12 relative overflow-hidden text-center">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-sky-50 blur-3xl opacity-80 pointer-events-none" />
          <div className="relative z-10">
            <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center shadow-inner mx-auto mb-8">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.557 50.557 0 0 1 12 13.489a50.55 50.55 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm6.75 0a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm6.75 0a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-5 leading-tight">
              {t('create.studentTitle')}
            </h1>
            <p className="text-slate-600 font-medium leading-relaxed mb-10 text-base md:text-lg">
              {t('create.studentBody')}
            </p>
            <Link
              to="/"
              className="inline-flex justify-center items-center font-bold bg-blue-600 text-white px-8 py-4 rounded-2xl shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-[0.98]"
            >
              {t('create.studentCta')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto bg-white min-h-[90vh] shadow-sm border-x border-slate-100 p-12 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-50 blur-3xl opacity-70"></div>
      <div className="relative z-10">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        </div>
        <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">{t('createListing.title')}</h2>
        <p className="text-slate-500 font-medium mb-10 text-lg">{t('createListing.subtitle')}</p>
      </div>

      {error && <div className="relative z-10 bg-red-50 text-red-600 px-5 py-4 rounded-xl mb-8 text-sm font-bold border border-red-100">{error}</div>}

      <form onSubmit={handleSubmit} className="relative z-10 space-y-8">
        <div>
          <label htmlFor="create-title" className="text-sm font-bold text-slate-700 block mb-2 px-1">{t('createListing.titleLabel')}</label>
          <input
            id="create-title"
            type="text" required
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            placeholder={t('createListing.titlePh')}
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="create-desc" className="text-sm font-bold text-slate-700 block mb-2 px-1">{t('createListing.descLabel')}</label>
          <textarea
            id="create-desc"
            required rows="5"
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none leading-relaxed"
            placeholder={t('createListing.descPh')}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          ></textarea>
        </div>

        <div>
          <label htmlFor="create-price" className="text-sm font-bold text-slate-700 block mb-2 px-1">{t('createListing.priceLabel')}</label>
          <div className="relative md:w-1/2">
            <span className="absolute left-5 top-4 font-bold text-slate-400">€</span>
            <input
              id="create-price"
              type="number" required min="1"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-5 py-4 text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-text appearance-none"
              placeholder={t('createListing.pricePh')}
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
          </div>
        </div>
        
        {/* Facebook Style Photo Uploader */}
        <div className="bg-slate-50 rounded-3xl border border-slate-200 p-6 shadow-inner">
          <label className="text-lg font-black text-slate-900 block mb-4">{t('createListing.photos')}</label>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {previews.map((preview, index) => (
              <div key={index} className="relative aspect-square rounded-2xl overflow-hidden group border border-slate-200 shadow-sm">
                <img src={preview} alt={`Preview ${index}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <button 
                    type="button" 
                    onClick={() => removeFile(index)}
                    aria-label={`Remove photo ${index + 1}`}
                    className="bg-white/90 text-red-600 rounded-full w-10 h-10 flex items-center justify-center hover:bg-white hover:scale-110 focus:bg-white focus:scale-110 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all shadow-lg"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            
            <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 bg-white hover:bg-blue-50 hover:border-blue-400 flex flex-col items-center justify-center cursor-pointer transition-colors group">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <span className="text-sm font-bold text-slate-500 group-hover:text-blue-600">{t('createListing.addPhotos')}</span>
              <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        </div>

        <div className="pt-4">
          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-5 px-4 rounded-2xl shadow-xl shadow-blue-500/30 hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-500/40 transition-all hover:-translate-y-1 active:scale-[0.98] text-xl cursor-pointer disabled:opacity-70 disabled:pointer-events-none">
            {isLoading ? t('createListing.submitting') : t('createListing.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}
