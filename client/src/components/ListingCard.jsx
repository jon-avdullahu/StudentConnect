import { Link } from 'react-router-dom';
import { assetUrl } from '../api';
import { useLocale } from '../context/LocaleContext';

export default function ListingCard({ listing }) {
  const { t } = useLocale();
  const photoUrl = listing.photos && listing.photos.length > 0
    ? assetUrl(listing.photos[0])
    : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800';

  const ownerName = (listing.owner_full_name || '').trim() || t('listing.ownerFallback');
  const avatarLetter = ownerName.charAt(0).toUpperCase() || listing.title?.charAt(0).toUpperCase() || '?';

  return (
    <div className="group relative bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 transition-all duration-300">
      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 relative">
        <img 
          src={photoUrl} 
          alt={listing.title} 
          className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-white/20">
          <span className="font-extrabold text-slate-900 tracking-tight">€{listing.price}</span>
          <span className="text-xs text-slate-500 font-bold ml-1 uppercase">{t('listing.priceSuffix')}</span>
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-slate-900 leading-tight mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
          {listing.title}
        </h3>
        <p className="text-sm text-slate-500 line-clamp-2 mb-6 leading-relaxed font-medium">
          {listing.description}
        </p>
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shadow-inner">
              {avatarLetter}
            </div>
            <span className="text-sm font-semibold text-slate-700 line-clamp-1" title={ownerName}>
              {ownerName}
            </span>
          </div>
          <span className="text-sm font-bold text-blue-600">{t('listing.details')}</span>
        </div>
      </div>
      <Link to={`/listing/${listing.id}`} className="absolute inset-0 z-10">
        <span className="sr-only">{t('listing.viewListing')}</span>
      </Link>
    </div>
  );
}
