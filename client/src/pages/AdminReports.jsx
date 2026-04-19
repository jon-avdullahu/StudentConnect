import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl, getAuthHeaders, parseJsonResponse } from '../api';
import { useLocale } from '../context/LocaleContext';

function readStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const STATUS_FILTERS = ['', 'pending', 'reviewed', 'resolved', 'dismissed'];
const STATUS_LABEL_KEYS = {
  '': 'admin.filterAll',
  pending: 'admin.filterPending',
  reviewed: 'admin.filterReviewed',
  resolved: 'admin.filterResolved',
  dismissed: 'admin.filterDismissed',
};
const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  reviewed: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  dismissed: 'bg-slate-100 text-slate-600',
};

export default function AdminReports() {
  const { t } = useLocale();
  const [user] = useState(readStoredUser);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const isAdmin = user?.role === 'admin';

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const q = statusFilter ? `?status=${statusFilter}` : '';
      const res = await fetch(apiUrl(`/api/reports${q}`), { headers: getAuthHeaders() });
      const data = await parseJsonResponse(res);
      setReports(Array.isArray(data) ? data : []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (isAdmin) loadReports();
  }, [isAdmin, loadReports]);

  const updateStatus = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      const res = await fetch(apiUrl(`/api/reports/${id}/status`), {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status: newStatus }),
      });
      const updated = await parseJsonResponse(res);
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch {
      /* swallow */
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-black text-slate-900 mb-4">{t('admin.notAdmin')}</h1>
        <Link to="/" className="text-blue-600 font-bold hover:underline">{t('admin.goHome')}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-8">{t('admin.reports')}</h1>

      <div className="flex flex-wrap gap-2 mb-8">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
              statusFilter === s
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
            }`}
          >
            {t(STATUS_LABEL_KEYS[s])}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl h-32 border border-slate-100" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <p className="text-center text-slate-500 font-medium py-16">{t('admin.emptyReports')}</p>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                <div className="space-y-1 text-sm">
                  <p className="font-bold text-slate-800">
                    {t('admin.reporter', { id: report.reporter_id })}
                  </p>
                  <p className="text-slate-500">
                    <span className="font-semibold">{t('admin.entityType')}:</span> {report.reported_entity_type}
                    {' · '}
                    <span className="font-semibold">{t('admin.entityId', { id: report.entity_id })}</span>
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${STATUS_COLORS[report.status] || 'bg-slate-100 text-slate-600'}`}>
                  {report.status}
                </span>
              </div>

              <p className="text-slate-700 font-medium mb-4">{report.reason}</p>

              <div className="flex flex-wrap gap-2">
                {report.status !== 'reviewed' && (
                  <button
                    disabled={updatingId === report.id}
                    onClick={() => updateStatus(report.id, 'reviewed')}
                    className="text-xs font-bold px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    {updatingId === report.id ? t('admin.updating') : t('admin.markReviewed')}
                  </button>
                )}
                {report.status !== 'resolved' && (
                  <button
                    disabled={updatingId === report.id}
                    onClick={() => updateStatus(report.id, 'resolved')}
                    className="text-xs font-bold px-4 py-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                  >
                    {updatingId === report.id ? t('admin.updating') : t('admin.markResolved')}
                  </button>
                )}
                {report.status !== 'dismissed' && (
                  <button
                    disabled={updatingId === report.id}
                    onClick={() => updateStatus(report.id, 'dismissed')}
                    className="text-xs font-bold px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    {updatingId === report.id ? t('admin.updating') : t('admin.dismiss')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
