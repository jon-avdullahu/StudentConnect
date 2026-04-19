import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiUrl, assetUrl, parseJsonResponse } from '../api';
import { useLocale } from '../context/LocaleContext';
import { useTeam } from '../context/TeamContext';
import ReportModal from '../components/ReportModal';

function readStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=1200';

export default function ListingDetail() {
  const { id } = useParams();
  const { t } = useLocale();
  const { team } = useTeam();
  const [me, setMe] = useState(() => readStoredUser());
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePhoto, setActivePhoto] = useState(0);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    setMe(readStoredUser());
    const onStorage = (e) => {
      if (e.key === 'user' || e.key === null) setMe(readStoredUser());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      setActivePhoto(0);
      try {
        const res = await fetch(apiUrl(`/api/listings/${id}`));
        const data = await parseJsonResponse(res);
        if (!cancelled) setListing(data);
      } catch (e) {
        if (!cancelled) {
          setListing(null);
          setError(e.message || 'Could not load this listing.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-xl w-48 mb-8" />
        <div className="h-44 md:h-52 bg-slate-100 rounded-[2rem] mb-8" />
        <div className="h-8 bg-slate-100 rounded-lg w-2/3 mb-4" />
        <div className="h-4 bg-slate-100 rounded w-full mb-2" />
        <div className="h-4 bg-slate-100 rounded w-5/6" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">{t('listingDetail.unavailable')}</h1>
        <p className="text-slate-500 font-medium mb-8">{error || t('listingDetail.unavailableSub')}</p>
        <Link
          to="/"
          className="inline-flex items-center font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-6 py-3 rounded-full transition-colors"
        >
          ← {t('listingDetail.backToListings')}
        </Link>
      </div>
    );
  }

  const photos = Array.isArray(listing.photos) && listing.photos.length > 0
    ? listing.photos.map(assetUrl)
    : [PLACEHOLDER];
  const mainSrc = photos[activePhoto] || PLACEHOLDER;
  const ownerName = (listing.owner_full_name || '').trim() || t('listing.ownerFallback');
  const ownerId = listing.owner_id;
  const isOwner = me && ownerId != null && Number(me.id) === Number(ownerId);
  const isStudent = me?.role === 'student';
  const canMessage = Boolean(me && isStudent && !isOwner && ownerId != null);
  const posted =
    listing.created_at &&
    new Date(listing.created_at).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 pb-20">
      <Link
        to="/"
        className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-blue-600 mb-8 transition-colors"
      >
        <span className="mr-2">←</span> {t('listingDetail.backAll')}
      </Link>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="relative bg-slate-100 px-4 py-5 md:px-6 md:py-6">
          <img
            src={mainSrc}
            alt=""
            className="mx-auto block max-h-40 sm:max-h-44 md:max-h-48 w-auto max-w-full object-contain rounded-xl shadow-sm ring-1 ring-slate-200/60"
          />
          <div className="absolute top-3 right-3 md:top-4 md:right-4 bg-white/95 backdrop-blur-md px-3 py-2 md:px-4 md:py-2.5 rounded-xl shadow-md border border-white/20">
            <span className="font-black text-slate-900 text-base md:text-lg tracking-tight">€{listing.price}</span>
            <span className="text-xs text-slate-500 font-bold ml-1 uppercase">{t('listingDetail.priceSuffix')}</span>
          </div>
        </div>

        {photos.length > 1 && (
          <div className="flex gap-2 p-4 overflow-x-auto border-t border-slate-100 bg-slate-50/80">
            {photos.map((url, i) => (
              <button
                key={`${url}-${i}`}
                type="button"
                onClick={() => setActivePhoto(i)}
                className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                  i === activePhoto ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="p-8 md:p-10">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-4">{listing.title}</h1>

          <div className="flex flex-wrap items-center gap-4 mb-8 text-sm text-slate-500 font-semibold">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                {ownerName.charAt(0).toUpperCase()}
              </div>
              <span className="text-slate-800">{ownerName}</span>
            </div>
            {posted && (
              <>
                <span className="text-slate-300">·</span>
                <span>{t('listingDetail.posted', { date: posted })}</span>
              </>
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-3">{t('listingDetail.about')}</h2>
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">{listing.description}</p>
          </div>

          {canMessage && (
            <div className="mt-10 pt-8 border-t border-slate-100">
              {team?.full ? (
                <div className="flex flex-col sm:flex-row gap-3 sm:items-stretch">
                  <Link
                    to={{
                      pathname: `/messages/${ownerId}`,
                      search: new URLSearchParams({
                        listing: String(listing.id),
                        contact: 'self',
                      }).toString(),
                    }}
                    state={{ peerName: ownerName }}
                    className="inline-flex items-center justify-center w-full sm:flex-1 font-bold bg-blue-600 text-white px-8 py-4 rounded-2xl shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-[0.99] text-center"
                  >
                    {t('listing.messageForSelf')}
                  </Link>
                  <Link
                    to={{
                      pathname: `/messages/${ownerId}`,
                      search: new URLSearchParams({
                        listing: String(listing.id),
                        contact: 'team',
                      }).toString(),
                    }}
                    state={{ peerName: ownerName }}
                    className="inline-flex items-center justify-center w-full sm:flex-1 font-bold bg-violet-600 text-white px-8 py-4 rounded-2xl shadow-lg shadow-violet-500/25 hover:bg-violet-700 transition-all active:scale-[0.99] text-center"
                  >
                    {t('listing.messageAsTeam')}
                  </Link>
                </div>
              ) : (
                <Link
                  to={{
                    pathname: `/messages/${ownerId}`,
                    search: new URLSearchParams({ listing: String(listing.id) }).toString(),
                  }}
                  state={{ peerName: ownerName }}
                  className="inline-flex items-center justify-center w-full sm:w-auto font-bold bg-blue-600 text-white px-8 py-4 rounded-2xl shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-[0.99]"
                >
                  {t('listing.contactLandlord')}
                </Link>
              )}
              <p className="mt-3 text-sm text-slate-500 font-medium">{t('listing.contactHint')}</p>
              {team?.full && (
                <p className="mt-2 text-sm text-slate-500 font-medium">{t('listing.teamContactHint')}</p>
              )}
            </div>
          )}

          {me && !isOwner && (
            <div className="mt-6 flex justify-end">
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
            <ReportModal entityType="listing" entityId={listing.id} onClose={() => setShowReport(false)} />
          )}

          {!me && ownerId != null && (
            <div className="mt-10 pt-8 border-t border-slate-100">
              <p className="text-slate-600 font-medium mb-4">{t('listing.signInToContactLead')}</p>
              <Link
                to="/login"
                state={{
                  from: `/messages/${ownerId}?${new URLSearchParams({
                    listing: String(listing.id),
                  }).toString()}`,
                }}
                className="inline-flex items-center justify-center font-bold bg-blue-600 text-white px-8 py-4 rounded-2xl shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-all"
              >
                {t('listing.signInToContact')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
