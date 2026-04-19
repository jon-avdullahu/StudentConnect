import { useState } from 'react';
import { getAuthHeaders, parseJsonResponse } from '../api';
import { useLocale } from '../context/LocaleContext';

export default function ReportModal({ entityType, entityId, onClose }) {
  const { t } = useLocale();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          reported_entity_type: entityType,
          entity_id: entityId,
          reason: reason.trim(),
        }),
      });
      await parseJsonResponse(res);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-black text-slate-900 mb-4">{t('report.title')}</h2>

        {success ? (
          <div className="text-center py-6">
            <p className="text-green-600 font-bold mb-4">{t('report.success')}</p>
            <button onClick={onClose} className="text-sm font-bold text-blue-600 hover:underline">
              {t('report.cancel')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <p className="text-red-600 text-sm font-bold mb-3" role="alert">{error}</p>}
            <label htmlFor="report-reason" className="text-sm font-bold text-slate-700 block mb-2">
              {t('report.reasonLabel')}
            </label>
            <textarea
              id="report-reason"
              required
              rows={4}
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('report.reasonPh')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={onClose} className="text-sm font-bold text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl transition-colors">
                {t('report.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading || !reason.trim()}
                className="text-sm font-bold bg-red-600 text-white px-6 py-2 rounded-xl shadow-md hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {loading ? t('report.submitting') : t('report.submit')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
