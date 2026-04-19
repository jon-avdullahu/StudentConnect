import { useState, useEffect, useCallback } from 'react';
import ListingCard from '../components/ListingCard';
import { useLocale } from '../context/LocaleContext';

export default function Home() {
  const { locale, setLocale, t } = useLocale();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchListings = useCallback(() => {
    setLoading(true);
    setError('');
    const q = new URLSearchParams();
    if (search.trim()) q.set('search', search.trim());
    if (minPrice) q.set('min_price', minPrice);
    if (maxPrice) q.set('max_price', maxPrice);
    const qs = q.toString();
    fetch(`/api/listings${qs ? `?${qs}` : ''}`)
      .then(res => res.json())
      .then(data => {
        setListings(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError(t('home.fetchError'));
        setLoading(false);
      });
  }, [search, minPrice, maxPrice, t]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchListings();
  };

  return (
    <div className="py-16 px-4 max-w-7xl mx-auto">
      <div className="mx-auto max-w-3xl text-center mb-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 mb-8">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider sm:mr-2">{t('lang.label')}</span>
          <div
            className="inline-flex self-center sm:self-auto rounded-full border border-slate-200 bg-white p-1 shadow-sm"
            role="group"
            aria-label={t('lang.label')}
          >
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={`px-4 py-2 text-sm font-bold rounded-full transition-all ${
                locale === 'en'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
              }`}
            >
              {t('lang.en')}
            </button>
            <button
              type="button"
              onClick={() => setLocale('sq')}
              className={`px-4 py-2 text-sm font-bold rounded-full transition-all ${
                locale === 'sq'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
              }`}
            >
              {t('lang.sq')}
            </button>
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 mb-6 leading-tight">
          {t('home.heroBefore')}{' '}
          <span className="text-blue-600">{t('home.heroHighlight')}</span>
        </h1>
        <p className="text-lg md:text-xl leading-relaxed text-slate-500 mb-10 max-w-2xl mx-auto font-medium">
          {t('home.heroSub')}
        </p>

        <form onSubmit={handleSearch} className="max-w-xl mx-auto">
          <div className="flex relative group">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('home.searchPlaceholder')}
              aria-label={t('home.searchAria')}
              className="w-full bg-white rounded-full py-5 pl-8 pr-16 shadow-lg shadow-slate-200/50 border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700 placeholder-slate-400"
            />
            <button
              type="submit"
              aria-label={t('home.searchAria')}
              className="absolute right-3 top-3 bottom-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-12 flex items-center justify-center transition-colors shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="mt-4 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors inline-flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
            {t('home.filters')}
          </button>

          {filtersOpen && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in">
              <div className="flex items-center gap-2">
                <label htmlFor="minPrice" className="text-sm font-bold text-slate-600">{t('home.minPrice')}</label>
                <input
                  id="minPrice"
                  type="number"
                  min="0"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="0"
                  className="w-28 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <span className="text-slate-300 font-bold">—</span>
              <div className="flex items-center gap-2">
                <label htmlFor="maxPrice" className="text-sm font-bold text-slate-600">{t('home.maxPrice')}</label>
                <input
                  id="maxPrice"
                  type="number"
                  min="0"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="∞"
                  className="w-28 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              {(minPrice || maxPrice) && (
                <button
                  type="button"
                  onClick={() => { setMinPrice(''); setMaxPrice(''); }}
                  className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                >
                  {t('home.clearFilters')}
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      {error && (
        <div className="text-center py-12 mb-8 bg-red-50/50 rounded-[2rem] border border-red-100" role="alert">
          <p className="text-red-600 font-bold">{error}</p>
          <button onClick={fetchListings} className="mt-3 text-sm font-bold text-red-500 hover:text-red-700 transition-colors underline">{t('home.retry')}</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="animate-pulse bg-white rounded-[2rem] h-96 shadow-sm border border-slate-100">
              <div className="bg-slate-100 w-full h-56 rounded-t-[2rem]"></div>
              <div className="p-6 space-y-4">
                <div className="h-6 bg-slate-100 rounded-full w-3/4"></div>
                <div className="h-4 bg-slate-100 rounded-full w-1/2"></div>
                <div className="h-4 bg-slate-100 rounded-full w-full"></div>
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-24 bg-blue-50/50 rounded-[3rem] border border-blue-100">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-3">{t('home.emptyTitle')}</h3>
          <p className="text-slate-500 font-medium max-w-md mx-auto">{t('home.emptySub')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {listings.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
